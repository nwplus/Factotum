const { Message } = require('discord.js');
const Activity = require('../../classes/activity');
const ActivityCommand = require('../../classes/activity-command');
const discordServices = require('../../discord-services');

// Command export
module.exports = class RemovePrivatesFor extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'removevoiceto',
            group: 'a_activity',
            memberName: 'remove private voice channels',
            description: 'Will remove x number of private voice channels for given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'number',
                    prompt: 'number of private channels to remove',
                    type: 'integer',
                },
            ],
        });
    }

    /**
     * Required class by children, should contain the command code.
     * @param {Message} message - the message that has the command
     * @param {Activity} activity - the activity for this activity command
     */
    async activityCommand(message, activity, { number }) {
        
        let final = activity.removeVoiceChannels(number);

        // report success of channel deletions
        discordServices.replyAndDelete(message,'Workshop session named: ' + activityName + ' now has ' + final + ' voice channels.');
    }
};