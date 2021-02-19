// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const firebaseServices = require('../../firebase-services/firebase-services');
const Discord = require('discord.js');
const discordServices = require('../../discord-services');
const Verification = require('../../classes/verification');

// Command export
module.exports = class Attend extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'attend',
            group: 'verification',
            memberName: 'hacker attendance',
            description: 'Will mark a hacker as attending and upgrade role to Attendee. Can only be called once!',
            args: [
                {
                    key: 'email',
                    prompt: 'Please provide your email address',
                    type: 'string',
                    default: '',
                },
                {
                    key: 'guildId',
                    prompt: 'Please provide the server ID, ask admins for it!',
                    type: 'number',
                },
            ],
        },
        {
            dmOnly: true
        });
    }

    /**
     * 
     * @param {Discord.Message} message 
     * @param {String} param1 
     */
    async runCommand(message, { email, guildId }) {
        // check if the user needs to attend, else warn and return
        if (discordServices.checkForRole(message.author, discordServices.roleIDs.attendeeRole)) {
            discordServices.sendEmbedToMember(message.author, {
                title: 'Attend Error',
                description: 'You do not need to attend! Happy hacking!!!'
            }, true);
            return;
        }

        // make email lowercase
        email = email.toLowerCase();

        // regex to validate email
        const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

        // let user know he has used the command incorrectly and exit
        if (email === '' || !re.test(email)) {
            discordServices.sendMessageToMember(message.author, 'You have used the verify command incorrectly! \nPlease write a valid email after the command like this: !verify email@gmail.com');
            return;
        }

        let guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            discordServices.sendEmbedToMember(message.author, {
                title: 'Attendance Failure',
                description: 'The given server ID is not valid. Please try again!',
            });
            return;
        }
        let member = guild.member(message.author.id);
        
        // call the firebase services attendHacker function
        Verification.attend(member);
    }

};