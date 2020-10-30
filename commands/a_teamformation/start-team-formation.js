// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class StartTeamFormation extends Command {
    constructor(client) {
        super(client, {
            name: 'starttf',
            group: 'a_teamformation',
            memberName: 'start team formation',
            description: 'Send a message with emoji collector, one meoji for recruiters, one emoji for team searchers. Instructions will be sent via DM.',
            guildOnly: true,
        });
    }

    async run (message) {
        message.delete();
        // can only be called my staff
        if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
            // can only be called in the team formation information channel
            if (message.channel.id === '770354140961570857') {
                // grab current channel
                var channel = message.channel;
                
                // create and send embed message to channel with emoji collector
                const msgEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.embedColor)
                    .setTitle('Team Formation Information')
                    .setDescription('Welcome to the team formation section! If you are looking for a team or need a few more memebers to complete your ultimate group, you are in the right place!')
                    .addField('How does this work?', 'Teams and hackers will react to this message, the bot will send them a template they need to fill out and send back to the bot via DM.' +
                    'Then the bot will post the team\'s or hacker\'s information in the respective channels. Other hackers or teams can then browse the channels and reach out to those intersted ' +
                    'by reacting to the post.')
                    .addField('Disclaimer!!', 'By participating in this activity you consent to letting the bot iniciate a conversation between you and other teams or hackers.')
                    .addField('Teams looking for a new members', 'React with 🚎 and the bot will send you instructions.')
                    .addField('Hacker looking for a team', 'React with 🏍️ and the bot will send you isntructions.')
                
                var cardMessage = await channel.send(msgEmbed);

                await cardMessage.react('🚎');
                await cardMessage.react('🏍️');

                // filter for emoji collector, make sure its not bot!
                const emojiFilter = (reaction, user) => {
                    return user.id != cardMessage.author.id && reaction.emoji.name === '🏍️' || reaction.emoji.name === '🚎';
                };

                // set collector
                var mainCollector = await cardMessage.createReactionCollector(emojiFilter);

                mainCollector.on('collect', async (reaction, user) => {

                    // boolean if team or hacker
                    var isTeam = reaction.emoji.name === '🚎';

                    const dmMessage = new Discord.MessageEmbed();

                    // branch between team and hacker
                    if (isTeam) {
                        dmMessage.setTitle('Team Formation - Team Format');
                        dmMessage.setDescription('We are very exited for you to find your perfect team members! Please copy and paste the following format in your next message. ' +
                        'Try to respond to all the sections! Once you are ready to submit, please react to this message with 🇩 and then send me your information!');
                        dmMessage.addField('Format:', 'This \n is a \n format!');
                    } else {
                        dmMessage.setTitle('Team Formation - Hacker Format');
                        dmMessage.setDescription('We are very exited for you to find your perfect team! Please copy and paste the following format in your next message. ' +
                        'Try to respond to all the sections! Once you are ready to submit, please react to this message with 🇩 and then send me your information!');
                        dmMessage.addField('Format:', 'This \n is a \n format!');
                    }

                    // send message to hacker via DM
                    var dmMsg = await user.send(dmMessage);
                    
                    // add the reaction
                    await dmMsg.react('🇩');

                    // general filter for user input only, not the bot!
                    const filter = (reaction, user) => reaction.emoji.name === '🇩' && user.id != dmMsg.author.id;

                    // await one reaction
                    const dmCollector = await dmMsg.createReactionCollector(filter, {max: 1});
                    
                    dmCollector.on('collect' , async r => {

                        var confDm = await user.send('Please send me your completed form, if you do not follow the form your post will be deleted! You have 10 seconds to send your information.');

                        // no need for filter
                        const trueFilter = m => true;

                        // await type of channel
                        confDm.channel.awaitMessages(trueFilter, {max: 1, timout: 10000}).then(async (msgs) => {
                            // given list
                            var msg = msgs.first();

                            var content = msg.content;

                            // add post to corresponding channel
                            if (isTeam) {
                                // channel to send post to 
                                var channel = message.guild.channels.cache.get('770354487595499592');

                                // send message
                                channel.send('<@' + user.id +'> and their team is looking for more team members! Information about them can be found below:\n' + content);
                            } else {
                                // channel to send post to 
                                var channel = message.guild.channels.cache.get('770354521733857320');

                                // send message
                                channel.send('<@' + user.id +'>  is looking for a team to join! Information about them can be found below:\n' + content);
                            }

                            // remove the messages
                            await confDm.delete();

                            // we would want to remove their message, but that is not possible!

                            // confirm the post has been received
                            if (isTeam) {
                                user.send('Thanks for sending me your information, you should see it pop up in the respective channel under the team formation category.' +
                                'Once you find your members please react to my original message with ⛔ so I can remove your post. Happy hacking!!!').then(msg => msg.delete({timeout: 5000}));
                            } else {
                                user.send('Thanks for sending me your information, you should see it pop up in the respective channel under the team formation category.' +
                                'Once you find your ideal team please react to my original message with ⛔ so I can remove your post. Happy hacking!!!').then(msg => msg.delete({timeout: 5000}));
                            }
                        });
                    });
                });
            } else {
                discordServices.replyAndDelete(message, 'Hey there, the !starttf command is only available in the create-channel channel.');
            }
        } else {
            discordServices.replyAndDelete(message, 'Hey there, the !starttf command is only for staff!');
        }
        
    }

}