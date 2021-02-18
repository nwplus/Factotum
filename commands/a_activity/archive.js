// Discord.js commando requirements
const Activity = require('../../classes/activity');
const ActivityCommand = require('../../classes/activity-command');
const BotGuild = require('../../db/botGuildDBObject');
const discordServices = require('../../discord-services');
const { Message } = require('discord.js');


// Command export
module.exports = class InitAmongUs extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'archive',
            group: 'a_activity',
            memberName: 'archive activity',
            description: 'Will archive an activity by removing the category and voice channels, and moving text channels to archive category.',
            guildOnly: true,
        });
    }

    /**
     * Command code.
     * @param {Message} message 
     * @param {Activity} activity 
     */
    async activityCommand(message, activity) {

        let botGuild = await BotGuild.findById(message.guild.id);

        // get the archive category or create it
        var archiveCategory = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name === '💼archive');

        if (archiveCategory === undefined) {
            
            // position is used to create archive at the very bottom!
            var position = (await message.guild.channels.cache.filter(channel => channel.type === 'category')).array().length;
            archiveCategory = await message.guild.channels.create('💼archive', {
                type: 'category', 
                position: position + 1,
                permissionOverwrites: botGuild.roleIDs?.attendeeRole ? [
                    {
                        id: botGuild.roleIDs.everyoneRole,
                        deny: ['VIEW_CHANNEL'],
                    },
                    {
                        id: botGuild.roleIDs.attendeeRole,
                        allow: ['VIEW_CHANNEL'],
                    },
                    {
                        id: botGuild.roleIDs.staffRole,
                        allow: ['VIEW_CHANNEL'],
                    }
                ] : []
            });
        }

        activity.archive(archiveCategory);

        // report success of coffee chat creation
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' is now archived.');
    }
}; 