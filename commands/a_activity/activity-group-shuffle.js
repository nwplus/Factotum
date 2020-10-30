// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class GroupShuffle extends Command {
    constructor(client) {
        super(client, {
            name: 'gshuffle',
            group: 'a_activity',
            memberName: 'group shuffle in activity',
            description: 'Will shuffle groups in the main channel into the available private channels.',
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
                    var numberOfChannels = await firebaseServices.activityPrivateChannels(activityName);

                    // Check if there are private channels if not do nothing
                    if (numberOfChannels != 0) {

                        // get the general voice channel
                        var generalVoice = await category.children.find(channel => channel.name === activityName + '-general-voice');

                        // get members in general voice channel
                        var members = await generalVoice.members;

                        // get channels
                        var channels = [];
                        for (var index = 0; index < numberOfChannels; index++) {
                            channels.push(
                                await category.children.find(channel => channel.name === activityName + '-' + index)
                            );
                        }

                        // get teams from firebase
                        var groups = await firebaseServices.getGroupsFromCoffeChat(activityName);

                        // add the members into the channels
                        for(var index = 0; index < groups.length; index++) {
                            var group = groups[index];
                            await group['members'].forEach(async (item, i) => {
                                var member = await members.find(guildMember => guildMember.user.username === item);
                                if (member != undefined) {
                                    await member.voice.setChannel(channels[index]).catch(console.error);
                                }
                            })
                        }

                        // report success of activity shuffling
                        message.reply('Activity named: ' + activityName + ' groups have been shuffled into the private channels!');
                    } else {
                        // report failure due to no private channels
                        message.reply('Activity named: ' + activityName + ' groups were not shuffled because there are no private channels!');
                    }
                } else {
                    // report failure due to no category names like activityName
                    message.reply('Activity named: ' + activityName + ' groups were not shuffled because the activity does not excist!');
                }
                
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }
};