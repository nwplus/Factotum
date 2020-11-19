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

        // get activity category
        var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

        // check if the category exist if not then report failure and return
        if (category === undefined) {
            discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' does not exist. No action taken.');
            return;
        }

        // get number of channels
        var numberOfChannels = await firebaseActivity.numOfVoiceChannels(activityName);

        // if no channels then report failure and return
        if (numberOfChannels === 0) {
            discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' members were not called back because there are no private channels!');
            return;
        }
        
        // get the general voice channel by name
        var generalVoice = await category.children.find(channel => channel.name === activityName + '-general-voice');

        // loop over channels and get all member to move back to main voice channel
        for (var index = 0; index < numberOfChannels; index++) {
            var channel = await category.children.find(channel => channel.name === activityName + '-' + index);

            var members = channel.members;

            members.forEach(member => member.voice.setChannel(generalVoice));
        }
        
        // report success of activity callback
        discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' members have been called back!');
    }
}