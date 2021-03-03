const PermissionCommand = require('../../classes/permission-command');
const { Message } = require('discord.js');
const Activity = require('../../classes/activities/activity');
const BotGuildModel = require('../../classes/bot-guild');

/**
 * Creates a new activity and prompts the user for any information.
 * @category Commands
 * @subcategory Activity
 * @extends PermissionCommand
 * @guildonly
 */
class NewActivity extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'new-activity',
            group: 'a_activity',
            memberName: 'create a new activity',
            description: 'Will create a new activity.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the activity name, can use emojis!',
                    type: 'string',
                },
            ],
        },
        {
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'This command can only be used in the admin console!',
            role: PermissionCommand.FLAGS.ADMIN_ROLE,
            roleMessage: 'You do not have permission for this command, only admins can use it!',
        });
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message - the message in which the command was run
     * @param {Object} args
     * @param {String} args.activityName
     */
    async runCommand(botGuild, message, {activityName}) {

        let allowedRoles = await Activity.promptForRoleParticipants(message.channel, message.author.id, true);
        let activity = await new Activity({ activityName, guild: message.guild, roleParticipants: allowedRoles, botGuild}).init();

    }
}
module.exports = NewActivity;