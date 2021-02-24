import { Document } from 'mongoose'
import Cave from '../classes/cave'

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
        botSupportChannel: String,
    },

    verification: {
        /** @required */
        isEnabled: Boolean,
        guestRoleID: String,
        welcomeChannelID: String,
        welcomeSupportChannelID: String,
        /** <Type, RoleId> */
        verificationRoles: Map<String, String>
    },

    attendance: {
        /** @required */
        isEnabled: Boolean,
        attendeeRoleID: String,
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

    report: {
        /** @required */
        isEnabled: Boolean,
        incomingReportChannelID: String,
    },

    announcement: {
        /** @required */
        isEnabled: Boolean,
        announcementChannelID: String,
    },

    ask: {
        /** @required */
        isEnabled: Boolean,
    },

    /**
     * This is some text
     */
    blackList: Map<String, Number>,

    /**
     * The caves created in this guild.
     */
    caves: Map<String, Cave>,

    /**
     * An object with some nice colors to use!
     */
    colors: {
        /** @hexColor */
        embedColor: String,
        /** @hexColor */
        questionEmbedColor: String,
        /** @hexColor */
        announcementEmbedColor: String,
        /** @hexColor */
        tfTeamEmbedColor: String,
        /** @hexColor */
        tfHackerEmbedColor: String,
        /** @hexColor */
        specialDMEmbedColor: String, 
    },

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