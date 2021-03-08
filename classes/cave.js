const Discord = require("discord.js");
const discordServices = require('../discord-services');
const Prompt = require('../classes/prompt');
const Ticket = require('./tickets/ticket');
const BotGuild = require("../db/mongo/BotGuild");
const BotGuildModel = require('./bot-guild');
const winston = require("winston");
const TicketManager = require("./tickets/ticket-manager");

class Cave {

    /**
     * @typedef Emojis
     * @property {Discord.GuildEmoji | Discord.ReactionEmoji} joinTicketEmoji - emoji for mentors to accept a ticket
     * @property {Discord.GuildEmoji | Discord.ReactionEmoji} giveHelpEmoji - emoji for mentors to join an ongoing ticket
     * @property {Discord.GuildEmoji | Discord.ReactionEmoji} requestTicketEmoji - emoji for hackers to request a ticket
     * @property {Discord.GuildEmoji | Discord.ReactionEmoji} addRoleEmoji - emoji for Admins to add a mentor role
     * @property {Discord.GuildEmoji | Discord.ReactionEmoji} deleteChannelsEmoji - emoji for Admins to force delete ticket channels
     * @property {Discord.GuildEmoji | Discord.ReactionEmoji} excludeFromAutoDeleteEmoji - emoji for Admins to opt tickets in/out of garbage collector
     */

     /**
      * @typedef Times
      * @property {Number} inactivePeriod - number of minutes a ticket channel will be inactive before bot starts to delete it
      * @property {Number} bufferTime - number of minutes the bot will wait for a response before deleting ticket
      * @property {Number} reminderTime - number of minutes the bot will wait before reminding mentors of unaccepted tickets
      */

    /**
     * @typedef RoleInfo
     * @property {String} name - the role name
     * @property {Discord.Snowflake} id - the role id (snowflake)
     * @property {Number} activeUsers - number of users with this role
     */

    /**
     * @typedef PublicChannels
     * @property {Discord.CategoryChannel} category - the public category
     * @property {Discord.TextChannel} outgoingTickets - the outgoing ticket channel
     */

    /**
     * @typedef PrivateChannels
     * @property {Discord.CategoryChannel} category - the private category
     * @property {Discord.TextChannel} generalText - the general text channel
     * @property {Discord.TextChannel} console - the console channel
     * @property {Discord.TextChannel} incomingTickets - the incoming tickets channel
     * @property {Array<Discord.VoiceChannel>} voiceChannels - the cave voice channels
     */

    /**
     * @typedef EmbedMessages
     * @property {Discord.Message} adminConsole - the admin console embed message
     * @property {Discord.Message} console - the console embed message
     * @property {Discord.Message} request - the request embed message
     */


    /**
     * Constructor to create a cave.
     * @param {CaveOptions} caveOptions - the cave options
     * @param {BotGuildModel} botGuild
     */
    constructor(caveOptions, botGuild) {

        /**
         * The cave options.
         * @type {CaveOptions}
         */
        this.caveOptions;

        this.validateCaveOptions(caveOptions);

        /**
         * The private channels of this cave.
         * @type {PrivateChannels}
         */
        this.privateChannels = {
            voiceChannels: [],
        };

        /**
         * The public channel of this cave.
         * @type {PublicChannels}
         */
        this.publicChannels = {};

        /**
         * The adminEmojis
         * @type {Discord.Collection<String, Discord.GuildEmoji | Discord.ReactionEmoji>}
         */
        this.adminEmojis = new Discord.Collection();
        this.adminEmojis.set(this.caveOptions.emojis.addRoleEmoji.name, this.caveOptions.emojis.addRoleEmoji);
        this.adminEmojis.set(this.caveOptions.emojis.deleteChannelsEmoji.name, this.caveOptions.emojis.deleteChannelsEmoji);
        this.adminEmojis.set(this.caveOptions.emojis.excludeFromAutoDeleteEmoji.name, this.caveOptions.emojis.excludeFromAutoDeleteEmoji);

        /**
         * The emojis to use for roles.
         * key :  emoji id, 
         * value : RoleInfo
         * @type {Map<String, RoleInfo>}
         */
        this.emojis = new Map();

        /**
         * The embed messages
         * @type {EmbedMessages}
         */
        this.embedMessages = {};

        /**
         * The ticket count.
         * @type {Number}
         */
        this.ticketCount = 0;

        this.tickets = new Discord.Collection();

        /**
         * @type {TicketManager}
         */
        this.ticketManager;

        /**
         * @type {BotGuildModel}
         */
        this.botGuild = botGuild;

        winston.loggers.get(this.botGuild._id).event(`A cave named ${caveOptions.name} was created.`, {data: {caveOptions: caveOptions}, event: "Cave"});
    }


    /**
     * Create all the channels needed for this cave.
     * @param {Discord.GuildChannelManager} guildChannelManager - guild manager to create channels
     * @async
     */
    async init(guildChannelManager) {
        await this.initPrivate(guildChannelManager);
        await this.initPublic(guildChannelManager);
        this.createTicketManager(guildChannelManager.guild);
        winston.loggers.get(this.botGuild._id).event(`The cave named ${this.caveOptions.name} has been initialized!`, {event: "Cave"});
    }



    /**
     * Finds all the already created channels for this cave.
     * @param {Discord.TextChannel} channel - the channel where to prompt
     * @param {Discord.Snowflake} userId - the user to prompt
     * @async
     */
    async find(channel, userId) {
        try {
            let console = (await Prompt.channelPrompt({prompt: 'What is the cave\'s console channel?', channel, userId})).first();
            let generalText = (await Prompt.channelPrompt({prompt: 'What is the cave\'s general text channel?', channel, userId})).first();
            let incomingTickets = (await Prompt.channelPrompt({prompt: 'What is the cave\'s incoming tickets channel?', channel, userId})).first();
            let outgoingTickets = (await Prompt.channelPrompt({prompt: 'What is the cave\'s outgoing tickets channel?', channel, userId})).first();

            this.privateChannels = {
                console: console,
                category: console.parent,
                generalText: generalText,
                incomingTickets: incomingTickets,
                voiceChannels: console.parent.children.filter(channel => channel.type === 'voice').array(),
            };
    
            this.publicChannels = {
                outgoingTickets: outgoingTickets,
                category: outgoingTickets.parent,
            }
    
            // add request ticket channel to black list
            this.botGuild.blackList.set(this.publicChannels.outgoingTickets.id, 5000);
            this.botGuild.save();
            
            // delete everything from incoming outgoing and console
            this.publicChannels.outgoingTickets.bulkDelete(100, true);
            this.privateChannels.console.bulkDelete(100, true);
            this.privateChannels.incomingTickets.bulkDelete(100, true);
            winston.loggers.get(this.botGuild._id).event(`The cave ${this.caveOptions.name} found all the channels necessary created by the user.`, { event: "Cave", data: {privateChannels: this.privateChannels, publicChannels: this.publicChannels}});
            this.createTicketManager(channel.guild);
        } catch (error) {
            winston.loggers.get(this.botGuild._id).warning(`The cave ${this.caveOptions.name} was finding the channels, but found the error ${error}.`, {event: "Cave"});
            try {
                var isSure = await Prompt.yesNoPrompt({prompt: 'Are you sure you want to cancel? If you say yes, the channels will be created by me.', channel, userId});
            } catch (error) {
                winston.loggers.get(this.botGuild._id).warning(`The cave ${this.caveOptions.name} asked the user if they want to cancel the cave find and got this error ${error}`, {event: "Cave"});
                this.init(channel.guild.channels);
            }

            if (isSure) {
                winston.loggers.get(this.botGuild._id).verbose(`The cave ${this.caveOptions.name} was finding channels, got canceled and will now create the channels.`, {event: "Cave"});
                this.init(channel.guild.channels);
            } else {
                winston.loggers.get(this.botGuild._id).verbose(`The cave ${this.caveOptions.name} was finding channels, got canceled, but user re-triggered the find function.`, {event: "Cave"});
                this.find(channel, userId);
            }
        }
    }

    createTicketManager(guild) {
        this.ticketManager = new TicketManager(this, {
            ticketCreatorInfo: {
                channel: this.publicChannels.outgoingTickets,
            },
            ticketDispatcherInfo: {
                channel: this.privateChannels.incomingTickets,
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
                embedCreator: (ticket) => new Discord.MessageEmbed()
                    .setTitle(`New Ticket - ${ticket.id}`)
                    .setDescription(`<@${ticket.group.first().id}> has a question: ${ticket.question}`)
                    .addField(`They are requesting:`, `<@&${ticket.requestedRole.id}>`)
                    .addField(`Can you help them?`, `If so react to this message with ${ticket.ticketManager.ticketDispatcherInfo.takeTicketEmoji}.`)
                    .setTimestamp(),
            },
            systemWideTicketInfo: {
                garbageCollectorInfo: {
                    isEnabled: true,
                    inactivePeriod: this.caveOptions.times.inactivePeriod,
                    bufferTime: this.caveOptions.times.bufferTime,
                },
                isAdvancedMode: true,
            },
        }, guild, this.botGuild);
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
        if (!caveOptions.role instanceof Discord.Role) throw new Error('The caveOptions.role must be Role object!');
        for (const emoji in caveOptions.emojis) {
            if (!emoji instanceof Discord.GuildEmoji && !emoji instanceof Discord.ReactionEmoji) throw new Error('The ' + emoji + 'must be a GuildEmoji or ReactionEmoji!');
        }
        this.caveOptions = caveOptions;
    }


    /**
     * Creates all the private channels necessary!
     * @param {Discord.GuildChannelManager} guildChannelManager - guild manager to create channels
     * @private
     * @async
     */
    async initPrivate(guildChannelManager) {
        // Create category
        this.privateChannels.category = await guildChannelManager.create(this.caveOptions.preEmojis + this.caveOptions.name + ' Cave', {
            type: 'category',  
            permissionOverwrites: [
                {
                    id: this.botGuild.roleIDs.everyoneRole,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: this.caveOptions.role.id,
                    allow: ['VIEW_CHANNEL'],
                    deny: ['SEND_MESSAGES'],
                },
                {
                    id: this.botGuild.roleIDs.staffRole,
                    allow: ['VIEW_CHANNEL'],
                }
            ]
        });

        // general text channel to talk
        this.privateChannels.generalText = await guildChannelManager.create('✍' + this.caveOptions.name + '-banter', {
            type: 'text',
            parent: this.privateChannels.category,
            topic: 'For any and all social interactions. This entire category is only for ' + this.caveOptions.name + 's and staff!',
        }).then(channel => channel.updateOverwrite(this.caveOptions.role.id, { SEND_MESSAGES: true }));


        // console channel to ask for tags
        this.privateChannels.console = await guildChannelManager.create('📝' + this.caveOptions.name + '-console', {
            type: 'text',
            parent: this.privateChannels.category,
            topic: 'Sign yourself up for specific roles! New roles will be added as requested, only add yourself to one if you feel comfortable responding to questions about the topic.',
        });

        // incoming tickets
        this.privateChannels.incomingTickets = await guildChannelManager.create('📨incoming-tickets', {
            type: 'text',
            parent: this.privateChannels.category,
            topic: 'All incoming tickets! Those in yellow still need help!!! Those in green have been handled by someone.',
        });

        // create a couple of voice channels
        for (var i = 0; i < 3; i++) {
            this.privateChannels.voiceChannels.push(await guildChannelManager.create('🗣️ Room ' + i, { type: 'voice', parent: this.privateChannels.category }));
        }

        winston.loggers.get(this.botGuild._id).verbose(`The cave ${this.caveOptions.name} created the private channels. `, { event: "Cave", data: {privateChannels: this.privateChannels}});
    }

    /**
     * Creates the public channels needed for this cave.
     * @param {Discord.GuildChannelManager} guildChannelManager - guild manager to create channels
     * @private
     * @async
     */
    async initPublic(guildChannelManager) {
        // create help public channels category
        this.publicChannels.category = await guildChannelManager.create('👉🏽👈🏽' + this.caveOptions.name + ' Help', {
            type: 'category',
        });

        // create request ticket channel
        this.publicChannels.outgoingTickets = await guildChannelManager.create('🎫request-ticket', {
            type: 'text',
            parent: this.publicChannels.category,
            topic: 'Do you need help? Request a ticket here! Do not send messages, they will be automatically removed!',
        });

        // add request ticket channel to black list
        this.botGuild.blackList.set(this.publicChannels.outgoingTickets.id, 5000);
        this.botGuild.save();

        winston.loggers.get(this.botGuild._id).verbose(`The cave ${this.caveOptions.name} created the public channels. `, { event: "Cave", data: {publicChannels: this.publicChannels}});
    }

    /**
     * Sends all the necessary embeds to the channels.
     * @param {Discord.TextChannel} adminConsole - the admin console
     * @async
     */
    async sendConsoleEmbeds(adminConsole) {
        await this.sendAdminConsole(adminConsole);

        await this.sendCaveConsole();

        await this.sendRequestConsole();

        winston.loggers.get(this.botGuild._id).event(`The cave ${this.caveOptions.name} has sent all console embeds.`, {event: "Cave"});
    }
 
    /**
     * Send the request ticket console and creates the reaction collector.
     * @async
     * @private
     */
    async sendRequestConsole() {
        this.ticketManager.sendTicketCreatorConsole(
            'Ticket Request System', 
            `If you or your team want to talk with a ${this.caveOptions.name} follow the instructions below: 
            \n* React to this message with the correct emoji and follow instructions
            \n* Once done, wait for someone to accept your ticket!`,
        );
    }


    /**
     * Will send the cave console embed and create the collector.
     * @private
     * @async
     */
    async sendCaveConsole() {
        // cave console embed
        const caveConsoleEmbed = new Discord.MessageEmbed()
            .setColor(this.caveOptions.color)
            .setTitle(this.caveOptions.name + ' Role Console')
            .setDescription('Hi! Thank you for being here. \n* Please read over all the available roles. \n* Choose those you would feel ' +
                'comfortable answering questions for. \n* When someone sends a help ticket, and has specified one of your roles, you will get pinged!');
        this.embedMessages.console = await (await this.privateChannels.console.send(caveConsoleEmbed)).pin();

        const collector = this.embedMessages.console.createReactionCollector((reaction, user) => !user.bot && this.emojis.has(reaction.emoji.name), { dispose: true });

        collector.on('collect', async (reaction, user) => {
            let member = reaction.message.guild.member(user);
            let role = this.emojis.get(reaction.emoji.name);

            if (member.roles.cache.has(role.id)) {
                this.privateChannels.console.send('<@' + user.id + '> You already have the ' + role.name + ' role!').then(msg => msg.delete({ timeout: 10000 }));
                winston.loggers.get(this.botGuild._id).userStats(`The cave ${this.caveOptions.name} had a add role request from user ${user.id} but could not complete as 
                    he already has that role ${role.name} with id ${role.id}`, {event: "Cave"});
                return;
            }

            discordServices.addRoleToMember(member, role.id);
            role.activeUsers += 1;
            this.privateChannels.console.send('<@' + user.id + '> You have been granted the ' + role.name + ' role!').then(msg => msg.delete({ timeout: 10000 }));
            winston.loggers.get(this.botGuild._id).userStats(`The cave ${this.caveOptions.name} gave the user ${user.id} the role ${role.name} with id ${role.id}.`, {event: "Cave"});
        });

        collector.on('remove', (reaction, user) => {
            let member = reaction.message.guild.member(user);
            let role = this.emojis.get(reaction.emoji.name);

            discordServices.removeRolToMember(member, role.id);
            role.activeUsers -= 1;
            this.privateChannels.console.send('<@' + user.id + '> You have lost the ' + role.name + ' role!').then(msg => msg.delete({ timeout: 10000 }));
            winston.loggers.get(this.botGuild._id).userStats(`The cave ${this.caveOptions.name} has removed the users ${user.id}'s role named ${role.name} with id ${role.id}.`, {event: "Cave"});
        });
    }


    /**
     * Will send the admin console embed and create the collector.
     * @param {Discord.TextChannel} adminConsole - the admin console
     * @private
     * @async
     */
    async sendAdminConsole(adminConsole) {
        // admin console embed
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle(this.caveOptions.name + ' Cave Console')
            .setDescription(this.caveOptions.name + ' cave options are found below.')
            .addField('Add a role', 'To add a role please click the ' + this.caveOptions.emojis.addRoleEmoji.toString() + ' emoji.')
            .addField('Delete ticket channels', 'Click the ' + this.caveOptions.emojis.deleteChannelsEmoji.toString() + ' emoji to delete some or all mentor ticket channels.\n' +
                'Note that if some of a ticket\'s channels are deleted, it will be automatically excluded from the garbage collector.')
            .addField('Include/Exclude tickets from garbage collector', 'Click the ' + this.caveOptions.emojis.excludeFromAutoDeleteEmoji.toString() +
                ' emoji to include/exclude a ticket from being automatically deleted for inactivity or mentors leaving. (All tickets are included by default, and the status of partially deleted tickets cannot be changed)');
        this.embedMessages.adminConsole = await adminConsole.send(msgEmbed);
        this.adminEmojis.forEach(emoji => this.embedMessages.adminConsole.react(emoji));

        // create collector
        const collector = this.embedMessages.adminConsole.createReactionCollector((reaction, user) => !user.bot && this.adminEmojis.has(reaction.emoji.name));

        // on emoji reaction
        collector.on('collect', async (reaction, admin) => {
            // helpful prompt vars
            let channel = adminConsole;
            let userId = admin.id;

            // remove reaction
            reaction.users.remove(admin.id);

            if (reaction.emoji.name === this.adminEmojis.first().name) {
                winston.loggers.get(this.botGuild._id).verbose(`The cave ${this.caveOptions.name} is working on getting a new role thanks to user ${admin.id}.`, {event: "Cave"});
                
                try {
                    let role = await this.newRole(adminConsole, admin.id);
                    winston.loggers.get(this.botGuild._id).event(`The cave ${this.caveOptions.name} got a new role named ${role.name} with id ${role.id}.`, {event: "Cave"});

                    // let admin know the action was successful
                    adminConsole.send('<@' + admin.id + '> The role has been added!').then(msg => msg.delete({ timeout: 8000 }));
                } catch (error) {
                    winston.loggers.get(this.botGuild._id).warning(`The cave ${this.caveOptions.name} was getting a new role but was canceled due to ${error}.`, {event: "Cave"});
                    adminConsole.send('<@' + admin.id + '> The role was not created!').then(msg => msg.delete({timeout: 5000}));
                    return;
                }
            } else if (reaction.emoji.name === Array.from(this.adminEmojis.keys())[1]) { // check if the delete channels emoji was selected
                winston.loggers.get(this.botGuild._id).verbose(`The cave ${this.caveOptions.name} is working on deleting some channels from its ticket system thanks to user ${admin.id}.`, {event: "Cave"});

                // ask user whether they want to delete all channels / all channels older than an age that they specify, or specific channels
                let isDeleteAll = await Prompt.yesNoPrompt({prompt: 'Type "yes" if you would like to delete all ticket channels (you can also specify to delete all channels older than a certain age if you choose this option),\n' +
                    '"no" if you would like to only delete some.', channel, userId});

                if (isDeleteAll) {
                    // if user chose to delete all ticket channels, ask if they would like to delete all channels or all channels over
                    // a certain age
                    let age = (await Prompt.numberPrompt({prompt: 'Enter how old, in minutes, a ticket has to be to remove. ' +
                            'Send 0 if you want to remove all of them. Careful - this cannot be undone!', channel, userId}))[0];

                    this.ticketManager.removeTicketsByAge(age);

                    adminConsole.send('<@' + admin.id + '> All tickets over ' + age + ' minutes old have been deleted!').then(msg => msg.delete({ timeout: 8000 }));
                    winston.loggers.get(this.botGuild._id).event(`The cave ${this.caveOptions.name} deleted all of its tickets over ${age} minutes old.`, {event: "Cave"});
                } else {
                    // ask user if they want to name the tickets to not delete, or name the tickets to delete
                    let exclude = await Prompt.yesNoPrompt({prompt: 'Type "yes" if you would like to delete all tickets **except** for some you mention later, ' +
                        'or type "no" if you would like for the tickets you mention to be deleted.', channel, userId});
                    
                    let prompt = `In **one** message, send all the ticket numbers to be ${exclude ? 'excluded' : 'deleted'}, separated by spaces. Careful - this cannot be undone!`;

                    var ticketMentions = await Prompt.numberPrompt({prompt, channel, userId});
                    
                    if (exclude) { // check if user specified to exclude certain channels from being deleted
                        this.ticketManager.removeAllTickets(ticketMentions);
                    } else {
                        this.ticketManager.removeTicketsById(ticketMentions);
                    }

                    adminConsole.send('<@' + admin.id + '> The following tickets have been deleted: ' + Array.from(ticketsToDelete.keys()).join(', '))
                        .then(msg => msg.delete({ timeout: 8000 }));
                    winston.loggers.get(this.botGuild._id).event(`The cave ${this.caveOptions.name} lost the following tickets: ${Array.from(ticketsToDelete.keys()).join()}`, {event: "Cave"});
                
                }
            } else if (reaction.emoji.name === Array.from(this.adminEmojis.keys())[2]) { // check if Admin selected to include/exclude tickets from garbage collection
                winston.loggers.get(this.botGuild._id).verbose(`The cave ${this.caveOptions.name} is working on including or excluding some tickets from the 
                    ticket garbage collector thanks to user ${admin.id}.`, {event: "Cave"});

                var isExcluding = await Prompt.yesNoPrompt({ prompt: 'Would you like to exclude tickets, if not you will include tickets.', channel, userId});

                let ticketNumbers = await Prompt.numberPrompt({ prompt: `What tickets would you like to ${ isExcluding ? 'exclude' : 'include' }?`});

                ticketNumbers.forEach((ticketNumber) => {
                    let ticket = this.ticketManager.tickets.get(ticketNumber);
                    if (ticket) {
                        ticket.includeExclude(isExcluding);
                    }
                });

                // print the changes in Admin Console 
                adminConsole.send(`Status updated to ${isExcluding ? 'exclude' : 'include' } for tickets: ${ticketNumbers.join(', ')}`);
                winston.loggers.get(this.botGuild._id).event(`The cave ${this.caveOptions.name} changed some tickets status to ${exclude}. The tickets affected are: ${validNumbers.join()}`, {event: "Cave"});
            }
        });
    }


    /**
     * Will check the guild for already created roles for this cave.
     * @param {Discord.RoleManager} roleManager - the guild role manager
     * @param {Discord.TextChannel} adminConsole - the channel to prompt
     * @param {Discord.Snowflake} userId - the user's id to prompt
     */
    checkForExistingRoles(roleManager, adminConsole, userId) {
        let initialRoles = roleManager.cache.filter(role => role.name.startsWith(this.caveOptions.preRoleText + '-'));

        initialRoles.each(async role => {
            let emoji = await this.promptAndCheckReaction('React with emoji for role named: ', role.name, adminConsole, userId);

            let activeUsers = role.members.size;
            this.addRole(role, emoji, activeUsers);
        });
    }


    /**
     * Prompt for an emoji for a role, will make sure that emoji is not already in use!
     * @param {String} prompt - the prompt string
     * @param {String} roleName - the role name
     * @param {Discord.TextChannel} channel - channel to prompt for role
     * @param {Discord.Snowflake} userId - the user to prompt
     * @async
     * @private
     * @returns {Promise<Discord.GuildEmoji | Discord.ReactionEmoji>}
     */
    async promptAndCheckReaction(prompt, roleName, channel, userId) {
        return await Prompt.reactionPrompt({prompt: prompt + ' ' +  roleName + '.', channel, userId}, this.emojis);
    }


    /**
     * Adds a role to this cave
     * @param {Discord.Role} role - the role to add
     * @param {Discord.GuildEmoji} emoji - the emoji associated to this role
     * @param {Number} currentActiveUsers - number of active users with this role
     * @private
     */
    addRole(role, emoji, currentActiveUsers = 0) {
        // add to the emoji collection
        this.emojis.set(emoji.name, {
            name: role.name.substring(this.caveOptions.preRoleText.length + 1),
            id: role.id,
            activeUsers: currentActiveUsers,
        });

        // add to the embeds
        this.embedMessages.console.edit(this.embedMessages.console.embeds[0].addField('If you know ' + role.name.substring(2) + ' -> ' + emoji.toString(), '-------------------------------------'));
        this.embedMessages.console.react(emoji);

        this.embedMessages.request.edit(this.embedMessages.request.embeds[0].addField('Question about ' + role.name.substring(2) + ' -> ' + emoji.toString(), '-------------------------------------'));
        this.embedMessages.request.react(emoji);
    }


    /**
     * Prompts a user for a new role.
     * @param {Discord.TextChannel} channel - channel where to prompt
     * @param {Discord.Snowflake} userId - the user to prompt
     * @returns {Promise<Discord.Role>}
     * @async
     * @throws Throws an error if the prompt is canceled and the new role cant be created.
     */
    async newRole(channel, userId) {
        let roleNameMsg = await Prompt.messagePrompt({prompt: 'What is the name of the new role?', channel, userId}, 'string');

        let roleName = roleNameMsg.content;

        let emoji = await this.promptAndCheckReaction('What emoji do you want to associate with this new role?', roleName, channel, userId);

        // make sure the reaction is not already in use!
        if (this.emojis.has(emoji.name)) {
            message.channel.send('<@' + userId + '>This emoji is already in use! Please try again!').then(msg => msg.delete({ timeout: 8000 }));
            return;
        }

        let role = await channel.guild.roles.create({
            data: {
                name: this.caveOptions.preRoleText + '-' + roleName,
                color: this.caveOptions.color,
            }
        });

        this.addRole(role, emoji);

        try {
            var addPublic = await Prompt.yesNoPrompt({prompt: 'Do you want me to create a public text channel?', channel, userId});
        } catch (error) {
            // if canceled treat it as a false
            var addPublic = false;
        }

        if (addPublic) {
            channel.guild.channels.create(roleName, {
                type: 'text',
                parent: this.publicChannels.category,
                topic: 'For you to have a chat about ' + roleName,
            });
        }

        return role;
    }
}
module.exports = Cave;