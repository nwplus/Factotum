// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services/firebase-services');

const discordServices = require('../../discord-services');

// Command export
module.exports = class Verificaiton extends Command {
    constructor(client) {
        super(client, {
            name: 'verify',
            group: 'verification',
            memberName: 'hacker verificaiton',
            description: 'Will verify a guest to its correct role if their email is in our database.',
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

        // Make sure it is only used in the welcome channel
        if (message.channel.id != discordServices.welcomeChannel) {
            discordServices.sendMessageToMember(message.member, 'Hi, the !verify command is only available in the welcome channel!', true);
            return;
        }
        // Make sure only guests can call this command
        if (!(discordServices.checkForRole(message.member, discordServices.guestRole))) {
            discordServices.sendMessageToMember(message.member, 'Hi there, it seems you have tried to verify your email when you are ' +
            'already more then a guest. No need to do it agian!', true);
            return;
        }

        // let user know he has used the command incorrectly and exit
        if (email === '') {
            discordServices.sendMessageToMember(message.author, 'You have used the verify command incorrectly! \nPlease write your email after the command like this: !verify email@gmail.com');
            return;
        }

        // Call the verify function to get status
        var status = await firebaseServices.verify(email, message.author.id);
    
        switch(status) {
            case firebaseServices.status.HACKER_SUCCESS:
                discordServices.sendMessageToMember(message.member, 'Thank you for verifing your status with us, you now have acces to ' +
                ' most of the server. Remember you need to !attend <your email> in the attend channel that will' +
                ' open a few hours before the hackathon beggins.');
                discordServices.replaceRoleToMember(message.member, discordServices.guestRole, discordServices.hackerRole);
                discordServices.addRoleToMember(message.member,discordServices.stamp0Role);
                discordServices.discordLog(message.guild, "Verified email " + email +
                    " successfully and they is now a hacker!");
                break;
            case firebaseServices.status.HACKER_IN_USE:
                discordServices.sendMessageToMember(message.member, 'Hi there, it seems the email you tried to verify with is already in use! Please make ' +
                'sure that you have the correct email. If you think this is an error please contact us in the welome-support channel.');
                break;
            case firebaseServices.status.SPONSOR_SUCCESS:
                discordServices.sendMessageToMember(message.member, 'Hi there sponsor, thank you very much for being part of nwHacks and for joining our discord!');
                discordServices.replaceRoleToMember(message.member, discordServices.guestRole, discordServices.sponsorRole);
                discordServices.discordLog(message.guild, "Verified email " + email +
                    " successfully and he is now a sponsor!");
                break;
            case firebaseServices.status.SPONSOR_IN_USE:
                discordServices.sendMessageToMember(message.member, 'Hi there sponsor, thank you very much for being part of nwHacks, we would love to give you access ' +
                'to our discord but the email you used to verify is already in use! If you think this is a mistake in our part please ' + 
                'let us know in the welcome-support channel.');
                break;
            case firebaseServices.status.MENTOR_SUCCESS:
                discordServices.sendMessageToMember(message.member, 'Hi there mentor, thank you very much for being part of nwHacks and for joining our discord!');
                discordServices.replaceRoleToMember(message.member, discordServices.guestRole, discordServices.mentorRole);
                discordServices.discordLog(message.guild, "Verified email " + email +
                " successfully and he is now a mentor!");
                break;
            case firebaseServices.status.MENTOR_IN_USE:
                discordServices.sendMessageToMember(message.member, 'Hi there mentor, thank you very much for being part of nwHacks, we would love to give you access ' +
                'to our discord but the email you used to verify is already in use! If you think this is a mistake in our part please ' + 
                'let us know in the welcome-support channel.');
                break;
            case firebaseServices.status.STAFF_SUCCESS:
                discordServices.sendMessageToMember(message.member, 'Hi there mate! Welcome to your discord! If you need' + 
                ' to know more about what I can do please call !help.');
                discordServices.replaceRoleToMember(message.member, discordServices.guestRole, discordServices.staffRole);
                discordServices.discordLog(message.guild, "Verified email " + email +
                " successfully and he is now a staff!");
                break;
            case firebaseServices.status.STAFF_IN_USE:
                discordServices.sendMessageToMember(message.member, 'Hi there mate! It seems this email is already in use! If this is' +
                ' a mistake let my creator know via slack!');
                break;
            case firebaseServices.status.FAILURE:

                discordServices.sendMessageToMember(message.member, 'Hi there, the email you tried to verify yourself with is not' +
                ' in our system, please make sure your email is well typed. If you think this is an error' +
                ' please contact us in the welcome-support channel.');
                break;
        }
    }

};