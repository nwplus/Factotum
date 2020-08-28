// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class RemoveWorkshop extends Command {
    constructor(client) {
        super(client, {
            name: 'removeworkshop',
            group: 'workshop',
            memberName: 'remove a workshop',
            description: 'Will remove the cateogry and everything inside',
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
        if (message.channel.name === 'console') {
            // only memebers with the Hacker tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.adminRole)) {
                
                // Create category
                var category = await message.guild.channels.cache.find(channel => channel.name === workshopName);
                await category.children.forEach(channel => channel.delete());
                category.delete().catch(console.error);

                // create workshop in db
                firebaseServices.removeWorkshop(workshopName);

                // report success of workshop creation
                message.reply('Workshop session named: ' + workshopName + ' removed succesfully!');
            }   
        }
    }

};