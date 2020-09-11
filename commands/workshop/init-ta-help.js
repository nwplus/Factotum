// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class InitTAHelp extends Command {
    constructor(client) {
        super(client, {
            name: 'inittahelpfor',
            group: 'workshop',
            memberName: 'initialize ta help for',
            description: 'Will initialize the ta help funcitonality for the given workshop',
            guildOnly: true,
            args: [
                {
                    key: 'workshopName',
                    prompt: 'the workshop name',
                    type: 'string',
                }
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
                
                // get category
                var category = await message.guild.channels.cache.find(channel => channel.name === workshopName);

                // make sure the workshop excists
                if (category != undefined) {

                    // grab general voice and update permission to no speak for attendees
                    var generalVoice = await category.children.find(channel => channel.name === workshopName + '-general-voice');
                    generalVoice.updateOverwrite(discordServices.attendeeRole, {
                        SPEAK : false
                    });
                    generalVoice.updateOverwrite(discordServices.mentorRole, {
                        SPEAK : true, 
                        MOVE_MEMBERS : true,
                    });
                    generalVoice.updateOverwrite(discordServices.staffRole, {
                        SPEAK : true, 
                        MOVE_MEMBERS : true,
                    })

                     firebaseServices.intiTAHelpFor(workshopName);

                     // create TA console
                     message.guild.channels.create(workshopName + '-TA-console', {type: 'text', parent: category,  permissionOverwrites: [
                        {
                            id: discordServices.hackerRole,
                            deny: ['VIEW_CHANNEL'],
                        },
                        {
                            id: discordServices.attendeeRole,
                            deny: ['VIEW_CHANNEL'],
                        },
                        {
                            id: discordServices.sponsorRole,
                            deny: ['VIEW_CHANNEL'],
                        },
                        {
                            id: discordServices.mentorRole,
                            allow: ['VIEW_CHANNEL'],
                        },
                        {
                            id: discordServices.staffRole,
                            allow: ['VIEW_CHANNEL'],
                        }
                    ]});

                    // report success of workshop creation
                    message.reply('Workshop session named: ' + workshopName + ' now has TA help functionality.');
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