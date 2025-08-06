import { SavedMessage } from "./common";

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
