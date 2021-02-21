// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const BotGuild = require('../../db/BotGuild');

// Command export
module.exports = class ClearChat extends Command {
    constructor(client) {
        super(client, {
            name: 'help',
            group: 'essentials',
            memberName: 'help user',
            description: 'Will send available commands depending on role!',
            hidden: true,
        });
    }

    async run(message) {

        let botGuild = await BotGuild.findById(message.guild.id);
        
        var commands = [];

        // if message on DM then send hacker commands
        if (message.channel.type === 'dm') {
            var commandGroups = this.client.registry.findGroups('utility');
        } else {
            discordServices.deleteMessage(message);

            if ((discordServices.checkForRole(message.member, botGuild.roleIDs.staffRole))) {
                var commandGroups = this.client.registry.findGroups('a_');
            } else {
                var commandGroups = this.client.registry.findGroups('utility');
            }
        }

        // add all the commands from the command groups
        commandGroups.forEach((value) => {
            value['commands'].array().forEach((value, index) => {
                commands.push(value);
            })
        });

        var length = commands.length;

        const textEmbed = new Discord.MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('Commands Available for you')
            .setDescription('All other interactions with me will be via emoji reactions!')
            .setTimestamp();

        // add each command as a field in the embed
        for (var i = 0; i < length; i++) {
            var command = commands[i];
            if (command.format != null) {
                textEmbed.addField(this.client.commandPrefix + command.name, command.description + ', arguments: ' + command.format);
            } else {
                textEmbed.addField(this.client.commandPrefix + command.name, command.description + ', no arguments');
            }
        }

        message.author.send(textEmbed);
    }

}