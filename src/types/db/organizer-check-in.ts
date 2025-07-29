import { SavedMessage } from "./common";

export interface OrganizerCheckInDoc {
  /** Map of username to display name */
  organizerAttendance: {
    [username: string]: string;
  };
  savedMessage: SavedMessage;
}
