const { Collection, User, GuildMember, Message, ReactionCollector, Role, MessageEmbed } = require('discord.js');
const winston = require("winston");
const discordServices = require('../../discord-services');
const Room = require("../room");
const TicketManager = require("./ticket-manager");

class Ticket {

    /**
     * @typedef MsgAndCollector
     * @property {Message} msg
     * @property {ReactionCollector} collector
     */

    /**
     * @typedef TicketMessages
     * @property {MsgAndCollector} groupLeader
     * @property {MsgAndCollector} ticketManager - Message sent to incoming ticket channel for helpers to see.
     * @property {MsgAndCollector} ticketRoom - The message with the information embed sent to the ticket channel once the ticket is open.
     */

    /**
     * @typedef TicketGarbageInfo
     * @property {Number} noHelperInterval - Interval ID for when there are no more helpers in the ticket
     * @property {Boolean} mentorDeletionSequence - Flag to check if a deletion sequence has already been triggered by all mentors leaving the ticket; if so, there will not be
     * another sequence started for inactivity
     * @property {Boolean} exclude - Flag for whether this ticket is excluded from automatic garbage collection
     */

    /**
     * The possible status of the ticket.
     * @enum {String}
     * @static
     */
    static STATUS = {
        /** Ticket is open for someone to take. */
        new: 'new',
        /** Ticket has been dealt with and is closed. */
        closed: 'closed',
        /** Ticket is being handled by someone. */
        taken: 'taken',
    }

    /**
     * Bot message containing information sent to ticket text channel
     * @param {User | GuildMember} teamLeader
     * @param {String} question
     * @param {MessageEmbed}
     * @static
     */
    static getTicketRoomEmbed = (teamLeader, question) => new MessageEmbed()
        .setColor(discordServices.embedColor)
        .setTitle('Original Question')
        .setDescription('<@' + teamLeader.id + '> has the question: ' + question);

    /**
     *      
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
        this.room = new Room(ticketManager.guild, ticketManager.botGuild, `Ticket-${ticketNumber}`, undefined, hackers);

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
         * All the group members.
         * @type {Collection<String, User>} - <ID, User>
         */
        this.group = hackers;

        /**
         * Mentors who join the ticket
         * @type {Collection<String, User>} - <ID, User>
         */
        this.helpers = new Collection();

        /**
         * @type {TicketMessages}
         */
        this.messages = {
            groupLeader: {
                msg: null,
                collector: null,
            },
            ticketManager: {
                msg: null,
                collector: null,
            },
            ticketRoom: {
                msg: null,
                collector: null,
            },
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
         * @type {Ticket.types}
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
     */
    setStatus(status, reason = '', user) {
        this.status = status;
        
        switch(status) {
            case Ticket.STATUS.new:
                // let user know that ticket was submitted and give option to remove ticket
                await this.contactGroupLeader();

                this.newStatusCallback();
                break;

            case Ticket.STATUS.taken:
                await this.takenStatusCallback(user);
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
        const ticketManagerMsgEmbed = this.ticketManager.ticketDispatcherInfo.embedCreator(
            this.group.first().username, 
            this.question, 
            this.requestedRole.id
        );
        this.messages.ticketManager.msg = await this.ticketManager.ticketDispatcherInfo.channel.send('<@&' + this.requestedRole.id + '>', ticketManagerMsgEmbed);
        this.messages.ticketManager.msg.react(this.ticketManager.ticketDispatcherInfo.takeTicketEmoji.name);

        // ticket manager helper console collector
        this.messages.ticketManager.collector = this.messages.ticketManager.msg.createReactionCollector((reaction, user) => {
            let isEmoji = false;
            if (this.status === Ticket.STATUS.new) 
                isEmoji = this.ticketManager.ticketDispatcherInfo.takeTicketEmoji.name === reaction.emoji.name;
            else if (this.status === Ticket.STATUS.taken)
                isEmoji = this.ticketManager.ticketDispatcherInfo.joinTicketEmoji.name === reaction.emoji.name;
            return !user.bot && isEmoji;
        });

        this.messages.ticketManager.collector.on('collect', async (reaction, helper) => {
            if (reaction.emoji.name === this.ticketManager.ticketDispatcherInfo.joinTicketEmoji) {
                // add new helper nad clear the interval
                this.helperJoinsTicket(helper);
            } else {
                this.setStatus(Ticket.STATUS.taken, 'helper has joined', helper);
            }
        });
    }

    /**
     * Contacts the group leader and sends a console with the ability to remove the ticket.
     * @private
     */
    async contactGroupLeader() {
        let removeTicketEmoji = '⚔️';
        this.messages.groupLeader.msg = await discordServices.sendEmbedToMember(this.requester, {
            title: 'Ticket was Successful!',
            description: 'Your ticket to the ' + this.ticketManager.parent.name + ' group was successful! It is ticket number ' + this.id + '.',
            fields: [{
                title: 'Remove the ticket',
                description: 'If you don\'t need help anymore, react to this message with ' + removeTicketEmoji,
            },
            {
                title: 'Ticket Description:',
                description: this.question,
            }]
        });
        this.messages.groupLeader.msg.react(removeTicketEmoji);

        // option to remove the ticket
        this.messages.groupLeader.collector = this.messages.groupLeader.msg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === removeTicketEmoji, { max: 1 });
        this.messages.groupLeader.collector.on('collect', (reaction, user) => {
            this.setStatus(Ticket.STATUS.closed, 'group leader closed the ticket');
        });
    }

    /**
     * Callback for status change for when the ticket is taken by a helper.
     * @param {User} helper - the helper user
     * @private
     */
    async takenStatusCallback(helper) {
        await this.room.init();

        // add helper and clear the ticket reminder timeout
        this.addHelper(helper);

        // edit ticket manager helper console with mentor information
        this.messages.ticketManager.msg.edit(this.messages.ticketManager.msg.embeds[0].addField('This ticket is being handled!', '<@' + helper.id + '> Is helping this team!')
            .addField('Still want to help?', 'Click the ' + this.ticketManager.ticketDispatcherInfo.joinTicketEmoji.toString() + ' emoji to join the ticket!')
            .setColor('#80c904'));
        this.messages.ticketManager.msg.react(this.ticketManager.ticketDispatcherInfo.joinTicketEmoji);

        // update dm with user to reflect that their ticket has been accepted
        this.messages.groupLeader.msg.edit(this.messages.groupLeader.msg.embeds[0].addField('Your ticket has been taken by a helper!', 'Please go to the corresponding channel and read the instructions there.'));
        this.messages.groupLeader.collector.stop();

        // send message mentioning all the parties involved so they get a notification
        let notificationMessage = '<@' + helper.id + '> ' + this.group.array().join(' ');
        this.room.channels.generalText.send(notificationMessage).then(msg => msg.delete({ timeout: 15000 }));

        // send message with information embed to the ticket room and get leave ticket collector going
        let leaveTicketEmoji = '👋🏽';
        let ticketRoomEmbed = Ticket.getTicketRoomEmbed(this.group.first(), this.question).addField('Thank you for helping this team.', '<@' + helper.id + '> Best of luck!')
            .addField('When done:', '* React to this message with ' + leaveTicketEmoji + ' to lose access to these channels!');

        this.messages.ticketRoom.msg = await this.room.channels.generalText.send(ticketRoomEmbed);
        this.messages.ticketRoom.msg.react(leaveTicketEmoji);

        this.messages.ticketRoom.collector = this.messages.ticketRoom.msg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === leaveTicketEmoji);
        this.messages.ticketRoom.collector.on('collect', async (reaction, exitUser) => {
            // delete the mentor or the group member that is leaving the ticket
            this.helpers.delete(exitUser.id);
            this.group.delete(exitUser.id);

            this.room.removeUserAccess(exitUser);

            // if all hackers are gone, delete ticket channels
            if (this.group.size === 0) {
                this.setStatus(Ticket.STATUS.closed, 'no users on the ticket remaining');
            }

            // tell hackers all mentors are gone and ask to delete the ticket if this has not been done already 
            else if (this.helpers.size === 0 && !this.garbageCollectorInfo.mentorDeletionSequence && !this.garbageCollectorInfo.exclude) {
                this.garbageCollectorInfo.mentorDeletionSequence = true;
                await this.askToDelete('mentor');
            }
        });

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
        this.messages.ticketManager.msg.edit(this.messages.ticketManager.msg.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
        this.messages.ticketRoom.msg.edit(this.messages.ticketRoom.msg.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
    }

    /**
     * Adds a helper to the ticket.
     * @param {User} user - the user to add to the ticket as a helper
     * @param {NodeJS.Timeout} [timeoutId] - the timeout to clear due to this addition
     * @private
     */
    addHelper(user, timeoutId) {
        this.helpers.set(user.id, user);
        this.room.giveUserAccess(user);
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
            msgText += `${this.helpers.array().map(user => '<@' + user.id + '>').join(' ')} Hello! I detected some inactivity on this channel and wanted to check in.\n`
        } else if (reason === 'mentor') {
            msgText += 'Hello! Your mentor(s) has/have left the ticket.\n'
        }

        let warning = await this.room.channels.generalText.send(`${msgText} If the ticket has been solved, please click the 👋 emoji above 
            to leave the channel. If you need to keep the channel, please click the emoji below, 
            **otherwise this ticket will be deleted in ${this.ticketManager.systemWideTicketInfo.garbageCollectorInfo.bufferTime} minutes**.`);

        await warning.react('🔄');

        // reaction collector to listen for someone to react with the emoji for more time
        const deletionCollector = warning.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🔄', { time: this.ticketManager.systemWideTicketInfo.garbageCollectorInfo.bufferTime * 60 * 1000, max: 1 });
        
        deletionCollector.on('end', async (collected) => {
            // if a channel has already been deleted by another process, stop this deletion sequence
            if (collected.size === 0 && !this.garbageCollectorInfo.exclude) { // checks to see if no one has responded and this ticket is not exempt
                this.setStatus(Ticket.STATUS.closed, 'inactivity');
            } else if (collected.size > 0) {
                await this.room.channels.generalText.send('You have indicated that you need more time. I\'ll check in with you later!');

                // set an interval to ask again later
                this.garbageCollectorInfo.noHelperInterval = setInterval(() => this.askToDelete('mentor'), this.ticketManager.systemWideTicketInfo.garbageCollectorInfo.inactivePeriod * 60 * 1000);
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
            if (collected.size === 0 && this.room.channels.generalVoice.members.size === 0) {
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
        this.messages.ticketManager.msg.edit(
            this.messages.ticketManager.msg.embeds[0].setColor('#128c1e').addField(
                'Ticket Closed', 
                `This ticket has been closed${reason ? ' due to ' + reason : '!! Good job!'}`
            )
        );
        this.messages.groupLeader.msg.edit(
            this.messages.groupLeader.msg.embeds[0].addField(
                'Ticket Closed!', 
                `Your ticket was closed due to ${reason}. If you need more help, please request another ticket!`
            )
        );

        // don't allow team leaders to close the ticket
        this.messages.groupLeader.collector.stop();

        // don't allow more mentors to join the ticket
        this.messages.ticketManager.collector.stop();

        // delete the room, clear intervals, remove ticket from the ticketManager
        this.room.delete();
        clearInterval(this.garbageCollectorInfo.noHelperInterval);
    }
}

module.exports = Ticket;
