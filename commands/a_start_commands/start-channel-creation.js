// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Prompt = require('../../classes/prompt');

// Command export
module.exports = class StartChannelCreation extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'start-channel-creation',
            group: 'a_start_commands',
            memberName: 'start channel creation',
            description: 'Send a message with emoji collector, for each emoji bot will ask type and other friends invited and create the private channel.',
            guildOnly: true,
        },
        {
            roleID: discordServices.roleIDs.staffRole,
            roleMessage: 'Hey there, the !start-channel-creation command is only for staff!',
            channelID: discordServices.channelIDs.adminConsoleChannel,
            channelMessage: 'Hey there, the !start-channel-creation command is only available in the admin console channel.',
        });
    }

    /**
     *  
     * @param {Discord.Message} message 
     */
    async runCommand(message) {

        try {
            // grab current channel
            var channel = await Prompt.channelPrompt('What channel do you want to use? The channel\'s category will be used to create the new channels.', message.channel, message.author.id);
        } catch (error) {
            message.channel.send('<@' + message.author.id + '> The command has been canceled due to the prompt cancel.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        // grab channel creation category
        var category = channel.parent;
        
        // create and send embed message to channel with emoji collector
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.colors.embedColor)
            .setTitle('Private Channel Creation')
            .setDescription('Do you need a private channel to work with your friends? Or a voice channel to get to know a mentor, here you can create private text or voice channels.' +
                ' However do know that server admins will have access to these channels, and the bot will continue to monitor for bad language, so please follow the rules!')
            .addField('Ready for a channel of your own?', 'Just react this message with any emoji and the bot will ask you a few simple questions.');
        
        var cardMessage = await channel.send(msgEmbed);
        cardMessage.pin();

        // main collector works with any emoji
        var mainCollector = cardMessage.createReactionCollector(m => true);

        mainCollector.on('collect', async (reaction, user) => {
            try {
                let channelType =(await Prompt.messagePrompt('Do you want a "voice" or "text" channel?', 'string', channel, user.id, 15)).content;

                // make sure input is valid
                if (channelType != 'voice' && channelType != 'text') {
                    // report the error and ask to try again
                    discordServices.replyAndDelete(message, 'Wrong input, please respond with "voice" or "text" only. Try again.');
                    return;
                }

                let guests = (await Prompt.messagePrompt('Please tag all the invited users to this private ' + channelType + ' channel. Type "none" if no guests are welcomed.', 'string', channel, user.id, 30)).mentions.members;

                let channelName = (await Prompt.messagePrompt('What do you want to name the channel? If you don\'t care then send "default"!', 'string', channel, user.id, 20)).content;

                // if channelName is default then use default
                if (channelName === 'default') {
                    channelName = user.username + '-private-channel';
                }

                // create channel
                message.guild.channels.create(channelName, {
                    type: channelType, 
                    parent: category
                }).then(async newChannel => {
                    newChannel.updateOverwrite(user, {
                        VIEW_CHANNEL : true,
                    });

                    // add guests
                    guests.each(mem => newChannel.updateOverwrite(mem.user, {
                        VIEW_CHANNEL : true,
                    }));

                    // DM to creator with emoji collector
                    let dmMsg = await discordServices.sendEmbedToMember(user, {
                        title: 'Channel Creation',
                        description: 'Your private channel ' + channelName +
                            ' has been created, when you are done with it, please react to this message with 🚫 to delete the channel.',
                    });
                    dmMsg.react('🚫');

                    const deleteFilter = (react, user) => !user.bot && react.emoji.name === '🚫';
                    dmMsg.awaitReactions(deleteFilter, {max: 1}).then(reacts => {
                        newChannel.delete();
                        dmMsg.delete();
                        discordServices.sendEmbedToMember(user, {
                            title: 'Channel Creation',
                            description: 'Private channel has been deleted successfully!',
                        }, true);
                    });
                });
            } catch (error) {
                channel.send('<@' + user.id + '> The channel creation was canceled due to a timeout or prompt cancel. Try again!').then(msg => msg.delete({timeout: 8000}));
            }
        });
        
    }

}