// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const firebaseActivity = require('../../firebase-services/firebase-services-activities');


// Command export
module.exports = class InitAmongUs extends Command {
    constructor(client) {
        super(client, {
            name: 'archive',
            group: 'a_activity',
            memberName: 'archive activity',
            description: 'Will archive an activity by removing the category and voice channels, and moving text channels to archive category.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
                {
                    key: 'categoryChannelKey',
                    prompt: 'snowflake of the activiti\'s category',
                    type: 'string',
                    default: '',
                },
                {
                    key: 'textChannelKey',
                    prompt: 'snowflake of the general text channel for the activity',
                    type: 'string',
                    default: '',
                },
                {
                    key: 'voiceChannelKey',
                    prompt: 'snowflake of the general voice channel for the activity',
                    type: 'string',
                    default: '',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName, categoryChannelKey, textChannelKey, voiceChannelKey}) {
        discordServices.deleteMessage(message);

        // make sure command is only used in the admin console
        if (!discordServices.isAdminConsole(message.channel)) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;   
        }
        // only memebers with the staff tag can run this command!
        if (!discordServices.checkForRole(message.member, discordServices.staffRole)) {
            discordServices.replyAndDelete(message, 'You do not have permision for this command, only staff can use it!');
            return;             
        }

        // get the archive category or create it
        var archiveCategory = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name === '💼archive');

        if (archiveCategory === undefined) {
            
            // position is used to create archive at the very bottom!
            var position = (await message.guild.channels.cache.filter(channel => channel.type === 'category')).array().length;
            archiveCategory = await message.guild.channels.create('💼archive', {
                type: 'category', 
                position: position + 1,
                permissionOverwrites: [
                {
                    id: discordServices.hackerRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.attendeeRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.mentorRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.sponsorRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.staffRole,
                    allow: ['VIEW_CHANNEL'],
                }
            ]});
        }

        // get category
        if (categoryChannelKey === '') {
            var category = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name.endsWith(activityName));
        } else {
            var category = message.guild.channels.resolve(categoryChannelKey);
        }

        // if no activity category then report failure and return
        if (category === undefined) {
            discordServices.replyAndDelete(message,'The activity named: ' + activityName +', does not exist! No action taken.');
            return;
        }

        // grab general voice and update permission to no speak for attendees
        if (textChannelKey === '') {
            var generalText = await category.children.find(channel => channel.type === 'text'  && channel.name.endsWith(discordServices.activityTextChannelName));
        } else {
            var generalText = message.guild.channels.resolve(textChannelKey);
        }

        // move text channel
        await generalText.setParent(archiveCategory);
        await generalText.setName(activityName + '-banter');

        // remove all text channels except text
        var channels = category.children.array();

        for (var i = 0; i < channels.length; i++) {
            discordServices.blackList.delete(channels[i].id);
            await discordServices.deleteChannel(channels[i]);
        }

        // remove category
        discordServices.deleteChannel(category);

        firebaseActivity.remove(activityName);

        // report success of coffee chat creation
        discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' is now archived.');
    }
}; 