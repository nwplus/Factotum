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
            args: [
                {
                    key: 'question',
                    prompt: 'Question to ask',
                    type: 'string',
                }
            ],
        });
    }

    // Run function -> command body
    async run(message, {question}) {
                
        discordServices.deleteMessage(message);

        // only memebers with the Hacker tag can run this command!
        if ((await discordServices.checkForRole(message.member, discordServices.attendeeRole))) {
                
            // get current channel
            var curChannel = message.channel;

            // message embed to be used for question
            const qEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('Question from ' + message.author.username)
                .setDescription(question);
            
            // send message and add emoji collector
            curChannel.send(qEmbed).then(async (msg) => {
                // emoji msg
                await msg.react('🇷');

                // add answered emoji!
                await msg.react('✅');

                // add upvote emoji
                await msg.react('⏫');

                // add delete emoji
                await msg.react('⛔');

                // filter for emoji, not this bot!
                const emojiFilter = (reaction, user) => user.bot != true && (reaction.emoji.name === '🇷' || reaction.emoji.name === '✅' || reaction.emoji.name === '⛔');

                const collector = msg.createReactionCollector(emojiFilter);

                collector.on('collect', async (reaction, user) => {
                    // check for checkmark emoji and only user who asked the question
                    if (reaction.emoji.name === '✅' && user.id === message.author.id) {
                        // change color
                        msg.embeds[0].setColor('#80c904');
                        // change title and edit embed
                        var title = '✅ ANSWERED ' + msg.embeds[0].title;
                        msg.edit(msg.embeds[0].setTitle(title));
                    } else if (reaction.emoji.name === '⛔') {
                        msg.delete();
                    } else {
                        // if response emoji

                        // promt the response
                        var promt = await curChannel.send('<@' + user.id + '> Please send your response within 10 seconds! If you want to cancel write cancel.');

                        // filter and message await only one
                        // only user who emojied this message will be able to add a rely to it
                        const responseFilter = m => m.author.id === user.id;

                        curChannel.awaitMessages(responseFilter, {max: 1, time: 10000, errors: ['time']}).then( (msgs) => {
                            var response = msgs.first();

                            // if cancel then do nothing
                            if (response.content.toLowerCase() != 'cancel') {
                                // add a field to the message embed with the response
                                msg.edit(msg.embeds[0].addField(user.username + ' Responded:', response.content));

                                curChannel.send('<@' + user.id + '> Thank you for your response!').then(msg => msg.delete({timeout: 2000}));
                            }

                            // delete messages
                            promt.delete();
                            response.delete();
                        }).catch((msgs) => {
                            promt.delete();
                            curChannel.send('<@' + user.id + '> Time is up! When you are ready to respond, emoji again!').then(msg => msg.delete({timeout: 2000}));
                        });

                        // delete the reaciton
                        reaction.users.remove(user.id);
                    }
                });
            });

        }    
    }

};