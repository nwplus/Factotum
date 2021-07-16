const { Collection, User, Role } = require('discord.js');
const winston = require('winston');
const discordServices = require('../../../../discord-services');
const Console = require('../../../UI/Console/console');
const Feature = require('../../../UI/Console/feature');
const Room = require('../../../UI/Room/room');
const TicketManager = require('./ticket-manager');

class Ticket {

    /**
     * @typedef TicketConsoles
     * @property {Console} groupLeader
     * @property {Console} ticketManager - Message sent to incoming ticket channel for helpers to see.
     * @property {Console} ticketRoom - The message with the information embed sent to the ticket channel once the ticket is open.
     */

    /**
     * @typedef TicketGarbageInfo
     * @property {Number} noHelperInterval - Interval ID for when there are no more helpers in the ticket
     * @property {Boolean} mentorDeletionSequence - Flag to check if a deletion sequence has already been triggered by all mentors leaving the ticket; if so, there will not be
     * another sequence started for inactivity
     * @property {Boolean} exclude - Flag for whether this ticket is excluded from automatic garbage collection
     */

    /**
     * @param {Collection<String, User>} hackers 
     * @param {String} question 
     * @param {Role} requesterRole
     * @param {Number} ticketNumber
     * @param {TicketManager} ticketManager 
     */
    constructor(hackers, question, requestedRole, ticketNumber, ticketManager) {

        /**
         * Ticket number
         * @type {Number}
         */
        this.id = ticketNumber;

        /**
         * The room this ticket will be solved in.
         * @type {Room}
         */
        this.room = ticketManager.systemWideTicketInfo.isAdvancedMode ? new Room(ticketManager.parent.guild, ticketManager.parent.botGuild, `Ticket-${ticketNumber}`, undefined, hackers.clone()) : null;

        /**
         * Question from hacker
         * @type {String}
         */
        this.question = question;

        /**
         * @type {Role}
         */
        this.requestedRole = requestedRole;

        /**
         * All the group members, group leader should be the first one!
         * @type {Collection<String, User>} - <ID, User>
         * Must clone the Map since we edit it.
         */
        this.group = hackers.clone();

        /**
         * Mentors who join the ticket
         * @type {Collection<String, User>} - <ID, User>
         */
        this.helpers = new Collection();

        /**
         * All the consoles sent out.
         * GroupLeader -> sent via DM to leader, they can cancel the ticket from there
         * ticketManager -> sent to the helper channel
         * ticketRoom -> sent to the ticket room once created for users to leave
         * @type {TicketConsoles}
         */
        this.consoles = {
            groupLeader: null,
            ticketManager: null,
            ticketRoom: null,
        };

        /**
         * Garbage collector info.
         * @type {TicketGarbageInfo}
         */
        this.garbageCollectorInfo = {
            noHelperInterval: null,
            mentorDeletionSequence: false,
            exclude: false,
        };

        /**
         * The status of this ticket
         * @type {Ticket.STATUS}
         */
        this.status = null;

        /**
         * @type {TicketManager}
         */
        this.ticketManager = ticketManager; 
    }

    /**
     * This function is called by the ticket's Cave class to change its status between include/exclude for automatic garbage collection.
     * If a previously excluded ticket is re-included, the bot starts listening for inactivity as well.
     * @param {Boolean} exclude - true if ticket is now excluded from garbage collection, false if not
     */
    async includeExclude(exclude) {
        // oldExclude saves the previous inclusion status of the ticket
        var oldExclude = this.garbageCollectorInfo.exclude;
        // set excluded variable to new status
        this.garbageCollectorInfo.exclude = exclude;

        // if this ticket was previously excluded and is now included, start the listener for inactivity
        if (oldExclude && !exclude) {
            this.startChannelActivityListener();
        }
    }

    /**
     * Change the status of this ticket.
     * @param {String} status - one of Ticket.STATUS
     * @param {String} [reason] - the reason for the change
     * @param {User} [user] - user involved with the status change
     * @async
     */
    async setStatus(status, reason = '', user) {
        this.status = status;
        
        switch(status) {
            case Ticket.STATUS.new:
                // let user know that ticket was submitted and give option to remove ticket
                await this.contactGroupLeader();

                this.newStatusCallback();
                break;

            case Ticket.STATUS.taken:
                if (this.ticketManager.systemWideTicketInfo.isAdvancedMode) await this.advancedTakenStatusCallback(user);
                else await this.basicTakenStatusCallback(user);
                break;
            case Ticket.STATUS.closed:
                this.delete(reason);
                break;
        }
    }

    /**
     * The new ticket status callback creates the ticket manager helper console and sends it to the incoming tickets channel.
     * @private
     */
    async newStatusCallback() {
        const ticketManagerMsgEmbed = this.ticketManager.ticketDispatcherInfo.embedCreator(this);

        this.consoles.ticketManager = new Console({
            title: ticketManagerMsgEmbed.title,
            description: ticketManagerMsgEmbed.description,
            channel: this.ticketManager.ticketDispatcherInfo.channel,
            guild: this.ticketManager.parent.guild,
            color: '#fff536'
        });

        ticketManagerMsgEmbed.fields.forEach((embedField => {
            this.consoles.ticketManager.addField(embedField.name, embedField.value, embedField.inline);
        }));

        let joinTicketFeature = Feature.create({
            name: 'Can you help them?',
            description: 'If so, react to this message with the emoji!',
            emoji: this.ticketManager.ticketDispatcherInfo.takeTicketEmoji,
            callback: (user, reaction, stopInteracting) => {
                if (this.status === Ticket.STATUS.new) {
                    this.setStatus(Ticket.STATUS.taken, 'helper has taken the ticket', user);
                }
                stopInteracting();
            }
        });

        this.consoles.ticketManager.addFeature(joinTicketFeature);

        this.consoles.ticketManager.sendConsole(`<@&${this.requestedRole.id}>`);
    }

    /**
     * Contacts the group leader and sends a console with the ability to remove the ticket.
     * @private
     */
    async contactGroupLeader() {
        let removeTicketEmoji = '⚔️';
        this.consoles.groupLeader = new Console({
            title: 'Ticket was Successful!',
            description: `Your ticket to the ${this.ticketManager.parent.name} group was successful! It is ticket number ${this.id}`,
            channel: await this.group.first().createDM(),
            guild: this.ticketManager.parent.guild,
            features: new Collection([
                [removeTicketEmoji, {
                    name: 'Remove the ticket',
                    description: 'React to this message if you don\'t need help any more!',
                    emojiName: removeTicketEmoji,
                    callback: (user, reaction, stopInteracting) => {
                        // make sure user can only close the ticket if no one has taken the ticket
                        if (this.status === Ticket.STATUS.new) this.setStatus(Ticket.STATUS.closed, 'group leader closed the ticket');
                    },
                }]
            ]),
            options: { max: 1 }
        });

        this.consoles.groupLeader.sendConsole();
    }

    /**
     * Callback for status change to taken when ticket manager is NOT in advanced mode.
     * @param {User} helper - the user who is taking the ticket
     */
    async basicTakenStatusCallback(helper) {
        this.addHelper(helper);

        // edit ticket manager helper console with mentor information
        await this.consoles.ticketManager.addField('This ticket is being handled!', `<@${helper.id}> is helping this team!`);
        await this.consoles.ticketManager.changeColor('#36c3ff');

        // update dm with user to reflect that their ticket has been accepted
        this.consoles.groupLeader.addField('Your ticket has been taken by a helper!', 'Expect a DM from a helper soon!');
        this.consoles.groupLeader.stopConsole();
    }

    /**
     * Callback for status change for when the ticket is taken by a helper.
     * @param {User} helper - the helper user
     * @private
     */
    async advancedTakenStatusCallback(helper) {
        await this.room.init();

        // add helper and clear the ticket reminder timeout
        this.addHelper(helper);

        // edit ticket manager helper console with mentor information
        await this.consoles.ticketManager.addField('This ticket is being handled!', `<@${helper.id}> is helping this team!`);
        await this.consoles.ticketManager.changeColor('#36c3ff');

        let takeTicketFeature = Feature.create({
            name: 'Still want to help?',
            description: `Click the ${this.ticketManager.ticketDispatcherInfo.joinTicketEmoji.toString()} emoji to join the ticket!`,
            emoji: this.ticketManager.ticketDispatcherInfo.joinTicketEmoji,
            callback: (user, reaction, stopInteracting) => {
                if (this.status === Ticket.STATUS.taken) this.helperJoinsTicket(user);
                stopInteracting();
            }
        });
        await this.consoles.ticketManager.addFeature(takeTicketFeature);

        // update dm with user to reflect that their ticket has been accepted
        this.consoles.groupLeader.addField('Your ticket has been taken by a helper!', 'Please go to the corresponding channel and read the instructions there.');
        this.consoles.groupLeader.stopConsole();

        // send message mentioning all the parties involved so they get a notification
        let notificationMessage = '<@' + helper.id + '> ' + this.group.array().join(' ');
        this.room.channels.generalText.send(notificationMessage).then(msg => msg.delete({ timeout: 15000 }));

        let leaveTicketEmoji = '👋🏽';

        this.consoles.ticketRoom = new Console({
            title: 'Original Question',
            description: `<@${this.group.first().id}> has the question: ${this.question}`,
            channel: this.room.channels.generalText,
            color: this.ticketManager.parent.botGuild.colors.embedColor,
            guild: this.ticketManager.parent.guild,
        });

        this.consoles.ticketRoom.addField('Thank you for helping this team.', `<@${helper.id}> best of luck!`);
        this.consoles.ticketRoom.addFeature({
            name: 'When done:',
            description: `React to this message with ${leaveTicketEmoji} to lose access to these channels!`,
            emojiName: leaveTicketEmoji,
            callback: (user, reaction, stopInteracting) => {
                // delete the mentor or the group member that is leaving the ticket
                this.helpers.delete(user.id);
                this.group.delete(user.id);

                this.room.removeUserAccess(user);

                // if all hackers are gone, delete ticket channels
                if (this.group.size === 0) {
                    this.setStatus(Ticket.STATUS.closed, 'no users on the ticket remaining');
                }

                // tell hackers all mentors are gone and ask to delete the ticket if this has not been done already 
                else if (this.helpers.size === 0 && !this.garbageCollectorInfo.mentorDeletionSequence && !this.garbageCollectorInfo.exclude) {
                    this.garbageCollectorInfo.mentorDeletionSequence = true;
                    this.askToDelete('mentor');
                }

                stopInteracting();
            }
        });

        this.consoles.ticketRoom.sendConsole();

        //create a listener for inactivity in the text channel
        this.startChannelActivityListener();
    }

    /**
     * Callback for collector for when a new helper joins the ticket.
     * @param {User} helper - the new helper user
     * @private
     */
    helperJoinsTicket(helper) {
        this.addHelper(helper, this.garbageCollectorInfo.noHelperInterval);

        discordServices.sendMsgToChannel(this.room.channels.generalText, helper.id, 'Has joined the ticket!', 10);

        // update the ticket manager and ticket room embeds with the new mentor
        this.consoles.ticketManager.addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!');
        this.consoles.ticketRoom.addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!');
    }

    /**
     * Adds a helper to the ticket.
     * @param {User} user - the user to add to the ticket as a helper
     * @param {NodeJS.Timeout} [timeoutId] - the timeout to clear due to this addition
     * @private
     */
    addHelper(user, timeoutId) {
        this.helpers.set(user.id, user);
        if (this.room) this.room.giveUserAccess(user);
        if (timeoutId) clearTimeout(timeoutId);
    }

    /**
     * Main deletion sequence: mentions and asks hackers if ticket can be deleted, and deletes if there is no response or indicates that
     * it will check in again later if someone does respond
     * @param {String} reason - 'mentor' if this deletion sequence was initiated by the last mentor leaving, 'inactivity' if initiated by
     * inactivity in the text channel
     * @private
     */
    async askToDelete(reason) {
        // assemble message to send to hackers to verify if they still need the ticket
        let msgText = `${this.group.array().map(user => '<@' + user.id + '>').join(' ')} `;
        if (reason === 'inactivity') {
            msgText += `${this.helpers.array().map(user => '<@' + user.id + '>').join(' ')} Hello! I detected some inactivity on this channel and wanted to check in.\n`;
        } else if (reason === 'mentor') {
            msgText += 'Hello! Your mentor(s) has/have left the ticket.\n';
        }

        let warning = await this.room.channels.generalText.send(`${msgText} If the ticket has been solved, please click the 👋 emoji above 
            to leave the channel. If you need to keep the channel, please click the emoji below, 
            **otherwise this ticket will be deleted in ${this.ticketManager.systemWideTicketInfo.garbageCollectorInfo.bufferTime} minutes**.`);

        await warning.react('🔄');

        // reaction collector to listen for someone to react with the emoji for more time
        const deletionCollector = warning.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🔄', { time: this.ticketManager.systemWideTicketInfo.garbageCollectorInfo.bufferTime * 60 * 1000, max: 1 });
        
        deletionCollector.on('end', async (collected) => {
            // if a channel has already been deleted by another process, stop this deletion sequence
            if (collected.size === 0 && !this.garbageCollectorInfo.exclude && this.status != Ticket.STATUS.closed) { // checks to see if no one has responded and this ticket is not exempt
                this.setStatus(Ticket.STATUS.closed, 'inactivity');
            } else if (collected.size > 0) {
                await this.room.channels.generalText.send('You have indicated that you need more time. I\'ll check in with you later!');

                // set an interval to ask again later
                this.garbageCollectorInfo.noHelperInterval = setInterval(() => this.askToDelete(reason), this.ticketManager.systemWideTicketInfo.garbageCollectorInfo.inactivePeriod * 60 * 1000);
            }
        });
    }

    /**
     * Uses a message collector to see if there is any activity in the room's text channel. When the collector ends, if it collected 
     * no messages and there is no one on the voice channels then ask to delete and listen once again.
     * @async
     * @private
     */
    async startChannelActivityListener() {
        // message collector that stops when there are no messages for inactivePeriod minutes
        const activityListener = this.room.channels.generalText.createMessageCollector(m => !m.author.bot, { idle: this.ticketManager.systemWideTicketInfo.garbageCollectorInfo.inactivePeriod * 60 * 1000 });
        activityListener.on('end', async collected => {
            if (collected.size === 0 && this.room.channels.generalVoice.members.size === 0 && this.status === Ticket.STATUS.taken) {
                await this.askToDelete('inactivity');
                
                // start listening again for inactivity in case they ask for more time
                this.startChannelActivityListener(); 
            }
        });
    }

    /**
     * Deletes the ticket, the room and the intervals.
     * @param {String} reason - the reason to delete the ticket
     * @private
     */
    delete(reason) {
        // update ticketManager msg and let user know the ticket is closed
        this.consoles.ticketManager.addField(
            'Ticket Closed', 
            `This ticket has been closed${reason ? ' due to ' + reason : '!! Good job!'}`
        );
        this.consoles.ticketManager.changeColor('#43e65e');
        this.consoles.ticketManager.stopConsole();
        
        this.consoles.groupLeader.addField(
            'Ticket Closed!', 
            `Your ticket was closed due to ${reason}. If you need more help, please request another ticket!`
        );
        this.consoles.groupLeader.stopConsole();

        // delete the room, clear intervals
        if (this.room) this.room.delete();
        clearInterval(this.garbageCollectorInfo.noHelperInterval);
        
        if (this.consoles?.ticketRoom) this.consoles.ticketRoom.stopConsole();
    }
}

/**
 * The possible status of the ticket.
 * @enum {String}
 * @static
 */
Ticket.STATUS = {
    /** Ticket is open for someone to take. */
    new: 'new',
    /** Ticket has been dealt with and is closed. */
    closed: 'closed',
    /** Ticket is being handled by someone. */
    taken: 'taken',
};

module.exports = Ticket;
