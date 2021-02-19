// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Verification = require('../../classes/verification');

// Command export
module.exports = class Verify extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'verify',
            group: 'verification',
            memberName: 'hacker verification',
            description: 'Will verify a guest to its correct role if their email is in our database.',
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
            dmOnly: true,
        });
    }

    /**
     * 
     * @param {Discord.Message} message 
     * @param {String} email 
     */
    async runCommand(message, { email, guildId }) {
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
        let member = guild.member(message.author.id);

        // check if the user needs to verify, else warn and return
        if (!discordServices.checkForRole(member, discordServices.roleIDs.guestRole)) {
            discordServices.sendEmbedToMember(member, {
                title: 'Verify Error',
                description: 'You do not need to verify, you are already more than a guest!'
            }, true);
            return;
        }

        // Call the verify function
        Verification.verify(member, email, guild);

    }

};