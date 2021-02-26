const { Guild, Collection, Role, CategoryChannel, VoiceChannel, TextChannel, OverwriteResolvable } = require('discord.js');
const winston = require('winston');
const BotGuildModel = require('../bot-guild');

/**
 * @typedef ActivityChannels
 * @property {CategoryChannel} category
 * @property {Collection<String, VoiceChannel>} voiceChannels
 * @property {Collection<String, TextChannel>} textChannels
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
 * @property {String} roleID - the role snowflake
 * @property {PermissionOverwriteOption} permissions - the permissions to set to that role
 */

class Activity {

    static voiceChannelName = '🔊Room-';
    static mainTextChannelName = '🖌️activity-banter';
    static mainVoiceChannelName = '🗣️activity-room';

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
         * @type {Collection<String, Role}
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
        };

        /**
         * The mongoose BotGuildModel Object
         * @type {BotGuildModel}
         */
        this.botGuild = botGuild;

        winston.loggers.get(guild.id).event(`An activity named ${this.name} was created.`, {data: {permissions: this.rolesAllowed}});
    }

    /**
     * Initialize this activity by creating the channels.
     * @async
     * @returns {Promise<Activity>}
     */
    async init() {
        let position = this.guild.channels.cache.filter(channel => channel.type === 'category').size;
        this.channels.category = await this.createCategory(position);

        await this.addChannel(Activity.mainTextChannelName, {
            parent: this.channels.category,
            type: 'text',
            topic: 'A general banter channel to be used to communicate with other members, mentors, or staff. The !ask command is available for questions.',
        });
        await this.addChannel(Activity.mainVoiceChannelName, {
            parent: this.channels.category,
            type: 'voice',
        });

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was initialized.`, {event: "Activity"});
        return this;
    }

    /**
     * Helper function to create the category 
     * @param {Number} position - the position of this category on the server
     * @requires this.name - to be set
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
     * Adds a channels to this activity. Will automatically set the parent and add it to the correct collection.
     * @param {String} name - name of the channel to create
     * @param {import("discord.js").GuildCreateChannelOptions} info - one of voice or text
     * @param {Array<RolePermission>} permissions - the permissions per role to be added to this channel after creation.
     */
    async addChannel(name, info, permissions = []) {
        info.parent = info.parent || this.channels.category;
        info.type = info.type || 'text';

        let channel = await this.guild.channels.create(name, info);

        permissions.forEach(rolePermission => channel.updateOverwrite(rolePermission.roleID, rolePermission.permissions));

        // add channel to correct list
        if (info.type == 'text') this.channels.textChannels.set(channel.name, channel);
        else this.channels.voiceChannels.set(channel.name, channel);

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} had a channel named ${name} added to it of type ${info?.type || 'text'}.`, {event: "Activity"});

        return channel;
    }

    /**
     * Add voice channels to this activity.
     * @param {Number} number - the number of new voice channels to add
     * @param {Number} maxUsers - max number of users per channel, 0 if unlimited
     * @returns {Number} - total number of channels
     */
    addVoiceChannels(number, maxUsers = 0) {
        let current = this.channels.voiceChannels.size;
        let total = current + number;

        for (let index = current; index < total; index++) {
            this.addChannel(Activity.voiceChannelName + index,
                {
                    type: 'voice',
                    userLimit: maxUsers === 0 ? undefined : maxUsers,
                });
        }
        return total;
    }


    /**
     * Removes voice channels from the category
     * @param {Number} numberOfChannels - the number of channels to remove
     * @returns {Number} - the final number of voice channels
     */
    removeVoiceChannels(numberOfChannels) {
        let total = this.channels.voiceChannels.size;
        let final = total - numberOfChannels;

        if (final < 0) final = 0;

        for (let index = total - 1; index >= final; index--) {
            let channelName = Activity.voiceChannelName + index;
            let channel = this.channels.voiceChannels.get(channelName);
            if (channel != undefined) {
                winston.loggers.get(this.guild.id).event(`The activity ${this.name} lost a voice channel named ${channelName}`, {event: "Activity"});
                discordServices.deleteChannel(channel);
            }
        }

        return final;
    }

    /**
     * Archive the activity. Move general text channel to archive category, remove all remaining channels
     * and remove the category.
     * @param {CategoryChannel} archiveCategory - the category where the general text channel will be moved to
     * @async
     */
    async archive(archiveCategory) {
        // move all text channels to the archive and rename with activity name
        await Promise.all(this.channels.textChannels.forEach(async channel => {
            await channel.setParent(archiveCategory);
            let channelName = channel.name;
            await channel.setName(`${this.name}-${channelName}`)
        }));

        // remove all channels in the category one at a time to not get a UI glitch
        let channels = this.channels.category.children.array();

        for(let i = 0; i < channels.length; i++) {
            this.botGuild.blackList.delete(channels[i].id);
            await discordServices.deleteChannel(channels[i]);
        }

        await discordServices.deleteChannel(this.channels.category);

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
            await discordServices.deleteChannel(listOfChannels[i]);
        }

        await this.channels.category.delete();

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was deleted!`, {event: "Activity"});
    }

    /**
     * will add a max amount of users to the activity voice channels 
     * @param {Number} limit - the user limit
     * @async
     * @returns {Promise<null>} 
     */
    async addLimitToVoiceChannels(limit) {
        this.channels.voiceChannels.forEach(async (channel) => {
            await channel.edit({ userLimit: limit });
        });
        winston.loggers.get(this.guild.id).verbose(`The activity ${this.name} had its voice channels added a limit of ${limit}`, {event: "Activity"});
    }
}

module.exports = Activity;