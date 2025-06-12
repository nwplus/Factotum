import { db } from "./firestore";

export interface GuildDoc {
  setupComplete: boolean;
  roleIds: {
    admin: string;
    member: string;
    mentor: string;
  };
  channelIds: {
    adminConsole: string;
    adminLog: string;
  };
}

export interface FactotumDoc {
  guilds: {
    [guildId: string]: GuildDoc;
  };
}

interface CommandDataDoc {
  mentorCave: {};
}

const getFactotumBaseDocRef = () => {
  return db.collection("ExternalProjects").doc("Factotum");
};

export const getGuildDocRef = (guildId: string) => {
  return getFactotumBaseDocRef().collection("guilds").doc(guildId);
};
