import { Guild } from "discord.js";

import { db } from "./firestore";

export interface GuildDoc {
  setupComplete: boolean;
  hackathonName: string;
  roleIds: {
    admin: string;
    staff: string;
    verified: string;
    unverified: string;
  };
  /** Guaranteed to be guild text-based channels */
  channelIds: {
    adminConsole: string;
    adminLog: string;
  };
}

interface SavedMessage {
  messageId: string;
  channelId: string;
}

export interface VerificationDoc {
  extraRoles: {
    [roleName: string]: string;
  };
  roleIds: {
    hacker: string;
    sponsor: string;
    mentor: string;
    organizer: string;
    photographer: string;
    volunteer: string;
  };
}

export interface HackersDoc {
  applicantId: string;
}

export interface OtherAttendeesDoc {
  roles: string[];
  email: string;
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

export interface TicketDoc {
  unansweredTicketTime: number;
  currentTicketCount: number;
  extraSpecialties: {
    [emoji: string]: string;
  };
  roleIds: {
    requestTicketRole: string;
  };
  channelIds: {
    incomingTicketsChannel: string;
  };
  savedMessages: {
    mentorSpecialtySelection: SavedMessage;
    requestTicket: SavedMessage;
  };
}

const htmlCssEmoji = "💻";
const jsTsEmoji = "🕸️";
const pythonEmoji = "🐍";
const sqlEmoji = "🐬";
const reactEmoji = "⚛️";
const noSqlEmoji = "🔥";
const javaEmoji = "☕";
const cEmoji = "🎮";
const cSharpEmoji = "💼";
const reduxEmoji = "☁️";
const figmaEmoji = "🎨";
const unityEmoji = "🧊";
const rustEmoji = "⚙️";
const awsEmoji = "🙂";
const ideationEmoji = "💡";
const pitchingEmoji = "🎤";

export const MENTOR_SPECIALTIES_MAP = new Map([
  [htmlCssEmoji, "HTML/CSS"],
  [jsTsEmoji, "JavaScript/TypeScript"],
  [pythonEmoji, "Python"],
  [sqlEmoji, "SQL"],
  [reactEmoji, "React"],
  [noSqlEmoji, "NoSQL"],
  [javaEmoji, "Java"],
  [cEmoji, "C/C++"],
  [cSharpEmoji, "C#"],
  [reduxEmoji, "Redux"],
  [figmaEmoji, "Figma"],
  [unityEmoji, "Unity"],
  [rustEmoji, "Rust"],
  [awsEmoji, "AWS"],
  [ideationEmoji, "Ideation"],
  [pitchingEmoji, "Pitching"],
]);

export interface TriviaDoc {
  interval: number;
  paused: boolean;
  askedQuestions: string[];
  roleIds: {
    notify: string;
  };
  savedMessages: {
    triviaInfoMessage: SavedMessage;
    triviaControlPanelMessage: SavedMessage;
  };
}

export interface TriviaQuestionDoc {
  question: string;
  /** Leave undefined if answer should be selected by manual review */
  answers?: string[];
  needAllAnswers?: boolean;
}

export interface TriviaLeaderboardDoc {
  score: number;
  answeredQuestions: string[];
}

export const getFactotumBaseDocRef = () => {
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
