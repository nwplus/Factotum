// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseActivity = require('../../firebase-services/firebase-services-activities');
const discordServices = require('../../discord-services');

// Command export
module.exports = class MentorShuffle extends Command {
    constructor(client) {
        super(client, {
            name: 'mshuffle',
            group: 'a_activity',
            memberName: 'mentor shuffle in activity',
            description: 'Will shuffle mentors in the main channel into the available private channels.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the activity name',
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
        if (! discordServices.isAdminConsole(message.channel)) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;   
        }
        // only memebers with the staff tag can run this command!
        if (!(await discordServices.checkForRole(message.member, discordServices.staffRole))) {
            discordServices.replyAndDelete(message, 'You do not have permision for this command, only staff can use it!');
            return;             
        }

        // get category
        if (categoryChannelKey === '') {
            var category = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name === activityName);
        } else {
            var category = message.guild.channels.resolve(categoryChannelKey);
        }

        
        // check if the category exist if not then report failure and return
        if (category === undefined) {
            discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' does not exist. No action taken.');
            return;
        }

        // get number of channels
        var numberOfChannels = await firebaseActivity.numOfVoiceChannels(activityName);

        // if no channels then report failure and return
        if (numberOfChannels === 0) {
            discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' mentors were not shuffled because there are no private channels!');
            return;
        }

        // grab general voice and update permission to no speak for attendees
        if (voiceChannelKey === '') {
            var generalVoice = await category.children.find(channel => channel.name === activityName + '-general-voice');
        } else {
            var generalVoice = message.guild.channels.resolve(voiceChannelKey);
        }

        // get members in general voice channel
        var mentors = await generalVoice.members.filter(async member => {
            return await discordServices.checkForRole(member, discordServices.mentorRole);
        });

        // get channels
        var channels = [];
        for (var index = 0; index < numberOfChannels; index++) {
            channels.push(
                await category.children.find(channel => channel.name === activityName + '-' + index)
            );
        }

        // add the mentors into the channels
        var channelIndex = 0;
        mentors.each(mentor => {
            mentor.voice.setChannel(channels[channelIndex % numberOfChannels]).catch(console.error);
            channelIndex++;
        });

        // report success of activity shuffling
        discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' mentors have been shuffled into the private channels!');
    }
};