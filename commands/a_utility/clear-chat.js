// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { discordLog } = require('../../discord-services');
const { MessageEmbed, Message } = require('discord.js');
const BotGuildModel = require('../../classes/Bot/bot-guild');

/**
 * The clear chat command will clear a channel from at most 100 messages that are at least 2 weeks young.
 * Option to keep pinned messages available.
 * @category Commands
 * @subcategory Admin-Utility
 * @extends PermissionCommand
 */
class ClearChat extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'clear-chat',
            group: 'a_utility',
            memberName: 'clear chat utility',
            description: 'Will clear up to 100 newest messages from the channel. Messages older than two weeks will not be deleted. Then will send message with available commands in the channel, if any.',
            guildOnly: true,
            args: [
                {
                    key: 'keepPinned',
                    prompt: 'if pinned messages should be kept',
                    type: 'boolean',
                    default: false,
                },
            ],
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the command !clear-chat is only available to staff!',
        });
    }

    /**
     * @param {BotGuildModel} botGuild - the botGuild instance given from PermissionCommand
     * @param {Message} message - the message in which the command was run
     * @param {Object} args - the command arguments
     * @param {Boolean} args.keepPinned - if true any pinned messages will not be removed
     */
    async runCommand (botGuild, message, {keepPinned}) {

        if (keepPinned) {
            // other option is to get all channel messages, filter of the pined channels and pass those to bulkDelete, might be to costly?
            var messagesToDelete = message.channel.messages.cache.filter(msg => !msg.pinned);
            await message.channel.bulkDelete(messagesToDelete, true).catch(console.error);
        } else {
            // delete messages and log to console
            await message.channel.bulkDelete(100, true).catch(console.error);
        }

        discordLog(message.guild, 'CHANNEL CLEAR ' + message.channel.name + '. By user: ' + message.author.username);
    }
}
module.exports = ClearChat;
