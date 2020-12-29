// Discord.js commando requirements
const discordServices = require('../../discord-services');
const ActivityCommand = require('../../classes/activity-command');
const Activity = require('../../classes/activity');
const ActivityManager = require('../../classes/activity-manager');

// Command export
module.exports = class ActivityCallback extends ActivityCommand {
    constructor(client, activity) {
        super(client, 
            {
                name: 'callback',
                group: 'a_activity',
                memberName: 'call back to main voice channel',
                description: 'Will return everyone to the workshop\'s main voice channel.',
                guildOnly: true,
            });
    }

    /**
     * Required class by children, should contain the command code.
     * @param {Message} message - the message that has the command
     * @param {Activity} activity - the activity for this activity command
     */
    async runActivityCommand(message, activity, args, fromPattern, result) {

        ActivityManager.voiceCallBack(activity);

        // report success of activity callback
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' members have been called back!');
    }
}