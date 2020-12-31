const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class ShowInformation extends PermissionCommand {
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
        },
        {
            roleID: discordServices.adminRole,
            roleMessage: 'Hey there, the command !showi is only available to Admins!',
        });
    }

    async runCommand(message, {command}) {

        const embed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor);

        if (command === 'verify') {
            embed.setTitle('Welcome to the nwHacks 2021 Discord server!')
                .setDescription('In order to verify that you have registered for nwHacks 2021, please send the **!verify** command to this channel followed by the email you used to sign up. \nFor example: !verify example@gmail.com')
                .addField('Do you need assistance?', 'Head over to the welcome-support channel and ping the admins!')
                .addField('Worry Not! Your email will be kept Private!', 'All messages to this channel are automaticaly removed!');
        } else if (command === 'attend') {
            embed.setTitle('Hey there!')
                .setDescription('In order to indicate that you are participating at nwHacks 2021, please send the **!attend** command to this channel followed by the email you used to sign up. \nFor example: !attend example@gmail.com')
                .addField('Do you need assistance?', 'Head over to the support channel and ping the admins!')
                .addField('Worry Not! Your email will be kept Private!', 'All messages to this channel are automaticaly removed!');
        }

        message.channel.send(embed).then(msg => msg.pin());

        discordServices.replyAndDelete(message, 'Information about ' + command + ' has been sent!');
    }

}