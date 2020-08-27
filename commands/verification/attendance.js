// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');

// Command export
module.exports = class Attendace extends Command {
    constructor(client) {
        super(client, {
            name: 'attend',
            group: 'verification',
            memberName: 'hacker attendance',
            description: 'Will mark a hacker as attending and upgrade role to Attendee',
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
            if (message.member.roles.cache.some(r => r.name === "Hacker")) {

                // call the firebas services attendhacker function
                var status = await firebaseServices.attendHacker(email);

                // Check the returned status and act accordingly!
                switch(status) {
                    case firebaseServices.status.HACKER_SUCCESS:
                        message.member.send('Thank you for attending nwHacks 2020. Happy hacking!!!');
                        message.member.roles.add(message.member.guild.roles.cache.find(role => role.name === "Attendee"));
                        message.guild.channels.cache.find(channel => channel.name === "logs").send("Hacker with email " + email +
                            " is attending nwHacks 2020!");
                        break;
                    case firebaseServices.status.MENTOR_IN_USE:
                        message.member.send('Hi there, this email is already marked as attending, have a great day!');
                        break;
                    case firebaseServices.status.FAILURE:
                        message.member.send('Hi there, the email you tried to attend with is not' +
                        ' in our system, please make sure your email is well typed. If you think this is an error' +
                        ' please contact us in the welcome-support channel.');
                        break;
                }
            } else {
                message.member.send('Hi there, it seems you are already marked as attendee, or you do not need to be marked as attendee. Happy hacking!');
            }
        } else {
            message.member.send('Hi there, the !attend command is only available in the attend-channel channel.');
        }
        message.delete();
    }

};