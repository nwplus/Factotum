const { Collection } = require("discord.js");
const Discord = require("discord.js");
const winston = require("winston");
const discordServices = require('../discord-services');
const Cave = require("./cave");

class Ticket {
    /**
    * @typedef Emojis
    * @property {Discord.GuildEmoji | Discord.ReactionEmoji} joinTicketEmoji - emoji for mentors to accept a ticket
    * @property {Discord.GuildEmoji | Discord.ReactionEmoji} giveHelpEmoji - emoji for mentors to join an ongoing ticket
    * @property {Discord.GuildEmoji | Discord.ReactionEmoji} requestTicketEmoji - emoji for hackers to request a ticket
    * @property {Discord.GuildEmoji | Discord.ReactionEmoji} addRoleEmoji - emoji for Admins to add a mentor role
    * @property {Discord.GuildEmoji | Discord.ReactionEmoji} deleteChannelsEmoji - emoji for Admins to force delete ticket channels
    * @property {Discord.GuildEmoji | Discord.ReactionEmoji} excludeFromAutoDeleteEmoji - emoji for Admins to opt tickets in/out of garbage collector
    */

    constructor(guild, question, cave, requester, hackers, ticketNumber, ticketMsg, inactivePeriod, bufferTime) {
        /**
         * Guild this ticket is in
         * @type {Discord.Guild}
         */
        this.guild = guild;

        /**
         * Category this ticket's voice and text channels are under
         * @type {Discord.CategoryChannel}
         */
        this.category;

        /**
         * Question from hacker
         * @type {String}
         */
        this.question = question;

        /**
         * Text channel for this ticket
         * @type {Discord.TextChannel}
         */
        this.text;

        /**
         * Voice channel for this ticket
         * @type {Discord.VoiceChannel}
         */
        this.voice;

        /**
         * The cave this ticket is in
         * @type {Cave}
         */
        this.cave = cave;

        /**
         * Emojis used in the cave this ticket is in
         * @type {Emojis}
         */
        this.caveEmojis = cave.caveOptions.emojis;

        /**
         * User who requested the ticket
         * @type {Discord.User}
         */
        this.requester = requester;

        /**
         * Users(teammates) mentioned in the question
         * @type {Array<Discord.User>}
         */
        this.hackers = hackers;
        /**
         * Mentors who join the ticket
         * @type {Array<Discord.User>}
         */
        this.mentors = [];

        /**
         * Ticket number
         * @type {Number}
         */
        this.ticketNumber = ticketNumber;

        /**
         * Bot message containing information sent to ticket text channel
         * @type {Discord.MessageEmbed}
         */
        this.openTicketEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Original Question')
            .setDescription('<@' + this.requester.id + '> has the question: ' + this.question);

        /**
         * The message with the information embed sent to the ticket channel.
         * @type {Discord.Message}
         */
        this.openTicketEmbedMsg;

        /**
         * Message sent to incoming ticket channel
         * @type {Discord.Message} 
         */
        this.ticketMsg = ticketMsg;

        /**
         * Amount of time, in minutes, of inactivity in the ticket text channel before the bot initiates ticket deletion sequence
         * @type {Number} 
         */
        this.inactivePeriod = inactivePeriod;

        /**
         * Amount of time, in minutes, the bot will wait for a response after asking to delete a ticket
         * @type {Number}
         */
        this.bufferTime = bufferTime;

        /**
         * Interval ID for setInterval and clearInterval functions
         * @type {Number}
         */
        this.interval;

        /**
         * Flag to check if a deletion sequence has already been triggered by all mentors leaving the ticket; if so, there will not be
         * another sequence started for inactivity
         * @type {Boolean}
         */
        this.mentorDeletionSequence = false;

        /**
         * Flag for whether this ticket is excluded from automatic garbage collection
         * @type {Boolean}
         */
        this.excluded = false;

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

    /**
     * Create a category with the ticket's number, and a voice and text channel under it
     */
    async createCategory() {
        this.category = await this.guild.channels.create("Ticket - " + this.ticketNumber, {
            type: 'category',
            permissionOverwrites: [
                {
                    id: this.cave.botGuild.roleIDs.everyoneRole,
                    deny: ['VIEW_CHANNEL'],
                }
            ]
        });

        this.text = await this.guild.channels.create('banter', {
            type: 'text',
            parent: this.category
        });

        this.voice = await this.guild.channels.create('discussion', {
            type: 'voice',
            parent: this.category
        });
    }

    async init() {

        /**
         * @type {Discord.Collection<Discord.Snowflake, Discord.GuildEmoji>} - <guild emoji snowflake, guild emoji>
         */
        const ticketEmojis = new Discord.Collection();
        ticketEmojis.set(this.caveEmojis.giveHelpEmoji.name, this.caveEmojis.giveHelpEmoji);

        // permissions for users that will be added into the ticket category
        let ticketPermissions = { 'VIEW_CHANNEL': true, 'USE_VAD': true };

        // reaction collector that listens for the emojis that trigger actions
        const ticketCollector = this.ticketMsg.createReactionCollector((reaction, user) => !user.bot && ticketEmojis.has(reaction.emoji.name));

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
            this.ticketMsg.edit(this.ticketMsg.embeds[0].setColor('#128c1e').addField('Ticket Closed', 'This ticket has been closed by the user!'));
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
                await this.category.updateOverwrite(helper, ticketPermissions);
                this.text.send('<@' + helper.id + '> Has joined the ticket!').then(msg => msg.delete({ timeout: 10000 }));
                this.mentors.push(helper.id); //add new mentor to list of mentors

                this.ticketMsg.edit(this.ticketMsg.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
                this.openTicketEmbedMsg.edit(this.openTicketEmbedMsg.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
            } else {
                clearTimeout(timeout);
                // edit incoming ticket with mentor information
                this.ticketMsg.edit(this.ticketMsg.embeds[0].addField('This ticket is being handled!', '<@' + helper.id + '> Is helping this team!')
                    .addField('Still want to help?', 'Click the ' + this.caveEmojis.joinTicketEmoji.toString() + ' emoji to join the ticket!')
                    .setColor('#80c904'));
                this.ticketMsg.react(this.caveEmojis.joinTicketEmoji);
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
                await this.createCategory();
                await this.category.updateOverwrite(helper, ticketPermissions);
                this.hackers.forEach(user => this.category.updateOverwrite(user, ticketPermissions));

                let leaveTicketEmoji = '👋🏽';
                this.openTicketEmbed.addField('Thank you for helping this team.', '<@' + helper.id + '> Best of luck!')
                    .addField('When done:', '* React to this message with ' + leaveTicketEmoji + ' to lose access to these channels!');

                // send message with information embed to the ticket text channel
                this.openTicketEmbedMsg = await this.text.send(this.openTicketEmbed);
                this.openTicketEmbedMsg.react(leaveTicketEmoji);
                this.mentors.push(helper.id);

                // send message mentioning all the parties involved so they get a notification
                let notificationMessage = '<@' + helper.id + '> ' + this.hackers.join(' ');
                this.text.send(notificationMessage).then(msg => msg.delete({ timeout: 15000 }));

                this.createActivityListener(); //create a listener for inactivity in the text channel

                // reaction collector that listens for the emoji to leave a ticket
                const looseAccessCollector = this.openTicketEmbedMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === leaveTicketEmoji);

                looseAccessCollector.on('collect', async (reaction, exitUser) => {
                    // if mentor is leaving, delete from mentors list
                    for (var i = 0; i < this.mentors.length; i++) {
                        if (this.mentors[i] === exitUser.id) {
                            this.mentors.splice(i, 1);
                        }
                    }

                    // if hacker is leaving, delete from hackers list
                    for (var i = 0; i < this.hackers.length; i++) {
                        if (this.hackers[i] === exitUser) {
                            this.hackers.splice(i, 1);
                        }
                    }

                    // if all hackers are gone, delete ticket channels
                    if (this.hackers.length === 0) {
                        ticketCollector.stop();
                        looseAccessCollector.stop();
                        await discordServices.deleteChannel(this.voice);
                        await discordServices.deleteChannel(this.text);
                        await discordServices.deleteChannel(this.category);
                        this.ticketMsg.edit(this.ticketMsg.embeds[0].setColor('#128c1e').addField('Ticket Closed', 'This ticket has been closed!! Good job!'));
                        this.cave.tickets.delete(this.ticketNumber); // delete this ticket from the cave's Collection of active tickets
                    } else if (this.mentors.length === 0) {
                        this.category.updateOverwrite(exitUser, { VIEW_CHANNEL: false, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: false });
                        // tell hackers mentor is gone and ask to delete the ticket if this has not been done already 
                        if (!this.mentorDeletionSequence && !this.excluded) {
                            this.mentorDeletionSequence = true;
                            await this.askToDelete('mentor');
                            ticketCollector.stop();
                            // if none of the channels has been deleted (i.e. someone responded to the request to delete the channel by
                            // asking for more time) then set an interval to check in again later
                            if (!this.category.deleted && !this.text.deleted && !this.voice.deleted) {
                                this.interval = setInterval(() => this.askToDelete('mentor'), this.inactivePeriod * 60 * 1000);
                            }
                        }
                    } else {
                        //change user permissions so that they no longer have access
                        this.category.updateOverwrite(exitUser, { VIEW_CHANNEL: false, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: false });
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
        if (this.category.deleted || this.text.deleted || this.voice.deleted || this.excluded) return;

        // assemble message to send to hackers to verify if they still need the ticket
        var requestMsg = this.hackers.join(' ');
        if (reason === 'inactivity') {
            requestMsg = requestMsg + ' <@' + this.mentors.join('> <@') + '>'
            requestMsg = requestMsg + ' Hello! I detected some inactivity on this channel and wanted to check in.\n';
        } else if (reason === 'mentor') {
            requestMsg = requestMsg + ' Hello! Your mentor(s) has/have left the ticket.\n'
        }
        let warning = await this.text.send(requestMsg + 'If the ticket has been solved, please click the 👋 emoji above to leave the channel. ' +
            'If you need to keep the channel, please click the emoji below, **otherwise this ticket will be deleted in ** ' + this.bufferTime + ' **minutes**.')

        warning.react('🔄');

        // reaction collector to listen for someone to react with the emoji for more time
        const deletionCollector = warning.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🔄', { time: this.bufferTime * 60 * 1000, max: 1 });
        deletionCollector.on('end', async (collected) => {
            // if a channel has already been deleted by another process, stop this deletion sequence
            if (this.category.deleted || this.text.deleted || this.voice.deleted) {
                clearInterval(this.interval);
            } else if (collected.size === 0 && !this.excluded) { // checks to see if no one has responded and this ticket is not exempt
                clearInterval(this.interval);

                // delete channels, update Cave's ticket Collection and edit message in incoming tickets if there is no other 
                // deletion process ongoing
                if (!this.category.deleted && !this.text.deleted && !this.voice.deleted) {
                    await discordServices.deleteChannel(this.voice);
                    await discordServices.deleteChannel(this.text);
                    await discordServices.deleteChannel(this.category);
                    this.ticketMsg.edit(this.ticketMsg.embeds[0].setColor('#128c1e').addField('Ticket Closed Due to Inactivity', 'This ticket has been closed!! Good job!'));
                    this.cave.tickets.delete(this.ticketNumber);
                }
            } else if (collected.size > 0) {
                await this.text.send('You have indicated that you need more time. I\'ll check in with you later!');
            }
        });
    }

    /**
     * Listen for inactivity on the text channel
     */
    async createActivityListener() {
        // stop listening if there is another deletion process ongoing
        if (this.category.deleted || this.text.deleted || this.voice.deleted || this.excluded) return;
        // message collector that stops when there are no messages for inactivePeriod minutes
        const activityListener = this.text.createMessageCollector(m => !m.author.bot, { idle: this.inactivePeriod * 60 * 1000 });
        activityListener.on('end', async collected => {
            //don't start deletion sequence if the text/voice channel got deleted while the collector was listening
            if (!this.mentorDeletionSequence && !this.category.deleted && !this.text.deleted && !this.voice.deleted) {
                if (this.voice.members.array().length === 0) {
                    await this.askToDelete('inactivity');
                }
                this.createActivityListener(); // start listening again for inactivity if they asked for more time
            }
        });
    }
}

module.exports = Ticket;
