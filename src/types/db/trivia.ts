import { SavedMessage } from "./common";

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
