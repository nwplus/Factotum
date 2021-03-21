const { Message } = require('discord.js');
const PermissionCommand = require('../../classes/permission-command');
const { messagePrompt } = require('../../classes/prompt');
const BotGuildModel = require('../../classes/bot-guild');

/**
 * Gives admin the ability to change the prefix used in the guild by the bot.
 */
class ChangePreFix extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'change-prefix',
            group: 'a_utility',
            memberName: 'change guild prefix',
            description: 'Change the prefix used in this guild by the bot.',
            guildOnly: true,
        }, {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
        });
    }

    /**
     * @param {BotGuildModel} botGuild 
     * @param {Message} message 
     */
    async runCommand(botGuild, message) {
        let options = ['!', '#', '$', '%', '&', '?', '|', '°'];

        let prefix = '';
        while (!options.includes(prefix)) {
            prefix = (await messagePrompt({ prompt: `What would you like to use as the prefix? Options: ${options.join(', ')}.`, channel: message.channel, userId: message.author.id}, 'string', 45)).content;
        }

        botGuild.prefix = prefix;
        botGuild.save();

        message.guild.commandPrefix = prefix;

    }
}
module.exports = ChangePreFix;