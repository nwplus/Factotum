// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class AskQuestion extends PermissionCommand {
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
        },
        {
            roleID: discordServices.attendeeRole,
            roleMessage: 'This command is only available for attendees!',
        });
    }

    // Run function -> command body
    async runCommand(message, {question}) {

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
            .setColor(discordServices.colors.questionEmbedColor)
            .setTitle('Question from ' + message.author.username)
            .setDescription(question);
        
        // send message and add emoji collector
        curChannel.send(qEmbed).then(async (msg) => {

            // list of users currently responding
            var onResponse = new Discord.Collection();
            
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

                // add response to question
                if (reaction.emoji.name === '🇷') {
                    // make sure user is not already responding
                    if (onResponse.has(user.id)) {
                        return;
                    } else {
                        onResponse.set(user.id, user.username);
                    }

                    // promt the response
                    curChannel.send('<@' + user.id + '> Please send your response within 15 seconds! If you want to cancel write cancel.').then(promt => {
                        // filter and message await only one
                        // only user who emojied this message will be able to add a reply to it
                        curChannel.awaitMessages(m => m.author.id === user.id, {max: 1, time: 15000, errors: ['time']}).then((msgs) => {
                            var response = msgs.first();

                            // if cancel then do nothing
                            if (response.content.toLowerCase() != 'cancel') {
                                // if user has a mentor role, they get a spcial title
                                if (discordServices.checkForRole(response.member, discordServices.mentorRole)) {
                                    msg.edit(msg.embeds[0].addField('🤓 ' + user.username + ' Responded:', response.content));
                                } else {
                                    // add a field to the message embed with the response
                                    msg.edit(msg.embeds[0].addField(user.username + ' Responded:', response.content));
                                }
                            }

                            // delete messages
                            promt.delete();
                            response.delete();

                            // remove user from on response list
                            onResponse.delete(user.id);
                        }).catch((msgs) => {
                            promt.delete();
                            curChannel.send('<@' + user.id + '> Time is up! When you are ready to respond, emoji again!').then(msg => msg.delete({timeout: 2000}));

                            // remove user from on response list
                            onResponse.delete(user.id);
                        });
                    });
                }
                // check for checkmark emoji and only user who asked the question
                else if (reaction.emoji.name === '✅' && user.id === message.author.id) {
                    // change color
                    msg.embeds[0].setColor('#80c904');
                    // change title and edit embed
                    msg.edit(msg.embeds[0].setTitle('✅ ANSWERED ' + msg.embeds[0].title));
                } 
                // remove emoji will remove the message
                else if (reaction.emoji.name === '⛔') {
                    // check that user is staff
                    if (discordServices.checkForRole(msg.guild.member(user), discordServices.staffRole)) {
                        msg.delete();
                    } else {
                        discordServices.sendMessageToMember(user, 'Deleting a question is only available to staff!', true);
                    }
                    
                } 
            });
        });
    }
};