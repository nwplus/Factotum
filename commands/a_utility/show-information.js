// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class ShowInformation extends Command {
    constructor(client) {
        super(client, {
            name: 'showi',
            group: 'a_utility',
            memberName: 'show information for',
            description: 'Will send information about a command.',
            guildOnly: true,
            args: [
                {
                    key: 'command',
                    prompt: 'command to show information about',
                    type: 'string',
                },
            ],
        });
    }

    async run (message, {command}) {
        discordServices.deleteMessage(message);
        // only admins can use this command inside the guild
        if (! (discordServices.checkForRole(message.member, discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'Hey there, the command !showi is only available to Admins!');
            return;
        }

        const embed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor);

        if (command === 'verify') {
            embed.setTitle('Welcome to the HackCamp 2020 Discord server!')
                .setDescription('In order to verify that you have registered for HackCamp 2020, please send the **!verify** command to this channel followed by the email you used to sign up. \nFor example: !verify example@gmail.com')
                .addField('Do you need assistance?', 'Head over to the welcome-support channel and ping the admins!');
        } else if (command === 'attend') {
            embed.setTitle('Hey there!')
                .setDescription('In order to indicate that you are participating at HackCamp 2020, please send the **!attend** command to this channel followed by the email you used to sign up. \nFor example: !attend example@gmail.com')
                .addField('Do you need assistance?', 'Head over to the support channel and ping the admins!');
        }

        message.channel.send(embed).then(msg => msg.pin());

        discordServices.replyAndDelete(message, 'Information about ' + command + ' has been sent!');
    }

}