const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Activity = require('../../classes/activity');
const PermissionCommand = require('../../classes/permission-command');
const ActivityManager = require('../../classes/activity-manager');

module.exports = class WorkshopPolls extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'workshop-polls',
            group: 'a_activity',
            memberName: 'workshop polling',
            description: 'polls workshop attendees during the workshop',
            args: [
                {
                    key: 'questionType',
                    prompt: 'what are you polling for?',
                    type: 'string',
                    validate: (value) => value === 'speed' || value === 'difficulty' || value === 'explanations',
                },
            ],
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the command !contests is only available to Staff!',
        });
    }


    /**
     * Required class by children, should contain the command code.
     * @param {Message} message - the message that has the command
     * @param {Activity} activity - the activity for this activity command
     */
    async runCommand(botGuild, message, activity, { questionType }) {

        let responses = new Discord.Collection();
        let title = '';
        let question = '';

        if (questionType === 'speed') {
            title = 'Speed Poll!';
            question = 'Please react to this poll!';
            responses.set('🐢', 'Too Slow?');
            responses.set('🐶', 'Just Right?');
            responses.set('🐇', 'Too Fast?');
        } else if (questionType === 'difficulty') {
            title = 'Difficulty Poll!';
            question = 'Please react to this poll! If you need help, go to the assistance channel!';
            responses.set('🐢', 'Too Hard?');
            responses.set('🐶', 'Just Right?');
            responses.set('🐇', 'Too Easy?');
        } else if (questionType === 'explanations') {
            title = 'Explanation Poll!';
            question = 'Please react to this poll!';
            responses.set('🐢', 'Hard to understand?');
            responses.set('🐶', 'Meh explanations?');
            responses.set('🐇', 'Easy to understand?');
        }

        ActivityManager.sendPoll(activity, title, question, responses);
    }
}
