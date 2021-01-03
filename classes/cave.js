const Discord = require("discord.js");
const discordServices = require('../discord-services');
const Prompt = require('../classes/prompt');

class Cave {

    /**
     * @typedef CaveOptions
     * @property {String} name - the name of the cave category
     * @property {String} preEmojis - any pre name emojis
     * @property {String} preRoleText - the text to add before every role name, not including '-'
     * @property {String} color - the role color to use for this cave
     * @property {Discord.Role} role - the role associated with this cave
     * @property {String} joinTicketEmoji - the join ticket emoji
     * @property {String} giveHelpEmoji - the give help to ticket emoji
     */

    /**
     * @typedef RoleInfo
     * @property {String} name - the role name
     * @property {String} id - the role id (snowflake)
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
     * Contructor to create a cave.
     * @param {CaveOptions} caveOptions - the cave options
     */
    constructor(caveOptions) {

        /**
         * The name of the cave category.
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
         * @type {Array<String>}
         */
        this.adminEmojis = ['🧠'];

        /**
         * The emojis to use for roles.
         * key :  emoji name, 
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
         * The request ticket emoji to use.
         * @type {String}
         */
        this.requestTicketEmoji = '🎫';

        /**
         * The ticket count.
         * @type {Number}
         */
        this.ticketCount = 0;
    }


    /**
     * Create all the channels needed for this cave.
     * @param {Discord.GuildChannelManager} guildChannelManager - guild manager to create channels
     * @async
     */
    async init(guildChannelManager) {
        await this.initPrivate(guildChannelManager);
        await this.initPublic(guildChannelManager);
    }



    /**
     * Finds all the already created channels for this cave.
     * @param {Discord.TextChannel} channel - the channel where to prompt
     * @param {Discord.Snowflake} userID - the user to prompt
     * @async
     */
    async find(channel, userID) {
        let console = await Prompt.channelPrompt('What is the cave\'s console channel?', channel, userID);
        let generalText = await Prompt.channelPrompt('What is the cave\'s general text channel?', channel, userID);
        let incomingTickets = await Prompt.channelPrompt('What is the cave\'s incoming tickets channel?', channel, userID);
        let outgoingTickets = await Prompt.channelPrompt('What is the cave\'s outgoing tickets channel?', channel, userID);

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
        discordServices.blackList.set(this.publicChannels.outgoingTickets.id, 5000);
        
        // delete everything from incoming outgoing and console
        this.publicChannels.outgoingTickets.bulkDelete(100, true);
        this.privateChannels.console.bulkDelete(100, true);
        this.privateChannels.incomingTickets.bulkDelete(100, true);
    }

    /**
     * Validates and set the cave options.
     * @param {CaveOptions} caveOptions - the cave options to validate
     * @private
     */
    validateCaveOptions(caveOptions) {
        if (typeof caveOptions.name != 'string' && caveOptions.name.length === 0) throw new Error('caveOptions.name must be a non empty string');
        if (typeof caveOptions.preEmojis != 'string') throw new Error('The caveOptions.preEmojis must be a string of emojis!');
        if (typeof caveOptions.preRoleText != 'string' && caveOptions.preRoleText.length === 0) throw new Error('The caveOptions.preRoleText must be a non empty string!');
        if (typeof caveOptions.color != 'string' && caveOptions.color.length === 0) throw new Error('The caveOptions.color must be a non empty string!');
        if (!caveOptions.role instanceof Discord.Role) throw new Error('The caveOptions.role must be Role obbject!');
        if (typeof caveOptions.giveHelpEmoji != 'string') caveOptions.giveHelpEmoji = '🤝';
        if (typeof caveOptions.joinTicketEmoji != 'string') caveOptions.joinTicketEmoji = '🏃🏽';
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
        this.privateChannels.category = await guildChannelManager.create(this.caveOptions.preEmojis + this.caveOptions.name + ' Cave', {type: 'category',  permissionOverwrites: [
            {
                id: discordServices.hackerRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.attendeeRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: this.caveOptions.role.id,
                allow: ['VIEW_CHANNEL'],
                deny: ['SEND_MESSAGES'],
            },
            {
                id: discordServices.sponsorRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.staffRole,
                allow: ['VIEW_CHANNEL'],
            }
        ]});

        // general text channel to talk
        this.privateChannels.generalText = await guildChannelManager.create('✍' + this.caveOptions.name + '-banter', {
            type: 'text', 
            parent: this.privateChannels.category,
            topic: 'For any and all social interactions. This entire category is only for ' + this.caveOptions.name + 's and staff!',
        }).then(channel => channel.updateOverwrite(this.caveOptions.role.id, {SEND_MESSAGES: true}));


        // console channel to ask for tags
        this.privateChannels.console = await guildChannelManager.create('📝' + this.caveOptions.name + '-console', {
            type: 'text', 
            parent: this.privateChannels.category,
            topic: 'Sign yourself up for specific roles! New roles will be added as requested, only add yourself to one if you feel comfortable responing to questions about the topic.',
        });

        // incoming tickets
        this.privateChannels.incomingTickets = await guildChannelManager.create('📨incoming-tickets', {
            type: 'text', 
            parent: this.privateChannels.category,
            topic: 'All incoming tickets! Those in yellow still need help!!! Those in green have been handled by someone.',
        });

        // create a couple of voice channels
        for (var i = 0; i < 3; i++) {
            this.privateChannels.voiceChannels.push(await guildChannelManager.create('🗣️ Room ' + i, {type: 'voice', parent: this.privateChannels.category}));
        }
    }

    /**
     * Creates the public channels needed for this cave.
     * @param {Discord.GuildChannelManager} guildChannelManager - guild manager to create channels
     * @private
     * @async
     */
    async initPublic(guildChannelManager) {
        // create help public channels category
        this.publicChannels.category = await guildChannelManager.create('👉🏽👈🏽' + this.caveOptions.name + ' Help', {type: 'category', permissionOverwrites: [
            {
                id: discordServices.hackerRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.attendeeRole,
                allow: ['VIEW_CHANNEL'],
            },
            {
                id: this.caveOptions.role.id,
                allow: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.sponsorRole,
                allow: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.staffRole,
                allow: ['VIEW_CHANNEL'],
            }
        ]});

        // create request ticket channel
        this.publicChannels.outgoingTickets = await guildChannelManager.create('🎫request-ticket', {
            type: 'text', 
            parent: this.publicChannels.category,
            topic: 'Do you need help? Request a ticket here! Do not send messages, they will be automatically removed!',
        });

        // add request ticket channel to black list
        discordServices.blackList.set(this.publicChannels.outgoingTickets.id, 5000);
    }

    /**
     * Sends all the necessary embeds to the channels.
     * @param {Discord.TextChannel} adminConsole - the admin console
     * @param {Discord.Snowflake} promptUserId - the user to prompt
     * @async
     */
    async sendConsoleEmbeds(adminConsole, promptUserId) {
        await this.sendAdminConsole(adminConsole, promptUserId);

        await this.sendCaveConsole();

        await this.sendRequestConsole();
    }


    /**
     * @typedef TicketInfo
     * @property {Discord.CategoryChannel} category - the ticket category
     * @property {Discord.TextChannel} textChannel - the text channel
     * @property {Discord.VoiceChannel} voiceChannel - the voice channel
     * @property {Number} userCount - the reactions needed to remove the ticket
     */

    /**
     * Send the requst ticket console and creates the reaction collector.
     * @async
     * @private
     */
    async sendRequestConsole() {
        // cave request ticket embed
        const requestTicketEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Ticket Request System')
            .setDescription('If you or your team want to talk with a ' + this.caveOptions.name + ' follow the instructions below:' + 
            '\n* React to this message with the correct emoji and follow instructions' + 
            '\n* Once done, wait for someone to accept your ticket!')
            .addField('For a general ticket:', 'React with ' + this.requestTicketEmoji);
        this.embedMessages.request = await (await this.publicChannels.outgoingTickets.send(requestTicketEmbed)).pin();
        this.embedMessages.request.react(this.requestTicketEmoji);

        const collector = this.embedMessages.request.createReactionCollector((reaction, user) => !user.bot && (this.emojis.has(reaction.emoji.name) || reaction.emoji.name === this.requestTicketEmoji));

        collector.on('collect', async (reaction, user) => {
            // check if role they request has users in it
            if (this.emojis.has(reaction.emoji.name) && this.emojis.get(reaction.emoji.name).activeUsers === 0) {
                this.publicChannels.outgoingTickets.send('<@' + user.id + '> There are no mentors available with that role. Please request another role or the general role!').then(msg => msg.delete({timeout: 10000}));
                return;
            }

            let promptMsg = await Prompt.messagePrompt('Please send ONE message with: \n* A one liner of your problem ' + 
                                    '\n* Mention your team members using @friendName .', 'string', this.publicChannels.outgoingTickets, user.id, 45);
            
            if (promptMsg === null) return;

            this.ticketCount ++;

            var roleId;
            if (this.emojis.has(reaction.emoji.name)) roleId = this.emojis.get(reaction.emoji.name).id;
            else roleId = this.caveOptions.role.id;

            // the embed used in the incoming tickets channel to let mentors know about the question
            const incomingTicketEmbed = new Discord.MessageEmbed()
                .setColor(this.caveOptions.color)
                .setTitle('New Ticket! - ' + this.ticketCount)
                .setDescription('<@' + user.id + '> has the question: ' + promptMsg.content)
                .addField('They are requesting:', '<@&' + roleId + '>')
                .addField('Can you help them?', 'If so, react to this message with ' + this.caveOptions.giveHelpEmoji + '.');

            // the embed used to inform hackers and users of the open ticket, sent to the ticket text channel
            const openTicketEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('Original Question')
                .setDescription('<@' + user.id + '> has the question: ' + promptMsg.content);

            let ticketMsg = await this.privateChannels.incomingTickets.send('<@&' + roleId + '>', incomingTicketEmbed);
            ticketMsg.react(this.caveOptions.giveHelpEmoji);

            /**
             * @type {Discord.Collection<String, Number>} - <Emoji name, number>
             */
            const ticketEmojis = new Discord.Collection();
            ticketEmojis.set(this.caveOptions.giveHelpEmoji, 1);

            /**
             * @type {TicketInfo}
             */
            var ticketInfo = {};

            /**
             * The message with the infomration embed sent to the ticket channel.
             * We have it up here for higher scope!
             * @type {Discord.Message}
             */
            var openTicketEmbedMsg;

            let ticketPermissions = {'VIEW_CHANNEL': true, 'USE_VAD': true};

            const ticketCollector = ticketMsg.createReactionCollector((reaction, user) => !user.bot && ticketEmojis.has(reaction.emoji.name));

            ticketCollector.on('collect', async (reaction, helper) => {
                if (reaction.emoji.name === this.caveOptions.joinTicketEmoji) {
                    // add new mentor to existing ticket channels
                    await ticketInfo.category.updateOverwrite(helper, ticketPermissions);
                    ticketInfo.textChannel.send('<@' + helper.id + '> Has joined the ticket!').then(msg => msg.delete({timeout: 10000}));
                    ticketInfo.userCount += 1;

                    ticketMsg.edit(ticketMsg.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
                    openTicketEmbedMsg.edit(openTicketEmbedMsg.embeds[0].addField('More hands on deck!', '<@' + helper.id + '> Joined the ticket!'));
                } else {
                    // edit incoming ticket with mentor information
                    ticketMsg.edit(ticketMsg.embeds[0].addField('This ticket is being handled!', '<@' + helper.id + '> Is helping this team!')
                                        .addField('Still want to help?', 'Click the ' + this.caveOptions.joinTicketEmoji + ' emoji to join the ticket!')
                                        .setColor('#80c904'));
                    ticketMsg.react(this.caveOptions.joinTicketEmoji);
                    ticketEmojis.delete(this.caveOptions.giveHelpEmoji);
                    ticketEmojis.set(this.caveOptions.joinTicketEmoji, 10);

                    // new ticket, create channels and add users
                    ticketInfo = await this.createTicketChannels(reaction.message.guild.channels);
                    await ticketInfo.category.updateOverwrite(helper, ticketPermissions);
                    await ticketInfo.category.updateOverwrite(user, ticketPermissions);
                    promptMsg.mentions.users.forEach((user, snowflake, map) => ticketInfo.category.updateOverwrite(user, ticketPermissions));

                    let leaveTicketEmoji = '👋🏽';

                    openTicketEmbed.addField('Thank you for helping this team.', '<@' + helper.id + '> Best of luck!')
                        .addField('When done:', '* React to this message with ' + leaveTicketEmoji + ' to lose access to these channels!');

                    openTicketEmbedMsg = await ticketInfo.textChannel.send(openTicketEmbed);
                    openTicketEmbedMsg.react(leaveTicketEmoji);

                    // add the mentor, ticket author and his group
                    ticketInfo.userCount += promptMsg.mentions.users.array().length + 2;

                    // send message mentioning all the parties involved so they get a notification
                    let notificationMessage = '<@' + helper.id + '> <@' + user.id + '>';
                    promptMsg.mentions.users.forEach(user => notificationMessage.concat('<@' + user.id + '>'));
                    ticketInfo.textChannel.send(notificationMessage).then(msg => msg.delete({timeout: 15000}));

                    const looseAccessCollector = openTicketEmbedMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === leaveTicketEmoji);

                    looseAccessCollector.on('collect', async (reaction, exitUser) => {
                        ticketInfo.userCount -= 1;

                        if (ticketInfo.userCount === 0) {
                            ticketCollector.stop();
                            looseAccessCollector.stop();
                            await discordServices.deleteChannel(ticketInfo.voiceChannel);
                            await discordServices.deleteChannel(ticketInfo.textChannel);
                            await discordServices.deleteChannel(ticketInfo.category);

                            ticketMsg.edit(ticketMsg.embeds[0].setColor('#128c1e').addField('Ticket Closed', 'This ticket has been closed!! Good job!'));
                        } else {
                            ticketInfo.category.updateOverwrite(exitUser, {VIEW_CHANNEL: false, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: false});
                        }
                    });

                }
            });
        });
    }


    /**
     * Creates the ticket category and channels.
     * @param {Discord.GuildChannelManager} channelManager - the channel manger to use
     * @private
     * @async
     * @returns {Promise<TicketInfo>} - the ticket info object with all the channels created
     */
    async createTicketChannels(channelManager) {
        /**
         * @type {TicketInfo}
         */
        let ticketInfo = {};

        ticketInfo.category = await channelManager.create(this.caveOptions.name + ' Ticket-' + this.ticketCount, {
            type: 'category',
            permissionOverwrites: [
                {
                    id: discordServices.everyoneRole,
                    deny: ['VIEW_CHANNEL'],
                }
            ]
        });

        ticketInfo.textChannel = await channelManager.create('banter', {
            type: 'text', 
            parent: ticketInfo.category
        });

        ticketInfo.voiceChannel = await channelManager.create('discussion', {
            type: 'voice', 
            parent: ticketInfo.category
        });

        ticketInfo.userCount = 0;

        return ticketInfo;
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
            'comfortable answering questions for. \n* When someone sends a help ticket, and has specificed one of your roles, you will get pinged!');
        this.embedMessages.console = await (await this.privateChannels.console.send(caveConsoleEmbed)).pin();

        const collector = this.embedMessages.console.createReactionCollector((reaction, user) => !user.bot && this.emojis.has(reaction.emoji.name), {dispose: true});

        collector.on('collect', async (reaction, user) => {
            let member = reaction.message.guild.member(user);
            let role = this.emojis.get(reaction.emoji.name);

            if (member.roles.cache.has(role.id)) {
                this.privateChannels.console.send('<@' + user.id + '> You already have the ' + role.name + ' role!').then(msg => msg.delete({timeout: 10000}));
                return;
            }

            discordServices.addRoleToMember(member, role.id);
            role.activeUsers += 1;
            this.privateChannels.console.send('<@' + user.id + '> You have been granted the ' + role.name + ' role!').then(msg => msg.delete({timeout: 10000}));
        });

        collector.on('remove', (reaction, user) => {
            let member = reaction.message.guild.member(user);
            let role = this.emojis.get(reaction.emoji.name);

            discordServices.removeRolToMember(member, role.id);
            role.activeUsers -= 1;
            this.privateChannels.console.send('<@' + user.id + '> You have lost the ' + role.name + ' role!').then(msg => msg.delete({timeout: 10000}));
        });
    }


    /**
     * Will send the admin console embed and create the collector.
     * @param {Discord.TextChannel} adminConsole - the admin console
     * @param {Discord.Snowflake} promptUserId - the user to prompt
     * @private
     * @async
     */
    async sendAdminConsole(adminConsole, promptUserId) {
        // admin console embed
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle(this.caveOptions.name + ' Cave Console')
            .setDescription(this.caveOptions.name + ' cave options are found below.')
            .addField('Add a role', 'To add a role please click the ' + this.adminEmojis[0] + ' emoji.');
        this.embedMessages.adminConsole = await adminConsole.send(msgEmbed);
        this.adminEmojis.forEach(emoji => this.embedMessages.adminConsole.react(emoji));

        // create collector
        const collector = this.embedMessages.adminConsole.createReactionCollector((reaction, user) => !user.bot && this.adminEmojis.includes(reaction.emoji.name));

        // on emoji reaction
        collector.on('collect', async (reaction, admin) => {
            // remove reaction
            reaction.users.remove(admin.id);

            if (reaction.emoji.name === this.adminEmojis[0]) {
                await this.newRole(adminConsole, promptUserId);
            }

            // let admin know the action was succesfull
            adminConsole.send('<@' + promptUserId + '> The role has been added!').then(msg => msg.delete({timeout: 8000}));
        });
    }


    /**
     * Will check the guild for already created roles for this cave.
     * @param {Discord.RoleManager} roleManager - the guild role manager
     * @param {Discord.TextChannel} adminConsole - the channel to prompt
     * @param {Discord.Snowflake} userId - the user's id to prompt
     */
    checkForExcistingRoles(roleManager, adminConsole, userId) {
        let initialRoles = roleManager.cache.filter(role => role.name.startsWith(this.caveOptions.preRoleText + '-'));

        initialRoles.each(async role => {
            let messageReaction = await this.promptAndCheckReaction(role, adminConsole, userId);

            let activeUsers = role.members.array().length;
            this.addRole(role, messageReaction.emoji.name, activeUsers);
        });
    }


    /**
     * Prompt for an emoji for a role, will make sure that emoji is not already in use!
     * @param {Discord.Role} role - role in question
     * @param {Discord.TextChannel} adminConsole
     * @param {Discord.Snowflake} userId - the user to prompt
     * @async
     * @private
     * @returns {Promise<Discord.MessageReaction>}
     */
    async promptAndCheckReaction(role, adminConsole, userId) {
        let messageReaction = await Prompt.reactionPrompt('React with emoji for role named: ' + role.name, adminConsole, userId);
            if (this.emojis.has(messageReaction.emoji.name)) {
                adminConsole.send('<@' + userId + '> That emoji is already in use! Try again!').then(msg => msg.delete({timeout: 8000}));
                return this.promptAndCheckReaction(role, adminConsole, userId);
            } else return messageReaction;
    }


    /**
     * Adds a role to this cave
     * @param {Discord.Role} role - the role to add
     * @param {String} emojiName - the emoji associated to this role
     * @param {Number} currentActiveUsers - number of active users with this role
     * @private
     */
    addRole(role, emojiName, currentActiveUsers = 0) {
        // add to the emoji collectioin
        this.emojis.set(emojiName, {
            name: role.name.substring(this.caveOptions.preRoleText.length + 1), 
            id: role.id,
            activeUsers: currentActiveUsers,
        });

        // add to the embeds
        this.embedMessages.console.edit(this.embedMessages.console.embeds[0].addField('If you know ' + role.name.substring(2) + ' -> ' + emojiName, '-------------------------------------'));
        this.embedMessages.console.react(emojiName);

        this.embedMessages.request.edit(this.embedMessages.request.embeds[0].addField('Question about ' + role.name.substring(2) + ' -> ' + emojiName, '-------------------------------------'));
        this.embedMessages.request.react(emojiName);
    }


    /**
     * Prompts a user for a new role.
     * @param {Discord.TextChannel} channel - channel where to prompt
     * @param {Discord.Snowflake} userId - the user to prompt
     * @async
     */
    async newRole(channel, userId) {
        let roleName = await Prompt.messagePrompt('What is the name of the new role?', 'string', channel, userId);

        if (roleName === null) return null;

        let reaction = await Prompt.reactionPrompt('What emoji do you want to associate with this new role?', channel, userId);

        // make sure the reaction is not already in use!
        if (cave.emojis.has(reaction.emoji.name)) {
            message.channel.send('<@' + userId + '>This emoji is already in use! Please try again!').then(msg => msg.delete({timeout: 8000}));
            return;
        }

        let role = channel.guild.roles.create({
            data: {
                name: this.caveOptions.preRoleText + '-' + roleName,
                color: this.caveOptions.color,
            }
        });

        this.addRole(role, reaction.emoji.name);

        let addPublic = await Prompt.yesNoPrompt('Do you want me to create a public text channel?', channel, userId);

        if (addPublic) {
            channel.guild.channels.create(this.caveOptions.name, {
                type: 'text',
                parent: this.publicChannels.category,
                topic: 'For you to have a chat about ' + this.caveOptions.name,
            });
        }
    }
}
module.exports = Cave;