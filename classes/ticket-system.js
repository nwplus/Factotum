const { Collection, GuildEmoji, ReactionEmoji, MessageEmbed, TextChannel } = require("discord.js");
const Ticket = require('./ticket');
const Activity = require('./activities/activity');
const Cave = require('./cave');

/**
 * Represents a real life ticket system that can be used in any setting. It is very versatile so it can be 
 * used with one or many helper types, can edit options, embeds, etc.
 * @class
 */
module.exports = class TicketSystem {

    /**
     * @typedef TicketSystemChannels
     * @property {TextChannel} requestTickets - the channel ID for the channel where tickets are requested
     * @property {TextChannel} incomingTickets - the channel ID for the channel where tickets are displayed for helpers
     */

    /**
     * @typedef GarbageCollectorInfo
     * @property {Boolean} isEnabled - if the garbage collector is enabled for this ticket system
     * @property {Number} inactivePeriod - number of minutes a ticket channel will be inactive before bot starts to delete it
     * @property {Number} bufferTime - number of minutes the bot will wait for a response before deleting ticket
     */

    /**
     * @typedef TicketHelperConsoleInfo
     * @property {GuildEmoji | ReactionEmoji} takeTicketEmoji - emoji for mentors to accept a ticket
     * @property {GuildEmoji | ReactionEmoji} joinTicketEmoji - emoji for mentors to join an open ticket
     * @property {NewTicketEmbedCreator} embedCreator - function to create a Discord MessageEmbed
     */

    /**
     * @callback NewTicketEmbedCreator
     * @param {String} requesterName
     * @param {String} question
     * @param {String} requestedRoleID
     * @returns {MessageEmbed}
     */

    /**
     * @typedef ReminderInfo
     * @property {Boolean} isEnabled - is this feature enabled
     * @property {Number} time - how long should I wait to remind helpers
     */

    /**
     * 
     * @param {Cave | Activity} parent 
     * @param {Object} args
     * @param {TicketSystemChannels} args.channels
     * @param {GarbageCollectorInfo} args.garbageCollectorInfo
     * @param {TicketHelperConsoleInfo} args.ticketHelperConsoleInfo
     * @param {Object} args.requestTicketConsoleInfo
     * @param {Object} args.multiRoleInfo
     * @param {Boolean} args.isAdvancedMode
     * @param {Object} args.reminderInfo
     */
    constructor(parent, { channels, garbageCollectorInfo, ticketHelperConsoleInfo, requestTicketConsoleInfo, multiRoleInfo, isAdvancedMode, reminderInfo }) {

        /**
         * The tickets in this ticket system.
         * @type {Collection<Number, Ticket>} - <Ticket Number (ID), Ticket>
         */
        this.tickets = new Collection();

        /**
         * The parent of this ticket-system. It must be paired with a cave or an activity.
         * @type {Cave | Activity}
         */
        this.parent = parent;

        /**
         * The channels needed for a ticket system.
         * @type {TicketSystemChannels}
         */
        this.channels = {
            requestTickets : channels.requestTickets,
            incomingTickets : channels.incomingTickets,
        }

        /**
         * The garbage collector information.
         * @type {GarbageCollectorInfo}
         */
        this.garbageCollectorInfo = {
            isEnabled : false,
            inactivePeriod : null,
            bufferTime : null,
        }

        /**
         * The helper card information. Data for the msg that is sent to the incoming tickets channel every 
         * time a new ticket is submitted for helpers to browse.
         * @type {TicketHelperConsoleInfo}
         */
        this.ticketHelperConsoleInfo = {
            takeTicketEmoji : null,
            joinTicketEmoji : null,
            embedCreator : null,
        }

        /**
         * The reminder information for this ticket system.
         * @type {ReminderInfo}
         */
        this.reminderInfo = {
            isEnabled: false,
            time: null,
        }

        /**
         * The embed for the ticket-system information in case it must be unique. Also holds 
         * the message where the embed is sent for future editing.
         */
        this.requestTicketConsoleInfo = {
            informationEmbed : null,
            message : null,
        }

        /**
         * Information about the system being multi role, if its the case, it needs a 
         * Multi Role Selector.
         */
        this.multiRoleInfo = {
            isEnabled : false,
            multiRoleSelector : null,
        }

        /**
         * Information about the system being advanced. Advanced mode will create a category with channels for 
         * the users and the helpers. Regular will not create anything and expects the helper to DM the user or users.
         */
        this.isAdvancedMode = false;

        this.validateTicketSystemInfo({ channels, garbageCollectorInfo, ticketHelperConsoleInfo, requestTicketConsoleInfo, multiRoleInfo, isAdvancedMode, reminderInfo });
    }

    validateTicketSystemInfo({ channels, garbageCollectorInfo, ticketHelperConsoleInfo, requestTicketConsoleInfo, multiRoleInfo, isAdvancedMode, reminderInfo }) {
        this.channels = channels;
        this.garbageCollectorInfo = garbageCollectorInfo;
        this.ticketHelperConsoleInfo = ticketHelperConsoleInfo;
        this.requestTicketConsoleInfo = requestTicketConsoleInfo;
        this.multiRoleInfo = multiRoleInfo;
        this.isAdvancedMode = isAdvancedMode;
        this.reminderInfo = reminderInfo;
    }

    /**
     * Return the number of tickets in this ticket system.
     * @returns {Number}
     */
    getTicketCount() {
        return this.tickets.array().length;
    }

    /**
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
        this.tickets.get(ticketId).setStatus(Ticket.STATUS.closed, 'ticket manager closed the ticket');
    }

}