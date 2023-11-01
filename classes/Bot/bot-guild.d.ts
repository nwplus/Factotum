import { Document } from 'mongoose'
import Cave from './activities/cave'

/**
 * @interface BotGuild
 */
interface BotGuild extends Document {
    /**
     * The basic roles for any botGuild. Given as snowflakes (ids).
     */
    roleIDs: {
        memberRole: String,
        staffRole: String,
        adminRole: String,
        everyoneRole: String,
    },

    channelIDs: {
        adminConsole: String,
        adminLog: String,
        botSpamChannel: String,
        incomingTicketsChannel: String,
        mentorRoleSelectionChannel: String,
        requestTicketChannel: String
    },

    verification: {
        /** @required */
        isEnabled: Boolean,
        guestRoleID: String,
        welcomeSupportChannelID: String,
        /** <Type, RoleId> */
        verificationRoles: Map<String, String>
    },

    stamps: {
        /** @required */
        isEnabled: Boolean,
        /** <RoleId, Stamp Number> */
        stampRoleIDs: Map<String, Number>,
        /** The first stamp role Id given to all users */
        stamp0thRoleId: Number,
        stampCollectionTime: Number,
    },

    /** @hexColor */
    embedColor: String,
    /**
     * The botGuild id must equal the guild id
     * @required
     */
    _id: String,

    /**
     * True if the bot has been set up and its ready to hack!
     */
    isSetUpComplete: Boolean,

    /**
     * Will set the minimum required information for the bot to work on this guild.
     * @param {BotGuildInfo} botGuildInfo 
     * @param {CommandoClient} client
     * @returns {Promise<BotGuild>}
     * @async
     */
    async readyUp(client, botGuildInfo);

    /**
     * Staff role permissions.
     * @static
     */
    static staffPermissions: String[];

    /**
     * Admin role permissions.
     * @static
     */
    static adminPermissions: String[];

    /**
     * The regular member perms.
     * @static
     */
    static memberPermissions: String[];
}

let botGuild: BotGuild;

export = botGuild;