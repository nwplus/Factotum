const PermissionCommand = require('../../classes/permission-command');
const { sendEmbedToMember, replyAndDelete } = require('../../discord-services');
const { Message, MessageEmbed } = require('discord.js');
const BotGuildModel = require('../../classes/bot-guild');
const { StringPrompt, MessagePrompt } = require('advanced-discord.js-prompts');
const ChannelPrompt = require('advanced-discord.js-prompts/prompts/channel-prompt');

/**
 * The start channel creation command lets users create private channels for them to use.
 * Users can create voice or text channels, invite as many people as they want when created and name the channels whatever they want.
 * A category and channel is created for this feature. The new channels are created inside this category.
 * Users can delete the channel by reacting to a message in their DMs with the bot.
 * THERE IS A LIMIT OF CHANNELS! Categories can only have up to 50 channels, if you expect more than 50 channels please DO NOT USE THIS FEATURE.
 * @category Commands
 * @subcategory Start-Commands
 * @extends PermissionCommand
 * @guildonly
 */
class StartChannelCreation extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'start-channel-creation',
            group: 'a_start_commands',
            memberName: 'start channel creation',
            description: 'Send a message with emoji collector, for each emoji bot will ask type and other friends invited and create the private channel.',
            guildOnly: true,
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the !start-channel-creation command is only for staff!',
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'Hey there, the !start-channel-creation command is only available in the admin console channel.',
        });
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message - the message in which the command was run
     */
    async runCommand(botGuild, message) {

        try {
            // grab current channel
            var channel = await ChannelPrompt.single({prompt: 'What channel do you want to use? The channel\'s category will be used to create the new channels.', channel: message.channel, userId: message.author.id});
        } catch (error) {
            message.channel.send('<@' + message.author.id + '> The command has been canceled due to the prompt cancel.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        // grab channel creation category and update permissions
        var category = channel.parent;
        category.updateOverwrite(botGuild.roleIDs.everyoneRole, {
            VIEW_CHANNEL: false,
        });

        channel.updateOverwrite(botGuild.roleIDs.everyoneRole, {
            VIEW_CHANNEL: true,
        });

        
        // create and send embed message to channel with emoji collector
        const msgEmbed = new MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('Private Channel Creation')
            .setDescription('Do you need a private channel to work with your friends? Or a voice channel to get to know a mentor, here you can create private text or voice channels.' +
                ' However do know that server admins will have access to these channels, and the bot will continue to monitor for bad language, so please follow the rules!')
            .addField('Ready for a channel of your own?', 'Just react this message with any emoji and the bot will ask you a few simple questions.');
        
        var cardMessage = await channel.send(msgEmbed);
        cardMessage.pin();

        // main collector works with any emoji
        var mainCollector = cardMessage.createReactionCollector(m => true);

        mainCollector.on('collect', async (reaction, user) => {
            // helpful vars
            let userId = user.id;

            try {
                let channelType = await StringPrompt.restricted({prompt: 'Do you want a "voice" or "text" channel?', channel, userId, time: 20, cancelable: true}, ['voice', 'text']);

                let guests = (await MessagePrompt.prompt({prompt: 'Please tag all the invited users to this private ' + channelType + ' channel. Type "none" if no guests are welcomed.', channel, userId, time: 60, cancelable: true})).mentions.members;

                let channelName = await StringPrompt.single({prompt: 'What do you want to name the channel? If you don\'t care then send "default"!', channel, userId, time: 30});

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
                    let dmMsg = await sendEmbedToMember(user, {
                        title: 'Channel Creation',
                        description: 'Your private channel ' + channelName +
                            ' has been created, when you are done with it, please react to this message with 🚫 to delete the channel.',
                    });
                    dmMsg.react('🚫');

                    const deleteFilter = (react, user) => !user.bot && react.emoji.name === '🚫';
                    dmMsg.awaitReactions(deleteFilter, {max: 1}).then(reacts => {
                        newChannel.delete();
                        dmMsg.delete();
                        sendEmbedToMember(user, {
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
module.exports = StartChannelCreation;
