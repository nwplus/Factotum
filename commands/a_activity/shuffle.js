// Discord.js commando requirements
const discordServices = require('../../discord-services');
const ActivityCommand = require('../../classes/activities/activity-command');
const ActivityManager = require('../../classes/activities/activity-manager');

// Command export
module.exports = class ActivityShuffle extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'shuffle',
            group: 'a_activity',
            memberName: 'shuffle everyone in activity',
            description: 'Will shuffle everyone in the main channel into the available private channels.',
            guildOnly: true,
        });
    }

    /**
     * Command code.
     * @param {Message} message 
     * @param {Activity} activity 
     */
    async activityCommand(botGuild, message, activity) {
        
        ActivityManager.shuffle(activity);

        // report success of activity shuffling
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' members have been shuffled into the private channels!');
    }
};