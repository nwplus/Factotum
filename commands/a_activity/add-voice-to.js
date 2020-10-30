// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');

// Command export
module.exports = class CreatePrivatesFor extends Command {
    constructor(client) {
        super(client, {
            name: 'addvoiceto',
            group: 'a_activity',
            memberName: 'create private voice channels for a workshop',
            description: 'Will create x number of private voice channels for given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
                {
                    key: 'number',
                    prompt: 'number of private channels',
                    type: 'integer',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName, number}) {
        message.delete();
        // make sure command is only used in the admin console
        if (discordServices.isAdminConsole(message.channel) === true) {
            // only memebers with the Hacker tag can run this command!
            if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
                
                // get category
                var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

                // make sure the workshop excists
                if (category != undefined) {

                    var final = await discordServices.addVoiceChannelsToActivity(activityName, number, category, message.guild.channels);

                    // report success of workshop creation
                    message.reply('Workshop session named: ' + activityName + ' now has ' + final + ' voice channels.');
                } else {
                    // if the category does not excist
                    message.reply('The workshop named: ' + activityName +', does not excist! Did not create voice channels.');
                }
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

};