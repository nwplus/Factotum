const { Collection, GuildEmoji, ReactionEmoji, MessageEmbed, TextChannel, Guild, Role, ReactionEmoji } = require("discord.js");
const Ticket = require('./ticket');
const Activity = require('../activities/activity');
const Cave = require('../cave');
const BotGuildModel = require('../bot-guild');


/**
 * Represents a real life ticket system that can be used in any setting. It is very versatile so it can be 
 * used with one or many helper types, can edit options, embeds, etc.
 * @class
 */
module.exports = class TicketManager {

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
     * @property {Message} msg - the console users use to create a ticket
     * @property {function} embedCreator - a function to create the console
     */

    /**
     * @typedef TicketDispatcherInfo
     * @property {TextChannel} channel - the channel where tickets are dispatched to 
     * @property {GuildEmoji | ReactionEmoji} takeTicketEmoji - emoji for mentors to accept/take a ticket
     * @property {GuildEmoji | ReactionEmoji} joinTicketEmoji - emoji for mentors to join a taken ticket
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
     * @param {String} requesterName
     * @param {String} question
     * @param {String} requestedRoleID
     * @returns {MessageEmbed}
     */
    /**
     * @typedef MainHelperInfo
     * @property {Role} role
     * @property {GuildEmoji | ReactionEmoji} emoji
     */


    /**
     * @constructor
     * @param {Cave | Activity} parent 
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
         * @type {Cave | Activity}
         */
        this.parent = parent;

        /**
         * @type {TicketCreatorInfo}
         */
        this.ticketCreatorInfo = {
            channel: null,
            msg: null, // the console
            embedCreator: null, // function
        }

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
        }

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
        }

        /**
         * Information about the system being multi role, if its the case, it needs a 
         * Multi Role Selector.
         */
        this.multiRoleInfo = {
            isEnabled : false,
            multiRoleSelector : null,
        }

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
    }

    

    /**
     * Adds a new ticket.
     * @param {Users[]} hackers
     * @param {String} question
     * @param {Role} roleRequested
     */
    newTicket(hackers, question, roleRequested) {
        let ticket = new Ticket(hackers, question, roleRequested, this.ticketCount, this);
        this.tickets.set(ticket.id, ticket);

        this.setReminder(ticket);

        this.ticketCount ++;
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
                    this.ticketDispatcherInfo.channel.send(`Hello <@&${this.ticketDispatcherInfo.mainHelperInfo.role.id}> ticket number ${ticket.id} still needs help!`);
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
        return this.tickets.array().length;
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
     */
    removeTicketsByAge(minAge) {
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