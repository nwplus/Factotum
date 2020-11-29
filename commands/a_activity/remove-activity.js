// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseActivity = require('../../firebase-services/firebase-services-activities');
const discordServices = require('../../discord-services');

// Command export
module.exports = class RemoveActivity extends Command {
    constructor(client) {
        super(client, {
            name: 'removeactivity',
            group: 'a_activity',
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
 
        // Create category
        var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

        // check if the category exist if not then report failure and return
        if (category === undefined) {
            discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' does not exist. No action taken.');
            return;
        }

        await category.children.forEach(channel => channel.delete());
        category.delete().catch(console.error);

        // create workshop in db
        firebaseActivity.remove(activityName);

        // report success of activity removal
        discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' removed succesfully!');
    }
};