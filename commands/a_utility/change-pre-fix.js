/** DEPRECATED */

const { Message } = require('discord.js');
const PermissionCommand = require('../../classes/permission-command');
const { StringPrompt } = require('advanced-discord.js-prompts');

/**
 * Gives admin the ability to change the prefix used in the guild by the bot.
 * @category Commands
 * @subcategory Admin-Utility
 * @extends PermissionCommand
 * @guildonly
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
     * @param {FirebaseFirestore.DocumentData | null | undefined} initBotInfo 
     * @param {Message} message 
     */
    async runCommand(initBotInfo, message) {
        let options = ['!', '#', '$', '%', '&', '?', '|', '°'];

        let prefix = StringPrompt.restricted({ prompt: 'What would you like to use as the prefix?', channel: message.channel, userId: message.author.id }, options);

        initBotInfo.prefix = prefix;
        initBotInfo.save();

        message.guild.commandPrefix = prefix;

    }
}
module.exports = ChangePreFix;