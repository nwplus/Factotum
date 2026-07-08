import { Timestamp } from "firebase-admin/firestore";

// Metadata
export interface ShiftScheduleDoc {
  active: boolean;
  lastUpdated: Timestamp;
  /** Reserved for later PRs — default channel for reminder pings. */
  defaultChannelId?: string;
}

export interface ShiftDoc {
  startTime: Timestamp;
  durationMinutes: number;
  location: string;
  description: string;
  organizerEmails: string[];
  shiftLeadEmails: string[];
  // Populated in a later PR once emails are resolved to Discord IDs
  organizerIds: string[];
  shiftLeadIds: string[];
  // Optional per-shift channel override for the reminder ping
  channelId?: string;
  // Optional link shown in the reminder
  link?: string;
  pingSent: boolean;
  completed: boolean;
}
