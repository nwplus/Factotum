const PermissionCommand = require('../../classes/permission-command');
const { sendEmbedToMember, sendMessageToMember, checkForRole, validateEmail } = require('../../discord-services');
const { Message } = require('discord.js');
const Verification = require('../../classes/verification');
const BotGuildModel = require('../../classes/bot-guild');

/**
 * Will verify the user running the command, needs the user's email and guild ID. Can only 
 * be run through DM.
 * @category Commands
 * @subcategory Verification
 * @extends PermissionCommand
 * @dmonly
 */
class Verify extends PermissionCommand {
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
     * @param {BotGuildModel} botGuild
     * @param {Message} message
     * @param {Object} args 
     * @param {String} args.email 
     * @param {String} args.guildId
     */
    async runCommand(botGuild, message, { email, guildId }) {

        // check if the user needs to verify, else warn and return
        if (!checkForRole(member, botGuild.roleIDs.guestRole)) {
            sendEmbedToMember(member, {
                title: 'Verify Error',
                description: 'You do not need to verify, you are already more than a guest!'
            }, true);
            return;
        }

        // let user know he has used the command incorrectly and exit
        if (!validateEmail(email)) {
            sendMessageToMember(message.author, 'You have used the verify command incorrectly! \nPlease write a valid email after the command like this: !verify email@gmail.com');
            return;
        }

        let guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            sendEmbedToMember(message.author, {
                title: 'Verification Failure',
                description: 'The given server ID is not valid. Please try again!',
            });
            return;
        }
        let member = guild.member(message.author.id);

        // Call the verify function
        try {
            Verification.verify(member, email, guild, botGuild);
        } catch (error) {
            sendEmbedToMember(member, {
                title: 'Verification Error',
                description: 'Email provided is not valid!'
            }, true);
        }
    }
}
module.exports = Verify;