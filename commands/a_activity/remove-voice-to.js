// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');

// Command export
module.exports = class RemovePrivatesFor extends Command {
    constructor(client) {
        super(client, {
            name: 'removevoiceto',
            group: 'a_activity',
            memberName: 'remove private voice channels',
            description: 'Will remove x number of private voice channels for given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
                {
                    key: 'number',
                    prompt: 'number of private channels to remove',
                    type: 'integer',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName, number}) {
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
        var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

        // if no category then report failure and return
        if (category === undefined) {
            // if the category does not excist
            discordServices.replyAndDelete(message,'The workshop named: ' + activityName +', does not excist! Did not remove voice channels.');
            return;
        }
        
        var final = await discordServices.removeVoiceChannelsToActivity(activityName, number, category);

        // report success of channel deletions
        discordServices.replyAndDelete(message,'Workshop session named: ' + activityName + ' now has ' + final + ' voice channels.');
    }
};