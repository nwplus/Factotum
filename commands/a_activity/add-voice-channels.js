// Discord.js commando requirements
const Activity = require('../../classes/activities/activity');
const ActivityCommand = require('../../classes/activities/activity-command');
const discordServices = require('../../discord-services');

// Command export
module.exports = class CreatePrivatesFor extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'add-voice-channels',
            group: 'a_activity',
            memberName: 'create private voice channels for a workshop',
            description: 'Will create x number of private voice channels for given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'number',
                    prompt: 'number of private channels',
                    type: 'integer',
                },
                {
                    key: 'isPrivate',
                    prompt: 'if the new voice channels should be privates',
                    type: 'boolean',
                    default: false,
                },
                {
                    key: 'maxUsers',
                    prompt: 'max number of users allowed on the voice channel',
                    type: 'integer',
                    default: 0,
                }
            ],
        });
    }

    /**
     * Command code.
     * @param {Message} message 
     * @param {Activity} activity 
     */
    async activityCommand(botGuild, message, activity, {number, isPrivate, maxUsers}) {
        let final = activity.addVoiceChannels(number, isPrivate, maxUsers);

        // report success of workshop creation
        discordServices.replyAndDelete(message,'Workshop session named: ' + activity.name + ' now has ' + final + ' voice channels.');
    }

};