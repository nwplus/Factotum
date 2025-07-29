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
