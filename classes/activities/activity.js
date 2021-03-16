const { Guild, Collection, Role, CategoryChannel, TextChannel, MessageEmbed, Message, GuildMember, PermissionOverwriteOption } = require('discord.js');
const winston = require('winston');
const BotGuild = require('../../db/mongo/BotGuild');
const BotGuildModel = require('../bot-guild');
const { rolePrompt, messagePrompt, reactionPicker, chooseChannel } = require('../prompt');
const { deleteMessage, shuffleArray, sendMsgToChannel } = require('../../discord-services');
const StampsManager = require('../stamps-manager');
const Room = require('../room');

/**
 * @typedef ActivityInfo
 * @property {string} activityName - the name of this activity!
 * @property {Guild} guild - the guild where the new activity lives
 * @property {Collection<String, Role>} roleParticipants - roles allowed to view activity 
 * @property {BotGuildModel} botGuild
 */

/**
 * An object with a role and its permissions
 * @typedef RolePermission
 * @property {String} id - the role snowflake
 * @property {PermissionOverwriteOption} permissions - the permissions to set to that role
 */

/**
 * @typedef ActivityFeature
 * @property {String} emoji - the emoji as a string
 * @property {String} name
 * @property {String} description
 * @property {Function} callback
 */

/**
 * An activity is a overarching class for any kind of activity. An activity consists of a 
 * category with voice and text channels. Activities also have roles that have access to it.
 * @class
 */
class Activity {

    static voiceChannelName = '🔊Room-';
    static mainTextChannelName = '🖌️activity-banter';
    static mainVoiceChannelName = '🗣️activity-room';

    /**
     * Prompts a user for the roles that can have access to an activity.
     * @param {TextChannel} channel - the channel to prompt in
     * @param {String} userId - the user id to prompt
     * @param {Boolean} [isStaffAuto=false] - true if staff are added automatically
     * @returns {Promise<Collection<String, Role>>}
     * @async
     * @static
     */
    static async promptForRoleParticipants(channel, userId, isStaffAuto = false) {
        let allowedRoles = new Collection();
        
        try {
            allowedRoles = await rolePrompt({ prompt: `What roles${isStaffAuto ? ', aside from Staff,' : ''} will be allowed to view this activity? (Type "cancel" if none)`,
                channel, userId });
        } catch (error) {
            // nothing given is an empty collection viewable to admins only
        }

        // add staff role
        if (isStaffAuto) {
            let staffRoleId = (await BotGuild.findById(channel.guild.id)).roleIDs.staffRole;
            allowedRoles.set(staffRoleId, channel.guild.roles.resolve(staffRoleId));
        } 

        return allowedRoles;
    }

    /**
     * Constructor for an activity, will create the category, voice and text channel.
     * @constructor
     * @param {ActivityInfo} ActivityInfo 
     */
    constructor({activityName, guild, roleParticipants, botGuild}) {
        /**
         * The name of this activity.
         * @type {string}
         */
        this.name = activityName;

        /**
         * The guild this activity is in.
         * @type {Guild}
         */
        this.guild = guild;

        /**
         * The room this activity lives in.
         * @type {Room}
         */
        this.room = new Room(guild, botGuild, activityName, roleParticipants);

        /**
         * The message that holds the admin console.
         * @type {Message}
         */
        this.adminConsoleMsg;

        /**
         * The mongoose BotGuildModel Object
         * @type {BotGuildModel}
         */
        this.botGuild = botGuild;

        /**
         * All the features this activity has to show in the console.
         * @type {Collection<String, ActivityFeature>} - <Feature name, Feature>
         */
        this.features = new Collection();

        winston.loggers.get(guild.id).event(`An activity named ${this.name} was created.`, {data: {permissions: roleParticipants}});
    }


    /**
     * Initialize this activity by creating the channels, adding the features and sending the admin console.
     * @async
     * @returns {Promise<Activity>}
     */
    async init() {
        await this.room.init();

        this.addDefaultFeatures();

        await this.sendAdminConsole();

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was initialized.`, {event: "Activity"});
        return this;
    }


    /**
     * Adds the default features to the activity, these features are available to all activities.
     * @protected
     */
    addDefaultFeatures() {
        /** @type {ActivityFeature[]} */
        let localFeatures = [
            {
                name: 'Add Channel',
                description: 'Add one channel to the activity.',
                emoji: '⏫',
                callback: (user) => this.addChannel(this.adminConsoleMsg.channel, user.id),
            },
            {
                name: 'Remove Channel',
                description: 'Remove a channel, decide from a list.',
                emoji: '⏬',
                callback: (user) => this.removeChannel(this.adminConsoleMsg.channel, user.id),
            },
            {
                name: 'Delete', 
                description: 'Delete this activity and its channels.',
                emoji: '⛔',
                callback: () => this.delete(),
            },
            {
                name: 'Archive',
                description: 'Archive the activity, text channels are saved.',
                emoji: '💼',
                callback: () => {
                    let archiveCategory = this.guild.channels.resolve(this.botGuild.channelIDs.archiveCategory);
                    this.archive(archiveCategory);
                }
            },
            {
                name: 'Callback',
                description: 'Move all users in the activity\'s voice channels back to a specified voice channel.',
                emoji: '🔃',
                callback: (user) => this.voiceCallBack(this.adminConsoleMsg.channel, user.id),
            },
            {
                name: 'Shuffle',
                description: 'Shuffle all members from one channel to all others in the activity.',
                emoji: '🌬️',
                callback: (user) => this.shuffle(this.adminConsoleMsg.channel, user.id),
            },
            {
                name: 'Role Shuffle',
                description: 'Shuffle all the members with a specific role from one channel to all others in the activity.',
                emoji: '🦜',
                callback: (user) => this.roleShuffle(this.adminConsoleMsg.channel, user.id),
            },
            {
                name: 'Distribute Stamp',
                description: 'Send a emoji collector for users to get a stamp.',
                emoji: '🏕️',
                callback: (user) => this.distributeStamp(this.adminConsoleMsg.channel, user.id),
            },
            {
                name: 'Rules Lock',
                description: 'Lock the activity behind rules, users must agree to the rules to access the channels.',
                emoji: '🔒',
                callback: (user) => this.ruleValidation(this.adminConsoleMsg.channel, user.id),
            }
        ];

        localFeatures.forEach(feature => this.features.set(feature.name, feature));
    }


    /**
     * Creates the admin console containing the features.
     * @private
     * @async
     */
    async sendAdminConsole() {
        const adminConsoleEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle(`Activity ${this.name} console.`)
            .setDescription(`This activity's information can be found below, you can also find the features available.`);

        // add all the features
        this.features.forEach((feature, key, map) => {
            adminConsoleEmbed.addField(`${feature.emoji} ${feature.name}`, `${feature.description}`);
        });

        /** @type {TextChannel} */
        let adminConsoleChannel = this.guild.channels.resolve(this.botGuild.channelIDs.adminConsole);
        this.adminConsoleMsg = await adminConsoleChannel.send(adminConsoleEmbed);

        // add all the feature emojis
        this.features.forEach((feature, key, map) => this.adminConsoleMsg.react(feature.emoji));

        // reaction collector to call feature callbacks
        const adminConsoleCollector = this.adminConsoleMsg.createReactionCollector((creation, user) => !user.bot);
        adminConsoleCollector.on('collect', (reaction, user) => {
            let feature = this.features.find(feature => feature.emoji === reaction.emoji.name);

            if (feature) {
                feature.callback(user);
                winston.loggers.get(this.guild.id).event(`Feature ${feature.name} was triggered on activity ${this.name} by user ${user.id}.`, { event: "Activity" });
            }

            reaction.users.remove(user);
        });
    }

    /**
     * FEATURES FROM THIS POINT DOWN.
     */

    /**
     * Add a channel to the activity, prompts user for info and name.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     * @async
     */
    async addChannel(channel, userId) {
        // voice or text
        let option = await reactionPicker({ prompt: 'What type of channel do you want?', channel, userId }, new Collection([['🔊', {name: 'voice', description: 'A voice channel'}], ['✍️', {name: 'text', description: 'A text channel'}]]));
        // channel name
        let name = (await messagePrompt({ prompt: 'What is the name of the channel?', channel, userId }, 'string')).content;

        return await this.room.addRoomChannel({name, info: { type: option.name}});
    }

    /**
     * Removes a channel from the activity, the user will decide which. Wont delete channels in the safeChannel map.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     * @async
     */
    async removeChannel(channel, userId) {
        // channel to remove
        let removeChannel = await chooseChannel('What channel should be removed?', this.room.channels.category.children.array(), channel, userId);

        try {
            this.room.removeRoomChannel(removeChannel);
        } catch (error) {
            sendMsgToChannel(channel, userId, 'Can\'t remove that channel!', 10);
            return;
        }

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} lost a channel named ${removeChannel.name}`, { event: "Activity" });
    }

    /**
     * Archive the activity. Move general text channel to archive category, remove all remaining channels
     * and remove the category.
     * @param {CategoryChannel} archiveCategory - the category where the general text channel will be moved to
     * @async
     */
    async archive(archiveCategory) {
        await this.room.archive(archiveCategory);

        deleteMessage(this.adminConsoleMsg);

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was archived!`, {event: "Activity"});
    }

    /**
     * Delete all the channels and the category. Remove the workshop from firebase.
     * @async
     */
    async delete() {
        await this.room.delete();

        await deleteMessage(this.adminConsoleMsg);

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was deleted!`, {event: "Activity"});
    }

    /**
     * Move all users back to a specified voice channel from the activity's voice channels.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     */
    async voiceCallBack(channel, userId) {
        let mainChannel = await chooseChannel('What channel should people be moved to?', this.room.channels.voiceChannels.array(), channel, userId);

        this.room.channels.voiceChannels.forEach(channel => {
            channel.members.forEach(member => member.voice.setChannel(mainChannel));
        });

        winston.loggers.get(this.guild.id).event(`Activity named ${this.name} had its voice channels called backs to channel ${mainChannel.name}.`, {event: "Activity"});
    }

    /**
     * @callback ShuffleFilter
     * @param {GuildMember} member
     * @returns {Boolean} - true if filtered
    /**
     * Shuffle all the general voice members on all other voice channels
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     * @param {ShuffleFilter} [filter] - filter the users to shuffle
     * @async
     */
    async shuffle(channel, userId, filter) {
        let mainChannel = await chooseChannel('What channel should I move people from?', this.room.channels.voiceChannels.array(), channel, userId);

        let members = mainChannel.members;
        if (filter) members = members.filter(member => filter(member));
        
        let memberList = members.array();
        shuffleArray(memberList);

        let channels = this.room.channels.voiceChannels.filter(channel => channel.id != mainChannel.id).array();

        let channelsLength = channels.length;
        let channelIndex = 0;
        memberList.forEach(member => {
            try {
                member.voice.setChannel(channels[channelIndex % channelsLength]);
                channelIndex++;
            } catch (error) {
                winston.loggers.get(this.guild.id).warning(`Could not set a users voice channel when shuffling an activity by role. Error: ${error}`, { event: "Activity" })
            }
        });

        winston.loggers.get(this.guild.id).event(`Activity named ${this.name} had its voice channel members shuffled around!`, {event: "Activity"});
    }

    /**
     * Shuffles users with a specific role throughout the activity's voice channels
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     * @async
     */
    async roleShuffle(channel, userId) {
        try {
            var role = (await rolePrompt({ prompt: "What role would you like to shuffle?", channel, userId })).first();
        } catch (error) {
            winston.loggers.get(this.guild.id).warning(`User canceled a request when asking for a role for role shuffle. Error: ${error}.`, { event: "Activity" });
        }

        this.shuffle(channel, userId, (member) => member.roles.cache.has(role.id));
    }

    /**
     * Will let hackers get a stamp for attending the activity.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     */
    async distributeStamp(channel, userId) {
        
        // The users already seen by this stamp distribution.
        let seenUsers = new Collection();

        const promptEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle('React within ' + this.botGuild.stamps.stampCollectionTime + ' seconds of the posting of this message to get a stamp for ' + this.name + '!');

        // send embed to general text or prompt for channel
        let promptMsg
        if ((await this.room.channels.generalText.fetch(true))) promptMsg = await this.room.channels.generalText.send(promptEmbed);
        else {
            let stampChannel = await chooseChannel('What channel should the stamp distribution go?', this.room.channels.textChannels.array(), channel, userId);
            promptMsg = await stampChannel.send(promptEmbed);
        }
        
        promptMsg.react('👍');

        // reaction collector, time is needed in milliseconds, we have it in seconds
        const collector = promptMsg.createReactionCollector((reaction, user) => !user.bot, { time: (1000 * this.botGuild.stamps.stampCollectionTime) });

        collector.on('collect', async (reaction, user) => {
            // grab the member object of the reacted user
            const member = this.guild.member(user);

            if (!seenUsers.has(user.id)) {
                StampsManager.parseRole(member, this.name, this.botGuild);
                seenUsers.set(user.id, user.username);
            }
        });

        // edit the message to closed when the collector ends
        collector.on('end', () => {
            winston.loggers.get(this.guild.id).event(`Activity named ${this.name} stamp distribution has stopped.`, {event: "Activity"});
            if (!promptMsg.deleted) {
                promptMsg.edit(promptEmbed.setTitle('Time\'s up! No more responses are being collected. Thanks for participating in ' + this.name + '!'));
            }
        });
    }

    /**
     * Will lock the channels behind an emoji collector.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     */
    async ruleValidation(channel, userId) {

        let rulesChannel = await this.room.lockRoom();

        let rules = (await messagePrompt({ prompt: 'What are the activity rules?', channel, userId })).cleanContent;

        let joinEmoji = '🚗';

        const embed = new MessageEmbed().setTitle('Activity Rules').setDescription(rules).addField('To join the activity:', `React to this message with ${joinEmoji}`).setColor(this.botGuild.colors.embedColor);

        const embedMsg = await rulesChannel.send(embed);

        embedMsg.react(joinEmoji);

        const collector = embedMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === joinEmoji);

        collector.on('collect', (reaction, user) => {
            this.room.giveUserAccess(user);
            rulesChannel.updateOverwrite(user.id, { VIEW_CHANNEL: false});
        });
    }
}

module.exports = Activity;