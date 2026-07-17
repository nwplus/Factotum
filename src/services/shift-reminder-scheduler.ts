import { GuildDoc } from "@/types/db/guild";
import {
  OrganizerShiftDoc,
  ShiftReminderConfigDoc,
  ShiftReminderDoc,
} from "@/types/db/shift-schedule";
import { truncate } from "@/util/discord";
import {
  getFactotumBaseDocRef,
  getGuildDocRef,
  getHackathonShiftsRef,
  getShiftRemindersRef,
  logToAdminLog,
} from "@/util/nwplus-firestore";
import { resolveOrganizerIds } from "@/util/organizer-mappings";

import { SapphireClient } from "@sapphire/framework";
import { EmbedBuilder, Guild, PermissionFlagsBits } from "discord.js";
import { Timestamp } from "firebase-admin/firestore";

const PING_LEAD_MS = 10 * 60_000;
const SCAN_INTERVAL_MS = 5 * 60_000;
// Timers are only ever set up to SCAN_HORIZON_MS ahead, so the 32-bit setTimeout
// ceiling (~24.8 days) is structurally impossible; shifts further out are simply
// picked up by a later sweep. The horizon deliberately exceeds
// SCAN_INTERVAL_MS + PING_LEAD_MS so no shift can slip between consecutive
// sweeps (the extra 60 s covers sweep jitter).
const SCAN_HORIZON_MS = SCAN_INTERVAL_MS + PING_LEAD_MS + 60_000;
// Sweeps ignore shifts that started longer ago than this: old enough that a
// miss alert is pure noise, and it keeps the sweep from re-reading a whole
// event's history forever.
const SCAN_LOOKBACK_MS = 7 * 24 * 60 * 60_000;
// Misses older than this are recorded silently instead of alerting — a first
// sync of a schedule that includes past days shouldn't flood the admin log
// with one alert per already-ended shift.
const MISS_ALERT_MAX_AGE_MS = 24 * 60 * 60_000;

const formatPeople = (ids: string[], emails: string[]): string => {
  const parts = [...ids.map((id) => `<@${id}>`), ...emails];
  return parts.length > 0 ? parts.join(", ") : "—";
};

const formatDuration = (startMs: number, endMs: number): string => {
  const totalMinutes = Math.max(1, Math.round((endMs - startMs) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const minutesText = `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (hours === 0) return minutesText;
  const hoursText = `${hours} hour${hours === 1 ? "" : "s"}`;
  return minutes === 0 ? hoursText : `${hoursText} ${minutesText}`;
};

const getReminderConfig = async (
  guildId: string,
): Promise<ShiftReminderConfigDoc | undefined> => {
  const configSnap = await getGuildDocRef(guildId)
    .collection("command-data")
    .doc("shift-schedule")
    .get();
  return configSnap.data() as ShiftReminderConfigDoc | undefined;
};

// Resolves both organizer groups of a shift against organizerMappings.
const resolveShiftPeople = async (shift: OrganizerShiftDoc) => {
  const [organizers, leads] = await Promise.all([
    resolveOrganizerIds(shift.organizerEmails ?? []),
    resolveOrganizerIds(shift.leadOrganizerEmails ?? []),
  ]);
  return {
    leads,
    mentionIds: [...new Set([...organizers.ids, ...leads.ids])],
    unresolvedEmails: [
      ...new Set([...organizers.unresolvedEmails, ...leads.unresolvedEmails]),
    ],
  };
};

/**
 * Sends a ping to a shift's organizers 10 minutes before it starts. Shifts are
 * read from hackathons/{GuildDoc.hackathonName}/shifts, which the Notion sync
 * owns — this service never writes them. Its own state (whether a reminder was
 * sent) lives in the parallel reminders collection.
 */
class ShiftReminderScheduler {
  private client!: SapphireClient;
  private started = false;
  private readonly timers = new Map<
    string,
    { timeout: NodeJS.Timeout; pingAtMs: number }
  >();
  private readonly inFlight = new Set<string>();

  public start(client: SapphireClient): void {
    if (this.started) return;
    this.started = true;
    this.client = client;
    // The boot sweep IS restart recovery: it re-schedules imminent shifts and
    // catches up anything whose window passed while the bot was down.
    void this.scanAll();
    setInterval(() => void this.scanAll(), SCAN_INTERVAL_MS);
  }

  private async scanAll(): Promise<void> {
    let guildDocs;
    try {
      guildDocs = await getFactotumBaseDocRef().collection("guilds").get();
    } catch (error) {
      console.error("Shift reminder sweep failed to list guilds:", error);
      return;
    }
    const results = await Promise.allSettled(
      guildDocs.docs.map((doc) => this.scanGuild(doc.id)),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Shift reminder sweep failed for guild ${guildDocs.docs[index].id}:`,
          result.reason,
        );
      }
    });
  }

  private async scanGuild(guildId: string): Promise<void> {
    const guildDocData = (await getGuildDocRef(guildId).get()).data() as
      | GuildDoc
      | undefined;
    // hackathonName doubles as the hackathons/{id} doc ID the sync writes to.
    if (!guildDocData?.setupComplete || !guildDocData.hackathonName) return;
    const hackathonId = guildDocData.hackathonName;

    const config = await getReminderConfig(guildId);
    if (config?.paused) {
      this.cancelGuildTimers(guildId);
      return;
    }

    const guild = await this.fetchGuild(guildId);
    if (!guild) return;

    const now = Date.now();
    const [shiftsSnap, remindersSnap] = await Promise.all([
      getHackathonShiftsRef(hackathonId)
        .where("startTime", ">", Timestamp.fromMillis(now - SCAN_LOOKBACK_MS))
        .where("startTime", "<=", Timestamp.fromMillis(now + SCAN_HORIZON_MS))
        .get(),
      getShiftRemindersRef(hackathonId).get(),
    ]);
    const reminders = new Map(
      remindersSnap.docs.map((doc) => [doc.id, doc.data() as ShiftReminderDoc]),
    );

    // Timers only ever cover shifts starting within the horizon, so a pending
    // shift missing from this sweep was deleted in Notion (or pushed far out)
    // — either way the pending reminder must stop; a later sweep reschedules
    // pushed-out shifts when they come back into range.
    const shiftIds = new Set(shiftsSnap.docs.map((doc) => doc.id));
    const prefix = `${guildId}:`;
    for (const [key, entry] of this.timers) {
      if (key.startsWith(prefix) && !shiftIds.has(key.slice(prefix.length))) {
        clearTimeout(entry.timeout);
        this.timers.delete(key);
      }
    }

    for (const doc of shiftsSnap.docs) {
      // Isolate each shift: a throwing update/fire/admin-log must not abort the
      // rest of the sweep — later (=further-out) shifts would silently miss
      // their window for up to a full scan interval.
      try {
        const shift = doc.data() as OrganizerShiftDoc;
        if (reminders.get(doc.id)?.reminderSent) continue;

        const startMs = shift.startTime.toMillis();
        // A shift can never end before it starts — guard against swapped or
        // wrong-day times from the sync so a future shift isn't misfiled as
        // already over.
        const endMs = Math.max(shift.endTime.toMillis(), startMs);
        const pingAtMs = startMs - PING_LEAD_MS;
        const startUnix = Math.floor(startMs / 1000);

        if (now >= startMs) {
          // The ping window passed without a successful send (bot down, no
          // usable channel, or the shift was added too late) — pinging
          // mid-shift would be noise. Record the miss FIRST so a failing
          // admin-log send can't retrigger this branch every sweep, then
          // alert once for recent misses.
          const ended = now >= endMs;
          await this.markReminder(
            hackathonId,
            doc.id,
            ended
              ? "Shift ended before a reminder was sent"
              : "Reminder window passed before a reminder could be sent",
          );
          if (now - startMs <= MISS_ALERT_MAX_AGE_MS) {
            const { mentionIds, unresolvedEmails } =
              await resolveShiftPeople(shift);
            await logToAdminLog(
              guild,
              `Missed shift reminder (shift already ${ended ? "ended" : "started"}): ${truncate(shift.title, 200)} at <t:${startUnix}:f> — organizers: ${truncate(formatPeople(mentionIds, unresolvedEmails), 1000)}`,
            );
          }
          continue;
        }

        const key = `${guildId}:${doc.id}`;
        if (pingAtMs > now) {
          const existing = this.timers.get(key);
          // Start time changed in Notion since this timer was set — reschedule
          // at the new time (covers moves in both directions).
          if (existing && existing.pingAtMs !== pingAtMs) {
            clearTimeout(existing.timeout);
            this.timers.delete(key);
          }
          if (!this.timers.has(key)) {
            this.timers.set(key, {
              pingAtMs,
              timeout: setTimeout(() => {
                void this.fire(guildId, hackathonId, doc.id).catch((error) =>
                  console.error(`Shift reminder ${key} failed:`, error),
                );
              }, pingAtMs - now),
            });
          }
        } else {
          await this.fire(guildId, hackathonId, doc.id);
        }
      } catch (error) {
        console.error(
          `Shift reminder sweep failed for guild ${guildId} shift ${doc.id}:`,
          error,
        );
      }
    }
  }

  private async fire(
    guildId: string,
    hackathonId: string,
    shiftId: string,
  ): Promise<void> {
    const key = `${guildId}:${shiftId}`;
    const entry = this.timers.get(key);
    if (entry !== undefined) clearTimeout(entry.timeout);
    this.timers.delete(key);

    if (this.inFlight.has(key)) return;
    this.inFlight.add(key);
    try {
      const shiftRef = getHackathonShiftsRef(hackathonId).doc(shiftId);
      const reminderRef = getShiftRemindersRef(hackathonId).doc(shiftId);
      const [shiftSnap, reminderSnap] = await Promise.all([
        shiftRef.get(),
        reminderRef.get(),
      ]);
      // Stale timer: the shift was deleted in Notion.
      if (!shiftSnap.exists) return;
      const shift = shiftSnap.data() as OrganizerShiftDoc;
      const reminder = reminderSnap.data() as ShiftReminderDoc | undefined;
      if (reminder?.reminderSent) return;

      const startMs = shift.startTime.toMillis();
      const endMs = shift.endTime.toMillis();
      const pingAtMs = startMs - PING_LEAD_MS;
      const now = Date.now();
      // Moved to a later start since this was scheduled — a sweep reschedules.
      if (pingAtMs - now > 60_000) return;
      // Moved to an earlier start that already passed — the sweep records it
      // as missed rather than pinging mid-shift.
      if (now >= startMs) return;

      const guild = await this.fetchGuild(guildId);
      if (!guild) return;
      const config = await getReminderConfig(guildId);
      if (config?.paused) return;

      // Always resolve people from the freshly-read doc, so organizer changes
      // in Notion up until the ping are honoured.
      const { leads, mentionIds, unresolvedEmails } =
        await resolveShiftPeople(shift);

      const late = now > pingAtMs + 60_000;
      const mentionText = mentionIds.map((id) => `<@${id}>`).join(" ");
      const content = truncate(
        `${mentionText ? `${mentionText}\n\n` : ""}🔔 **Reminder: Your shift starts in 10 minutes**${late ? " *(late reminder)*" : ""}`,
        2000,
      );

      const startUnix = Math.floor(startMs / 1000);
      // Notion titles/descriptions are uncapped, but Discord's builders throw
      // over their hard caps (title 256, field value 1024) — and a throw here
      // loses the ping. Truncate: degraded display at worst. Unresolved emails
      // deliberately never appear here — this message is public, and Notion
      // emails are often personal; they go to the admin log instead.
      const embed = new EmbedBuilder()
        .setTitle(truncate(`Shift reminder: ${shift.title}`, 256))
        .addFields(
          { name: "Starts", value: `<t:${startUnix}:f> (<t:${startUnix}:R>)` },
          { name: "Duration", value: formatDuration(startMs, endMs) },
          { name: "Location", value: truncate(shift.location || "—", 1024) },
          {
            name: "Shift lead(s)",
            value: truncate(formatPeople(leads.ids, []), 1024),
          },
          {
            name: "Description",
            value: truncate(shift.description || "—", 1024),
          },
        );
      if (shift.notionUrl?.startsWith("https://"))
        embed.setURL(shift.notionUrl);

      // Plain-text stand-in for channels where the embed can't be sent (most
      // commonly a denied Embed Links permission) — the mentions and shift
      // essentials still get through.
      const fallbackContent = truncate(
        `${content}\n${truncate(shift.title, 200)} — ${truncate(shift.location || "location TBD", 200)} — <t:${startUnix}:f> (${formatDuration(startMs, endMs)})`,
        2000,
      );

      const candidateIds = [
        ...new Set(
          [
            config?.reminderChannelId,
            guild.channels.cache.find(
              (channel) =>
                channel.name === "shift-reminders" && channel.isTextBased(),
            )?.id,
          ].filter((id): id is string => Boolean(id)),
        ),
      ];

      let sent = false;
      let lastSendError: unknown;
      for (const channelId of candidateIds) {
        let channel;
        try {
          channel = await guild.channels.fetch(channelId);
        } catch {
          continue;
        }
        if (!channel?.isTextBased()) continue;
        const me = guild.members.me;
        if (
          !me ||
          !channel
            .permissionsFor(me)
            .has([
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ])
        ) {
          continue;
        }
        try {
          await channel.send({ content, embeds: [embed] });
          sent = true;
          break;
        } catch (error) {
          try {
            await channel.send({ content: fallbackContent });
            sent = true;
            break;
          } catch (fallbackError) {
            lastSendError = fallbackError;
            console.error(
              `Shift reminder ${key} send failed in channel ${channelId}:`,
              error,
              fallbackError,
            );
          }
        }
      }

      // Mark-after-send is deliberate: the worst case is a rare duplicate ping
      // if the bot crashes between send and write — never a silently lost
      // reminder. Plain set (no merge) so a lastError from an earlier failed
      // attempt doesn't linger after a successful retry.
      if (sent) {
        await reminderRef.set({
          reminderSent: true,
          sentAt: Timestamp.now(),
          lastAttemptAt: Timestamp.now(),
        } satisfies ShiftReminderDoc);
        if (unresolvedEmails.length > 0) {
          await logToAdminLog(
            guild,
            `Shift reminder for ${truncate(shift.title, 200)} at <t:${startUnix}:f> sent, but these emails have no /link-email mapping and could not be mentioned: ${truncate(unresolvedEmails.join(", "), 1000)}`,
          );
        }
      } else {
        // Leave reminderSent false so the next sweep retries — a transient
        // Discord failure shouldn't permanently eat the ping. Retries are
        // naturally bounded to the 10-minute window: once the shift starts,
        // the sweep records the miss and stops.
        const failureReason = lastSendError
          ? `Send failed: ${truncate(
              lastSendError instanceof Error
                ? lastSendError.message
                : String(lastSendError),
              300,
            )}`
          : "No usable reminder channel (checked the configured reminderChannelId and #shift-reminders)";
        await reminderRef.set({
          reminderSent: false,
          lastAttemptAt: Timestamp.now(),
          lastError: failureReason,
        } satisfies ShiftReminderDoc);
        await logToAdminLog(
          guild,
          `Shift reminder for ${truncate(shift.title, 200)} at <t:${startUnix}:f> could not be sent — ${failureReason}. Check the reminderChannelId config / #shift-reminders channel and the bot's permissions there. Intended mentions: ${truncate(formatPeople(mentionIds, unresolvedEmails), 800)}`,
        );
      }
    } finally {
      this.inFlight.delete(key);
    }
  }

  // Terminal no-send states also set reminderSent — it doubles as "stop
  // processing this shift", so a miss alerts once instead of every sweep.
  private async markReminder(
    hackathonId: string,
    shiftId: string,
    lastError: string,
  ): Promise<void> {
    await getShiftRemindersRef(hackathonId)
      .doc(shiftId)
      .set({
        reminderSent: true,
        lastAttemptAt: Timestamp.now(),
        lastError,
      } satisfies ShiftReminderDoc);
  }

  private cancelGuildTimers(guildId: string): void {
    const prefix = `${guildId}:`;
    for (const [key, entry] of this.timers) {
      if (key.startsWith(prefix)) {
        clearTimeout(entry.timeout);
        this.timers.delete(key);
      }
    }
  }

  // Bot kicked from the guild → skip quietly.
  private async fetchGuild(guildId: string): Promise<Guild | null> {
    try {
      return await this.client.guilds.fetch(guildId);
    } catch {
      return null;
    }
  }
}

export const shiftReminderScheduler = new ShiftReminderScheduler();
