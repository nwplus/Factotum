// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class Attendace extends Command {
    constructor(client) {
        super(client, {
            name: 'attend',
            group: 'verification',
            memberName: 'hacker attendance',
            description: 'Will mark a hacker as attending and upgrade role to Attendee. Can only be called once!',
            guildOnly: true,
            args: [
                {
                    key: 'email',
                    prompt: 'Please provide your email address',
                    type: 'string',
                },
                
            ],
        });
    }

    // Run function -> command body
    async run(message, { email }) {
        // make sure command is only used in the attend-channel channel
        if (message.channel.name === 'attend-channel') {
            // only memebers with the Hacker tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.hackerRole)) {

                // call the firebas services attendhacker function
                var status = await firebaseServices.attendHacker(email);

                // Check the returned status and act accordingly!
                switch(status) {
                    case firebaseServices.status.HACKER_SUCCESS:
                        discordServices.sendMessageToMember(message.member, 'Thank you for attending nwHacks 2020. Happy hacking!!!');
                        discordServices.addRoleToMember(message.member, discordServices.attendeeRole);
                        discordServices.discordLog(message.guild, "Hacker with email " + email +
                            " is attending nwHacks 2020!");
                        break;
                    case firebaseServices.status.MENTOR_IN_USE:
                        discordServices.sendMessageToMember(message.member, 'Hi there, this email is already marked as attending, have a great day!');
                        break;
                    case firebaseServices.status.FAILURE:
                        discordServices.sendMessageToMember(message.member, 'Hi there, the email you tried to attend with is not' +
                        ' in our system, please make sure your email is well typed. If you think this is an error' +
                        ' please contact us in the welcome-support channel.');
                        break;
                }
            } else {
                discordServices.sendMessageToMember(message.member, 'Hi there, it seems you are already marked as attendee, or you do not need to be marked as attendee. Happy hacking!');
            }
        } else {
            discordServices.sendMessageToMember(message.member, 'Hi there, the !attend command is only available in the attend-channel channel.');
        }
        message.delete();
    }

};