import { SavedMessage } from "./common";

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
