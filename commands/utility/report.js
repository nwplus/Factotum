// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class Report extends Command {
    constructor(client) {
        super(client, {
            name: 'report',
            group: 'utility',
            memberName: 'report to admins',
            description: 'Will send report format to user via DM for user to send back via DM. Admins will get the report!',
            // not guild only!
            args: [],
        });
    }

    async run (message) {
        discordServices.deleteMessage(message);

        const embed = new Discord.MessageEmbed()
            .setColor(discordServices.colors.embedColor)
            .setTitle('Thank you for taking the time to report users who are not following server or MLH rules. You help makes our community safer!')
            .setDescription('Please use the format below, be as precise and accurate as possible. \n ' + 
                            'Everything you say will be 100% anonymous. We have no way of reaching back to you so again, be as detailed as possible!\n' + 
                            'Copy paste the format and send it to me in this channel!')
            .addField('Format:', 'User(s) discord username(s) (including discord id number(s)):\n' + 
                                    'Reason for report (one line):\n' + 
                                    'Detailed Explanation:\n' + 
                                    'Name of channel where the incident occurred (if possible):');

        // send message to user with report format
        var msgEmbed = await message.author.send(embed);

        // await response
        msgEmbed.channel.awaitMessages(m => true, {max: 1}).then(msgs => {
            var msg = msgs.first();

            msgEmbed.delete();
            message.author.send('Thank you for the report! Our admin team will look at it ASAP!');

            // send the report content to the admin report channel!
            var incomingReportChn = message.guild.channels.resolve(discordServices.channelIDs.incomingReportChannel);

            const adminMsgEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.colors.embedColor)
                .setTitle('There is a new report that needs your attention!')
                .setDescription(msg.content);

            // send embed with text message to ping admin
            incomingReportChn.send('<@&' + discordServices.roleIDs.adminRole + '> Incoming Report', {embed: adminMsgEmbed});
        })
        
    }

}