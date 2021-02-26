const discordServices = require('../../discord-services');
const ActivityCommand = require('../../classes/activities/activity-command');
const ActivityManager = require('../../classes/activities/activity-manager');
const { Message } = require('discord.js');
const Prompt = require('../../classes/prompt');
const winston = require('winston');
const Activity = require('../../classes/activities/activity');
// Command export
module.exports = class RoleShuffle extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'shuffle-role',
            group: 'a_activity',
            memberName: 'role shuffle in activity',
            description: 'Will shuffle users with a given role.',
            guildOnly: true,
        });
    }

    /**
     * Command code.
     * @param {Message} message 
     * @param {Activity} activity 
     */
    async activityCommand(botGuild, message, activity) {

        try {
            var role = (await Prompt.rolePrompt({ prompt: "What role would you like to shuffle?", channel: message.channel, userId: message.author.id})).first();
        } catch (error) {
            winston.loggers.get(message.guild.id).warning(`User canceled a request when asking for a role for role shuffle. Error: ${error}.`, { event: "RoleShuffle Command" });
        }

        ActivityManager.roleShuffle(activity, role);

        // report success of activity shuffling
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' mentors have been shuffled into the private channels!');
        winston.loggers.get(message.guild.id).verbose(`User shuffled users with role ${role.name} with id ${role.id} in the activity ${activity.name}.`, { event: "RoleShuffle Command" });
    }
};