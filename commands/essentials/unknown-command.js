// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const { deleteMessage } = require('../../discord-services');

// Command export
class UnknownCommand extends Command {
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
            deleteMessage(message);
            message.reply('This is an unknown command!').then(msg => msg.delete({timeout: 3000}));
        }
        
    }
}
module.exports = UnknownCommand;