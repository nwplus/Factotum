const { Collection, Guild, CategoryChannel, TextChannel, VoiceChannel, DiscordAPIError, Message } = require("discord.js");
const Prompt = require("./prompt");
const BotGuild = require("../db/mongo/BotGuild");
const discordServices = require('../discord-services');
const BotGuildModel = require('../classes/bot-guild');

/**
 * The activity class represents a discord activity, it holds important information like
 * the activity category, text and voice channels, etc.
 * @class Activity
 */
class Activity {

    /**
     * @typedef ActivityState
     * @property {Boolean} isWorkshop - is this activity a workshop?
     * @property {Boolean} isCoffeeChats - is this activity a coffee chats?
     * @property {Boolean} isAmongUs - is this activity an among us activity?
     */

    /**
     * Constructor for an activity, will create the category, voice and text channel.
     * @param {string} activityName - the name of this activity!
     * @param {Guild} guild - the guild where the new activity lives
     * @param {Collection<Snowflake, Role>} permissions - roles allowed to view activity
     * @param {ActivityInfo} activityInfo 
     * @constructor
     */
    constructor(activityName, guild, permissions, activityInfo) {
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
         * @type {Collection<Snowflake, Role}
         */
        this.permissions = permissions;

        /**
         * The category where this activity lives.
         * @type {CategoryChannel}
         */
        this.category;

        /**
         * The general text for the activity
         * @type {TextChannel}
         */
        this.generalText;

        /**
         * The general voice channel for the activity
         * @type {VoiceChannel}
         */
        this.generalVoice;

        /**
         * The state of this activity
         * @type {ActivityState}
         */
        this.state = {
            isWorkshop: false,
            isAmongUs: false,
            isCoffeeChats: false,
        }

        /**
         * An activity can be hidden or unhidden.
         * @type {Boolean}
         */
        this.isHidden = false;

        /**
         * A collection of all the voice channels in this activity. Not including generalVoice
         * @type {Collection<String, VoiceChannel>} - <Name, VoiceChannel
         */
        this.voiceChannels = new Collection();

        /**
         * A collection of all the text channels in this activity. Not including generalText
         * @type {Collection<String, TextChannel>} - <Name, TextChannel>
         */
        this.textChannels = new Collection();

        /**
         * The activity information
         * @type {ActivityInfo}
         */
        this.activityInfo = {};
        this.validateActivityInfo(activityInfo || {});

        /**
         * The mongoose BotGuildModel Object
         * @type {BotGuildModel}
         */
        this.botGuild;
    }


    /**
     * @typedef ActivityInfo
     * @property {String} voiceChannelName - name given too all extra voice channels
     * @property {String} generalVoiceChannelName - name of the general voice channel
     * @property {String} generalTextChannelName - name of the general text channel
     */

    /**
     * 
     * @param {ActivityInfo} activityInfo - the activityInfo to validate
     */
    validateActivityInfo(activityInfo) {
        this.activityInfo.voiceChannelName = activityInfo.voiceChannelName || '🔊Room-';
        this.activityInfo.generalTextChannelName = activityInfo.generalTextChannelName || '🖌️activity-banter';
        this.activityInfo.generalVoiceChannelName = activityInfo.generalVoiceChannelName || '🗣️activity-room';
    }


    /**
     * Initialize this activity by creating the channels.
     * @async
     * @returns {Promise<Activity>}
     */
    async init() {
        this.botGuild = await BotGuild.findById(this.guild.id);
        let position = this.guild.channels.cache.filter(channel => channel.type === 'category').size;
        this.category = await this.createCategory(position);
        this.generalText = await this.addChannel(this.activityInfo.generalTextChannelName, {
            type: 'text',
            topic: 'A general banter channel to be used to communicate with other members, mentors, or staff. The !ask command is available for questions.',
        });
        this.generalVoice = await this.addChannel(this.activityInfo.generalVoiceChannelName, {
            type: 'voice',
        });

        return this;
    }


    /**
     * Helper function to create the category 
     * @param {Number} position - the position of this category on the server
     * @async
     * @private
     * @requires this.name - to be set
     * @returns {Promise<CategoryChannel>} - a category with the activity name
     */
    async createCategory(position) {
        let overwrites = [
            {
                id: this.botGuild.roleIDs.everyoneRole,
                deny: ['VIEW_CHANNEL']
            },
            {
                id: this.botGuild.roleIDs.staffRole,
                allow: ['VIEW_CHANNEL']
            }];
        this.permissions.each(role => overwrites.push({ id: role.id, allow: ['VIEW_CHANNEL'] }));
        return this.guild.channels.create(this.name, {
            type: 'category',
            position: position >= 0 ? position : 0,
            permissionOverwrites: overwrites
        });
    }


    /**
     * An object with a role and its permissions
     * @typedef RolePermission
     * @property {String} roleID - the role snowflake
     * @property {PermissionOverwriteOption} permissions - the permissions to set to that role
     */

    /**
     * Add voice channels to this activity. Will automatically set the parent and add it to the correct collection.
     * @param {String} name - name of the channel to create
     * @param {import("discord.js").GuildCreateChannelOptions} info - one of voice or text
     * @param {Array<RolePermission>} permissions - the permissions per role to be added to this channel after creation.
     */
    async addChannel(name, info, permissions = []) {
        info.parent = info.parent || this.category;
        info.type = info.type || 'text';

        let channel = await this.guild.channels.create(name, info);

        permissions.forEach(rolePermission => channel.updateOverwrite(rolePermission.roleID, rolePermission.permissions));

        if (info.type == 'text') this.textChannels.set(channel.name, channel);
        else this.voiceChannels.set(channel.name, channel);

        return channel;
    }


    /**
     * Check the state of the activity and return if this is a regular activity.
     * @method
     * @returns {Boolean} - True if is regular, False if it is not regular
     */
    isRegularActivity() {
        let isRegular = true;
        for (const property in this.state) {
            isRegular = isRegular && !this.state[property];
        }
        return isRegular;
    }


    /**
     * Add voice channels to this activity.
     * @param {Number} number - the number of new voice channels to add
     * @param {Boolean} isPrivate - if the channels should be private to attendees
     * @param {Number} maxUsers - max number of users per channel, 0 if unlimited
     * @returns {Number} - total number of channels
     */
    addVoiceChannels(number, isPrivate, maxUsers = 0) {
        let current = this.voiceChannels.size;
        let total = current + number;

        for (let index = current; index < total; index++) {
            this.addChannel(this.activityInfo.voiceChannelName + index,
                {
                    type: 'voice',
                    userLimit: maxUsers === 0 ? undefined : maxUsers,
                },
                [
                    {
                        roleID: this.botGuild.roleIDs.hackerRole,
                        permissions: { VIEW_CHANNEL: isPrivate ? false : true, USE_VAD: true, SPEAK: true },
                    },
                ]);
        }
        return total;
    }


    /**
     * Removes voice channels from the category
     * @param {Number} numberOfChannels - the number of channels to remove
     * @returns {Number} - the final number of voice channels
     */
    removeVoiceChannels(numberOfChannels) {
        let total = this.voiceChannels.size;
        let final = total - numberOfChannels;

        if (final < 0) final = 0;

        for (let index = total - 1; index >= final; index--) {
            let channelName = this.activityInfo.voiceChannelName + index;
            let channel = this.voiceChannels.get(channelName);
            if (channel != undefined) discordServices.deleteChannel(channel);
        }
        return final;
    }


    /**
     * Makes this activity an among us activity
     * @param {Number} numOfChannels - The number of channels to add
     * @async
     * @returns {Promise<TextChannel>} - The join-activity text channel
     */
    async makeAmongUs(numOfChannels) {
        this.state.isAmongUs = true;

        this.category.setName('😈' + this.category.name);

        // we await this channel as it will be used later
        let channel = await this.addChannel('🕵🏽' + 'join-activity', {
            type: 'text',
            topic: 'This channel is only intended for you to gain access to other channels! Please do not use it for anything else!',
        });

        this.addChannel('🎮' + 'game-codes', {
            type: 'text',
            topic: 'This channel is only intended to send game codes for others to join!',
        }, [{roleID: this.botGuild.roleIDs.memberRole, permissions: {VIEW_CHANNEL: false}}]); // members cant see this channel until they emoji a message to accept to the game rules

        this.addVoiceChannels(numOfChannels, true, 12);

        return channel;
    }


    /**
     * Converts this activity into a coffee chat activity
     * @param {Number} numOfGroups - the number of groups this coffee chat can take
     * @returns {Promise<TextChannel>} - the join-activity text channel
     */
    async makeCoffeeChats(numOfGroups) {
        
        /**
         * The list of teams for the coffee chat!
         * @type {Object[]}
         */
        this.teams = []

        this.addVoiceChannels(numOfGroups, true);

        let channel = await this.addChannel('☕' + 'join-activity', {
            type: 'text',
            topic: 'This channel is only intended to add your team to the activity list! Please do not use it for anything else!',
        });


        /**
         * A collection of the groups that will attend this coffee chat.
         * @type {Collection<Number, Array>} - <group number, group members as array>
         */
        this.groups = new Collection();

        return channel;
    }


    /**
     * Will make this activity a workshop activity.
     * @async
     * @param {Collection<Snowflake, Role>} TARoles - roles with TA permissions aside from Staff
     * @returns {Promise<{taChannel : TextChannel, assistanceChannel : TextChannel}>} - an object with two text channels, taChannel, assistanceChannel
     */
    async makeWorkshop(TARoles) {
        // update the voice channel permission to no speaking for attendees
        this.generalVoice.updateOverwrite(this.botGuild.roleIDs.everyoneRole, {
            SPEAK: false,
        });
        this.generalVoice.updateOverwrite(this.botGuild.roleIDs.staffRole, {
            SPEAK: true,
            MOVE_MEMBERS: true,
        });
        TARoles.each(role => {
            this.generalVoice.updateOverwrite(role, {
                SPEAK: true,
                MOVE_MEMBERS: true,
            });
        })

        // make TA channel private and give each TA role permission to view it
        let TAChannelPermissions = [
            { roleID: this.botGuild.roleIDs.everyoneRole, permissions: { VIEW_CHANNEL: false } },
        ];
        TARoles.each(role => TAChannelPermissions.push({roleID: role, permissions: {VIEW_CHANNEL: true}}));

        // create ta console
        let taChannel = await this.addChannel(':🧑🏽‍🏫:' + 'ta-console', {
            type: 'text',
            topic: 'The TA console, here TAs can chat, communicate with the workshop lead, look at the wait list, and send polls!',
        }, TAChannelPermissions);

        // create and blacklist an assistance channel
        let assistanceChannel = await this.addChannel('🙋🏽' + 'assistance', {
            type: 'text',
            topic: 'For hackers to request help from TAs for this workshop, please don\'t send any other messages!'
        });
        this.botGuild.blackList.set(assistanceChannel.id, 5000);
        this.botGuild.save();
        
        return { taChannel, assistanceChannel };
    }


    /**
     * Archive the activity. Move general text channel to archive category, remove all remaining channels
     * and remove the category.
     * @param {CategoryChannel} archiveCategory - the category where the general text channel will be moved to
     * @async
     */
    async archive(archiveCategory) {
        await this.generalText.setParent(archiveCategory);
        await this.generalText.setName(this.name + '-banter');

        // remove all channels in the category one at a time to not get a UI glitch
        let channels = this.category.children.array();

        for(let i = 0; i < channels.length; i++) {
            this.botGuild.blackList.delete(channels[i].id);
            await discordServices.deleteChannel(channels[i]);
        }

        this.botGuild.save();
        await discordServices.deleteChannel(this.category);
    }

    /**
     * Delete all the channels and the category. Remove the workshop from firebase.
     * @async
     */
    async delete() {
        var listOfChannels = this.category.children.array();
        for (var i = 0; i < listOfChannels.length; i++) {
            await discordServices.deleteChannel(listOfChannels[i]);
        }

        await this.category.delete();
    }

    /**
     * will add a max amount of users to the activity voice channels 
     * @param {Number} limit - the user limit
     * @async
     * @returns {Promise<null>} 
     */
    async addLimitToVoiceChannels(limit) {
        this.voiceChannels.forEach(async (channel) => {
            await channel.edit({ userLimit: limit });
        });
    }

    /**
     * Will hide the voice channel given.
     * @param {TextChannel} channel 
     * @param {Boolean} toHide 
     */
    async makeVoiceChannelPrivate(channel, toHide) {
        channel.updateOverwrite(this.botGuild.roleIDs.everyoneRole, {VIEW_CHANNEL: toHide ? false : true});
    }
}

module.exports = Activity;