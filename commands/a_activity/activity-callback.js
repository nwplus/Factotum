// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseActivity = require('../../firebase-services/firebase-services-activities')
const discordServices = require('../../discord-services');

// Command export
module.exports = class ActivityCallback extends Command {
    constructor(client) {
        super(client, {
            name: 'callback',
            group: 'a_activity',
            memberName: 'call back to main voice channel',
            description: 'Will return everyone to the workshop\'s main voice channel.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName}) {
        discordServices.deleteMessage(message);
        // make sure command is only used in the boothing-wait-list channel
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

                        // loop over channels and get all member to move back to main voice channel
                        for (var index = 0; index < numberOfChannels; index++) {
                            var channel = await category.children.find(channel => channel.name === activityName + '-' + index);

                            var members = channel.members;

                            members.forEach(member => member.voice.setChannel(generalVoice));
                        }
                        

                        // report success of activty shuffling
                        message.reply('Activity named: ' + activityName + ' members have been called back!');
                    } else {
                        // report failure due to no private channels
                        message.reply('Activity named: ' + activityName + ' members were not called back because there are no private channels!');
                    }
                } else {
                    // report failure due to no activity
                    message.reply('Activity named: ' + activityName + ' does not exist. No action taken.');
                }
                
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }
};