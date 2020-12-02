// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class StartChannelCreation extends Command {
    constructor(client) {
        super(client, {
            name: 'startcc',
            group: 'a_start_commands',
            memberName: 'start channel creation',
            description: 'Send a message with emoji collector, for each emoji bot will ask type and other friends invited and create the private channel.',
            guildOnly: true,
        });
    }

    async run (message) {
        discordServices.deleteMessage(message);

        // can only be called by staff
        if (!(discordServices.checkForRole(message.member, discordServices.staffRole))) {
            discordServices.replyAndDelete(message, 'Hey there, the !startcc command is only for staff!');
            return;
        }
        // can only be called in the channel-creation channel
        if (message.channel.id != discordServices.channelcreationChannel) {
            discordServices.replyAndDelete(message, 'Hey there, the !startcc command is only available in the create-channel channel.');
            return;
        }

        // grab current channel
        var channel = message.channel;

        // grab channel creation category
        var category = await message.channel.parent;
        
        // create and send embed message to channel with emoji collector
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Private Channel Creation')
            .setDescription('Do you need a private channel to work with your friends? Or a voice channel to get to know a mentor, here you can create privte text or voice channels.' +
                ' However do know that server admins will have access to these channels, and the bot will continue to monitor for bad language, so please follow the rules!')
            .addField('Ready for a channel of your own?', 'Just react this message with any emoji and the bot will ask you a few simple questions.');
        
        var cardMessage = await channel.send(msgEmbed);
        cardMessage.pin();

        // main collector works with any emoji
        var mainCollector = await cardMessage.createReactionCollector(m => true);

        mainCollector.on('collect', (reaction, user) => {
            
            // general filter that only works with user who reacted
            const filter = m => m.author.id === user.id;

            // ask user for type of channel
            channel.send('<@'+ user.id + '> Do you want a "voice" or "text" channel? Please respond within 10 seconds.').then(async msg => {
                channel.awaitMessages(filter, {max: 1, timout: 10000}).then(async msgsChannelTypes => {

                    var msgChannelType = await msgsChannelTypes.first();
                    var channelType = msgChannelType.content;

                    // remove promt and user message
                    msg.delete();
                    msgChannelType.delete();

                    // make sure input is valid
                    if (channelType != 'voice' && channelType != 'text') {
                        // report the error and ask to try again
                        discordServices.replyAndDelete(message, 'Wrong input, please respond with "voice" or "text" only. Try again.');
                        return;
                    }

                    // promt for other users that are invited to this channel, the guests
                    channel.send('<@' + user.id + '> Please tag all the invited users to this private ' + channelType + ' channel. Type "none" if no guests are welcomed. You have 15 seconds.').then(async msg => {
                        channel.awaitMessages(filter, {max: 1, time: 15000}).then(async msgsWithGuests => {
                            var msgWithGuests = msgsWithGuests.first();

                            // get the mentions from the message
                            var guests = msgWithGuests.mentions.members;

                            // remove promt and user message
                            msg.delete();
                            msgWithGuests.delete();

                            // ask for channel name
                            channel.send('<@' + user.id + '> What do you want to name the channel? If you don\'t care then send "default"!').then(async msg => {
                                channel.awaitMessages(filter, {max: 1, time: 10000}).then(async msgsName => {
                                    var channelNameMSG = msgsName.first();
                                    var channelName = channelNameMSG.content;

                                    // if channelName is default then use default
                                    if (channelName === 'default') {
                                        channelName = user.username + '-private-channel';
                                    }

                                    // create channel
                                    var newChannel = await message.guild.channels.create(channelName, {type: channelType, parent: category});

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
                                    
                                    // remove promt and user message with channel name
                                    msg.delete();
                                    channelNameMSG.delete();

                                    // DM to creator with emoji collector
                                    var dmMsg = await user.send('Your private channel' + channelName +' has been created, when you are done with it, please react to this meesage with 🚫 to delete the channel.')

                                    dmMsg.react('🚫');

                                    const deleteFilter = (react, user) => !user.bot && react.emoji.name === '🚫';
                                    dmMsg.awaitReactions(deleteFilter, {max: 1}).then(reacts => {
                                        newChannel.delete();
                                        dmMsg.delete();
                                        user.send('Private channel has been delete succesfully').then(msg => msg.delete({timeout: 5000}));
                                    });

                                }).catch((errors) => console.log(errors));
                            });
                        });
                    });
                });
            });
        });
        
    }

}