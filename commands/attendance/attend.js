const PermissionCommand = require('../../classes/permission-command');
const { Message } = require('discord.js');
const { checkForRole, sendEmbedToMember } = require('../../discord-services');
const Verification = require('../../classes/Bot/Features/Verification/verification');

/**
 * Attends the user who runs this command. The user must have the guild ID. Can only be run 
 * via DMs.
 * @category Commands
 * @subcategory Verification
 * @extends PermissionCommand
 * @dmonly
 */
class Attend extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'attend',
            group: 'attendance',
            memberName: 'hacker attendance',
            description: 'Will mark a hacker as attending and upgrade role to Attendee. Can only be called once!',
            args: [
                {
                    key: 'guildId',
                    prompt: 'Please provide the server ID, ask admins for it!',
                    type: 'integer',
                },
            ],
        },
        {
            dmOnly: true
        });
    }

    /**
     * @param {FirebaseFirestore.DocumentData | null | undefined} initBotInfo
     * @param {Message} message
     * @param {Object} args
     * @param {String} args.guildId 
     */
    async runCommand(initBotInfo, message, { guildId }) {
        // check if the user needs to attend, else warn and return
        if (checkForRole(message.author, initBotInfo.attendance.attendeeRoleID)) {
            sendEmbedToMember(message.author, {
                title: 'Attend Error',
                description: 'You do not need to attend! Happy hacking!!!'
            }, true);
            return;
        }

        let guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            sendEmbedToMember(message.author, {
                title: 'Attendance Failure',
                description: 'The given server ID is not valid. Please try again!',
            });
            return;
        }
        let member = guild.member(message.author.id);
        
        // call the firebase services attendHacker function
        Verification.attend(member, initBotInfo);
    }
}
module.exports = Attend;