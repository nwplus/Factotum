const { Collection, Snowflake } = require('discord.js');

module.exports = class BotGuild {

    /**
     * @typedef RoleIDs
     * @property {String} memberRole - regular guild member role ID
     * @property {String} staffRole - the staff role ID
     * @property {String} adminRole - the admin role ID
     * @property {String} everyoneRole - the everyone role ID
     */

     /**
      * @typedef ChannelIDs
      * @property {String} adminConsole - the admin console channel ID
      * @property {String} adminLog - the admin log channel ID
      * @property {String} botSupportChannel - the bot support channel ID
      */

    /**
     * @typedef VerificationInfo
     * @property {Boolean} isEnabled - true if verification is enabled
     * @property {String} isVerifiedRoleID - the verified role ID that holds basic permissions
     * @property {String[]} isVerifiedRolePermissions - the permissions for the isVerified role
     * @property {String} guestRoleID - the guest role ID used for verification
     * @property {String} welcomeChannelID -  the welcome channel where users learn to verify
     * @property {String} welcomeSupportChannelID - the support channel where the bot can contact users
     */

    /**
     * @typedef AttendanceInfo
     * @property {Boolean} isEnabled - true if attendance is enabled in this guild
     * @property {String} attendeeRoleID - the attendee role ID used for attendance
     */

    /**
     * @typedef StampInfo
     * @property {Boolean} isEnabled - true if stamps are enabled
     * @property {Collection<Number, String>} stampRoleIDs - <StampNumber, roleID>
     * @property {Number} stampCollectionTime - time given to users to collect password stamps
     */

    /**
     * @typedef ReportInfo
     * @property {Boolean} isEnabled - true if the report functionality is enabled
     * @property {String} incomingReportChannelID - channel where reports are sent
     */

    /**
     * Creates a new Bot Guild.
     * @param {String} guildID - the guild ID this new Bot Guild is associated to.
     */
    constructor(guildID) {

        /**
         * The Bot Guild roles
         * @type {RoleIDs}
         */
        this.roleIDs = {
            memberRole : null,
            staffRole : null,
            adminRole : null,
            everyoneRole : null,
        }

        /**
         * Permissions for important/common roles.
         */
        this.permissions = {
            /**
             * Staff role permissions.
             * @type {String[]}
             */
            staffPermissions : ['VIEW_CHANNEL', 'MANAGE_EMOJIS', 'CHANGE_NICKNAME', 'MANAGE_NICKNAMES', 
            'KICK_MEMBERS', 'BAN_MEMBERS', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 
            'READ_MESSAGE_HISTORY', 'CONNECT', 'STREAM', 'SPEAK', 'PRIORITY_SPEAKER', 'USE_VAD', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS'],
            
            /**
             * Admin role permissions.
             * @type {String[]}
             */
            adminPermissions: ['ADMINISTRATOR'],
        }

        /**
         * The common channels for this bot guild.
         * @type {ChannelIDs}
         */
        this.channelIDs = {
            adminConsole : null,
            adminLog : null,
            botSupportChannel : null,
        }

        /**
         * The verification information.
         * @type {VerificationInfo}
         */
        this.verification = {
            isEnabled : false,
            isVerifiedRoleID : null,
            isVerifiedRolePermissions : ['VIEW_CHANNEL', 'CHANGE_NICKNAME', 'SEND_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY',
            'CONNECT', 'SPEAK', 'STREAM', 'USE_VAD'],
            guestRoleID : null,
            welcomeChannelID : null,
            welcomeSupportChannelID : null,
        }

        /**
         * The attendance information.
         * @type {AttendanceInfo}
         */
        this.attendance = {
            isEnabled : false,
            attendeeRoleID : null,
        }

        /**
         * The stamps information.
         * @type {StampInfo}
         */
        this.stamps = {
            isEnabled : false,
            stampRoleIDs : new Collection(),
            stampCollectionTime : 60,
        }

        /**
         * The report information.
         * @type {ReportInfo}
         */
        this.report = {
            isEnabled : false,
            incomingReportChannelID : null,
        }

        /**
         * A list of channels where messages will get deleted after x amount of time
         * @type {Map<Snowflake, Number>} - <text channel snowflake, Number>
         */
        this.blackList = new Collection();

        /**
         * All the caves this guild has active.
         * @type {Collection<String, Cave>} - <Cave Name, Cave>
         */
        this.caves = new Collection();

        /**
         * All the custom colors available to the bot.
         * @type {Object}
         */
        this.colors = {
            embedColor : '#26fff4',
            questionEmbedColor : '#f4ff26',
            announcementEmbedColor : '#9352d9',
            tfTeamEmbedColor : '#60c2e6',
            tfHackerEmbedColor : '#d470cd',
            specialDMEmbedColor : '#fc6b03',
        }

        /**
         * The guild this Bot Guild belongs to.
         * @type {Snowflake}
         */
        this.guildID = guildID

        /**
         * The first console available to admins. Holds general bot information.
         */
        this.mainConsoleMsg;

    }


}