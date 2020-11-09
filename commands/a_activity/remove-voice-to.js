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
        if (discordServices.isAdminConsole(message.channel) === true) {
            // only memebers with the Hacker tag can run this command!
            if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
                
                // get category
                var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

                // make sure the workshop excists
                if (category != undefined) {

                    var final = await discordServices.removeVoiceChannelsToActivity(activityName, number, category);

                    // report success of channel deletions
                    discordServices.replyAndDelete(message,'Workshop session named: ' + activityName + ' now has ' + final + ' voice channels.');
                } else {
                    // if the category does not excist
                    discordServices.replyAndDelete(message,'The workshop named: ' + activityName +', does not excist! Did not remove voice channels.');
                }
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

};