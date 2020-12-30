const discordServices = require('../../discord-services');
const ActivityCommand = require('../../classes/activity-command');
const Activity = require('../../classes/activity');
const ActivityManager = require('../../classes/activity-manager');

module.exports = class DistributeStamp extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'distribute-stamp',
            group: 'a_activity',
            memberName: 'gives stamps',
            description: 'gives a stamp to everyone who reacted within the timeframe, if targetChannelKey not give, it will send it to the message channel.',
            args: [
                {
                    key: 'timeLimit',
                    prompt: 'How many seconds will the reactions be open for',
                    type: 'integer',
                    default: discordServices.stampCollectTime,
                },
            ],
        });
    }


    /**
     * Command code.
     * @param {Message} message 
     * @param {Activity} activity 
     */
    async activityCommand(message, activity, {timeLimit}) {
        ActivityManager.distributeStamp(activity, time);
    }

};