import { Guild } from "discord.js";

import { db } from "./firestore";

export interface GuildDoc {
  setupComplete: boolean;
  hackathonName: string;
  roleIds: {
    admin: string;
    staff: string;
    mentor: string;
    hacker: string;
    verified: string;
    unverified: string;
  };
  channelIds: {
    adminConsole: string;
    adminLog: string;
  };
}

interface CommandDataCollection {
  mentorCave: {};
}

interface SavedMessage {
  messageId: string;
  channelId: string;
}

export interface VerificationDoc {
  roleIds: {
    hacker: string;
    sponsor: string;
    mentor: string;
    organizer: string;
    photographer: string;
    volunteer: string;
  };
  savedMessage: SavedMessage;
}

export interface PronounsDoc {
  roleIds: {
    heHimRole: string;
    sheHerRole: string;
    theyThemRole: string;
    otherRole: string;
  };
  savedMessage: SavedMessage;
}

export const PRONOUN_REACTION_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

const getFactotumBaseDocRef = () => {
  return db.collection("ExternalProjects").doc("Factotum");
};

export const getGuildDocRef = (guildId: string) => {
  return getFactotumBaseDocRef().collection("guilds").doc(guildId);
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
