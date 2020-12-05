// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class ChangeStampTime extends Command {
    constructor(client) {
        super(client, {
            name: 'stamptime',
            group: 'a_utility',
            memberName: 'new stamp time',
            description: 'Will set the given seconds as the new stamp time for activities.',
            guildOnly: true,
            args: [
                {
                    key: 'newTime',
                    prompt: 'new time for stamp collectors to use',
                    type: 'integer',
                },
            ],
        });
    }

    async run (message, {newTime}) {
        discordServices.deleteMessage(message);
        // only admins can use this command inside the guild
        if (! (discordServices.checkForRole(message.member, discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'Hey there, the command !stamptime is only available to Admins!');
            return;
        }

        discordServices.stampCollectTime = newTime;

        discordServices.replyAndDelete(message, 'Stamp collection will now give hackers ' + newTime + ' seconds to collect stamp.');
    }

}