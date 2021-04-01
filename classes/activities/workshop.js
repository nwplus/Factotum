const { Role, Collection, TextChannel, VoiceChannel, GuildCreateChannelOptions, MessageEmbed, Message } = require('discord.js');
const winston = require('winston');
const { randomColor, sendMessageToMember, sendMsgToChannel } = require('../../discord-services');
const Console = require('../console');
const Room = require('../room');
const TicketManager = require('../tickets/ticket-manager');
const Activity = require('./activity');
const { StringPrompt, SpecialPrompt, ListPrompt } = require('advanced-discord.js-prompts');


/**
 * @typedef PollInfo
 * @property {String} type
 * @property {String} title
 * @property {String} question
 * @property {String} emojiName - must be unicode emoji!
 * @property {Collection<String, String>} responses - <Emoji String, Description>
 */

/**
 * A workshop is an activity with a TA system to help users with questions.
 * The TA system has two options, regular or advanced. Regular option involves TAs reaching out via DMs to users while advanced option 
 * involves users joining a voice channel to receive help. The advanced option is only recommended with knowledgeable discord users.
 * It also has polls the TAs can send to learn basic knowledge from the audience.
 * @extends Activity
 */
class Workshop extends Activity {

    /**
     * 
     * @constructor
     * @param {Activity.ActivityInfo} 
     * @param {Boolean} [isLowTechSolution=true]
     * @param {Collection<String, Role>} [TARoles] - roles with TA permissions
     */
    constructor({activityName, guild, roleParticipants, botGuild}, isLowTechSolution = true, TARoles) {
        super({activityName, guild, roleParticipants, botGuild});

        /**
         * @type {Collection<String, Role>} - roles with TA permissions
         */
        this.TARoles = TARoles || new Collection();

        /**
         * True if the assistance protocol is low tech.
         * @type {Boolean}
         */
        this.isLowTechSolution = isLowTechSolution;

        /**
         * The channel where hackers can ask questions.
         * @type {TextChannel}
         */
        this.assistanceChannel;

        /**
         * The channels only available to TAs
         * @type {Collection<String, TextChannel | VoiceChannel>} - <Channel Name, channel>
         */
        this.TAChannels = new Collection();

        /**
         * TA Console where assistance calls are sent.
         * @type {TextChannel}
         */
        this.TAConsole;

        /**
         * The message where we show the wait list live.
         * @type {Message}
         */
        this.waitListEmbedMsg;

        /**
         * wait list Collection
         * @type {Collection<String, String>} - <User Id, Username>
         */
        this.waitlist = new Collection();

        /**
         * The polls available.
         * @type {Collection<String, PollInfo>} - <Poll type, PollInfo>
         */
        this.polls = new Collection;

        /**
         * The ticket manager.
         * @type {TicketManager}
         */
        this.ticketManager;
    }


    /**
     * Initializes the workshop and adds the ta console, ta banter and assistance channel.
     * @override
     */
    async init() {
        await super.init();

        this.TAConsole = await this.addTAChannel('_🧑🏽‍🏫ta-console', {
            type: 'text',
            topic: 'The TA console, here TAs can chat, communicate with the workshop lead, look at the wait list, and send polls!',
        }, [], true);

        this.addTAChannel('_ta-banter', {
            topic: 'For TAs to talk without cluttering the console.',
        });

        this.assistanceChannel = await this.room.addRoomChannel({
            name: '🙋🏽assistance', 
            info: {
                type: 'text',
                topic: 'For hackers to request help from TAs for this workshop, please don\'t send any other messages!'
            },
            isSafe: true,
        });

        this.botGuild.blackList.set(this.assistanceChannel.id, 3000);
        this.botGuild.save();

        if (this.isLowTechSolution) {
            this.ticketManager = new TicketManager(this, {
                ticketCreatorInfo: {
                    channel: this.assistanceChannel,
                },
                ticketDispatcherInfo: {
                    channel: await this.room.addRoomChannel({
                        name: '_Incoming Tickets',
                        isSafe: true,
                    }),
                    takeTicketEmoji: '👍',
                    joinTicketEmoji: '☝️',
                    reminderInfo: {
                        isEnabled: true,
                        time: 5
                    },
                    mainHelperInfo: {
                        role: this.TARoles.first(),
                        emoji: '✋',
                    },
                    embedCreator: (ticket) => new MessageEmbed()
                        .setTitle(`New Ticket - ${ticket.id}`)
                        .setDescription(`<@${ticket.group.first().id}> has a question: ${ticket.question}`)
                        .setTimestamp(),
                },
                systemWideTicketInfo: {
                    garbageCollectorInfo: {
                        isEnabled: false,
                    },
                    isAdvancedMode: false,
                }
            }, this.guild, this.botGuild);
        }

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was transformed to a workshop.`, {event: 'Activity'});

        return this;
    }


    /**
     * Adds extra workshop features, plus the regular features. Also adds default polls.
     * @override
     */
    addDefaultFeatures() {
        this.addDefaultPolls();

        /** @type {Console.Feature[]} */
        let localFeatures = [];

        this.polls.forEach((pollInfo) => localFeatures.push({
            name: pollInfo.title,
            description: `Asks the question: ${pollInfo.title} - ${pollInfo.question}`,
            emojiName: pollInfo.emojiName,
            callback: (user, reaction, stopInteracting, console) => this.sendPoll(pollInfo.type).then(() => stopInteracting()),
        }));

        localFeatures.forEach(feature => this.adminConsole.addFeature(feature));

        super.addDefaultFeatures();
    }


    /**
     * Adds the default polls to the polls list.
     * @protected
     */
    addDefaultPolls() {
        /** @type {PollInfo[]} */
        let localPolls = [
            {
                title: 'Speed Poll!',
                type: 'Speed Poll',
                emojiName: '🏎️',
                question: 'Please react to this poll!',
                responses: new Collection([['🐢', 'Too Slow?'], ['🐶', 'Just Right?'], ['🐇', 'Too Fast?']]),
            },
            {
                title: 'Difficulty Poll!',
                type: 'Difficulty Poll',
                emojiName: '✍️',
                question: 'Please react to this poll! If you need help, go to the assistance channel!',
                responses: new Collection([['🐢', 'Too Hard?'], ['🐶', 'Just Right?'], ['🐇', 'Too Easy?']]),
            },
            {
                title: 'Explanation Poll!',
                type: 'Explanation Poll',
                emojiName: '🧑‍🏫',
                question: 'Please react to this poll!',
                responses: new Collection([['🐢', 'Hard to understand?'], ['🐶', 'Meh explanations?'], ['🐇', 'Easy to understand?']]),
            }
        ];

        localPolls.forEach(pollInfo => this.polls.set(pollInfo.type, pollInfo));
    }
    

    /**
     * Will send all the consoles the workshop needs to work.
     * @async
     */
    async sendConsoles() {
        let mentorColor = randomColor();

        const TAInfoEmbed = new MessageEmbed()
            .setTitle('TA Information')
            .setDescription('Please read this before the workshop starts!')
            .setColor(mentorColor);
        this.isLowTechSolution ? TAInfoEmbed.addField('Ticketing System is turned on!', `* Tickets will be sent to <#${this.ticketManager.ticketDispatcherInfo.channel.id}>
            \n* React to the ticket message and send the user a DM by clicking on their name`) :
            TAInfoEmbed.addField('Advanced Voice Channel System is turned on!', `* Users who need help will be listed in a message on channel <#${this.TAConsole}>
                \n* Users must be on the general voice channel to receive assistance
                \n* You must be on a private voice channel to give assistance
                \n* When you react to the message, the user will be moved to your voice channel so you can give assistance
                \n* Once you are done, move the user back to the general voice channel`);
        this.TAConsole.send(TAInfoEmbed);

        // Console for TAs to send polls and stamp distribution
        let TAPollingConsole = new Console({
            title: 'Polling and Stamp Console',
            description: 'Here are some common polls you might want to use!',
            channel: this.TAConsole,
            guild: this.guild,
        });
        this.polls.forEach((pollInfo) => TAPollingConsole.addFeature({
            name: pollInfo.title,
            description: `Asks the question: ${pollInfo.title} - ${pollInfo.question}`,
            emojiName: pollInfo.emojiName,
            callback: (user, reaction, stopInteracting, console) => this.sendPoll(pollInfo.type).then(() => stopInteracting()),
        }));
        TAPollingConsole.addFeature({
            name: 'Stamp Distribution',
            description: 'Activate a stamp distribution on the activity\'s text channel',
            emojiName: '📇',
            callback: (user, reaction, stopInteracting, console) => {
                this.distributeStamp(this.room.channels.generalText);
                stopInteracting();
            }
        });
        TAPollingConsole.sendConsole();

        if (this.isLowTechSolution) {
            await this.ticketManager.sendTicketCreatorConsole('Get some help from the Workshop TAs!', 
                'React to this message with the emoji and write a quick description of your question. A TA will reach out via DM soon.');
            this.ticketManager.ticketCreatorInfo.console.addField('Simple or Theoretical Questions', 'If you have simple or theory questions, ask them in the main banter channel!');
        } else {
            // embed message for TA console
            const incomingTicketsEmbed = new MessageEmbed()
                .setColor(mentorColor)
                .setTitle('Hackers in need of help waitlist')
                .setDescription('* Make sure you are on a private voice channel not the general voice channel \n* To get the next hacker that needs help click 🤝');
            this.TAConsole.send(incomingTicketsEmbed).then(message => this.incomingTicketsHandler(message));

            // where users can request assistance
            const outgoingTicketEmbed = new MessageEmbed()
                .setColor(this.botGuild.colors.embedColor)
                .setTitle(this.name + ' Help Desk')
                .setDescription('Welcome to the ' + this.name + ' help desk. There are two ways to get help explained below:')
                .addField('Simple or Theoretical Questions', 'If you have simple or theory questions, ask them in the main banter channel!')
                .addField('Advanced Question or Code Assistance', 'If you have a more advanced question, or need code assistance, click the 🧑🏽‍🏫 emoji for live TA assistance! Join the ' +  this.room.channels.generalVoice.name || Room.voiceChannelName + ' voice channel if not already there!');
            this.assistanceChannel.send(outgoingTicketEmbed).then(message => this.outgoingTicketHandler(message));
        }
    }


    /**
     * Adds a channel to the activity, ask if it will be for TAs or not.
     * @param {TextChannel} channel - channel to prompt user
     * @param {String} userId - user to prompt for channel info
     * @override
     */
    async addChannel(channel, userId) {
        // ask if it will be for TA
        let isTa = await SpecialPrompt.boolean({ prompt: 'Is this channel for TAs?', channel, userId });

        if (isTa) {
            /** @type {TextChannel} */
            let newChannel = await super.addChannel(channel, userId);
            this.getTAChannelPermissions().forEach(rolePermission => newChannel.updateOverwrite(rolePermission.id, rolePermission.permissions));
            this.TAChannels.set(newChannel.name, newChannel);
        } else {
            super.addChannel(channel, userId);
        }
    }


    /**
     * Creates a channel only available to TAs.
     * @param {String} name 
     * @param {GuildCreateChannelOptions} info
     * @returns {Promise<TextChannel | VoiceChannel>}
     * @async 
     */
    async addTAChannel(name, info) {
        let channel = await this.room.addRoomChannel({name, info, permissions: this.getTAChannelPermissions()});
        this.TAChannels.set(channel.name, channel);
        return channel;
    }


    /**
     * Returns the perms for a TA Channel
     * @protected
     * @returns {Activity.RolePermission[]}
     */
    getTAChannelPermissions() {
        /** The permissions for the TA channels */
        let TAChannelPermissions = [
            { id: this.botGuild.roleIDs.everyoneRole, permissions: { VIEW_CHANNEL: false } },
        ];

        // add regular activity members to the TA perms list as non tas, so they cant see that channel
        this.room.rolesAllowed.forEach(role => {
            TAChannelPermissions.push({id: role.id, permissions: {VIEW_CHANNEL: false}});

        });

        // Loop over ta roles, give them voice channel perms and add them to the TA permissions list
        this.TARoles.forEach(role => {
            TAChannelPermissions.push({id: role.id, permissions: {VIEW_CHANNEL: true}});
        });

        return TAChannelPermissions;
    }


    /**
     * FEATURES:
     */


    /**
     * Send a poll to the general text channel
     * @param {String} type - the type of poll to send
     * @async
     */
    async sendPoll(type, channel, userId) {
        let poll = this.polls.get(type);
        if (!poll) throw new Error('No poll was found of that type!');
        
        // create poll
        let description = poll.question + '\n\n';
        for (const key of poll.responses.keys()) {
            description += '**' + poll.responses.get(key) + '->** ' + key + '\n\n';
        }

        let qEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle(poll.title)
            .setDescription(description);

        // send poll to general text or prompt for channel
        let pollChannel;
        if ((await this.room.channels.generalText.fetch(true))) pollChannel = this.room.channels.generalText;
        else pollChannel = ListPrompt.singleListChooser({
            prompt: 'What channel should the poll go to?',
            channel: channel,
            userId: userId
        }, this.room.channels.textChannels.array());

        pollChannel.send(qEmbed).then(msg => {
            poll.responses.forEach((value, key) => msg.react(key));
        });

        winston.loggers.get(this.guild.id).event(`Activity named ${this.name} sent a poll with title: ${poll.title} and question ${poll.question}.`, { event: 'Workshop' });
    }

    /**
     * Creates and handles with the emoji reactions on the incoming ticket console embed
     * @param {Message} message 
     */
    incomingTicketsHandler(message) {
        message.pin();
        message.react('🤝');

        this.waitListEmbedMsg = message;

        // add reaction to get next in this message!
        const getNextCollector = message.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🤝');

        getNextCollector.on('collect', async (reaction, user) => {
            // remove the reaction
            reaction.users.remove(user.id);

            // check that there is someone to help
            if (this.waitlist.size === 0) {
                this.TAConsole.send('<@' + user.id + '> No one to help right now!').then(msg => msg.delete({ timeout: 5000 }));
                return;
            }

            // if pullInFunctionality is turned off then then just remove from list
            if (this.isLowTechSolution) {
                // remove hacker from wait list
                let hackerKey = this.waitlist.firstKey();
                this.waitlist.delete(hackerKey);

            } else {
                // grab the ta and their voice channel
                var ta = message.guild.member(user.id);
                var taVoice = ta.voice.channel;

                // check that the ta is in a voice channel
                if (taVoice === null || taVoice === undefined) {
                    this.TAConsole.send('<@' + user.id + '> Please join a voice channel to assist hackers.').then(msg => msg.delete({ timeout: 5000 }));
                    return;
                }

                // get next user
                let hackerKey = this.waitlist.firstKey();
                this.waitlist.delete(hackerKey);
                var hacker = message.guild.member(hackerKey);

                // if status mentor in use there are no hackers in list
                if (hacker === undefined) {
                    this.TAConsole.send('<@' + user.id + '> There are no hackers in need of help!').then(msg => msg.delete({ timeout: 5000 }));
                    return;
                }

                try {
                    await hacker.voice.setChannel(taVoice);
                    sendMessageToMember(hacker, 'TA is ready to help you! You are with them now!', true);
                    this.TAConsole.send('<@' + user.id + '> A hacker was moved to your voice channel! Thanks for your help!!!').then(msg => msg.delete({ timeout: 5000 }));
                } catch (err) {
                    sendMessageToMember(hacker, 'A TA was ready to talk to you, but we were not able to pull you to their voice ' +
                        'voice channel. Try again and make sure you are in the general voice channel!');
                    this.TAConsole.send('<@' + user.id + '> We had someone that needed help, but we were unable to move them to your voice channel. ' +
                        'They have been notified and skipped. Please help someone else!').then(msg => msg.delete({ timeout: 8000 }));
                }
            }

            // remove hacker from the embed list
            this.waitListEmbedMsg.edit(this.waitListEmbedMsg.embeds[0].spliceFields(0, 1));
        });
    }

    /**
     * Creates and handles with the emoji reactions on the outgoing ticket console embed
     * @param {Message} message 
     */
    outgoingTicketHandler(message) {
        message.pin();
        message.react('🧑🏽‍🏫');

        // filter collector and event handler for help emoji from hackers
        const helpCollector = message.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🧑🏽‍🏫');

        helpCollector.on('collect', async (reaction, user) => {
            // remove the emoji
            reaction.users.remove(user.id);

            // check that the user is not already on the wait list
            if (this.waitlist.has(user.id)) {
                sendMessageToMember(user, 'You are already on the TA wait list! A TA will get to you soon!', true);
                return;
            } else {
                var position = this.waitlist.size;
                // add user to wait list
                this.waitlist.set(user.id, user.username);
            }

            let oneLiner = await StringPrompt.single({prompt: 'Please send to this channel a one-liner of your problem or question. You have 20 seconds to respond', channel: this.assistanceChannel, userId: user.id });

            const hackerEmbed = new MessageEmbed()
                .setColor(this.botGuild.colors.embedColor)
                .setTitle('Hey there! We got you signed up to talk to a TA!')
                .setDescription('You are number: ' + position + ' in the wait list.')
                .addField(!this.isLowTechSolution ? 'JOIN THE VOICE CHANNEL!' : 'KEEP AN EYE ON YOUR DMs', 
                    !this.isLowTechSolution ? 'Sit tight in the voice channel. If you are not in the voice channel when its your turn you will be skipped, and we do not want that to happen!' :
                        'A TA will reach out to you soon via DM! Have your question ready and try to keep up with the workshop until then!');

            sendMessageToMember(user, hackerEmbed);

            // update message embed with new user in list
            this.waitListEmbedMsg.edit(this.waitListEmbedMsg.embeds[0].addField(user.username, '<@' + user.id + '> has the question: ' +  oneLiner));
            
            // send a quick message to let ta know a new user is on the wait list
            this.TAConsole.send('A new hacker needs help!').then(msg => msg.delete({timeout: 3000}));
        });
    }
}

module.exports = Workshop;