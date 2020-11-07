// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseActivity = require('../../firebase-services/firebase-services-activities');
const discordServices = require('../../discord-services');

// Command export
module.exports = class ActivityShuffle extends Command {
    constructor(client) {
        super(client, {
            name: 'shuffle',
            group: 'a_activity',
            memberName: 'shuffle everyone in activity',
            description: 'Will shuffle everyone in the main channel into the available private channels.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the activity name',
                    type: 'string',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName}) {
        message.delete();
        // make sure command is only used in the admin console
        if (discordServices.isAdminConsole(message.channel) === true) {
            // only memebers with the Hacker tag can run this command!
            if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {

                // get category
                var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

                // check if the category excist if not then do nothing
                if (category != undefined) {
                    
                    // get number of channels
                    var numberOfChannels = await firebaseActivity.numOfVoiceChannels(activityName);

                    // Check if there are private channels if not do nothing
                    if (numberOfChannels != 0) {

                        // get the general voice channel
                        var generalVoice = await category.children.find(channel => channel.name === activityName + '-general-voice');

                        // get members in general voice channel
                        var members = generalVoice.members;

                        // get channels
                        var channels = [];
                        for (var index = 0; index < numberOfChannels; index++) {
                            channels.push(
                                await category.children.find(channel => channel.name === activityName + '-' + index)
                            );
                        }

                        // shuffle the member list
                        this.shuffleArray(members);

                        // add the members into the channels
                        var index = 0;
                        members.each(member => {
                            member.voice.setChannel(channels[index % numberOfChannels]).catch(console.error);
                            index++;
                        })

                        // report success of activity shuffling
                        message.reply('Activity named: ' + activityName + ' members have been shuffled into the private channels!');
                    } else {
                        // report failure due to no private channels
                        message.reply('Activity named: ' + activityName + ' members were not shuffled because there are no private channels!');
                    }
                } else {
                    // report failure due to no category names like activityName
                    message.reply('Activity named: ' + activityName + ' members were not shuffled because the activity does not excist!');
                }
                
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

};