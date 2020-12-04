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
                },
                {
                    key: 'targetChannelKey',
                    prompt: 'what channel is the poll being sent to? in snowflake',
                    type: 'string',
                    default: '',
                },
            ],
        });
    }

    async run(message, {activityName, question, targetChannelKey}) {
        //doesn't run if it is called by someone who is not staff nor admin or if it is not called in admin console
        if (!await(discordServices.checkForRole(message.member,discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'You do not have permission for this command, only admins can use it!');
            return;
        }
        if (!discordServices.isAdminConsole(message.channel)) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;
        }
    
    //sends embedded message to the activity's text channel
        // grab channel, depending on if targetChannelKey was given
        if (targetChannelKey === '') {
            var targetChannel = message.guild.channels.cache.find(channel => channel.type === 'text' && channel.name.endsWith(discordServices.activityTextChannelName));
        } else {
            var targetChannel = message.guild.channels.resolve(targetChannelKey);
        }
        

        // create embed depending on the type of poll needed
        var qEmbed;
        if (question === 'speed') { 
            qEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('Speed Poll!')
                .setDescription('Please react to this poll!\n\n' + 
                    '**Too Slow? ->**  🐢\n\n' + 
                    '**Just Right? ->**  🐶\n\n' + 
                    '**Too Fast? ->**  🐇');
        } else if (question === 'difficulty') {
            qEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('Difficulty Poll!')
                .setDescription('Please react to this poll! If you need help, go to the assistance channel!\n\n' + 
                    '**Too Hard? ->**  🐢\n\n' + 
                    '**Just Right? ->**  🐶\n\n' + 
                    '**Too Easy? ->**  🐇');
        } else if (question === 'explanations') {
            qEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('Explanation Poll!')
                .setDescription('Please react to this poll!\n\n' + 
                    '**Hard to understand? ->**  🐢\n\n' + 
                    '**Meh explanations? ->**  🐶\n\n' + 
                    '**Easy to understand? ->**  🐇');
        }

        // send message
        targetChannel.send(qEmbed).then((msg) => {
            let emoji1 = '🐢';
            let emoji2 = '🐶';
            let emoji3 = '🐇';
            msg.react(emoji1);
            msg.react(emoji2);
            msg.react(emoji3);

            const collector = msg.createReactionCollector((reaction, user) => !user.bot, {time: (1000 * 300)});

            //edits the embedded message to notify people when it stops collecting reacts
            collector.on('end', collected => {
                if (!targetChannel.deleted) {
                    msg.edit(qEmbed.setTitle('Thanks for responding!'));
                }
            })
        })
    }
}
