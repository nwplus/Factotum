// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class AskQuestion extends Command {
    constructor(client) {
        super(client, {
            name: 'ask',
            group: 'utility',
            memberName: 'ask anonymus question with thread',
            description: 'Will send the question to the same channel, and add emoji collector for thread like support.',
            guildOnly: true,
            args: [
                {
                    key: 'question',
                    prompt: 'Question to ask',
                    type: 'string',
                    default: '',
                }
            ],
        });
    }

    // Run function -> command body
    async run(message, {question}) {
        discordServices.deleteMessage(message);

        // only memebers with the Hacker tag can run this command!
        if (!(await discordServices.checkForRole(message.member, discordServices.attendeeRole))) {
            discordServices.sendMessageToMember(message.member, 'This command is only available for attendees!', true);
            return;
        }

        // if question is blank let user know via DM and exit
        if (question === '') {
            discordServices.sendMessageToMember(message.member, 'When using the !ask command, add your question on the same message!\n' + 
                                                                'Like this: !ask This is a question');
            return;
        }
        
        
        // get current channel
        var curChannel = message.channel;

        // message embed to be used for question
        const qEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Question from ' + message.author.username)
            .setDescription(question);
        
        // send message and add emoji collector
        curChannel.send(qEmbed).then(async (msg) => {

            // list of users currently responding
            var onResponse = [];
            
            msg.react('🇷');  // respond emoji
            msg.react('✅');  // answered emoji!
            msg.react('⏫');  // upvote emoji
            msg.react('⛔');  // delete emoji

            // filter and collector
            const emojiFilter = (reaction, user) => !user.bot && (reaction.emoji.name === '🇷' || reaction.emoji.name === '✅' || reaction.emoji.name === '⛔');
            const collector = msg.createReactionCollector(emojiFilter);

            collector.on('collect', async (reaction, user) => {
                // delete the reaciton
                reaction.users.remove(user.id);

                // make sure user is not already responding
                if (onResponse.includes(user.id)) {
                    return;
                } else {
                    onResponse.push(user.id);
                }

                // check for checkmark emoji and only user who asked the question
                if (reaction.emoji.name === '✅' && user.id === message.author.id) {
                    // change color
                    msg.embeds[0].setColor('#80c904');
                    // change title and edit embed
                    var title = '✅ ANSWERED ' + msg.embeds[0].title;
                    msg.edit(msg.embeds[0].setTitle(title));
                } 
                // remove emoji will remove the message
                else if (reaction.emoji.name === '⛔') {
                    msg.delete();
                } 
                // add response to question emoji
                else {
                    // promt the response
                    var promt = await curChannel.send('<@' + user.id + '> Please send your response within 10 seconds! If you want to cancel write cancel.');

                    // filter and message await only one
                    // only user who emojied this message will be able to add a reply to it
                    const responseFilter = m => m.author.id === user.id;

                    curChannel.awaitMessages(responseFilter, {max: 1, time: 15000, errors: ['time']}).then( async (msgs) => {
                        var response = msgs.first();

                        // if cancel then do nothing
                        if (response.content.toLowerCase() != 'cancel') {
                            // if user has a mentor role, they get a spcial title
                            if ((await discordServices.checkForRole(response.member, discordServices.mentorRole))) {
                                msg.edit(msg.embeds[0].addField('🤓 ' + user.username + ' Responded:', response.content));
                            } else {
                                // add a field to the message embed with the response
                                msg.edit(msg.embeds[0].addField(user.username + ' Responded:', response.content));
                            }
                            // thanks user for their response
                            curChannel.send('<@' + user.id + '> Thank you for your response!').then(msg => msg.delete({timeout: 2000}));
                        }

                        // delete messages
                        promt.delete();
                        response.delete();

                        // remove user from on response list
                        onResponse.splice(onResponse.indexOf(user.id), 1);
                    }).catch((msgs) => {
                        promt.delete();
                        curChannel.send('<@' + user.id + '> Time is up! When you are ready to respond, emoji again!').then(msg => msg.delete({timeout: 2000}));

                        // remove user from on response list
                        onResponse.splice(onResponse.indexOf(user.id), 1);
                    });
                }
            });
        });
    }
};