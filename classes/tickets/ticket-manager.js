const { Collection, GuildEmoji, ReactionEmoji, TextChannel, Guild, Role, User } = require('discord.js');
const Ticket = require('./ticket');
const BotGuildModel = require('../bot-guild');
const Console = require('../console');
const { sendMsgToChannel } = require('../../discord-services');
const winston = require('winston');
const { StringPrompt } = require('advanced-discord.js-prompts');


/**
 * Represents a real life ticket system that can be used in any setting. It is very versatile so it can be 
 * used with one or many helper types, can edit options, embeds, etc.
 * @class
 */
class TicketManager {

    /**
     * All the information needed for tickets in this ticket manager
     * @typedef SystemWideTicketInfo
     * @property {GarbageCollectorInfo} garbageCollectorInfo - the garbage collector information for each tickets
     * @property {Boolean} isAdvancedMode Information about the system being advanced. Advanced mode will create a category with channels for 
     * the users and the helpers. Regular will not create anything and expects the helper to DM the user or users.
     */
    /**
     * @typedef GarbageCollectorInfo
     * @property {Boolean} isEnabled - if the garbage collector is enabled for this ticket system
     * @property {Number} inactivePeriod - number of minutes a ticket channel will be inactive before bot starts to delete it
     * @property {Number} bufferTime - number of minutes the bot will wait for a response before deleting ticket
     */

    /**
     * @typedef TicketCreatorInfo
     * @property {TextChannel} channel - the channel where users can create a ticket
     * @property {Console} console - the console used to let users create tickets
     */

    /**
     * @typedef TicketDispatcherInfo
     * @property {TextChannel} channel - the channel where tickets are dispatched to 
     * @property {GuildEmoji | ReactionEmoji} takeTicketEmoji - emoji for mentors to accept/take a ticket, can be a unicode emoji string
     * @property {GuildEmoji | ReactionEmoji} joinTicketEmoji - emoji for mentors to join a taken ticket, can be a unicode emoji string
     * @property {NewTicketEmbedCreator} embedCreator - function to create a Discord MessageEmbed
     * @property {ReminderInfo} reminderInfo - the reminder information
     * @property {MainHelperInfo} mainHelperInfo
     */
    /**
     * @typedef ReminderInfo
     * @property {Boolean} isEnabled - is this feature enabled
     * @property {Number} time - how long should I wait to remind helpers
     * @property {Collection<Number, NodeJS.Timeout>} reminders - the timeout reminders mapped by the ticket ID
     */
    /**
     * @callback NewTicketEmbedCreator
     * @param {Ticket} ticket
     * @returns {MessageEmbed}
     */
    /**
     * @typedef MainHelperInfo
     * @property {Role} role
     * @property {GuildEmoji | ReactionEmoji} emoji - can be a unicode emoji string
     */


    /**
     * @constructor
     * @param {import('../activities/activity')} parent 
     * @param {Object} args
     * @param {TicketCreatorInfo} args.ticketCreatorInfo
     * @param {TicketDispatcherInfo} args.ticketDispatcherInfo
     * @param {SystemWideTicketInfo} args.systemWideTicketInfo
     * @param {Guild} guild     
     * @param {BotGuildModel} botGuild
     */
    constructor(parent, { ticketCreatorInfo, ticketDispatcherInfo, systemWideTicketInfo }, guild, botGuild) {

        /**
         * The tickets in this ticket system.
         * @type {Collection<Number, Ticket>} - <Ticket Number (ID), Ticket>
         */
        this.tickets = new Collection();

        /**
         * The number of tickets created.
         */
        this.ticketCount = 0;

        /**
         * The parent of this ticket-system. It must be paired with a cave or an activity.
         * @type {import('../activities/activity')}
         */
        this.parent = parent;

        /**
         * @type {TicketCreatorInfo}
         */
        this.ticketCreatorInfo = {
            channel: null,
            console: null,
        };

        /**
         * @type {TicketDispatcherInfo}
         */
        this.ticketDispatcherInfo = {
            channel: null,
            takeTicketEmoji: null,
            joinTicketEmoji: null,
            embedCreator: null, // function
            reminderInfo: {
                isEnabled: null,
                time: null,
                reminders: new Collection(),
            },
            mainHelperInfo: {
                role: null,
                emoji: null,
            },
        };

        /**
         * @type {SystemWideTicketInfo}
         */
        this.systemWideTicketInfo = {
            garbageCollectorInfo: {
                isEnabled : false,
                inactivePeriod : null,
                bufferTime : null,
            },
            isAdvancedMode: false,
        };

        /**
         * Information about the system being multi role, if its the case, it needs a 
         * Multi Role Selector.
         */
        this.multiRoleInfo = {
            isEnabled : false,
            multiRoleSelector : null,
        };

        /** @type {BotGuildModel} */
        this.botGuild = botGuild;

        /** @type {Guild} */
        this.guild = guild;

        this.validateTicketSystemInfo({ ticketCreatorInfo, ticketDispatcherInfo, systemWideTicketInfo });
    }
    /**
     * 
     * @param {Object} param0 
     * @private
     */
    validateTicketSystemInfo({ ticketCreatorInfo, ticketDispatcherInfo, systemWideTicketInfo }) {
        this.ticketCreatorInfo = ticketCreatorInfo;
        this.ticketDispatcherInfo = ticketDispatcherInfo;
        this.systemWideTicketInfo = systemWideTicketInfo;
        this.ticketDispatcherInfo.reminderInfo.reminders = new Collection();
    }

    /**
     * Sends the ticket creator console.
     * @param {String} title - the ticket creator console title
     * @param {String} description - the ticket creator console description
     * @param {String} [color] - the ticket creator console color, hex
     * @async
     */
    async sendTicketCreatorConsole(title, description, color) {
        /** @type {Console.Feature[]} */
        let featureList = [
            Console.newFeature({
                name: 'General Ticket',
                description: 'A general ticket aimed to all helpers.',
                emoji: this.ticketDispatcherInfo.mainHelperInfo.emoji,
                callback: (user, reaction, stopInteracting, console) => this.startTicketCreationProcess(user, this.ticketDispatcherInfo.mainHelperInfo.role, console.channel).then(() => stopInteracting()),
            })
        ];

        let features = new Collection(featureList.map(feature => [feature.emojiName, feature]));

        this.ticketCreatorInfo.console = new Console({ title, description, channel: this.ticketCreatorInfo.channel, features, color, guild: this.guild });
        await this.ticketCreatorInfo.console.sendConsole();
    }

    /**
     * Adds a new type of ticket, usually a more focused field, there must be a role associated 
     * to this new type of ticket.
     * @param {Role} role - role to add
     * @param {String} typeName
     * @param {GuildEmoji | ReactionEmoji} emoji 
     */
    addTicketType(role, typeName, emoji) {
        this.ticketCreatorInfo.console.addFeature(
            Console.newFeature({
                name: `Question about ${typeName}`,
                description: '---------------------------------',
                emoji: emoji,
                callback: (user, reaction, stopInteracting, console) => {
                    this.startTicketCreationProcess(user, role, console.channel).then(() => stopInteracting());
                }
            })
        );
    }

    /**
     * Prompts a user for more information to create a new ticket for them.
     * @param {User} user - the user creating a ticket
     * @param {Role} role 
     * @param {TextChannel | DMChannel}
     * @async
     */
    async startTicketCreationProcess(user, role, channel) {
        // check if role has mentors in it
        if (role.members.size <= 0) {
            sendMsgToChannel(channel, user.id, 'There are no mentors available with that role. Please request another role or the general role!', 10);
            winston.loggers.get(this.botGuild._id).userStats(`The cave ${this.parent.name} received a ticket from user ${user.id} but was canceled due to no mentor having the role ${role.name}.`, { event: 'Ticket Manager' });
            return;
        }

        try {
            var promptMsg = await StringPrompt.single({prompt: 'Please send ONE message with: \n* A one liner of your problem ' + 
                                '\n* Mention your team members using @friendName (example: @John).', channel, userId: user.id, cancelable: true, time: 45});
        } catch (error) {
            winston.loggers.get(this.botGuild._id).warning(`New ticket was canceled due to error: ${error}`, { event: 'Ticket Manager' });
            return;
        }

        let hackers = new Collection();
        hackers.set(user.id, user);
        if (promptMsg.mentions.users.size > 0) hackers = hackers.concat([promptMsg.mentions.users]);

        this.newTicket(hackers, promptMsg.cleanContent, role);
    }

    /**
     * Adds a new ticket.
     * @param {Collection<String, User>} hackers
     * @param {String} question
     * @param {Role} roleRequested
     * @private
     */
    newTicket(hackers, question, roleRequested) {
        let ticket = new Ticket(hackers, question, roleRequested, this.ticketCount, this);
        this.tickets.set(ticket.id, ticket);

        this.setReminder(ticket);

        this.ticketCount ++;

        ticket.setStatus('new');
    }

    /**
     * Sets a reminder to a ticket only if reminders are on.
     * @param {Ticket} ticket 
     * @private
     */
    setReminder(ticket) {
        // if reminders are on, set a timeout to reminder the main role of this ticket if the ticket is still new
        if (this.ticketDispatcherInfo.reminderInfo.isEnabled) {
            let timeout = setTimeout(() => {
                if (ticket.status === Ticket.STATUS.new) {
                    ticket.consoles.ticketManager.changeColor('#ff5736');
                    this.ticketDispatcherInfo.channel.send(`Hello <@&${this.ticketDispatcherInfo.mainHelperInfo.role.id}> ticket number ${ticket.id} still needs help!`)
                        .then(msg => msg.delete({ timeout: (this.ticketDispatcherInfo.reminderInfo.time * 60 * 1000)/2 }));
                    // sets another timeout
                    this.setReminder(ticket);
                }
            }, this.ticketDispatcherInfo.reminderInfo.time * 60 * 1000);

            this.ticketDispatcherInfo.reminderInfo.reminders.set(ticket.id, timeout);
        }
    }

    /**
     * Return the number of tickets in this ticket system.
     * @returns {Number}
     */
    getTicketCount() {
        return this.tickets.size;
    }

    /**
     * Removes all the tickets from this ticket manager.
     * @param {Number[]} [excludeTicketIds=[]] - tickets to be excluded
     */
    removeAllTickets(excludeTicketIds = []) {
        // exclude the tickets
        let ticketsToRemove;
        if (excludeTicketIds.length > 0) ticketsToRemove = this.tickets.filter((ticket, ticketId) => excludeTicketIds.includes(ticketId));
        else ticketsToRemove = this.tickets;

        ticketsToRemove.forEach((ticket, ticketId) => {
            this.removeTicket(ticketId);
        });
    }

    /**
     * Removes tickets by their ids
     * @param {Number[]} ticketIds - ticket ids to remove
     */
    removeTicketsById(ticketIds) {
        ticketIds.forEach(ticketId => {
            this.removeTicket(ticketId);
        });
    }

    /**
     * Removes all tickets older than the given age.
     * @param {Number} minAge - the minimum age in minutes
     * @throws Error when used and advanced mode is turned off
     */
    removeTicketsByAge(minAge) {
        // only usable when advanced mode is turned on
        if (!this.systemWideTicketInfo.isAdvancedMode) throw new Error('Remove by age is only available when advanced mode is on!');
        this.tickets.forEach((ticket, ticketId, tickets) => {
            let now = Date.now();

            let timeDif = now - ticket.room.timeCreated;

            if (timeDif > minAge * 50 * 1000) {
                this.removeTicket(ticketId);
            }
        });
    }

    /**
     * Removes a ticket, deletes the ticket's channels too!
     * @param {Number} ticketId - the ticket id to remove
     */
    removeTicket(ticketId) {
        // remove the reminder for this ticket if reminders are on
        if (this.ticketDispatcherInfo.reminderInfo.isEnabled && this.ticketDispatcherInfo.reminderInfo.reminders.has(ticketId)) {
            clearTimeout(this.ticketDispatcherInfo.reminderInfo.reminders.get(ticketId));
            this.ticketDispatcherInfo.reminderInfo.reminders.delete(ticketId);
        }
        this.tickets.get(ticketId).setStatus(Ticket.STATUS.closed, 'ticket manager closed the ticket');
    }
}
module.exports = TicketManager;