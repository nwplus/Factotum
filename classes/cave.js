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
        this.privateChannels;

        /**
         * The public channel of this cave.
         * @type {PublicChannels}
         */
        this.publicChannels;

        /**
         * The adminEmojis
         * @type {Array<String>}
         */
        this.adminEmojis = ['🧠'];

        /**
         * The emojis to use for roles.
         * key :  emoji name, 
         * value : [role name, role snowflake]
         * @type {Map<String, Array<String>>}
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
    }


    /**
     * Create all the channels needed for this cave.
     * @async
     */
    async init() {
        await this.initPrivate();
        await this.initPublic();
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
        if (typeof caveOptions.name != String && caveOptions.name.length === 0) throw new Error('caveOptions.name must be a non empty string');
        if (typeof caveOptions.preEmojis != String) throw new Error('The caveOptions.preEmojis must be a string of emojis!');
        if (typeof caveOptions.preRoleText != String && caveOptions.preRoleText.length === 0) throw new Error('The caveOptions.preRoleText must be a non empty string!');
        if (typeof caveOptions.color != String && caveOptions.color.length === 0) throw new Error('The caveOptions.color must be a non empty string!');
        this.caveOptions = caveOptions;
    }


    /**
     * Creates all the private channels necessary!
     * @private
     * @async
     */
    async initPrivate() {
        // Create category
        this.privateChannels.category = await message.guild.channels.create(this.caveOptions.preEmojis + this.caveOptions.name + ' Cave', {type: 'category',  permissionOverwrites: [
            {
                id: discordServices.hackerRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.attendeeRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.mentorRole,
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
        this.privateChannels.generalText = await message.guild.channels.create('✍' + this.name + '-banter', {
            type: 'text', 
            parent: mentorCaveCategory,
            topic: 'For any and all social interactions between mentors. This entire category is only for mentors and staff!',
        }).then(channel => channel.updateOverwrite(discordServices.mentorRole, {SEND_MESSAGES: true}));


        // mentor console channel to ask for tags
        this.privateChannels.console = await message.guild.channels.create('📝' + this.name + '-console', {
            type: 'text', 
            parent: mentorCaveCategory,
            topic: 'Sign yourself up for specific mentor roles! New roles will be added as requested, only add yourself to one if you feel comfortable responing to questions about the topic.',
        });

        // mentor incoming tickets
        this.privateChannels.incomingTickets = await message.guild.channels.create('📨incoming-tickets', {
            type: 'text', 
            parent: mentorCaveCategory,
            topic: 'All incoming tickets! Those in yellow still need help!!! Those in green have been handled by someone.',
        });

        // create a couple of voice channels for mentors to use
        for (var i = 0; i < 3; i++) {
            this.privateChannels.voiceChannels.push(await message.guild.channels.create('🗣️ Room ' + i, {type: 'voice', parent: mentorCaveCategory}));
        }
    }

    /**
     * Creates the public channels needed for this cave.
     * @private
     * @async
     */
    async initPublic() {
        // create mentor help public channels category
        this.publicChannels.category = await message.guild.channels.create('👉🏽👈🏽' + this.caveOptions.name + ' Help', {type: 'category', permissionOverwrites: [
            {
                id: discordServices.hackerRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.attendeeRole,
                allow: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.mentorRole,
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
        this.publicChannels.outgoingTickets = await message.guild.channels.create('🎫request-ticket', {
            type: 'text', 
            parent: publicHelpCategory,
            topic: 'Do you need help? Request a ticket here! Do not send messages, they will be automatically removed!',
        });

        // add request ticket channel to black list
        discordServices.blackList.set(requestTicketChannel.id, 5000);
    }

    /**
     * Sends all the necessary embeds to the channels.
     * @param {Discord.TextChannel} adminConsole - the admin console
     * @async
     */
    async sendConsoleEmbeds(adminConsole) {
        // admin console embed
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle(this.caveOptions.name + ' Cave Console')
            .setDescription(this.caveOptions.name + ' cave options are found below.')
            .addField('Add a mentor role', 'To add a mentor role please click the ' + this.adminEmojis[0] + ' emoji.');
        this.embedMessages.adminConsole = await adminConsole.send(msgEmbed);
        this.adminEmojis.forEach(emoji => this.embedMessages.adminConsole.react(emoji));

        // cave console embed
        const caveConsoleEmbed = new Discord.MessageEmbed()
            .setColor(this.privateChannels.console.guild.roles.resolve(discordServices.mentorRole).color)
            .setTitle(this.caveOptions.name + ' Role Console')
            .setDescription('Hi! Thank you for being here. \n* Please read over all the available roles. \n* Choose those you would feel ' + 
            'comfortable answering questions for. \n* When someone sends a help ticket, and has specificed one of your roles, you will get pinged!');
        this.embedMessages.console = await (await this.privateChannels.console.send(caveConsoleEmbed)).pin();

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
    }

    /**
     * Will check the guild for already created roles for this cave.
     * @param {Discord.RoleManager} roleManager - the guild role manager
     */
    checkForExcistingRoles(roleManager) {
        let initialRoles = roleManager.cache.filter(role => role.name.startsWith(this.caveOptions.preRoleText + '-'));

        initialRoles.each(async role => {
            let messageReaction = await Prompt.reactionPrompt('React with emoji for role named: ' + role.name);
            this.addRole(role, messageReaction.emoji.name);
        });
    }

    /**
     * Adds a role to this cave
     * @param {Discord.Role} role - the role to add
     * @param {String} emojiName - the emoji associated to this role
     * @private
     */
    addRole(role, emojiName) {
        // add to the emoji collectioin
        this.emojis.set(emojiName, [role.name.substring(this.caveOptions.preRoleText.length + 1), role.id]);

        // add to the embeds
        this.embedMessages.console.edit(this.embedMessages.console.embeds[0].addField('If you know ' + role.name.substring(2) + ' -> ' + emojiName, '-------------------------------------'));
        this.embedMessages.console.react(emojiName);

        this.embedMessages.request.edit(this.embedMessages.request.embeds[0].addField('Question about ' + role.name.substring(2) + ' -> ' + reaction.emoji.name, '-------------------------------------'));
        this.embedMessages.request.react(emojiName);
    }

    /**
     * Prompts a user for a new role.
     * @param {Discord.TextChannel} channel - channel where to prompt
     * @param {Discord.Snowflake} userId - the user to prompt
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