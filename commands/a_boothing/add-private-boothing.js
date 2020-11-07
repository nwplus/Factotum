// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');

// Command export
module.exports = class CreatePrivates extends Command {
    constructor(client) {
        super(client, {
            name: 'createprivates',
            group: 'a_boothing',
            memberName: 'create private voice channels',
            description: 'Will create x number of private voice channels for the sponsor boothing category.',
            guildOnly: true,
            args: [
                {
                    key: 'number',
                    prompt: 'number of private channels',
                    type: 'integer',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {number}) {
        discordServices.deleteMessage(message);
        // make sure command is only used in the boothing-wait-list channel
        if (message.channel.name === 'boothing-sponsor-console') {
            // only memebers with the Hacker tag can run this command!
            if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
                
                // get category
                var category = await message.guild.channels.cache.get(discordServices.sponsorCategory);

                // get private channels
                var channels = category.children.filter((value, index) => {
                    if (value.name.includes('Private')){
                        return true;
                    } else {
                        return false;
                    }
                });

                // number of channels
                var amount = channels.array().length;

                var total = amount + number;                

                // create voice channels
                for (var index = amount + 1; index <= total; index++) {
                    var channel = await message.guild.channels.create('Private-' + index, {type: 'voice', parent: category});
                    await channel.createOverwrite(discordServices.attendeeRole, {VIEW_CHANNEL: false, SPEAK: true, VIDEO: true, USE_VAD: true});
                    await channel.createOverwrite(discordServices.mentorRole, {VIEW_CHANNEL: false, SPEAK: true, VIDEO: true, USE_VAD: true});
                }

                // report success of workshop creation
                message.reply('Sponsor boothing now has ' + total + ' voice channels.');
                
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the boothing-sponsor-console console!');
        }
    }

};