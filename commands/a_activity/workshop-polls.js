const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

module.exports = class DistributeStamp extends Command {
    constructor(client) {
        super(client, {
            name: 'workshop-polls',
            group: 'a_activity',
            memberName: 'workshop polling',
            description: 'polls workshop attendees during the workshop',
            args: [
                {   key: 'activityName',
                    prompt: 'the workshop/activity name',
                    type: 'string'
                },
                {
                    key: 'question',
                    prompt: 'what are you polling for?',
                    type: 'string',
                }
            ],
        });
    }

    async run(message, {activityName,question}) {
        //doesn't run if it is called by someone who is not staff nor admin or if it is not called in admin console
        if (!await(discordServices.checkForRole(message.member,discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'You do not have permission for this command, only admins can use it!');
            return;
        } else if (!discordServices.isAdminConsole) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;
        }
    
        //sends embedded message to the activity's text channel
        var targetChannel = message.guild.channels.cache.find(channel => channel.name === (activityName + "-text"));
        var qEmbed;
        if (question === 'speed') { 
            qEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('Please react ' + '🐢' + ' if the pace is too slow, ' + '🐇' + ' if the pace is too fast, or ' + '🐶' + ' if the pace is just right within the next 5 minutes');
        } else if (question === 'difficulty') {
            qEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('Please react ' + '🐢' + ' if you are having trouble with the material, ' + '🐇' + ' if you are way ahead, or ' + '🐶' + ' if the difficulty is just right. Make sure to ask for help if you need it!');
        } else if (question === 'explanations') {
            qEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('Please react ' + '🐢' + ' if the explanations need improving, ' + '🐇' + ' if the explanations are well done, or ' + '🐶' + ' if they are meh. Make sure to ask for help if you need it!');
        }
        targetChannel.send(qEmbed).then((msg) => {
            const emojiFilter = (reaction,user) => user.id != msg.author.id;
            let emoji1 = '🐢';
            let emoji2 = '🐇';
            let emoji3 = '🐶';
            msg.react(emoji1);
            msg.react(emoji2);
            msg.react(emoji3);
            const collector = msg.createReactionCollector(emojiFilter, {time: (1000 * 300)});

            //edits the embedded message to notify people when it stops collecting reacts
            collector.on('end', collected => {
                if (msg.guild.channels.cache.find(channel => channel.name === targetChannel.name)) {
                    msg.edit(qEmbed.setTitle('Thanks for responding!'));
                }
            })
        })
    }
}
