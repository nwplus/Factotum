// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');

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
           // var commands = message.client.registry.commands.array();
           // var length = commands.length;

           // for (var i = 0; i < length; i++) {
           //     message.channel.send(commands[i].details);
           // }
        } else {
            discordServices.replyAndDelete(message.member, 'Hey there, the command !clearchat is only available to Admins!');
        }
    }

}