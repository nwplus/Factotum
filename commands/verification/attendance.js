// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services/firebase-services');
const Discord = require('discord.js');
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
                    default: '',
                },
                
            ],
        });
    }

    // Run function -> command body
    async run(message, { email }) {
        discordServices.deleteMessage(message);

        // make sure command is only used in the attend-channel channel
        if (message.channel.id != discordServices.attendChannel) {
            discordServices.sendMessageToMember(message.member, 'Hi there, the !attend command is only available in the attend-channel channel.', true);
            return;   
        }
        // only memebers with the Hacker tag can run this command!
        if (!(discordServices.checkForRole(message.member, discordServices.hackerRole))) {
            discordServices.sendMessageToMember(message.member, 'Hi there, it seems you are already marked as attendee, or you do not need to be marked as attendee. Happy hacking!', true);
            return;
        }

        // let user know he has used the command incorrectly and exit
        if (email === '') {
            discordServices.sendMessageToMember(message.author, 'You have used the attend command incorrectly! \nPlease write your email after the command like this: !attend email@gmail.com');
            return;
        }
        
        // call the firebase services attendhacker function
        var status = await firebaseServices.attendHacker(email);

        // embed to use
        const embed = new Discord.MessageEmbed()
            .setColor(discordServices.specialDMEmbedColor)
            .setTitle('Attendance Process');

        // Check the returned status and act accordingly!
        switch(status) {
            case firebaseServices.status.HACKER_SUCCESS:
                embed.addField('Thank you for attending HackCamp 2020.', 'Happy hacking!!!');
                discordServices.addRoleToMember(message.member, discordServices.attendeeRole);
                discordServices.discordLog(message.guild, "Hacker with email " + email +
                    " is attending HackCamp 2020!");
                break;
            case firebaseServices.status.HACKER_IN_USE:
                embed.addField('Hi there, this email is already marked as attending', 'Have a great day!')
                break;
            case firebaseServices.status.FAILURE:
                embed.addField('ERROR 401', 'Hi there, the email you tried to attend with is not' +
                    ' in our system, please make sure your email is well typed. If you think this is an error' +
                    ' please contact us in the support channel.')
                    .setColor('#fc1403');
                break;
        }
        discordServices.sendMessageToMember(message.member, embed);
    }

};