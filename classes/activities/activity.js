const { Guild, Collection, Role, CategoryChannel, TextChannel, MessageEmbed, GuildMember, PermissionOverwriteOption } = require('discord.js');
const winston = require('winston');
const BotGuild = require('../../db/mongo/BotGuild');
const BotGuildModel = require('../bot-guild');
const { shuffleArray, sendMsgToChannel } = require('../../discord-services');
const StampsManager = require('../stamps-manager');
const Room = require('../room');
const Console = require('../console');
const { StringPrompt, RolePrompt, ListPrompt } = require('advanced-discord.js-prompts');
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
 * category with voice and text channels.
 * Activities have features admins can run from the admin console by reacting to a message (console).
 * The activity can be private to specified roles or public to all users.
 * @class
 */
class Activity {

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
            allowedRoles = await RolePrompt.multi({ prompt: `What roles${isStaffAuto ? ', aside from Staff,' : ''} will be allowed to view this activity? (Type "cancel" if none)`,
                channel, userId, cancelable: true });
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
         * The admin console with activity features.
         * @type {Console}
         */
        this.adminConsole = new Console({
            title: `Activity ${activityName} Console`,
            description: 'This activity\'s information can be found below, you can also find the features available.',
            channel: guild.channels.resolve(botGuild.channelIDs.adminConsole),
            guild: this.guild,
        });

        /**
         * The mongoose BotGuildModel Object
         * @type {BotGuildModel}
         */
        this.botGuild = botGuild;

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

        await this.adminConsole.sendConsole();

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was initialized.`, {event: 'Activity'});
        return this;
    }


    /**
     * Adds the default features to the activity, these features are available to all activities.
     * @protected
     */
    addDefaultFeatures() {
        /** @type {Console.Feature[]} */
        let localFeatures = [
            {
                name: 'Add Channel',
                description: 'Add one channel to the activity.',
                emojiName: '⏫',
                callback: (user, reaction, stopInteracting, console) => this.addChannel(console.channel, user.id).then(() => stopInteracting()),
            },
            {
                name: 'Remove Channel',
                description: 'Remove a channel, decide from a list.',
                emojiName: '⏬',
                callback: (user, reaction, stopInteracting, console) => this.removeChannel(console.channel, user.id).then(() => stopInteracting()),
            },
            {
                name: 'Delete', 
                description: 'Delete this activity and its channels.',
                emojiName: '⛔',
                callback: (user, reaction, stopInteracting, console) => this.delete(),
            },
            {
                name: 'Archive',
                description: 'Archive the activity, text channels are saved.',
                emojiName: '💼',
                callback: (user, reaction, stopInteracting, console) => {
                    let archiveCategory = this.guild.channels.resolve(this.botGuild.channelIDs.archiveCategory);
                    this.archive(archiveCategory);
                }
            },
            {
                name: 'Callback',
                description: 'Move all users in the activity\'s voice channels back to a specified voice channel.',
                emojiName: '🔃',
                callback: (user, reaction, stopInteracting, console) => this.voiceCallBack(console.channel, user.id).then(() => stopInteracting()),
            },
            {
                name: 'Shuffle',
                description: 'Shuffle all members from one channel to all others in the activity.',
                emojiName: '🌬️',
                callback: (user, reaction, stopInteracting, console) => this.shuffle(console.channel, user.id).then(() => stopInteracting()),
            },
            {
                name: 'Role Shuffle',
                description: 'Shuffle all the members with a specific role from one channel to all others in the activity.',
                emojiName: '🦜',
                callback: (user, reaction, stopInteracting, console) => this.roleShuffle(console.channel, user.id).then(() => stopInteracting()),
            },
            {
                name: 'Distribute Stamp',
                description: 'Send a emoji collector for users to get a stamp.',
                emojiName: '🏕️',
                callback: (user, reaction, stopInteracting, console) => this.distributeStamp(console.channel, user.id).then(() => stopInteracting()),
            },
            {
                name: 'Rules Lock',
                description: 'Lock the activity behind rules, users must agree to the rules to access the channels.',
                emojiName: '🔒',
                callback: (user, reaction, stopInteracting, console) => this.ruleValidation(console.channel, user.id).then(() => stopInteracting()),
            }
        ];

        localFeatures.forEach(feature => this.adminConsole.addFeature(feature));
        
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
        let option = await ListPrompt.singleReactionPicker({
            prompt: 'What type of channel do you want?',
            channel,
            userId,
        }, [
            {
                name: 'voice',
                description: 'A voice channel',
                emojiName: '🔊'
            },
            {
                name: 'text', 
                description: 'A text channel',
                emojiName: '✍️',
            }
        ]);
        // channel name
        let name = await StringPrompt.single({ prompt: 'What is the name of the channel?', channel, userId});

        return await this.room.addRoomChannel({name, info: { type: option.name}});
    }

    /**
     * Removes a channel from the activity, the user will decide which. Wont delete channels in the safeChannel map.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     * @async
     */
    async removeChannel(channel, userId) {
        /** @type {TextChannel} channel to remove */
        let removeChannel = await ListPrompt.singleListChooser({
            prompt: 'What channel should be removed?',
            channel: channel,
            userId: userId
        }, this.room.channels.category.children.array());

        try {
            this.room.removeRoomChannel(removeChannel);
        } catch (error) {
            sendMsgToChannel(channel, userId, 'Can\'t remove that channel!', 10);
            return;
        }

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} lost a channel named ${removeChannel.name}`, { event: 'Activity' });
    }

    /**
     * Archive the activity. Move general text channel to archive category, remove all remaining channels
     * and remove the category.
     * @param {CategoryChannel} archiveCategory - the category where the general text channel will be moved to
     * @async
     */
    async archive(archiveCategory) {
        await this.room.archive(archiveCategory);

        this.adminConsole.delete();

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was archived!`, {event: 'Activity'});
    }

    /**
     * Delete all the channels and the category. Remove the workshop from firebase.
     * @async
     */
    async delete() {
        await this.room.delete();

        this.adminConsole.delete();

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was deleted!`, {event: 'Activity'});
    }

    /**
     * Move all users back to a specified voice channel from the activity's voice channels.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     */
    async voiceCallBack(channel, userId) {
        /** @type {VoiceChannel} */
        let mainChannel = await ListPrompt.singleListChooser({
            prompt: 'What channel should people be moved to?',
            channel: channel,
            userId: userId
        }, this.room.channels.voiceChannels.array());

        this.room.channels.voiceChannels.forEach(channel => {
            channel.members.forEach(member => member.voice.setChannel(mainChannel));
        });

        winston.loggers.get(this.guild.id).event(`Activity named ${this.name} had its voice channels called backs to channel ${mainChannel.name}.`, {event: 'Activity'});
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
        /** @type {VoiceChannel} */
        let mainChannel = await ListPrompt.singleListChooser({
            prompt: 'What channel should I move people from?',
            channel: channel,
            userId: userId
        }, this.room.channels.voiceChannels.array());

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
                winston.loggers.get(this.guild.id).warning(`Could not set a users voice channel when shuffling an activity by role. Error: ${error}`, { event: 'Activity' });
            }
        });

        winston.loggers.get(this.guild.id).event(`Activity named ${this.name} had its voice channel members shuffled around!`, {event: 'Activity'});
    }

    /**
     * Shuffles users with a specific role throughout the activity's voice channels
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     * @async
     */
    async roleShuffle(channel, userId) {
        try {
            var role = await RolePrompt.single({ prompt: 'What role would you like to shuffle?', channel, userId });
        } catch (error) {
            winston.loggers.get(this.guild.id).warning(`User canceled a request when asking for a role for role shuffle. Error: ${error}.`, { event: 'Activity' });
        }

        this.shuffle(channel, userId, (member) => member.roles.cache.has(role.id));
    }

    /**
     * Will let hackers get a stamp for attending the activity.
     * @param {TextChannel} channel - channel to prompt user for specified voice channel
     * @param {String} userId - user to prompt for specified voice channel
     */
    async distributeStamp(channel, userId) {

        if (!this.botGuild.stamps.isEnabled) {
            sendMsgToChannel(channel, userId, 'The stamp system is not enabled in this server!', 10);
            return;
        }
        
        // The users already seen by this stamp distribution.
        let seenUsers = new Collection();

        const promptEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle('React within ' + this.botGuild.stamps.stampCollectionTime + ' seconds of the posting of this message to get a stamp for ' + this.name + '!');

        // send embed to general text or prompt for channel
        let promptMsg;
        if ((await this.room.channels.generalText.fetch(true))) promptMsg = await this.room.channels.generalText.send(promptEmbed);
        else {
            let stampChannel = await ListPrompt.singleListChooser({
                prompt: 'What channel should the stamp distribution go?',
                channel: channel,
                userId: userId
            }, this.room.channels.textChannels.array());
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
            winston.loggers.get(this.guild.id).event(`Activity named ${this.name} stamp distribution has stopped.`, {event: 'Activity'});
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

        let rules = await StringPrompt.single({ prompt: 'What are the activity rules?', channel, userId});

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