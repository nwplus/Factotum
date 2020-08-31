// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class CreatePrivatesFor extends Command {
    constructor(client) {
        super(client, {
            name: 'createprivatesfor',
            group: 'workshop',
            memberName: 'create private voice channels for a workshop',
            description: 'Will create x number of private voice channels for given workshop',
            guildOnly: true,
            args: [
                {
                    key: 'workshopName',
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
    async run(message, {workshopName, number}) {
        message.delete();
        // make sure command is only used in the boothing-wait-list channel
        if (message.channel.name === 'console') {
            // only memebers with the Hacker tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.adminRole)) {
                
                // get category
                var category = await message.guild.channels.cache.find(channel => channel.name === workshopName);

                // make sure the workshop excists
                if (category != undefined) {

                     // udpate db and get total number of channels
                     var total = await firebaseServices.workshopAddPrivates(workshopName, number);

                    // grab index where channel naming should start, in case there are already channels made
                    var index = total - number;

                    // create voice channels
                    for (; index < total; index++) {
                        message.guild.channels.create(workshopName + '-' + index, {type: 'voice', parent: category});
                    }

                    // report success of workshop creation
                    message.reply('Workshop session named: ' + workshopName + ' now has ' + number + ' voice channels.');
                } else {
                    // if the category does not excist
                    message.reply('The workshop named: ' + workshopName +', does not excist! Did not create voice channels.');
                }
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

};