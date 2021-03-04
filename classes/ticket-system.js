const { Collection, GuildEmoji, ReactionEmoji, MessageEmbed } = require("discord.js");
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
     * @property {String} requestTickets - the channel ID for the channel where tickets are requested
     * @property {String} incomingTickets - the channel ID for the channel where tickets are displayed for helpers
     */

    /**
     * @typedef GarbageCollectorInfo
     * @property {Boolean} isEnabled - if the garbage collector is enabled for this ticket system
     * @property {Number} inactivePeriod - number of minutes a ticket channel will be inactive before bot starts to delete it
     * @property {Number} bufferTime - number of minutes the bot will wait for a response before deleting ticket
     */

    /**
     * @typedef HelperCardInfo
     * @property {GuildEmoji | ReactionEmoji} openTicketEmoji - emoji for mentors to accept a ticket
     * @property {GuildEmoji | ReactionEmoji} joinTicketEmoji - emoji for mentors to join an open ticket
     * @property {HelperCardEmbedCreator} embedCreator - function to create a Discord MessageEmbed
     */

    /**
     * @callback HelperCardEmbedCreator
     * @param {String} requesterName
     * @param {String} question
     * @param {String} requestedRoleID
     * @returns {MessageEmbed}
     */

    constructor(parent) {

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
        this.channelIDs = {
            requestTickets : null,
            incomingTickets : null,
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
         * @type {HelperCardInfo}
         */
        this.helperCardInfo = {
            openTicketEmoji : null,
            joinTicketEmoji : null,
            embedCreator : null,
        }

        /**
         * The general ticket information, this is the default helper information.
         */
        this.mainHelper = {
            roleID : null,
            emoji : null,
        }

        /**
         * The embed for the ticket-system information in case it must be unique. Also holds 
         * the message where the embed is sent for future editing.
         */
        this.requestTicketInfo = {
            informationEmbed : null,
            message : null,
        }

        /**
         * Information about the system being multi role, if its the case, it needs a 
         * Multi Role Selector.
         */
        this.multiRoleSystemInfo = {
            isEnabled : false,
            multiRoleSelector : null,
        }

        /**
         * Information about the system being advanced. Advanced mode will create a category with channels for 
         * the users and the helpers. Regular will not create anything and expects the helper to DM the user or users.
         */
        this.advancedModeInfo = {
            isEnabled : false,
            ticketTextEmbed : null,
        }

    }

    /**
     * Return the number of tickets in this ticket system.
     * @returns {Number}
     */
    getTicketCount() {
        return this.tickets.array().length;
    }

}