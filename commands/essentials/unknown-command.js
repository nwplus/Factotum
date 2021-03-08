// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');

// Command export
module.exports = class UnknownCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'unknown-command',
            group: 'essentials',
            memberName: 'unknown-command',
            description: 'Displays help information when an unknown command is used.',
            unknown: true,
            hidden: true,
        });
    }

    async run(message) {
        if (message.channel.type === 'dm') {
            return;
        } else {
            discordServices.deleteMessage(message);
            message.reply('This is an unknown command!').then(msg => msg.delete({timeout: 3000}));
        }
        
    }

};