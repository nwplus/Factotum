// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');

// Command export
module.exports = class CreateChannel extends Command {
    constructor(client) {
        super(client, {
            name: 'createchannel',
            group: 'utility',
            memberName: 'create a private voice or text channel',
            description: 'Will create a private voice or text channel only visible to whomever calls the command and any users tagged in the command, as well as server admins due to server limitations. ',
            guildOnly: true,
            args: [
                {
                    key: 'channelType',
                    prompt: 'type of channel, one of voice or text',
                    type: 'string',
                    validate: (val) => {
                        return val === 'voice' || val === 'text';
                    }
                },
                {
                    key: 'buddy1',
                    prompt: 'A friend to join the channel with',
                    type: 'member',
                    default: '',
                },
                {
                    key: 'buddy2',
                    prompt: 'A friend to join the channel with',
                    type: 'member',
                    default: '',
                },
                {
                    key: 'buddy3',
                    prompt: 'A friend to join the channel with',
                    type: 'member',
                    default: '',
                },
            ],
        });
    }

    async run (message, {channelType, buddy1, buddy2, buddy3}) {
        discordServices.deleteMessage(message);
        // can only be called in the channel-creation channel
        if (message.channel.id === discordServices.channelcreationChannel) {

            var channel;

            // grab channel creation category
            var category = await message.channel.parent

            if (channelType === 'text') {
                // create text channel
                channel = await message.guild.channels.create(message.author.username + '-private-channel', {type: 'text', parent: category});
            } else if (channelType === 'voice') {
                // create voice channel
                channel = await message.guild.channels.create(message.author.username + '-private-channel', {type: 'voice', parent: category});
            }

            // update permission for users to be able to view
            channel.updateOverwrite(discordServices.everyoneRole, {
                VIEW_CHANNEL : false,
            })
            channel.updateOverwrite(message.author, {
                VIEW_CHANNEL : true,
            });
            if (buddy1 != '') {
                channel.updateOverwrite(buddy1.user, {
                    VIEW_CHANNEL : true,
                });
            }
            if (buddy2 != '') {
                channel.updateOverwrite(buddy2.user, {
                    VIEW_CHANNEL : true,
                });
            }
            if (buddy3 != '') {
                channel.updateOverwrite(buddy3.user, {
                    VIEW_CHANNEL : true,
                });
            }
        } else {
            discordServices.replyAndDelete(message, 'Hey there, the !createchanel command is only available in the create-channel channel.');
        }
    }

}