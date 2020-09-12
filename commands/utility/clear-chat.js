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
            description: 'Will clear the entire chat. Only available to admins!',
            guildOnly: true,
            args: [],
        });
    }

    async run (message) {
        message.delete();
        // only admins can use this command inside the guild
        if (discordServices.checkForRole(message.member, discordServices.adminRole)) {
            await message.channel.bulkDelete(100, true).catch(console.error);
            discordServices.discordLog(message.guild, "Cleared the channel: " + message.channel.name + ". By user: " + message.author.username);
            
            var commands;

            // start if stair to know channel and thus know commands to print
            // boothing channels
            if (message.channel.name.startsWith('boothing-sponsor-console')) {
                commands = this.client.registry.findGroups('boothing')[0].commands.array();
            } else if (message.channel.name.startsWith('boothing-wait-list')) {
                commands = this.client.registry.findCommands('enterwaitlist');
            } 
            // if in the verify channel <welcome>
            else if (message.channel.id === '743192401434378271') {
                commands = this.client.registry.findCommands('verify');
            } 
            // if in the attend channel <attend-channel>
            else if (message.channel.id === '747581999363129474') {
                commands = this.client.registry.findCommands('attend');
            } 
            // workshop stuff
            // ta console
            else if (message.channel.name.includes('-ta-console')) {
                commands = this.client.registry.findCommands('givehelp');
            }
            // workshop text
            else if (message.channel.name.includes('-text')) {
                commands = this.client.registry.findCommands('ask');
            }
            // admin console
            else if (message.channel.id === '748955441484005488') {
                commands = this.client.registry.commands.array();
            }
            // crate channel
            else if (message.channel.id === '754396445494214789') {
                commands = this.client.registry.findCommands('createchannel');
            }
            // if there are no commands to send then return
            else {
                return;
            }
            
            var length = commands.length;

            const textEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
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