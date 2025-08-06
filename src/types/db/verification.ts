import { Timestamp } from "firebase-admin/firestore";

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

/** Created at time of verification since we pull valid hackers from hackathon doc */
export interface HackersDoc {
  discordId: string;
  verifiedTimestamp: Timestamp;
}

/** Manually created beforehand by organizers */
export interface OtherAttendeesDoc {
  roles: string[];
  email: string;
  discordId?: string;
  verifiedTimestamp?: Timestamp;
}
