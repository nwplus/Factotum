const { Guild, Collection, Role, TextChannel, MessageEmbed, GuildEmoji, ReactionEmoji } = require('discord.js');
const { sendMsgToChannel, addRoleToMember, removeRolToMember } = require('../../discord-services');
const BotGuildModel = require('../bot-guild');
const Room = require('../room');
const Console = require('../console');
const TicketManager = require('../tickets/ticket-manager');
const Activity = require('./activity');
const { StringPrompt, NumberPrompt, SpecialPrompt } = require('advanced-discord.js-prompts');

/**
 * @typedef CaveOptions
 * @property {String} name - the name of the cave category
 * @property {String} preEmojis - any pre name emojis
 * @property {String} preRoleText - the text to add before every role name, not including '-'
 * @property {String} color - the role color to use for this cave
 * @property {Role} role - the role associated with this cave
 * @property {Emojis} emojis - object holding emojis to use in this cave
 * @property {Times} times - object holding times to use in this cave
 * @property {Collection<String, Role>} publicRoles - the roles that can request tickets
 */

/**
 * @typedef Emojis
 * @property {GuildEmoji | ReactionEmoji} joinTicketEmoji - emoji for mentors to accept a ticket
 * @property {GuildEmoji | ReactionEmoji} giveHelpEmoji - emoji for mentors to join an ongoing ticket
 * @property {GuildEmoji | ReactionEmoji} requestTicketEmoji - emoji for hackers to request a ticket
 * @property {GuildEmoji | ReactionEmoji} addRoleEmoji - emoji for Admins to add a mentor role
 * @property {GuildEmoji | ReactionEmoji} deleteChannelsEmoji - emoji for Admins to force delete ticket channels
 * @property {GuildEmoji | ReactionEmoji} excludeFromAutoDeleteEmoji - emoji for Admins to opt tickets in/out of garbage collector
 */

/**
 * @typedef Times
 * @property {Number} inactivePeriod - number of minutes a ticket channel will be inactive before bot starts to delete it
 * @property {Number} bufferTime - number of minutes the bot will wait for a response before deleting ticket
 * @property {Number} reminderTime - number of minutes the bot will wait before reminding mentors of unaccepted tickets
 */

/**
 * @typedef SubRole
 * @property {String} name - the role name
 * @property {String} id - the role id (snowflake)
 * @property {Number} activeUsers - number of users with this role
 */

/**
 * @typedef CaveChannels
 * @property {TextChannel} roleSelection
 */

class Cave extends Activity {

    /**
     * @constructor
     * @param {CaveOptions} caveOptions 
     * @param {BotGuildModel} botGuild 
     * @param {Guild} guild
     */
    constructor(caveOptions, botGuild, guild) {
        super({
            activityName: caveOptions.name,
            guild: guild,
            roleParticipants: new Collection([[caveOptions.role.id, caveOptions.role]]),
            botGuild: botGuild,
        });

        /**
         * @type {CaveOptions}
         */
        this.caveOptions;
        this.validateCaveOptions(caveOptions);

        /**
         * The cave sub roles, keys are the emoji name, holds the subRole
         * @type {Map<String, SubRole>} - <Emoji Name, SubRole>
         */
        this.subRoles = new Map();

        /**
         * @type {TicketManager}
         */
        this.ticketManager;

        /**
          * The channels needed for a cave.
          * @type {CaveChannels}
          */
        this.channels = {};

        /**
          * The public room for this cave.
          * @type {Room}
          */
        this.publicRoom = new Room(guild, botGuild, `👉🏽👈🏽${caveOptions.name} Help`, caveOptions.publicRoles);

        /**
         * The console where cave members can get sub roles.
         * @type {Console}
         */
        this.subRoleConsole;
    }

    /**
     * Validates and set the cave options.
     * @param {CaveOptions} caveOptions - the cave options to validate
     * @param {Discord.Guild} guild - the guild where this cave is happening
     * @private
     */
    validateCaveOptions(caveOptions) {
        if (typeof caveOptions.name != 'string' && caveOptions.name.length === 0) throw new Error('caveOptions.name must be a non empty string');
        if (typeof caveOptions.preEmojis != 'string') throw new Error('The caveOptions.preEmojis must be a string of emojis!');
        if (typeof caveOptions.preRoleText != 'string' && caveOptions.preRoleText.length === 0) throw new Error('The caveOptions.preRoleText must be a non empty string!');
        if (typeof caveOptions.color != 'string' && caveOptions.color.length === 0) throw new Error('The caveOptions.color must be a non empty string!');
        if (!(caveOptions.role instanceof Role)) throw new Error('The caveOptions.role must be Role object!');
        for (const emoji in caveOptions.emojis) {
            if (!(caveOptions.emojis[emoji] instanceof GuildEmoji) && !(caveOptions.emojis[emoji] instanceof ReactionEmoji)) throw new Error('The ' + emoji + 'must be a GuildEmoji or ReactionEmoji!');
        }
        this.caveOptions = caveOptions;
    }

    async init() {
        await super.init();

        this.channels.roleSelection = await this.room.addRoomChannel({
            name: `📝${this.name}-role-selector`,
            info: {
                topic: 'Sign yourself up for specific roles! New roles will be added as requested, only add yourself to one if you feel comfortable responding to questions about the topic.',
            },
            isSafe: true,
        });
        this.subRoleConsole = new Console({
            title: 'Choose your sub roles!',
            description: 'Choose sub roles you are comfortable answering questions for! Remove your reaction to loose the sub role.',
            channel: this.channels.roleSelection,
            guild: this.guild,
        });
        this.subRoleConsole.sendConsole();

        for (var i = 0; i < 3; i++) {
            this.room.addRoomChannel({
                name: `🗣️ Room ${i}`,
                info: { type: 'voice' },
            });
        }

        await this.publicRoom.init();

        this.ticketManager = new TicketManager(this, {
            ticketCreatorInfo: {
                channel: await this.publicRoom.addRoomChannel({
                    name: '🎫request-ticket',
                    isSafe: true,
                }),
            },
            ticketDispatcherInfo: {
                channel: await this.room.addRoomChannel({
                    name: '📨incoming-tickets',
                    isSafe: true,
                }),
                takeTicketEmoji: this.caveOptions.emojis.giveHelpEmoji,
                joinTicketEmoji: this.caveOptions.emojis.joinTicketEmoji,
                reminderInfo: {
                    isEnabled: true,
                    time: this.caveOptions.times.reminderTime,
                },
                mainHelperInfo: {
                    role: this.caveOptions.role,
                    emoji: this.caveOptions.emojis.requestTicketEmoji,
                },
                embedCreator: (ticket) => new MessageEmbed()
                    .setTitle(`New Ticket - ${ticket.id}`)
                    .setDescription(`<@${ticket.group.first().id}> has a question: ${ticket.question}`)
                    .addField('They are requesting:', `<@&${ticket.requestedRole.id}>`)
                    .setTimestamp(),
            },
            systemWideTicketInfo: {
                garbageCollectorInfo: {
                    isEnabled: true,
                    inactivePeriod: this.caveOptions.times.inactivePeriod,
                    bufferTime: this.caveOptions.times.bufferTime
                },
                isAdvancedMode: true,
            }
        }, this.guild, this.botGuild);

        await this.ticketManager.sendTicketCreatorConsole('Get some help from our mentors!', 
            'To submit a ticket to the mentors please react to this message with the appropriate emoji. **If you are unsure, select a general ticket!**');
    }

    addDefaultFeatures() {
        /** @type {Console.Feature[]} */
        let localFeatures = [
            Console.newFeature({
                name: 'Add Sub-Role',
                description: 'Add a new sub-role cave members can select and users can use to ask specific tickets.',
                emoji: this.caveOptions.emojis.addRoleEmoji,
                callback: (user, reaction, stopInteracting, console) => this.addSubRoleCallback(console.channel, user.id).then(() => stopInteracting()),
            }),
            Console.newFeature({
                name: 'Delete Ticket Channels',
                description: 'Get the ticket manager to delete ticket rooms to clear up the server.',
                emoji: this.caveOptions.emojis.deleteChannelsEmoji,
                callback: (user, reaction, stopInteracting, console) => this.deleteTicketChannelsCallback(console.channel, user.id).then(() => stopInteracting()),
            }),
            Console.newFeature({
                name: 'Include/Exclude Tickets',
                description: 'Include or exclude tickets from the automatic garbage collector.',
                emoji: this.caveOptions.emojis.excludeFromAutoDeleteEmoji,
                callback: (user, reaction, stopInteracting, console) => this.includeExcludeCallback(console.channel, user.id).then(() => stopInteracting()),
            }),
        ];

        localFeatures.forEach(feature => this.adminConsole.addFeature(feature));

        super.addDefaultFeatures();
    }

    /**
     * Prompts a user for information to create a new sub role for this cave.
     * @param {TextChannel} channel 
     * @param {String} userId 
     * @returns {Promise<Role>}
     * @async
     */
    async addSubRoleCallback(channel, userId) {
        let roleNameMsg = await StringPrompt.single({prompt: 'What is the name of the new role?', channel, userId});

        let roleName = roleNameMsg.content;

        let emojis = new Map();
        this.subRoles.forEach((subRole, emojiName, map) => {
            emojis.set(emojiName, subRole.name);
        });

        let reaction = await SpecialPrompt.singleRestrictedReaction({ prompt: 'What emoji do you want to associate with this new role?', channel, userId }, emojis);
        let emoji = reaction.emoji;

        // search for possible existing role
        let findRole = this.guild.roles.cache.find(role => role.name.toLowerCase() === `${this.caveOptions.preRoleText}-${roleName}`.toLowerCase());
        let useOld;
        if (findRole) useOld = await SpecialPrompt.boolean({ prompt: 'I have found a role with the same name! Would you like to use that one? If not I will create a new one.', channel, userId });

        let role;
        if (useOld) role = findRole; 
        else role = await this.guild.roles.create({
            data: {
                name: `${this.caveOptions.preRoleText}-${roleName}`,
                color: this.caveOptions.color,
            }
        });

        this.addSubRole(role, emoji);

        try {
            let addPublic = await SpecialPrompt.boolean({ prompt: 'Do you want me to create a public text channel?', channel, userId });
            if (addPublic) this.publicRoom.addRoomChannel({ name: roleName });
        } catch {
            // do nothing
        }

        return role;
    }

    /**
     * Will prompt the user for more information to delete some, all, or a few tickets.
     * @param {TextChannel} channel 
     * @param {String} userId 
     * @async
     */
    async deleteTicketChannelsCallback(channel, userId) {
        let type = await StringPrompt.restricted({
            prompt: 'Type "all" if you would like to delete all tickets before x amount of time or type "some" to specify which tickets to remove.', 
            channel, 
            userId,
        }, ['all', 'some']);

        switch (type) {
            case 'all': {
                let age = await NumberPrompt.single({prompt: 'Enter how old, in minutes, a ticket has to be to remove. Send 0 if you want to remove all of them. Careful - this cannot be undone!', channel, userId});
                this.ticketManager.removeTicketsByAge(age);
                sendMsgToChannel(channel, userId, `All tickets over ${age} have been deleted!`);
                break;
            }
            case('some'): {
                let subtype = await StringPrompt.restricted({
                    prompt: 'Would you like to remove all tickets except for some tickets you specify later or would you like to remove just some tickets. Type all or some respectively.',
                    channel,
                    userId
                }, ['all', 'some']);

                switch (subtype) {
                    case 'all': {
                        let ticketMentions = await NumberPrompt.multi({
                            prompt: 'In one message write the numbers of the tickets to not delete! (Separated by spaces, ex 1 2 13).',
                            channel,
                            userId
                        });
                        this.ticketManager.removeAllTickets(ticketMentions);
                        break;
                    }
                    case 'some': {
                        let ticketMentions = await NumberPrompt.multi({
                            prompt: 'In one message type the ticket numbers you would like to remove! (Separated by spaces, ex. 1 23 3).',
                            channel,
                            userId,
                        });
                        this.ticketManager.removeTicketsById(ticketMentions);
                        break;
                    }
                }
            }  
        }
    }

    /**
     * Will prompt the user for channel numbers to include or exclude from the garbage collector.
     * @param {TextChannel} channel 
     * @param {String} userId 
     */
    async includeExcludeCallback(channel, userId) {
        let type = await StringPrompt.restricted({
            prompt: 'Would you like to include tickets on the automatic garbage collector or exclude tickets? Respond with include or exclude respectively.',
            channel,
            userId,
        }, ['include', 'exclude']);

        let tickets = await NumberPrompt.multi({
            prompt: `Type the ticket numbers you would like to ${type} separated by spaces.`,
            channel, 
            userId,
        });

        tickets.forEach((ticketNumber) => {
            let ticket = this.ticketManager.tickets.get(ticketNumber);
            ticket?.includeExclude(type === 'exclude' ? true : false);
        });
    }

    /**
     * Adds a subRole.
     * @param {Role} role - the role to add
     * @param {GuildEmoji} emoji - the emoji associated to this role
     * @param {Number} [currentActiveUsers=0] - number of active users with this role
     * @private
     */
    addSubRole(role, emoji, currentActiveUsers = 0) {
        /** @type {SubRole} */
        let subRoleName = role.name.substring(this.caveOptions.preRoleText.length + 1);
        let subRole = {
            name: subRoleName,
            id: role.id,
            activeUsers: currentActiveUsers,
        };

        // add to list of emojis being used
        this.subRoles.set(emoji.name, subRole);

        // add to subRole selector console
        this.subRoleConsole.addFeature(
            Console.newFeature({
                name: `-> If you know ${subRoleName}`,
                description: '---------------------------------',
                emoji: emoji,
                callback: (user, reaction, stopInteracting, console) => {
                    let member = this.guild.member(user);
                    addRoleToMember(member, role);
                    sendMsgToChannel(console.channel, user.id, `You have received the ${subRoleName} role!`, 10);
                    stopInteracting();
                },
                removeCallback: (user, reaction, stopInteracting, console) => {
                    let member = this.guild.member(user);
                    removeRolToMember(member, role);
                    sendMsgToChannel(console.channel, user.id, `You have lost the ${subRoleName} role!`, 10);
                    stopInteracting();
                },
            })
        );

        this.ticketManager.addTicketType(role, subRole.name, emoji);
    }

    /**
     * @override
     */
    delete() {
        this.publicRoom.delete();
        super.delete();
    }
}
module.exports = Cave;