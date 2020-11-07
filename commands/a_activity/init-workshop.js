// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseWorkshops = require('../../firebase-services/firebase-services-workshops');
const discordServices = require('../../discord-services');

// Command export
module.exports = class InitWorkshop extends Command {
    constructor(client) {
        super(client, {
            name: 'initw',
            group: 'a_activity',
            memberName: 'initialize workshop funcitonality for activity',
            description: 'Will initialize the workshop functionality for the given workshop. General voice channel will be muted for all hackers.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                }
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName}) {
        message.delete();
        // make sure command is only used in the admin console
        if (discordServices.isAdminConsole(message.channel) === true) {
            // only memebers with the Hacker tag can run this command!
            if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
                
                // get category
                var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

                // make sure the workshop excists
                if (category != undefined) {

                    // grab general voice and update permission to no speak for attendees
                    var generalVoice = await category.children.find(channel => channel.name === activityName + '-general-voice');
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

                     firebaseWorkshops.initWorkshop(activityName);

                     // create TA console
                     message.guild.channels.create(activityName + '-TA-console', {type: 'text', parent: category,  permissionOverwrites: [
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
                    message.reply('Activity named: ' + activityName + ' now has workshop functionality.');
                } else {
                    // if the category does not excist
                    message.reply('The activity named: ' + activityName +', does not exist! Did not create voice channels.');
                }
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

};