// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class WorkshopCallBack extends Command {
    constructor(client) {
        super(client, {
            name: 'callback',
            group: 'a_workshop',
            memberName: 'call back to main voice channel',
            description: 'Will return everyone to the workshop\'s main voice channel.',
            guildOnly: true,
            args: [
                {
                    key: 'workshopName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {workshopName}) {
        message.delete();
        // make sure command is only used in the boothing-wait-list channel
        if (discordServices.isAdminConsole(message.channel) === true) {
            // only memebers with the Hacker tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.staffRole)) {

                // get category
                var category = await message.guild.channels.cache.find(channel => channel.name === workshopName).catch(console.error);

                // check if the category excist if not then do nothing
                if (category != undefined) {
                    
                    // get number of channels
                    var numberOfChannels = firebaseServices.workshopPrivatChannels(workshopName);

                    // Check if there are private channels if not do nothing
                    if (numberOfChannels != 0) {

                        // get the general voice channel
                        var generalVoice = await category.children.find(channel => channel.name === workshopName + '-general-voice');

                        // loop over channels and get all member to move back to main voice channel
                        for (var index = 0; index < numberOfChannels; i++) {
                            var channel = await category.children.find(channel => channel.name === workshopName + '-' + index);

                            var members = channel.members;

                            for (var i = 0; i < members.length; i++) {
                                await members[i].voice.setChannel(generalVoice);
                            }
                        }
                        

                        // report success of workshop shuffling
                        message.reply('Workshop session named: ' + workshopName + ' members have been shuffled into the private channels!');
                    } else {
                        // report failure due to no private channels
                        message.reply('Workshop session named: ' + workshopName + ' members were not shuffled because there are no private channels!');
                    }
                } else {
                    // report failure due to no private channels
                    message.reply('Workshop session named: ' + workshopName + ' members were not shuffled because the workshop does not excist!');
                }
                
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

};