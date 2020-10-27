// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class InitCoffeeChats extends Command {
    constructor(client) {
        super(client, {
            name: 'initcoffeechats',
            group: 'a_activity',
            memberName: 'initialize coffee chat funcitonality for activity',
            description: 'Will initialize the coffee chat functionality for the given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
                {
                    key: 'numOfGroups',
                    prompt: 'number of groups to participate in coffee chat',
                    type: 'integer'
                }
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName, numOfGroups}) {
        message.delete();
        // make sure command is only used in the admin console
        if (discordServices.isAdminConsole(message.channel) === true) {
            // only memebers with the Staff tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.staffRole)) {
                
                // get category
                var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

                // make sure the workshop excists
                if (category != undefined) {
                    
                    // initialize firebase fields
                    firebaseServices.initCoffeeChat(activityName);

                    discordServices.addVoiceChannelsToActivity(activityName, numOfGroups, category, message.guild.channels);

                    // report success of coffee chat creation
                    message.reply('Activity named: ' + activityName + ' now has coffee chat functionality.');
                } else {
                    // if the category does not excist
                    message.reply('The activity named: ' + activityName +', does not exist! No action taken.');
                }
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

};