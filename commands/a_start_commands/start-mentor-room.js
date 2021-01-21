// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Cave = require('../../classes/cave');
const Prompt = require('../../classes/prompt');

// Command export
module.exports = class StartMentors extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'startm',
            group: 'a_start_commands',
            memberName: 'start the mentor\'s experience',
            description: 'Will create a private category for mentors with channels for them to use!',
            guildOnly: true,
            args: [],
        },
        {
            channelID: discordServices.adminConsoleChannel,
            channelMessage: 'This command can only be used in the admin console!',
            roleID: discordServices.adminRole,
            roleMessage: 'You do not have permision for this command, only admins can use it!',
        });
    }

    /**
     * 
     * @param {Discord.Message} message - a message
     */
    async runCommand(message) {

        let cave = new Cave({
            name: 'Mentor',
            preEmojis: '🧑🏽🎓',
            preRoleText: 'M',
            color: 'ORANGE',
            role: message.guild.roles.resolve(discordServices.mentorRole),
            joinTicketEmoji: await Prompt.reactionPrompt('What is the join ticket emoji?', message.channel, message.author.id),
            giveHelpEmoji: await Prompt.reactionPrompt('What is the give help emoji?', message.channel, message.author.id),
            requestTicketEmoji: await Prompt.reactionPrompt('What is the request ticket emoji?', message.channel, message.author.id),
            addRoleEmoji: await Prompt.reactionPrompt('What is the add role emoji?', message.channel, message.author.id),
        });

        let adminConsole = message.guild.channels.resolve(discordServices.adminConsoleChannel);

        let isCreated = await Prompt.yesNoPrompt('Are the categories and channels already created?', message.channel, message.author.id);

        if (isCreated) await cave.find(message.channel, message.author.id);
        else await cave.init(message.guild.channels);

        await cave.sendConsoleEmbeds(adminConsole);

        cave.checkForExcistingRoles(message.guild.roles, adminConsole, message.author.id);
    }

};