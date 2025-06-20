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
