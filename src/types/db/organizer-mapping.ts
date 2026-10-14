import { Timestamp } from "firebase-admin/firestore";

/**
 * An email→Discord link at organizerMappings/{normalizedEmail}, written by
 * /link-email. The doc ID is the normalized (trimmed, lowercased) email, so
 * lookups are direct doc reads. Global rather than guild-scoped because
 * Notion Person fields usually carry personal emails, which stay the same
 * across hackathons.
 */
export interface OrganizerMappingDoc {
  email: string;
  discordUserId: string;
  linkedAt: Timestamp;
}
