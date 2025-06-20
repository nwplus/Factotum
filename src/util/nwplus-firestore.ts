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

const getFactotumBaseDocRef = () => {
  return db.collection("ExternalProjects").doc("Factotum");
};

export const getGuildDocRef = (guildId: string) => {
  return getFactotumBaseDocRef().collection("guilds").doc(guildId);
};
