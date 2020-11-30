// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class ClearChat extends Command {
    constructor(client) {
        super(client, {
            name: 'clearchat',
            group: 'a_utility',
            memberName: 'clear chat utility',
            description: 'Will clear up to 100 newest messages from the channel. Messages older than two weeks will not be deleted. Then will send message with available commands in the channel, if any.',
            guildOnly: true,
            args: [
                {
                    key: 'isCommands',
                    prompt: 'should show commands in this channel?',
                    type: 'boolean',
                    default: false,
                },
            ],
        });
    }

    async run (message, {isCommands}) {
        discordServices.deleteMessage(message);
        // only admins can use this command inside the guild
        if (! (await discordServices.checkForRole(message.member, discordServices.adminRole))) {
            discordServices.replyAndDelete(message.member, 'Hey there, the command !clearchat is only available to Admins!');
            return;
        }

        await message.channel.bulkDelete(100, true).catch(console.error);
        discordServices.discordLog(message.guild, "Cleared the channel: " + message.channel.name + ". By user: " + message.author.username);
        
        var commands = [];
        // only proceed if we want the commands
        if (isCommands) {
            // if in the verify channel <welcome>
            if (message.channel.id === discordServices.welcomeChannel) {
                commands = this.client.registry.findCommands('verify');
            } 
            // if in the attend channel <attend-channel>
            else if (message.channel.id === discordServices.attendChannel) {
                commands = this.client.registry.findCommands('attend');
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
        }
    }

}