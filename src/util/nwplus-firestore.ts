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

export const logToAdminLog = async (guild: Guild, message: string) => {
  const guildDocRef = getGuildDocRef(guild.id);
  const guildDocData = (await guildDocRef.get()).data() as GuildDoc;

  const adminLogChannel = guild.channels.cache.get(
    guildDocData.channelIds.adminLog,
  );
  if (!adminLogChannel || !adminLogChannel.isTextBased()) return;

  await adminLogChannel.send(message);
};
