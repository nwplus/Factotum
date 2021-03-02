const PermissionCommand = require('../../classes/permission-command');
const Activity = require('../../classes/activities/activity');
const StampsManager = require('../../classes/stamps-manager');
const { Message, } = require('discord.js');

class DistributeStamp extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'distribute-stamp',
            group: 'stamps',
            memberName: 'gives stamps',
            description: 'gives a stamp to everyone who reacted within the time-frame, if targetChannelKey not give, it will send it to the message channel.',
            args: [
                {
                    key: 'timeLimit',
                    prompt: 'How many seconds will the reactions be open for',
                    type: 'integer',
                    default: 60,
                },
            ],
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the command !distribute-stamp is only available to Staff!',
        });
    }

    /**
     * Command code.
     * @param {Message} message 
     * @param {Activity} activity 
     */
    async runCommand(botGuild, message, activity, {timeLimit}) {
        StampsManager.distributeStamp(activity, botGuild, timeLimit);
    }
}
module.exports = DistributeStamp;