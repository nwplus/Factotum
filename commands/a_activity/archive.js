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
            archiveCategory = await message.guild.channels.create('💼archive', {type: 'category', permissionOverwrites: [
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
            ]})
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
        if (voiceChannelKey === '') {
            var generalVoice = await category.children.find(channel => channel.type === 'voice'  && channel.name.endsWith(discordServices.activityVoiceChannelName));
        } else {
            var generalVoice = message.guild.channels.resolve(voiceChannelKey);
        }

        // grab general voice and update permission to no speak for attendees
        if (textChannelKey === '') {
            var generalText = await category.children.find(channel => channel.type === 'text'  && channel.name.endsWith(discordServices.activityTextChannelName));
        } else {
            var generalText = message.guild.channels.resolve(textChannelKey);
        }

        // remove voice channels
        await discordServices.removeVoiceChannelsToActivity(activityName, category.children.array().length, category);

        // remove general voice
        generalVoice.delete();

        // remove all text channels except text
        category.children.filter(channel => channel.type === 'text' && channel.name != generalText.name).each(channel => channel.delete());

        // move text channel
        generalText.setName(activityName + '-' + generalText.name);
        generalText.setParent(archiveCategory);

        // remove category
        category.delete();

        firebaseActivity.remove(activityName);

        // report success of coffee chat creation
        discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' is now archived.');
    }
}; 