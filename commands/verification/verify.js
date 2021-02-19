// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Verification = require('../../classes/verification');
const { Document } = require('mongoose');

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
                    type: 'integer',
                },
            ],
        },
        {
            dmOnly: true,
        });
    }

    /**
     * DOES NOT WORK !!!! TODO REMOVE OR ADD ABILITY TO GIVE GUILD ID FOR IT TO WORK!
     * @param {Document} botGuild
     * @param {Discord.Message} message 
     * @param {String} email 
     */
    async runCommand(botGuild, message, { email, guildId }) {

        // check if the user needs to verify, else warn and return
        if (!discordServices.checkForRole(member, discordServices.roleIDs.guestRole)) {
            discordServices.sendEmbedToMember(member, {
                title: 'Verify Error',
                description: 'You do not need to verify, you are already more than a guest!'
            }, true);
            return;
        }

        // let user know he has used the command incorrectly and exit
        if (!discordServices.validateEmail(email)) {
            discordServices.sendMessageToMember(message.author, 'You have used the verify command incorrectly! \nPlease write a valid email after the command like this: !verify email@gmail.com');
            return;
        }

        let guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            discordServices.sendEmbedToMember(message.author, {
                title: 'Verification Failure',
                description: 'The given server ID is not valid. Please try again!',
            });
            return;
        }
        let member = guild.member(message.author.id);

        // Call the verify function
        try {
            Verification.verify(member, email, guild);
        } catch (error) {
            discordServices.sendEmbedToMember(member, {
                title: 'Verification Error',
                description: 'Email provided is not valid!'
            }, true);
        }
    }
};