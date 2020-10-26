// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class RemoveActivity extends Command {
    constructor(client) {
        super(client, {
            name: 'removeactivity',
            group: 'a_workshop',
            memberName: 'remove an activity',
            description: 'Will remove the category and everything inside it for the given activity',
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
            if (discordServices.checkForRole(message.member, discordServices.staffRole)) {
                
                // Create category
                var category = await message.guild.channels.cache.find(channel => channel.name === activityName);
                await category.children.forEach(channel => channel.delete());
                category.delete().catch(console.error);

                // create workshop in db
                firebaseServices.removeActivity(activityName);

                // report success of activity removal
                message.reply('Activity named: ' + activityName + ' removed succesfully!');
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

};