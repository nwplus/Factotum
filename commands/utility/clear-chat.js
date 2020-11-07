// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class ClearChat extends Command {
    constructor(client) {
        super(client, {
            name: 'clearchat',
            group: 'utility',
            memberName: 'clear chat utility',
            description: 'Will clear up to 100 newest messages from the channel. Messages older than two weeks will not be deleted. Then will send message with available commands in the channel, if any.',
            guildOnly: true,
            args: [],
        });
    }

    async run (message) {
        discordServices.deleteMessage(message);
        // only admins can use this command inside the guild
        if ((await discordServices.checkForRole(message.member, discordServices.adminRole))) {
            await message.channel.bulkDelete(100, true).catch(console.error);
            discordServices.discordLog(message.guild, "Cleared the channel: " + message.channel.name + ". By user: " + message.author.username);
            
            var commands = [];

            // start if stair to know channel and thus know commands to print
            // boothing channels
            if (message.channel.name.startsWith('boothing-sponsor-console')) {
                commands = this.client.registry.findGroups('s_boothing')[0].commands.array();
            } else if (message.channel.name.startsWith('boothing-wait-list')) {
                commands = this.client.registry.findGroups('h_boothing')[0].commands.array();
            } 
            // if in the verify channel <welcome>
            else if (message.channel.id === discordServices.welcomeChannel) {
                commands = this.client.registry.findCommands('verify');
            } 
            // if in the attend channel <attend-channel>
            else if (message.channel.id === discordServices.attendChannel) {
                commands = this.client.registry.findCommands('attend');
            } 
            // workshop stuff
            // ta console
            else if (message.channel.name.includes('-ta-console')) {
                commands = this.client.registry.findGroups('m_workshop')[0].commands.array();
            }
            // workshop text
            else if (message.channel.name.includes('-text')) {
                commands = this.client.registry.findGroups('h_workshop')[0].commands.array();
            }
            // admin console
            else if (discordServices.isAdminConsole(message.channel) === true) {
                // grab all the admin command groups
                var commandGroups = this.client.registry.findGroups('a_');
                // add all the commands from the command groups
                commandGroups.forEach((value,index) => {
                    value['commands'].array().forEach((value, index) => {
                        commands.push(value);
                    })
                });
            }
            // create channel
            else if (message.channel.id === discordServices.channelcreationChannel) {
                commands = this.client.registry.findCommands('createchannel');
            }
            // if there are no commands to send then return
            else {
                return;
            }
            
            var length = commands.length;

            const textEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('Commands Available in this Channel')
                .setDescription('The following are all the available commands in this channel, for more information about a specific command please call !help <command_name>.')
                .setTimestamp();

            for (var i = 0; i < length; i++) {
                var command = commands[i];
                if (command.format != null) {
                    textEmbed.addField(this.client.commandPrefix + command.name, command.description + ', arguments: ' + command.format);
                } else {
                    textEmbed.addField(this.client.commandPrefix + command.name, command.description + ', no arguments');
                }
            }

            message.channel.send(textEmbed);
        } else {
            discordServices.replyAndDelete(message.member, 'Hey there, the command !clearchat is only available to Admins!');
        }
    }

}