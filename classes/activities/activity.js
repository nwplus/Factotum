const { Guild, Collection, Role, CategoryChannel, VoiceChannel, TextChannel, OverwriteResolvable, Emoji, GuildEmoji, MessageEmbed, Message, GuildMember, PermissionOverwriteOption, GuildCreateChannelOptions } = require('discord.js');
const winston = require('winston');
const BotGuild = require('../../db/mongo/BotGuild');
const BotGuildModel = require('../bot-guild');
const { rolePrompt, messagePrompt, reactionPicker, chooseChannel } = require('../prompt');
const { deleteChannel, deleteMessage, shuffleArray, sendMsgToChannel } = require('../../discord-services');
const StampsManager = require('../stamps-manager');

/**
 * @typedef ActivityChannels
 * @property {CategoryChannel} category
 * @property {TextChannel} generalText
 * @property {VoiceChannel} generalVoice
 * @property {Collection<String, VoiceChannel>} voiceChannels
 * @property {Collection<String, TextChannel>} textChannels
 * @property {Collection<String, TextChannel | VoiceChannel>} safeChannels - channels that can not be removed
 */

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
 * @property {String} emoji
 * @property {String} name
 * @property {String} description
 * @property {Function} callback
 */

/**
 * An activity is a overarching class for any kind of activity. An activity consists of a 
 * category with voice and text channels.
 * Activities have features admins can run from the admin console by reacting to a message (console).
 * The activity can be private to specified roles or public to all users.
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
         * The name of this activity. Will remove all leading and trailing whitespace and
         * switch spaces for '-'. Will also replace all character except for numbers, letters and '-' 
         * and make it lowercase.
         * @type {string}
         */
        this.name = activityName.split(' ').join('-').trim().replace(/[^0-9a-zA-Z-]/g, '').toLowerCase();

        /**
         * The guild this activity is in.
         * @type {Guild}
         */
        this.guild = guild;
        
        /**
         * Roles allowed to view activity.
         * @type {Collection<String, Role>}
         */
        this.rolesAllowed = roleParticipants;

        /**
         * @type {ActivityChannels}
         */
        this.channels = {
            category: null,
            generalVoice: null,
            generalText: null,
            voiceChannels: new Collection(),
            textChannels: new Collection(),
            safeChannels: new Collection(),
        };

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

        winston.loggers.get(guild.id).event(`An activity named ${this.name} was created.`, {data: {permissions: this.rolesAllowed}});
    }


    /**
     * Initialize this activity by creating the channels, adding the features and sending the admin console.
     * @async
     * @returns {Promise<Activity>}
     */
    async init() {
        let position = this.guild.channels.cache.filter(channel => channel.type === 'category').size;
        this.channels.category = await this.createCategory(position);

        this.channels.generalText = await this.addChannelHelper(Activity.mainTextChannelName, {
            parent: this.channels.category,
            type: 'text',
            topic: 'A general banter channel to be used to communicate with other members, mentors, or staff. The !ask command is available for questions.',
        });
        this.channels.generalVoice = await this.addChannelHelper(Activity.mainVoiceChannelName, {
            parent: this.channels.category,
            type: 'voice',
        });

        this.addDefaultFeatures();

        await this.sendAdminConsole();

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was initialized.`, {event: "Activity"});
        return this;
    }
    /**
     * Helper function to create the category 
     * @param {Number} position - the position of this category on the server
     * @returns {Promise<CategoryChannel>} - a category with the activity name
     * @async
     * @private
     */
    async createCategory(position) {
        /** @type {OverwriteResolvable[]} */
        let overwrites = [
            {
                id: this.botGuild.roleIDs.everyoneRole,
                deny: ['VIEW_CHANNEL'],
            }];
        this.rolesAllowed.each(role => overwrites.push({ id: role.id, allow: ['VIEW_CHANNEL'] }));
        return this.guild.channels.create(this.name, {
            type: 'category',
            position: position >= 0 ? position : 0,
            permissionOverwrites: overwrites
        });
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
     * Adds a channels to this activity. Will automatically set the parent and add it to the correct collection.
     * @param {String} name - name of the channel to create
     * @param {GuildCreateChannelOptions} info - one of voice or text
     * @param {RolePermission[]} permissions - the permissions per role to be added to this channel after creation.
     * @param {Boolean} [isSafe=false] - true if the channel is safe and cant be removed
     * @protected
     */
    async addChannelHelper(name, info, permissions = [], isSafe = false) {
        info.parent = info.parent || this.channels.category;
        info.type = info.type || 'text';

        let channel = await this.guild.channels.create(name, info);

        permissions.forEach(rolePermission => channel.updateOverwrite(rolePermission.id, rolePermission.permissions));

        // add channel to correct list
        if (info.type == 'text') this.channels.textChannels.set(channel.id, channel);
        else this.channels.voiceChannels.set(channel.id, channel);

        if (isSafe) this.channels.safeChannels.set(channel.id, channel);

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} had a channel named ${name} added to it of type ${info?.type || 'text'}.`, {event: "Activity"});

        return channel;
    }


    /**
     * will add a max amount of users to the activity voice channels 
     * @param {Number} limit - the user limit
     * @async
     * @protected
     */
    async addLimitToVoiceChannels(limit) {
        this.channels.voiceChannels.forEach(async (channel) => {
            await channel.edit({ userLimit: limit });
        });
        winston.loggers.get(this.guild.id).verbose(`The activity ${this.name} had its voice channels added a limit of ${limit}`, {event: "Activity"});
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

        return await this.addChannelHelper(name, { type: option.name});
    }

    /**
     * Removes a channel from the activity, the user will decide which. Wont delete channels in the safeChannel map.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     * @async
     */
    async removeChannel(channel, userId) {
        // channel to remove
        let removeChannel = await chooseChannel('What channel should be removed?', this.channels.category.children.array(), channel, userId);

        if (this.channels.safeChannels.has(removeChannel.id)) {
            sendMsgToChannel(channel, userId, 'Can\'t remove that channel!', 10);
            return;
        }

        deleteChannel(removeChannel);
        winston.loggers.get(this.guild.id).event(`The activity ${this.name} lost a channel named ${removeChannel.name}`, { event: "Activity" });
    }

    /**
     * Archive the activity. Move general text channel to archive category, remove all remaining channels
     * and remove the category.
     * @param {CategoryChannel} archiveCategory - the category where the general text channel will be moved to
     * @async
     */
    async archive(archiveCategory) {
        // move all text channels to the archive and rename with activity name
        // remove all voice channels in the category one at a time to not get a UI glitch

        this.channels.category.children.forEach(async (channel, key) => {
            this.botGuild.blackList.delete(channel.id);
            if (channel.type === 'text') {
                let channelName = channel.name;
                await channel.setName(`${this.name}-${channelName}`);
                await channel.setParent(archiveCategory);
            } else deleteChannel(channel);
        });

        await deleteChannel(this.channels.category);

        deleteMessage(this.adminConsoleMsg);

        this.botGuild.save();

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was archived!`, {event: "Activity"});
    }

    /**
     * Delete all the channels and the category. Remove the workshop from firebase.
     * @async
     */
    async delete() {
        var listOfChannels = this.channels.category.children.array();
        for (var i = 0; i < listOfChannels.length; i++) {
            await deleteChannel(listOfChannels[i]);
        }

        await deleteChannel(this.channels.category);

        await deleteMessage(this.adminConsoleMsg);

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was deleted!`, {event: "Activity"});
    }

    /**
     * Move all users back to a specified voice channel from the activity's voice channels.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     */
    async voiceCallBack(channel, userId) {
        let mainChannel = await chooseChannel('What channel should people be moved to?', this.channels.voiceChannels.array(), channel, userId);

        this.channels.voiceChannels.forEach(channel => {
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
        let mainChannel = await chooseChannel('What channel should I move people from?', this.channels.voiceChannels.array(), channel, userId);

        let members = mainChannel.members;
        if (filter) members = members.filter(member => filter(member));
        
        let memberList = members.array();
        shuffleArray(memberList);

        let channels = this.channels.voiceChannels.filter(channel => channel.id != mainChannel.id).array();

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
        if ((await this.channels.generalText.fetch(true))) promptMsg = await this.channels.generalText.send(promptEmbed);
        else {
            let stampChannel = await chooseChannel('What channel should the stamp distribution go?', this.channels.textChannels, channel, userId);
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
     * Will let hackers get a stamp for attending the activity.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     */
    async ruleValidation(channel, userId) {
        // set category private
        this.rolesAllowed.forEach((role, key) => this.channels.category.updateOverwrite(role, { VIEW_CHANNEL: false }))

        // create rules channel and make it public
        /** @type {TextChannel} */
        let rulesChannel = await this.addChannelHelper('Activity Rules START HERE', { type: 'text' }, this.rolesAllowed.map((role, key) => ({ id: role.id, permissions: { VIEW_CHANNEL: true, SEND_MESSAGES: false, }})), true);
        
        let rules = (await messagePrompt({ prompt: 'What are the activity rules?', channel, userId })).cleanContent;

        let joinEmoji = '🚗';

        const embed = new MessageEmbed().setTitle('Activity Rules').setDescription(rules).addField('To join the activity:', `React to this message with ${joinEmoji}`).setColor(this.botGuild.colors.embedColor);

        const embedMsg = await rulesChannel.send(embed);

        embedMsg.react(joinEmoji);

        const collector = embedMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === joinEmoji);

        collector.on('collect', (reaction, user) => {
            this.channels.category.updateOverwrite(user.id, { VIEW_CHANNEL: true, SEND_MESSAGES: true});
            rulesChannel.updateOverwrite(user.id, { VIEW_CHANNEL: false});
        });
    }
}

module.exports = Activity;