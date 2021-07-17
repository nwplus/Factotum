const PermissionCommand = require('../../classes/permission-command');
const { discordLog } = require('../../discord-services');
const { Message } = require('discord.js');
const BotGuildModel = require('../../classes/bot-guild');

/**
 * The !set-bot-activity will set the bot's activity.
 * @category Commands
 * @subcategory Admin-Utility
 * @extends PermissionCommand
 */
class SetBotActivity extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'set-bot-activity',
            group: 'a_utility',
            memberName: 'set bot activity',
            description: 'Sets the bot activity.',
            guildOnly: true,
            args: [{   
                key: 'status',
                prompt: 'the bot status',
                type: 'string',
                default: 'nwplus.github.io/Factotum',
            }]
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the command !set-bot-activity is only available to Staff!',
        });
    }

    /**
     * @param {Message} message - the command message
     * @param {Object} args
     * @param {String} args.status
     */
     
    async runCommand(botGuild, message, {status}) {
        this.client.user.setActivity(status, {type: 'PLAYING'});
    }
}
module.exports = SetBotActivity;
