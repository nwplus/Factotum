const winston = require("winston");
const { User, Guild, Collection, Role, CategoryChannel, VoiceChannel, TextChannel, OverwriteResolvable } = require('discord.js');
const BotGuildModel = require('./bot-guild');
const { deleteChannel } = require("../discord-services");

/**
 * @typedef RoomChannels
 * @property {CategoryChannel} category
 * @property {TextChannel} generalText
 * @property {VoiceChannel} generalVoice
 * @property {TextChannel} nonLockedChannel
 * @property {Collection<String, VoiceChannel>} voiceChannels
 * @property {Collection<String, TextChannel>} textChannels
 * @property {Collection<String, TextChannel | VoiceChannel>} safeChannels - channels that can not be removed
 */

/**
 * An object with a role and its permissions
 * @typedef RolePermission
 * @property {String} id - the role snowflake
 * @property {PermissionOverwriteOption} permissions - the permissions to set to that role
 */

/**
 * The room class represents a room where things can occur, a room 
 * consists of a category with voice and text channels. As well as roles 
 * or users allowed to see the room.
 */
class Room {

    static voiceChannelName = '🔊Room-';
    static mainTextChannelName = '🖌️activity-banter';
    static mainVoiceChannelName = '🗣️activity-room';

    /**
     * @param {Guild} guild - the guild in which the room lives
     * @param {BotGuildModel} botGuild - the botGuild
     * @param {String} name - name of the room 
     * @param {Collection<String, Role >} [rolesAllowed=Collection()] - the participants able to view this room
     * @param {Collection<String, User>} [usersAllowed=Collection()] - the individual users allowed to see the room
     */
    constructor(guild, botGuild, name, rolesAllowed = new Collection(), usersAllowed = new Collection()) {

        /**
         * The name of this room. Will remove all leading and trailing whitespace and
         * switch spaces for '-'. Will also replace all character except for numbers, letters and '-' 
         * and make it lowercase.
         * @type {string}
         */
        this.name = name.split(' ').join('-').trim().replace(/[^0-9a-zA-Z-]/g, '').toLowerCase();

        /**
         * The guild this activity is in.
         * @type {Guild}
         */
        this.guild = guild;

        /**
         * Roles allowed to view the room.
         * @type {Collection<String, Role>}
         */
        this.rolesAllowed = rolesAllowed;

        /**
         * Users allowed to view the room.
         * @type {Collection<String, User>}
         */
        this.usersAllowed = usersAllowed;

        /**
         * @type {RoomChannels}
         */
        this.channels = {
            category: null,
            generalVoice: null,
            generalText: null,
            nonLockedChannel: null,
            voiceChannels: new Collection(),
            textChannels: new Collection(),
            safeChannels: new Collection(),
        };

        /**
         * The mongoose BotGuildModel Object
         * @type {BotGuildModel}
         */
        this.botGuild = botGuild;

        /**
         * True if the room is locked, false otherwise.
         * @type {Boolean}
         */
        this.locked = false;

    }

    /**
     * Initialize this activity by creating the channels, adding the features and sending the admin console.
     * @async
     * @returns {Promise<Room>}
     */
    async init() {
        let position = this.guild.channels.cache.filter(channel => channel.type === 'category').size;
        this.channels.category = await this.createCategory(position);

        this.channels.generalText = await this.addRoomChannel(Room.mainTextChannelName, {
            parent: this.channels.category,
            type: 'text',
            topic: 'A general banter channel to be used to communicate with other members, mentors, or staff. The !ask command is available for questions.',
        });
        this.channels.generalVoice = await this.addRoomChannel(Room.mainVoiceChannelName, {
            parent: this.channels.category,
            type: 'voice',
        });

        winston.loggers.get(this.guild.id).event(`The room ${this.name} was initialized.`, {event: "Room"});
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
     * Adds a channels to the room.
     * @param {String} name - name of the channel to create
     * @param {import("discord.js").GuildCreateChannelOptions} info - one of voice or text
     * @param {Array<RolePermission>} permissions - the permissions per role to be added to this channel after creation.
     * @param {Boolean} [isSafe=false] - true if the channel is safe and cant be removed
     * @async
     */
    async addRoomChannel(name, info, permissions = [], isSafe = false) {
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
     * Removes a channel from the room.
     * @param {VoiceChannel | TextChannel} channelToRemove 
     * @param {Boolean} [isForced=false] - is the deletion forced?, if so then channel will be removed even if its safeChannels
     * @async
     */
    async removeRoomChannel(channelToRemove, isForced = false) {
        if (isForced && this.channels.safeChannels.has(channelToRemove.id)) throw Error('Can\'t remove that channel.');

        if (channelToRemove.type === 'text') this.channels.textChannels.delete(channelToRemove.id);
        else this.channels.voiceChannels.delete(channelToRemove.id);

        this.channels.safeChannels.delete(channelToRemove.id);

        deleteChannel(channelToRemove);
        winston.loggers.get(this.guild.id).event(`The room ${this.name} lost a channel named ${channelToRemove.name}`, { event: "Room" });
    }

    /**
     * Deletes the room.
     * @async
     */
    async delete() {
        var listOfChannels = this.channels.category.children.array();
        for (var i = 0; i < listOfChannels.length; i++) {
            await deleteChannel(listOfChannels[i]);
        }

        await deleteChannel(this.channels.category);

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was deleted!`, {event: "Activity"});
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

        this.botGuild.save();

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was archived!`, {event: "Activity"});
    }

    /**
     * Locks the room for all roles except for a text channel. To gain access users must be allowed access
     * individually.
     * @returns {Promise<TextChannel>} - channel available to roles
     */
    async lockRoom() {
        // set category private
        this.rolesAllowed.forEach((role, key) => this.channels.category.updateOverwrite(role, { VIEW_CHANNEL: false }))

        /** @type {TextChannel} */
        this.channels.nonLockedChannel = await this.addRoomChannel('Activity Rules START HERE', { type: 'text' }, this.rolesAllowed.map((role, key) => ({ id: role.id, permissions: { VIEW_CHANNEL: true, SEND_MESSAGES: false, }})), true);
        this.channels.safeChannels.set(this.channels.nonLockedChannel.id, this.channels.nonLockedChannel);

        this.locked = true;

        return this.channels.nonLockedChannel;
    }

    /**
     * Gives access to the room to a role.
     * @param {Role} role - role to give access to
     */
    giveRoleAccess(role) {
        this.rolesAllowed.set(role.id, role);

        if (this.locked) {
            this.channels.nonLockedChannel.updateOverwrite(role.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false });
        } else {
            this.channels.category.updateOverwrite(role.id, { VIEW_CHANNEL: true });
        }
    }

    /**
     * Gives access to a user
     * @param {User} user - user to give access to
     */
    giveUserAccess(user) {
        this.usersAllowed.set(user.id, user);
        this.channels.category.updateOverwrite(user.id, { VIEW_CHANNEL: true, SEND_MESSAGES: true });
    }

    /**
     * Removes access to a user to see this room.
     * @param {User} user - the user to remove access to
     */
    removeUserAccess(user) {
        this.usersAllowed.delete(user.id);
        this.channels.category.updateOverwrite(user.id, { VIEW_CHANNEL: false });
    }


}
module.exports = Room;