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

        let emojis = '🧑🏽🎓';

        let cave = new Cave({
            name: 'Mentor',
            preEmojis: '🧑🏽🎓',
            preRoleText: 'M',
            color: 'ORANGE',
            role: message.guild.roles.resolve(discordServices.mentorRole),
        });

        let adminConsole = message.guild.channels.resolve(discordServices.adminConsoleChannel);

        let isCreated = await Prompt.yesNoPrompt('Are the categories and channels already created?', message.channel, message.author.id);

        if (isCreated) await cave.find(message.channel, message.author.id);
        else await cave.init(message.guild.channels);

        await cave.sendConsoleEmbeds(adminConsole, message.author.id);

        cave.checkForExcistingRoles(message.guild.roles, adminConsole, message.author.id);
    }

};