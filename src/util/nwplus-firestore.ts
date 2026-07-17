import { GuildDoc } from "@/types/db/guild";

import { Guild } from "discord.js";

import { db } from "./firestore";

export const getFactotumBaseDocRef = () => {
  return db.collection("ExternalProjects").doc("Factotum");
};

export const getGuildDocRef = (guildId: string) => {
  return getFactotumBaseDocRef().collection("guilds").doc(guildId);
};

export const getHackathonDocRef = (hackathonName: string) => {
  return db.collection("Hackathons").doc(hackathonName);
};

// The lowercase `hackathons` collection holds Notion-synced automation data
// (written by Functions-new), distinct from `Hackathons` above which holds
// application data. Its doc IDs follow the same naming as GuildDoc.hackathonName
// (e.g. "cmd-f2026") — that field is how a guild finds its shifts.
export const getHackathonShiftsRef = (hackathonId: string) => {
  return db.collection("hackathons").doc(hackathonId).collection("shifts");
};

export const getShiftRemindersRef = (hackathonId: string) => {
  return db.collection("hackathons").doc(hackathonId).collection("reminders");
};

export const getOrganizerMappingDocRef = (normalizedEmail: string) => {
  return db.collection("organizerMappings").doc(normalizedEmail);
};

export const logToAdminLog = async (guild: Guild, message: string) => {
  const guildDocRef = getGuildDocRef(guild.id);
  const guildDocData = (await guildDocRef.get()).data() as GuildDoc;

  const adminLogChannel = guild.channels.cache.get(
    guildDocData.channelIds.adminLog,
  );
  if (!adminLogChannel || !adminLogChannel.isTextBased()) return;

  await adminLogChannel.send(message);
};
