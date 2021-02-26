const discordServices = require('../../discord-services');
const { Message } = require('discord.js');
const Activity = require('../../classes/activities/activity');
const PermissionCommand = require('../../classes/permission-command');
const CoffeeChats = require('../../classes/activities/coffee-chats');

// Command export
module.exports = class InitCoffeeChats extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'init-coffee-chats',
            group: 'a_activity',
            memberName: 'initialize coffee chat functionality for activity',
            description: 'Will initialize the coffee chat functionality for the given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the activity name, can use emojis!',
                    type: 'string',
                },
                {
                    key: 'numOfGroups',
                    prompt: 'number of groups to participate in coffee chat',
                    type: 'integer'
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
     * Required class by children, should contain the command code.
     * @param {Message} message - the message that has the command
     * @param {Activity} activity - the activity for this activity command
     */
    async runCommand(botGuild, message, { activityName, numOfGroups }) {

        let roleParticipants = await Activity.promptForRoleParticipants(message.channel, message.author.id, true);

        let coffeeChats = await new CoffeeChats({activityName: activityName, guild: message.guild, roleParticipants: roleParticipants, botGuild: botGuild}, numOfGroups).init();

        // report success of coffee chat creation
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' now has coffee chat functionality.');
    }
};