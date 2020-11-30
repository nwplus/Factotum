// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class ClearChat extends Command {
    constructor(client) {
        super(client, {
            name: 'help',
            group: 'utility',
            memberName: 'help user',
            description: 'Will send available commands depending on role!',
            guildOnly: true,
            hidden: true,
        });
    }

    async run(message) {
        discordServices.deleteMessage(message);
        
        var commands = [];

        if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
            var commandGroups = this.client.registry.findGroups('a_');
        } else {
            var commandGroups = [this.client.registry.groups.get('utility')];
        }

        // add all the commands from the command groups
        commandGroups.forEach((value) => {
            value['commands'].array().forEach((value, index) => {
                commands.push(value);
            })
        });

        var length = commands.length;

        const textEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Commands Available for you')
            .setDescription('All other interactions with me will be via emoji reactions!')
            .setTimestamp();

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