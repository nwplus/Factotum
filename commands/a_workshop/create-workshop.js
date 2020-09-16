// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class CreateWorkshop extends Command {
    constructor(client) {
        super(client, {
            name: 'createworkshop',
            group: 'a_workshop',
            memberName: 'create a workshop',
            description: 'Will create a category, a text channel and voice channel for the given workshop name.',
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
        // make sure command is only used in the admin console
        if (discordServices.isAdminConsole(message.channel) === true) {
            // only memebers with the Hacker tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.adminRole)) {
                
                // Create category
                var category = await message.guild.channels.create(workshopName, {type: 'category',  permissionOverwrites: [
                    {
                        id: discordServices.hackerRole,
                        deny: ['VIEW_CHANNEL'],
                    },
                    {
                        id: discordServices.attendeeRole,
                        allow: ['VIEW_CHANNEL'],
                    },
                    {
                        id: discordServices.mentorRole,
                        allow: ['VIEW_CHANNEL'],
                    },
                    {
                        id: discordServices.sponsorRole,
                        allow: ['VIEW_CHANNEL'],
                    },
                    {
                        id: discordServices.staffRole,
                        allow: ['VIEW_CHANNEL'],
                    }
                ]});

                // create text channel
                message.guild.channels.create(workshopName + '-text', {type: 'text', parent: category,});

                // create general voice
                message.guild.channels.create(workshopName + '-general-voice', {type: 'voice', parent: category});

                // create workshop in db
                firebaseServices.createWorkshop(workshopName);

                // report success of workshop creation
                message.reply('Workshop session named: ' + workshopName + ' created succesfully. Any other commands will require this name as paramter.');
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

};