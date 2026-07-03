import BaseCommand from "@/classes/BaseCommand";
import { idHints } from "@/constants/id-hints";
import { ShiftDoc } from "@/types/db/shift-schedule";
import { getGuildDocRef, logToAdminLog } from "@/util/nwplus-firestore";
import { ParsedShift, parseScheduleCsv, RowError } from "@/util/schedule-csv";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  AttachmentBuilder,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Firestore caps a write batch at 500 operations.
const BATCH_LIMIT = 500;

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB
const DOWNLOAD_TIMEOUT_MS = 10_000;

const toShiftDoc = (shift: ParsedShift): ShiftDoc => ({
  startTime: Timestamp.fromDate(shift.startTime),
  durationMinutes: shift.durationMinutes,
  location: shift.location,
  description: shift.description,
  organizerEmails: shift.organizerEmails,
  shiftLeadEmails: shift.shiftLeadEmails,
  organizerIds: [],
  shiftLeadIds: [],
  ...(shift.channelId && { channelId: shift.channelId }),
  ...(shift.link && { link: shift.link }),
  pingSent: false,
  completed: false,
});

const formatErrors = (errors: RowError[]): string =>
  errors
    .map((error) => `Row ${error.row}: ${error.messages.join("; ")}`)
    .join("\n");

@ApplyOptions<Command.Options>({
  name: "upload-schedule",
  description: "Upload a CSV schedule (replaces the existing one).",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class UploadSchedule extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder.addAttachmentOption((option) =>
      option
        .setName("file")
        .setDescription("Schedule CSV file")
        .setRequired(true),
    );
  }

  protected override setCommandOptions() {
    return {
      idHints: [idHints.uploadSchedule],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guild = interaction.guild!;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const file = interaction.options.getAttachment("file", true);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return interaction.editReply({ content: "Please upload a `.csv` file." });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return interaction.editReply({
        content: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Please upload a CSV under 1 MB.`,
      });
    }

    let text: string;
    try {
      const response = await fetch(file.url, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      if (!response.ok) {
        return interaction.editReply({
          content: `Failed to download the uploaded file (HTTP ${response.status}). Please try again.`,
        });
      }
      text = await response.text();
    } catch {
      return interaction.editReply({
        content:
          "Failed to download the uploaded file (network error or timeout). Please try again.",
      });
    }

    const { shifts, errors } = parseScheduleCsv(text);

    if (errors.length > 0) {
      const report = formatErrors(errors);
      const intro = `Could not upload schedule — ${errors.length} row(s) had errors and nothing was saved.`;
      if (report.length <= 1800) {
        return interaction.editReply({
          content: `${intro}\n\`\`\`\n${report}\n\`\`\``,
        });
      }
      return interaction.editReply({
        content: intro,
        files: [
          new AttachmentBuilder(Buffer.from(report, "utf8"), {
            name: "schedule-errors.txt",
          }),
        ],
      });
    }

    if (shifts.length === 0) {
      return interaction.editReply({ content: "No shifts found in the file." });
    }

    // Replace the existing schedule atomically: deletes, writes, and metadata
    // go in a single batch so a failure leaves the old schedule intact.
    const scheduleDocRef = getGuildDocRef(guild.id)
      .collection("command-data")
      .doc("shift-schedule");
    const shiftsCollection = scheduleDocRef.collection("shifts");
    const { firestore } = shiftsCollection;

    const existing = await shiftsCollection.listDocuments();
    if (existing.length + shifts.length + 1 > BATCH_LIMIT) {
      return interaction.editReply({
        content: `Schedule is too large to replace atomically (existing + new shifts must be under ${BATCH_LIMIT - 1}). Nothing was saved.`,
      });
    }

    const batch = firestore.batch();
    for (const ref of existing) batch.delete(ref);
    for (const shift of shifts)
      batch.set(shiftsCollection.doc(), toShiftDoc(shift));
    batch.set(
      scheduleDocRef,
      { active: true, lastUpdated: FieldValue.serverTimestamp() },
      { merge: true },
    );
    await batch.commit();

    await logToAdminLog(
      guild,
      `Shift schedule uploaded by <@${interaction.user.id}>: ${shifts.length} shift(s).`,
    );

    const startTimes = shifts.map((shift) => shift.startTime.getTime());
    const earliest = new Date(Math.min(...startTimes));
    const latest = new Date(Math.max(...startTimes));

    const embed = new EmbedBuilder().setTitle("Schedule uploaded").addFields(
      { name: "Shifts loaded", value: `${shifts.length}` },
      {
        name: "Date range",
        value: `${earliest.toLocaleString()} → ${latest.toLocaleString()}`,
      },
    );

    return interaction.editReply({ embeds: [embed] });
  }
}

export default UploadSchedule;
