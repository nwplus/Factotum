const { Collection, Snowflake, Guild, TextChannel, Role, GuildAuditLogs } = require('discord.js');
const { CommandoClient, CommandoGuild } = require('discord.js-commando');

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
     * @typedef AnnouncementInfo
     * @property {Boolean} isEnabled
     * @property {String} announcementChannelID
     */

    /**
     * @typedef BotGuildInfo
     * @property {RoleIDs} roleIDs
     * @property {ChannelIDs} channelIDs
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

            /**
             * The regular member perms.
             * @type {String[]}
             */
            memberPermissions : ['VIEW_CHANNEL', 'CHANGE_NICKNAME', 'SEND_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY',
            'CONNECT', 'SPEAK', 'STREAM', 'USE_VAD'],
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
         * The announcement information.
         * @type {AnnouncementInfo}
         */
        this.announcement = {
            isEnabled : false,
            announcementChannelID: null,
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
        this.guildID = guildID;

        /**
         * The first console available to admins. Holds general bot information.
         */
        this.mainConsoleMsg = null;

        /**
         * True if the bot is ready and the commands are available to this guild. False otherwise.
         * @type {Boolean}
         */
        this.isSetUpCompete = false;
    }

    /**
     * Validate the information.
     * @param {BotGuildInfo} botGuildInfo - the information to validate
     * @throws Error if the botGuildInfo is incomplete
     */
    validateBotGuildInfo(botGuildInfo) {
        if (typeof botGuildInfo != Object) throw new Error('The bot guild information is required!');
        if (!botGuildInfo?.roleIDs || !botGuildInfo?.roleIDs?.adminRole || !botGuildInfo?.roleIDs?.everyoneRole
            || !botGuildInfo?.roleIDs?.memberRole || !botGuildInfo?.roleIDs?.staffRole) throw new Error('All the role IDs are required!');
        if (!botGuildInfo?.channelIDs || !botGuildInfo?.channelIDs?.adminConsole || !botGuildInfo?.channelIDs?.adminLog
            || !botGuildInfo?.channelIDs?.botSupportChannel) throw new Error('All the channel IDs are required!');
    }

    /**
     * Will set the minimum required information for the bot to work on this guild.
     * @param {BotGuildInfo} botGuildInfo 
     * @param {CommandoClient} client
     */
    readyUp(botGuildInfo, client) {
        this.validateBotGuildInfo(botGuildInfo);

        this.roleIDs = botGuildInfo.roleIDs;
        this.channelIDs = botGuildInfo.channelIDs;

        let guild = await client.guilds.fetch(this.guildID);

        let adminRole = await guild.roles.fetch(this.roleIDs.adminRole);
        // try giving the admins administrator perms
        try {
            if (!adminRole.permissions.has('ADMINISTRATOR')) 
            {
                adminRole.setPermissions(adminRole.permissions.add(['ADMINISTRATOR']));
                await adminRole.setMentionable(true);
            }
        } catch {
            discordServices.discordLog(guild, 'Was not able to give administrator privileges to the role <@&' + adminRole.id + '>. Please help me!')
        }

        // staff role set up
        let staffRole = await guild.roles.fetch(this.roleIDs.staffRole);
        staffRole.setMentionable(true);
        staffRole.setHoist(true);
        staffRole.setPermissions(staffRole.permissions.add(this.permissions.staffPermissions));

        // regular member role setup
        let memberRole = await guild.roles.fetch(this.roleIDs.memberRole);
        memberRole.setMentionable(false);
        memberRole.setPermissions(memberRole.permissions.add(this.permissions.memberPermissions));

        // change the everyone role permissions
        guild.roles.everyone.setPermissions(0); // no permissions for anything like the guest role

        // make sure admin channels are only for admins
        let adminCategory = guild.channels.resolve(this.channelIDs.adminConsole).parent
        adminCategory.overwritePermissions([
            {
                id: adminRole.id,
                allow: 'VIEW_CHANNEL'
            },
            {
                id: everyoneRole.id,
                deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'CONNECT']
            }
        ]);
        adminCategory.children.forEach(channel => channel.lockPermissions());

        this.isSetUpCompete = true;
    }

    /**
     * Will create the admin channels with the correct roles.
     * @param {Guild} guild 
     * @param {Role} adminRole 
     * @param {Role} everyoneRole 
     * @returns {Promise<{TextChannel, TextChannel}>} - {Admin Console, Admin Log Channel}
     * @static
     */
    static async createAdminChannels(guild, adminRole, everyoneRole) {
        let adminCategory = await guild.channels.create('Admins', {
            type: 'category',
            permissionOverwrites: [
                {
                    id: adminRole.id,
                    allow: 'VIEW_CHANNEL'
                },
                {
                    id: everyoneRole.id,
                    deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'CONNECT']
                }
            ]
        });

        let adminConsoleChannel = await guild.channels.create('console', {
            type: 'text',
            parent: adminCategory,
        });

        let adminLogChannel = await guild.channels.create('logs', {
            type: 'text',
            parent: adminCategory,
        });

        return {adminConsoleChannel, adminLogChannel};
    }

    /**
     * Will set up the verification process.
     * @param {CommandoClient} client 
     * @param {String} guestRoleID
     * @return {BotGuild}
     */
    setUpVerification(client, guestRoleID) {
        /** @type {CommandoGuild} */
        let guild = client.guilds.resolve(this.guildID);

        try {
            var guestRole = await guild.roles.fetch(guestRoleID);
        } catch (error) {
            throw new Error('The given guest role ID is not valid for this guild!');
        }
        guestRole.setMentionable(false);
        guestRole.setPermissions(0);
        this.verification.guestRoleID = guestRoleID;

        let welcomeCategory = await guild.channels.create('Welcome', {
            type: 'category',
            permissionOverwrites: [
                {
                    id: this.roleIDs.everyoneRole,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                },
                {
                    id: this.roleIDs.memberRole,
                    deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                },
            ],
        });

        let welcomeChannel = await guild.channels.create('welcome', {
            type: 'text',
            parent: welcomeCategory,
        });

        // update welcome channel to not send messages
        welcomeChannel.updateOverwrite(this.roleIDs.everyoneRole, {
            SEND_MESSAGES: false,
        });

        let welcomeChannelSupport = await guild.channels.create('welcome-support', {
            type: 'text',
            parent: welcomeCategory,
        });

        const embed = new Discord.MessageEmbed().setTitle('Welcome to the ' + guild.name + ' Discord server!')
            .setDescription('In order to verify that you have registered for ' + guild.name + ', please respond to the bot (me) via DM!')
            .addField('Do you need assistance?', 'Head over to the welcome-support channel and ping the admins!')
            .setColor(this.colors.embedColor);
        welcomeChannel.send(embed).then(msg => msg.pin());

        this.verification.welcomeChannelID = welcomeChannel.id;
        this.verification.welcomeSupportChannelID = welcomeChannelSupport.id;
        this.verification.isEnabled = true;
        guild.setCommandEnabled('verify', true);

        return this;
    }

    /**
     * Sets up the attendance functionality.
     * @param {CommandoClient} client 
     * @param {String} attendeeRoleID
     * @returns {BotGuild}
     */
    setUpAttendance(client, attendeeRoleID) {
        this.attendance.attendeeRoleID = attendeeRoleID;
        this.attendance.isEnabled = true;
        /** @type {CommandoGuild} */
        let guild = await client.guilds.fetch(this.guildID);
        guild.setCommandEnabled('start-attend', true);
        return this;
    }

    /**
     * Will set up the firebase announcements.
     * @param {CommandoClient} client 
     * @param {String} announcementChannelID
     */
    setUpAnnouncements(client, announcementChannelID) {
        /** @type {CommandoGuild} */
        let guild = client.guilds.fetch(this.guildID);
        
        let announcementChannel = guild.channels.resolve(announcementChannelID);
        if (!announcementChannel) throw new Error('The announcement channel ID is not valid for this guild!');

        this.announcement.isEnabled = true;
        this.announcement.announcementChannelID = announcementChannelID;

        // TODO Firebase setup 
        // start query listener for announcements
        // nwFirebase.firestore().collection('Hackathons').doc('nwHacks2021').collection('Announcements').onSnapshot(querySnapshot => {
        //     // exit if we are at the initial state
        //     if (isInitState) {
        //         isInitState = false;
        //         return;
        //     }

        //     querySnapshot.docChanges().forEach(change => {
        //         if (change.type === 'added') {
        //             const embed = new Discord.MessageEmbed()
        //                 .setColor(discordServices.colors.announcementEmbedColor)
        //                 .setTitle('Announcement')
        //                 .setDescription(change.doc.data()['content']);

        //             announcementChannel.send('<@&' + discordServices.roleIDs.attendeeRole + '>', { embed: embed });
        //         }
        //     });
        // });
    }

    

}