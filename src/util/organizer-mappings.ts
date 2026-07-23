import { OrganizerMappingDoc } from "@/types/db/organizer-mapping";
import { db } from "@/util/firestore";
import { getOrganizerMappingDocRef } from "@/util/nwplus-firestore";

/** Normalization used for organizerMappings doc IDs and all email comparisons */
export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

/**
 * Whether a normalized email can be an organizerMappings doc ID — Firestore
 * rejects path separators and oversized IDs, and Notion organizer fields are
 * free text, so junk like "n/a" must not crash a whole shift's resolution.
 */
export const isMappableEmail = (email: string): boolean =>
  email.length > 0 && email.length <= 320 && !email.includes("/");

/**
 * Resolves emails to Discord user IDs via organizerMappings. Emails without a
 * mapping (or that can't be looked up) stay unresolved — callers decide
 * whether to log or surface them.
 */
export const resolveOrganizerIds = async (
  emails: string[],
): Promise<{ ids: string[]; unresolvedEmails: string[] }> => {
  const normalized = [...new Set(emails.map(normalizeEmail))].filter(Boolean);
  const mappable = normalized.filter(isMappableEmail);
  const unresolvedEmails = normalized.filter(
    (email) => !isMappableEmail(email),
  );
  if (mappable.length === 0) return { ids: [], unresolvedEmails };

  // Mapping doc IDs are the normalized emails themselves, so this is a single
  // batched read — no queries needed.
  const snapshots = await db.getAll(...mappable.map(getOrganizerMappingDocRef));
  const ids = new Set<string>();
  snapshots.forEach((snapshot, index) => {
    const mapping = snapshot.data() as OrganizerMappingDoc | undefined;
    if (mapping?.discordUserId) ids.add(mapping.discordUserId);
    else unresolvedEmails.push(mappable[index]);
  });
  return { ids: [...ids], unresolvedEmails };
};
