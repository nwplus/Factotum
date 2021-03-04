const Discord = require("discord.js");
const { Collection, User } = require('discord.js');
const winston = require("winston");
const discordServices = require('../discord-services');
const Cave = require("./cave");
const Room = require("./room");
const TicketSystem = require("./ticket-system");

class Ticket {

    /**
     * @typedef TicketMessages
     * @property {Discord.Message} groupLeader
     * @property {Discord.Message} ticketManager - Message sent to incoming ticket channel for helpers to see.
     * @property {Discord.Message} ticketRoom - The message with the information embed sent to the ticket channel once the ticket is open.
     */

    /**
     * @typedef TicketGarbageInfo
     * @property {Number} interval - Interval ID for setInterval and clearInterval functions
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
        open: 'open',
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
    static getTicketRoomEmbed = (teamLeader, question) => new Discord.MessageEmbed()
        .setColor(discordServices.embedColor)
        .setTitle('Original Question')
        .setDescription('<@' + teamLeader.id + '> has the question: ' + question);

    /**
     * 
     * @param {*} question 
     * @param {Collection<String, User>} hackers 
     * @param {*} ticketNumber 
     */
    constructor(question, hackers, ticketNumber, guild, botGuild) {

        /**
         * The room this ticket will be solved in.
         * @type {Room}
         */
        this.room = new Room(guild, botGuild, `Ticket-${ticketNumber}`, undefined, hackers);

        /**
         * Question from hacker
         * @type {String}
         */
        this.question = question;

        /**
         * All the group members.
         * @type {Discord.User[]}
         */
        this.group = hackers.array();

        /**
         * Mentors who join the ticket
         * @type {Discord.User[]}
         */
        this.helpers = [];

        /**
         * Ticket number
         * @type {Number}
         */
        this.id = ticketNumber;

        /**
         * @type {TicketMessages}
         */
        this.messages = {
            groupLeader: null,
            ticketManager: null,
            ticketRoom: null,
        }

        /**
         * Garbage collector info.
         * @type {TicketGarbageInfo}
         */
        this.garbageCollectorInfo = {
            interval: null,
            mentorDeletionSequence: false,
            exclude: false,
        }

        /**
         * The status of this ticket
         * @type {Ticket.types}
         */
        this.status = Ticket.STATUS.open;

        /**
         * @type {TicketSystem}
         */
        this.ticketManager = ticketManager;  // TODO remove this.cave for this and also this.caveEmojis and this.bufferTime and this.inactivePeriod

        this.init();
    }

    /**
     * This function is called by the ticket's Cave class to change its status between include/exclude for automatic garbage collection.
     * If a previously excluded ticket is re-included, the bot starts listening for inactivity as well.
     * @param {Boolean} exclude - true if ticket is now excluded from garbage collection, false if not
     */
    async includeExclude(exclude) {
        // oldExclude saves the previous inclusion status of the ticket
        var oldExclude = this.excluded;
        // set excluded variable to new status
        this.excluded = exclude;

        // if this ticket was previously excluded and is now included, start the listener for inactivity
        if (oldExclude && !exclude) {
            this.createActivityListener();
        }
    }

    async init() {

        // reaction collector that listens for the emojis that trigger actions
        const ticketCollector = this.messages.ticketManager.createReactionCollector((reaction, user) => !user.bot && ticketEmojis.has(reaction.emoji.name));

        // if ticket has not been accepted after the specified time, it will send a reminder to the incoming tickets channel tagging all mentors
        var timeout = setTimeout(() => {
            this.cave.privateChannels.incomingTickets.send('Hello <@&' + this.cave.caveOptions.role + '> ticket number ' + this.ticketNumber + ' still needs help!');
        }, this.cave.caveOptions.times.reminderTime * 60 * 1000);

        // let user know that ticket was submitted and give option to remove ticket
        let removeTicketEmoji = '⚔️';

        let reqTicketUserEmbedMsg = await discordServices.sendEmbedToMember(this.requester, {
            title: 'Ticket was Successful!',
            description: 'Your ticket to the ' + this.cave.caveOptions.name + ' group was successful! It is ticket number ' + this.ticketNumber + '.',
            fields: [{
                title: 'Remove the ticket',
                description: 'If you don\'t need help anymore, react to this message with ' + removeTicketEmoji,
            },
            {
                title: 'Ticket Description:',
                description: this.question,
            }]
        });

        reqTicketUserEmbedMsg.react(removeTicketEmoji);
        let reqTicketUserEmbedMsgCollector = reqTicketUserEmbedMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === removeTicketEmoji, { max: 1 });
        reqTicketUserEmbedMsgCollector.on('collect', (reaction, user) => {
            // don't allow anyone to join ticket and update dm with user to show that ticket has been canceled
            ticketCollector.stop();
            this.messages.ticketManager.edit(this.messages.ticketManager.embeds[0].setColor('#128c1e').addField('Ticket Closed', 'This ticket has been closed by the user!'));
            reqTicketUserEmbedMsg.delete({ timeout: 3000 });
            discordServices.sendEmbedToMember(user, {
                title: 'Ticket Closed!',
                description: 'Your ticket number ' + this.ticketNumber + ' has been closed!',
            }, true);
            this.cave.tickets.delete(this.ticketNumber); // delete from cave's list of active tickets
            clearTimeout(timeout);
        });

        ticketCollector.on('collect', async (reaction, helper) => {
            if (reaction.emoji.name === this.caveEmojis.joinTicketEmoji.name) {
                // add new mentor to existing ticket channels
                this.room.giveUserAccess(helper);
                discordServices.sendMsgToChannel(this.room.channels.generalText, helper.id, 'Has joined the ticket!', 10);
                this.helpers.push(helper.id); //add new mentor to list of mentors

                // update the ticket manager and ticket room embeds with the new mentor
                this.messages.ticketManager.edit(this.messages.ticketManager.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
                this.messages.ticketRoom.edit(this.messages.ticketRoom.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
            } else {
                clearTimeout(timeout);

                // edit incoming ticket with mentor information
                this.messages.ticketManager.edit(this.messages.ticketManager.embeds[0].addField('This ticket is being handled!', '<@' + helper.id + '> Is helping this team!')
                    .addField('Still want to help?', 'Click the ' + this.caveEmojis.joinTicketEmoji.toString() + ' emoji to join the ticket!')
                    .setColor('#80c904'));
                this.messages.ticketManager.react(this.caveEmojis.joinTicketEmoji);
                ticketEmojis.delete(this.caveEmojis.giveHelpEmoji.name);
                ticketEmojis.set(this.caveEmojis.joinTicketEmoji.name, this.caveEmojis.joinTicketEmoji);

                // update dm with user to reflect that their ticket has been accepted
                const openedTicketEmbed = new Discord.MessageEmbed()
                    .setColor('#128c1e')
                    .setTitle('Your Ticket Number ' + this.ticketNumber + ' Has Been Opened!')
                    .setDescription('Your question: ' + this.question + '\nPlease go to the corresponding channel and read the instructions there.')
                reqTicketUserEmbedMsg.edit(openedTicketEmbed);
                reqTicketUserEmbedMsgCollector.stop();

                // new ticket, create channels and add users
                this.room.init();
                this.room.giveUserAccess(helper);

                let leaveTicketEmoji = '👋🏽';
                this.openTicketEmbed.addField('Thank you for helping this team.', '<@' + helper.id + '> Best of luck!')
                    .addField('When done:', '* React to this message with ' + leaveTicketEmoji + ' to lose access to these channels!');

                // send message with information embed to the ticket text channel
                this.messages.ticketRoom = await this.room.channels.generalText.send(this.openTicketEmbed);
                this.messages.ticketRoom.react(leaveTicketEmoji);
                this.helpers.push(helper.id);

                // send message mentioning all the parties involved so they get a notification
                let notificationMessage = '<@' + helper.id + '> ' + this.group.join(' ');
                this.room.channels.generalText.send(notificationMessage).then(msg => msg.delete({ timeout: 15000 }));

                this.createActivityListener(); //create a listener for inactivity in the text channel

                // reaction collector that listens for the emoji to leave a ticket
                const looseAccessCollector = this.messages.ticketRoom.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === leaveTicketEmoji);

                looseAccessCollector.on('collect', async (reaction, exitUser) => {
                    // if mentor is leaving, delete from mentors list
                    for (var i = 0; i < this.helpers.length; i++) {
                        if (this.helpers[i] === exitUser.id) {
                            this.helpers.splice(i, 1);
                        }
                    }

                    // if hacker is leaving, delete from hackers list
                    for (var i = 0; i < this.group.length; i++) {
                        if (this.group[i] === exitUser) {
                            this.group.splice(i, 1);
                        }
                    }

                    // if all hackers are gone, delete ticket channels
                    if (this.group.length === 0) {
                        ticketCollector.stop();
                        looseAccessCollector.stop();
                        this.messages.ticketManager.edit(this.messages.ticketManager.embeds[0].setColor('#128c1e').addField('Ticket Closed', 'This ticket has been closed!! Good job!'));
                        this.room.delete();
                        this.cave.tickets.delete(this.ticketNumber); // delete this ticket from the cave's Collection of active tickets
                    } else if (this.helpers.length === 0) {
                        this.room.removeUserAccess(exitUser);
                        // tell hackers mentor is gone and ask to delete the ticket if this has not been done already 
                        if (!this.garbageCollectorInfo.mentorDeletionSequence && !this.garbageCollectorInfo.exclude) {
                            this.garbageCollectorInfo.mentorDeletionSequence = true;
                            await this.askToDelete('mentor');
                            ticketCollector.stop();
                            // if none of the channels has been deleted (i.e. someone responded to the request to delete the channel by
                            // asking for more time) then set an interval to check in again later
                            if (!this.room.channels.category.deleted && !this.room.channels.generalText.deleted && !this.room.channels.generalVoice.deleted) {
                                this.interval = setInterval(() => this.askToDelete('mentor'), this.inactivePeriod * 60 * 1000);
                            }
                        }
                    } else {
                        //change user permissions so that they no longer have access
                        this.room.removeUserAccess(exitUser);
                    }
                });
            }
        });
    }

    /**
     * Main deletion sequence: mentions and asks hackers if ticket can be deleted, and deletes if there is no response or indicates that
     * it will check in again later if someone does respond
     * @param {String} reason - 'mentor' if this deletion sequence was initiated by the last mentor leaving, 'inactivity' if initiated by
     * inactivity in the text channel 
     */
    async askToDelete(reason) {
        // if ticket is missing a channel it does not start the sequence in case another deletion sequence is ongoing; also does not 
        // initiate if ticket is currently excluded from garbage collection
        if (this.room.channels.category.deleted || this.room.channels.generalText.deleted || this.room.channels.generalVoice.deleted || this.garbageCollectorInfo.exclude) return;

        // assemble message to send to hackers to verify if they still need the ticket
        var requestMsg = this.group.join(' ');
        if (reason === 'inactivity') {
            requestMsg = requestMsg + ' <@' + this.helpers.join('> <@') + '>'
            requestMsg = requestMsg + ' Hello! I detected some inactivity on this channel and wanted to check in.\n';
        } else if (reason === 'mentor') {
            requestMsg = requestMsg + ' Hello! Your mentor(s) has/have left the ticket.\n'
        }
        let warning = await this.room.channels.generalText.send(requestMsg + 'If the ticket has been solved, please click the 👋 emoji above to leave the channel. ' +
            'If you need to keep the channel, please click the emoji below, **otherwise this ticket will be deleted in ** ' + this.bufferTime + ' **minutes**.')

        await warning.react('🔄');

        // reaction collector to listen for someone to react with the emoji for more time
        const deletionCollector = warning.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🔄', { time: this.bufferTime * 60 * 1000, max: 1 });
        deletionCollector.on('end', async (collected) => {
            // if a channel has already been deleted by another process, stop this deletion sequence
            if (this.room.channels.category.deleted || this.room.channels.generalText.deleted || this.room.channels.generalVoice.deleted) {
                clearInterval(this.interval);
            } else if (collected.size === 0 && !this.garbageCollectorInfo.exclude) { // checks to see if no one has responded and this ticket is not exempt
                clearInterval(this.interval);

                // delete channels, update Cave's ticket Collection and edit message in incoming tickets if there is no other 
                // deletion process ongoing
                if (!this.room.channels.category.deleted && !this.room.channels.generalText.deleted && !this.room.channels.generalVoice.deleted) {
                    this.room.delete();
                    this.messages.ticketManager.edit(this.messages.ticketManager.embeds[0].setColor('#128c1e').addField('Ticket Closed Due to Inactivity', 'This ticket has been closed!! Good job!'));
                    discordServices.sendEmbedToMember(this.requester, {
                        title: 'Ticket Closed!',
                        description: 'Your ticket number ' + this.ticketNumber + ' was closed due to inactivity. If you need more help, please request another ticket!',
                    }, false);
                    this.cave.tickets.delete(this.ticketNumber);
                }
            } else if (collected.size > 0) {
                await this.room.channels.generalText.send('You have indicated that you need more time. I\'ll check in with you later!');
            }
        });
    }

    /**
     * Listen for inactivity on the text channel
     */
    async createActivityListener() {
        // stop listening if there is another deletion process ongoing
        if (this.room.channels.category.deleted || this.room.channels.generalText.deleted || this.room.channels.generalVoice.deleted || this.garbageCollectorInfo.exclude) return;
        // message collector that stops when there are no messages for inactivePeriod minutes
        const activityListener = this.room.channels.generalText.createMessageCollector(m => !m.author.bot, { idle: this.inactivePeriod * 60 * 1000 });
        activityListener.on('end', async collected => {
            //don't start deletion sequence if the text/voice channel got deleted while the collector was listening
            if (!this.room.channels.category.deleted && !this.room.channels.generalText.deleted && !this.room.channels.generalVoice.deleted) {
                if (this.room.channels.generalVoice.members.size === 0) {
                    await this.askToDelete('inactivity');
                }
                this.createActivityListener(); // start listening again for inactivity if they asked for more time
            }
        });
    }
}

module.exports = Ticket;
