const { Collection, MessageEmbed, GuildMember } = require('discord.js');
const winston = require('winston');
const { addRoleToMember, sendEmbedToMember, replaceRoleToMember, sendMessageToMember } = require('../discord-services');
const BotGuildModel = require('./bot-guild');

/**
 * @class
 * 
 */
class StampsManager {
    /**
     * Will let hackers get a stamp for attending the activity.
     * @param {import('./activities/activity')} activity - activity to use
     * @param {Number} [time] - time to wait till collector closes, in seconds
     * @param {BotGuildModel} botGuild
     * @async
     */
    static async distributeStamp(activity, botGuild, time = 60) {

        winston.loggers.get(activity.guild.id).event(`Activity named ${activity.name} is distributing stamps.`, {event: 'Activity Manager'});
        
        // The users already seen by this stamp distribution.
        let seenUsers = new Collection();

        const promptEmbed = new MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('React within ' + time + ' seconds of the posting of this message to get a stamp for ' + activity.name + '!');

        let promptMsg = await activity.generalText.send(promptEmbed);
        promptMsg.react('👍');

        // reaction collector, time is needed in milliseconds, we have it in seconds
        const collector = promptMsg.createReactionCollector((reaction, user) => !user.bot, { time: (1000 * time) });

        collector.on('collect', async (reaction, user) => {
            // grab the member object of the reacted user
            const member = activity.generalText.guild.member(user);

            if (!seenUsers.has(user.id)) {
                this.parseRole(member, activity.name, botGuild);
                seenUsers.set(user.id, user.username);
            }
        });

        // edit the message to closed when the collector ends
        collector.on('end', collected => {
            winston.loggers.get(activity.guild.id).event(`Activity named ${activity.name} stamp distribution has stopped.`, {event: 'Activity Manager'});
            if (!promptMsg.deleted) {
                promptMsg.edit(promptEmbed.setTitle('Time\'s up! No more responses are being collected. Thanks for participating in ' + activity.name + '!'));
            }
        });
    }


    /**
     * Upgrade the stamp role of a member.
     * @param {GuildMember} member - the member to add the new role to
     * @param {String} activityName - the name of the activity
     * @param {BotGuildModel} botGuild
     * @throws Error if the botGuild has stamps disabled
     */
    static parseRole(member, activityName, botGuild) {
        if (!botGuild.stamps.isEnabled) {
            winston.loggers.get(botGuild._id).error(`Stamp system is turned off for guild ${botGuild._id} but I was asked to parse a role for member ${member.id} for activity ${activityName}.`, { event: 'Activity Manager' });
            throw Error(`Stamp system is turned of for guild ${botGuild._id} but I was asked to parse a role for member ${member.id} for activity ${activityName}.`);
        }

        let role = member.roles.cache.find(role => botGuild.stamps.stampRoleIDs.has(role.id));

        if (role === undefined) {
            addRoleToMember(member, botGuild.stamps.stamp0thRoleId);
            sendEmbedToMember(member, 'I did not find an existing stamp role for you so I gave you one for attending '
                + activityName + '. Please contact an admin if there was a problem.', true);
            winston.loggers.get(botGuild._id).userStats(`Activity named ${activityName} tried to give a stamp to the user with id ${member.id} but he has no stamp, I gave them the first stamp!`, {event: 'Activity Manager'});
            return;
        }

        let stampNumber = botGuild.stamps.stampRoleIDs.get(role.id);
        if (stampNumber === botGuild.stamps.stampRoleIDs.size - 1) {
            sendMessageToMember(member, 'You already have the maximum allowed number of stamps!', true);
            winston.loggers.get(botGuild._id).userStats(`Activity named ${activityName} tried to give a stamp to the user with id ${member.id} but he is already in the max stamp ${stampNumber}`, {event: 'Activity Manager'});
            return;
        }
        let newRoleID;

        botGuild.stamps.stampRoleIDs.forEach((num, key, map) => {
            if (num === stampNumber + 1) newRoleID = key;
        });

        if (newRoleID != undefined) {
            replaceRoleToMember(member, role.id, newRoleID);
            sendMessageToMember(member, 'You have received a higher stamp for attending ' + activityName + '!', true);
            winston.loggers.get(botGuild._id).userStats(`Activity named ${activityName} gave a stamp to the user with id ${member.id} going from stamp number ${stampNumber} to ${stampNumber + 1}`, {event: 'Activity Manager'});
        }
    }
}
module.exports = StampsManager;