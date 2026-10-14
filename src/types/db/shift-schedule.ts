import { Timestamp } from "firebase-admin/firestore";

/**
 * A shift at hackathons/{hackathonId}/shifts/{notionPageId}, written by the
 * Notion→Firestore sync (Functions-new). Notion is the only source of truth
 * for the schedule, so Factotum treats these documents as read-only.
 */
export interface OrganizerShiftDoc {
  notionPageId: string;
  title: string;
  description?: string;
  location?: string;
  notionUrl?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  organizerEmails: string[];
  leadOrganizerEmails: string[];
  updatedAt: Timestamp;
}

/**
 * Reminder state at hackathons/{hackathonId}/reminders/{shiftId}, owned by
 * Factotum. Kept in a separate collection so Notion sync upserts can never
 * reset whether a reminder was already sent. A missing doc means "not sent".
 */
export interface ShiftReminderDoc {
  reminderSent: boolean;
  sentAt?: Timestamp;
  lastAttemptAt?: Timestamp;
  lastError?: string;
}

/**
 * Optional per-guild reminder settings at command-data/shift-schedule.
 * Both fields are manual escape hatches, set directly in Firestore.
 */
export interface ShiftReminderConfigDoc {
  /** Overrides the #shift-reminders channel-name convention. */
  reminderChannelId?: string;
  /** Stops all reminder pings for the guild without shutting the bot down. */
  paused?: boolean;
}
