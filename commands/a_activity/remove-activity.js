const discordServices = require('../../discord-services');
const Activity = require('../../classes/activity');
const ActivityCommand = require('../../classes/activity-command');

// Command export
module.exports = class RemoveActivity extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'remove-activity',
            group: 'a_activity',
            memberName: 'remove an activity',
            description: 'Will remove the category and everything inside it for the given activity',
            guildOnly: true,
        });
    }

    /**
     * Required class by children, should contain the command code.
     * @param {Message} message - the message that has the command
     * @param {Activity} activity - the activity for this activity command
     */
    async activityCommand(message, activity) {
        
        activity.delete();

        // report success of activity removal
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' removed successfully!');
    }
};