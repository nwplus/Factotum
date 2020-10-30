// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class StartChannelCreation extends Command {
    constructor(client) {
        super(client, {
            name: 'startcc',
            group: 'utility',
            memberName: 'start channel creation',
            description: 'Send a message with emoji collector, for each emoji bot will ask type and other friends invited and create the private channel.',
            guildOnly: true,
        });
    }

    async run (message) {
        message.delete();
        // can only be called my staff
        if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
            // can only be called in the channel-creation channel
            if (message.channel.id === '754396445494214789') {
                // grab current channel
                var channel = message.channel;

                // grab channel creation category
                var category = await message.channel.parent
                
                // create and send embed message to channel with emoji collector
                const msgEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.embedColor)
                    .setTitle('Private Channel Creation')
                    .setDescription('Do you need a private channel to work with your friends? Or a voice channel to get to know a mentor, here you can create privte text or voice channels.' +
                        ' However do know that server admins will have access to these channels, and the bot will continue to monitor for bad language, so please follow the rules!')
                    .addField('Ready for a channel of your own?', 'Just react this message with any emoji and the bot will ask you a few simple questions.');
                
                var cardMessage = await channel.send(msgEmbed);

                // filter for emoji collector, all emojis should work!
                const emojiFilter = m => true;

                // set collector
                var mainCollector = await cardMessage.createReactionCollector(emojiFilter);

                mainCollector.on('collect', (reaction, user) => {
                    
                    // general filter for user input only
                    const filter = m => m.author.id === user.id;

                    // ask user for type of channel
                    channel.send('<@'+ user.id + '> Do you want a voice or text channel? Please respond within 10 seconds.').then(async msg => {
                        // await type of channel
                        channel.awaitMessages(filter, {max: 1, timout: 10000}).then(msgstypes => {
                            // given list
                            var msgtype = msgstypes.first();

                            var channelType = msgtype.content;

                            // remove two messages
                            msg.delete();
                            msgtype.delete();

                            // make sure input is valid
                            if (channelType === 'voice' || channelType === 'text') {

                                channel.send('<@' + user.id + '> Please tag all the invited users to this private ' + channelType + ' channel. Type none if no guests are welcomed.').then(async msg => {
                                    // await guests
                                    channel.awaitMessages(filter, {max: 1, timout: 10000}).then(async msgsWithGuests => {
                                        var msgWithGuests = msgsWithGuests.first();

                                        // get the mentions from the message
                                        var guests = msgWithGuests.mentions.members;

                                        // create channel
                                        var newChannel = await message.guild.channels.create(user.username + '-private-channel', {type: channelType, parent: category});

                                        // update permission for users to be able to view
                                        newChannel.updateOverwrite(discordServices.everyoneRole, {
                                            VIEW_CHANNEL : false,
                                        })
                                        newChannel.updateOverwrite(user, {
                                            VIEW_CHANNEL : true,
                                        });

                                        // add guests
                                        guests.each(mem => newChannel.updateOverwrite(mem.user, {
                                            VIEW_CHANNEL : true,
                                        }));
                                        
                                        // remove messeges
                                        msg.delete();
                                        msgWithGuests.delete();
                                    })
                                });
                            } else {
                                // report the error and ask to try again
                                discordServices.replyAndDelete(message, 'Wrong input, please respond with voice or text only. Try again.');
                            }
                        });
                    });
                })
            } else {
                discordServices.replyAndDelete(message, 'Hey there, the !startcc command is only available in the create-channel channel.');
            }
        } else {
            discordServices.replyAndDelete(message, 'Hey there, the !startcc command is only for staff!')
        }
        
    }

}