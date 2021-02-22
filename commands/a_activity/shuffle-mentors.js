const discordServices = require('../../discord-services');
const ActivityCommand = require('../../classes/activity-command');
const ActivityManager = require('../../classes/activity-manager');

// Command export
module.exports = class MentorShuffle extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'shuffle-mentors',
            group: 'a_activity',
            memberName: 'mentor shuffle in activity',
            description: 'Will shuffle mentors in the main channel into the available private channels.',
            guildOnly: true,
        });
    }

    /**
     * Command code.
     * @param {Message} message 
     * @param {Activity} activity 
     */
    async activityCommand(botGuild, message, activity) {

        ActivityManager.mentorShuffle(activity);

        // report success of activity shuffling
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' mentors have been shuffled into the private channels!');
    }
};