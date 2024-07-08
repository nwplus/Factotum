const { Collection, TextChannel, Role, MessageEmbed, CategoryChannel, Guild } = require('discord.js');
// const { CommandoClient, CommandoGuild } = require('discord.js-commando');
const {SapphireClient} = require('@sapphire/framework')
const winston = require('winston');
const discordServices = require('../../discord-services');

/**
 * @class
 */
class BotGuild {

    
    /**
     * Staff role permissions.
     * @type {String[]}
     */
    static staffPermissions = ['VIEW_CHANNEL', 'CHANGE_NICKNAME', 'MANAGE_NICKNAMES', 
    'KICK_MEMBERS', 'BAN_MEMBERS', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 
    'READ_MESSAGE_HISTORY', 'CONNECT', 'STREAM', 'SPEAK', 'PRIORITY_SPEAKER', 'USE_VAD', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS'];

    /**
     * Admin role permissions.
     * @type {String[]}
     */
    static adminPermissions = ['ADMINISTRATOR'];

    /**
     * The regular member perms.
     * @type {String[]}
     */
    static memberPermissions = ['VIEW_CHANNEL', 'CHANGE_NICKNAME', 'SEND_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY',
    'CONNECT', 'SPEAK', 'STREAM', 'USE_VAD'];

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
     * Will set the minimum required information for the bot to work on this guild.
     * @param {BotGuildInfo} botGuildInfo 
     * @param {SapphireClient} client
     * @returns {Promise<BotGuild>}
     * @async
     */
    async readyUp(guild, botGuildInfo) {
        this.roleIDs = botGuildInfo.roleIDs;
        this.channelIDs = botGuildInfo.channelIDs;
        this.embedColor = botGuildInfo.embedColor;

        let adminRole = await guild.roles.resolve(this.roleIDs.adminRole);
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
        let staffRole = await guild.roles.resolve(this.roleIDs.staffRole);
        staffRole.setMentionable(true);
        staffRole.setHoist(true);
        staffRole.setPermissions(staffRole.permissions.add(BotGuild.staffPermissions));

        // regular member role setup
        let memberRole = await guild.roles.resolve(this.roleIDs.memberRole);
        memberRole.setMentionable(true);
        memberRole.setPermissions(memberRole.permissions.add(BotGuild.memberPermissions));

        // mentor role setup
        let mentorRole = await guild.roles.resolve(this.roleIDs.mentorRole);
        mentorRole.setMentionable(true);
        mentorRole.setPermissions(mentorRole.permissions.add(BotGuild.memberPermissions));

        // change the everyone role permissions, we do this so that we can lock rooms. For users to see the server when 
        // verification is off, they need to get the member role when greeted by the bot!
        // guild.roles.everyone.setPermissions(0); // no permissions for anything like the guest role

        this.isSetUpComplete = true;

        winston.loggers.get(this.id).event(`The botGuild has run the ready up function.`, {event: "Bot Guild"});

        return this;
    }

    /**
     * @typedef VerificationChannels
     * @property {String} welcomeChannelID
     * @property {String} welcomeChannelSupportID
     */

    /**
     * @typedef TypeInfo
     * @property {String} type
     * @property {String} roleId
     */

    /**
     * Will set up the verification process.
     * @param {SapphireClient} client 
     * @param {String} guestRoleId
     * @param {TypeInfo[]} types
     * @param {VerificationChannels} [verificationChannels]
     * @return {Promise<BotGuild>}
     * @async
     */
    async setUpVerification(guild, guestRoleId, types, welcomeSupportChannel) {
        // guestRole.setMentionable(false);
        // guestRole.setPermissions(0);
        this.verification.guestRoleID = guestRoleId;

        this.verification.welcomeSupportChannelID = welcomeSupportChannel;
        // add the types to the type map.
        types.forEach(async (type, index, list) => {
            try {
                await guild.roles.resolve(type.roleId);
                this.verification.verificationRoles.set(type.name.toLowerCase(), type.roleId);
            } catch (error) {
                throw new Error('The given verification role ID is not valid for this guild!');
            }
        });
        
        this.verification.isEnabled = true;
        // guild.setCommandEnabled('verify', true);
        return this;
    }

    /**
     * Creates the stamps roles and adds them to this BotGuild. If stamps roles are given 
     * then no roles are created!
     * @param {SapphireClient} client 
     * @param {Number} [stampAmount] - amount of stamps to create
     * @param {Number} [stampCollectionTime] - time given to users to send password to get stamp
     * @param {String[]} [stampRoleIDs] - current stamp roles to use
     * @returns {Promise<BotGuild>}
     * @async
     */
    // async setUpStamps(client, stampAmount = 0, stampCollectionTime = 60, stampRoleIDs = []) {
    //     let guild = await client.guilds.resolve(this.id);

    //     if (stampRoleIDs.length > 0) {
    //         stampRoleIDs.forEach((ID, index, array) => {
    //             this.addStamp(ID, index);
    //         });
    //         winston.loggers.get(this.id).event(`The botGuild has set up the stamp functionality. The stamp roles were given. Stamp collection time is set at ${stampCollectionTime}.` [{stampIds: stampRoleIDs}]);
    //     } else {
    //         for (let i = 0; i < stampAmount; i++) {
    //             let role = await guild.roles.create({
    //                 data: {
    //                     name: 'Stamp Role #' + i,
    //                     hoist: true,
    //                     color: discordServices.randomColor(),
    //                 }
    //             });

    //             this.addStamp(role.id, i);
    //         }
    //         winston.loggers.get(this.id).event(`The botGuild has set up the stamp functionality. Stamps were created by me, I created ${stampAmount} stamps. Stamp collection time is set at ${stampCollectionTime}.`, {event: "Bot Guild"});
    //     }

    //     this.stamps.stampCollectionTime = stampCollectionTime;
    //     this.stamps.isEnabled = true;

    //     // this.setCommandStatus(client);

    //     return this;
    // }

    /**
     * Adds a stamp to the stamp collection. Does not save the mongoose document!
     * @param {String} roleId 
     * @param {Number} stampNumber 
     */
    addStamp(roleId, stampNumber) {
        if (stampNumber === 0) this.stamps.stamp0thRoleId = roleId;
        this.stamps.stampRoleIDs.set(roleId, stampNumber);
        winston.loggers.get(this.id).event(`The botGuild has added a stamp with number ${stampNumber} linked to role id ${roleId}`, {event: "Bot Guild"});
    }

    /**
     * Will enable and disable the appropriate commands by looking at what is enabled in the botGuild.
     * @param {SapphireClient} client
     * @async 
     */
    async setCommandStatus(client) {
        /** @type {SapphireClient.Guild} */
        let guild = await client.guilds.resolve(this.id);

        // guild.setGroupEnabled('verification', this.verification.isEnabled);
        // guild.setGroupEnabled('attendance', this.attendance.isEnabled);

        // guild.setGroupEnabled('stamps', this.stamps.isEnabled);

        // guild.setCommandEnabled('report', this.report.isEnabled);
        // guild.setCommandEnabled('ask', this.ask.isEnabled);
        // guild.setGroupEnabled('hacker_utility', this.ask.isEnabled || this.report.isEnabled);
        
        // client.registry.groups.forEach((group, key, map) => {
        //     if (group.id.startsWith('a_')) guild.setGroupEnabled(group, this.isSetUpComplete);
        // });

        winston.loggers.get(guild.id).verbose(`Set the command status of guild ${guild.name} with id ${guild.id}`);
    }
}
module.exports = BotGuild;