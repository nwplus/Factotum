// Discord.js commando requirements
const discordServices = require('../../discord-services');
const ActivityCommand = require('../../classes/activity-command');
const ActivityManager = require('../../classes/activity-manager');

// Command export
module.exports = class GroupShuffle extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'shuffle-groups',
            group: 'a_activity',
            memberName: 'group shuffle in activity',
            description: 'Will shuffle groups in the main channel into the available private channels.',
            guildOnly: true,
        });
    }

    /**
     * The command code.
     * @param {Message} message 
     * @param {Activity} activity 
     */
    async activityCommand(message, activity) {

        await ActivityManager.groupShuffle(activity);

        // report success of activity shuffling
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' groups have been shuffled into the private channels!');
    }
};