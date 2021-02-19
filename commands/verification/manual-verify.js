// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const firebaseServices = require('../../firebase-services/firebase-services');
const discordServices = require('../../discord-services');
const { Message } = require('discord.js');
const Prompt = require('../../classes/prompt');

// Command export
module.exports = class Verification extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'manual-verify',
            group: 'verification',
            memberName: 'manual hacker verification',
            description: 'Will verify a guest to the specified role.',
            guildOnly: true,
        },
            {
                role: PermissionCommand.FLAGS.STAFF_ROLE,
                roleMessage: 'Hey there, the !manual-verify command is only for staff!',
                channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
                channelMessage: 'The !manual-verify command is only available in the admin console!'
            });
    }

    /**
     * 
     * @param {Message} message 
     */
    async runCommand(message) {
        try {
            // helpful vars
            let channel = message.channel;
            let userId = message.author.id;

            let guestId = (await Prompt.numberPrompt({ prompt: 'What is the ID of the member you would like to verify?', channel, userId}))[0];
            let newRoles = (await Prompt.rolePrompt({ prompt: 'Aside from Member, which role would you like to verify them to?', channel, userId }));
            let email = (await Prompt.messagePrompt({ prompt: 'What is their email?', channel, userId }, 'string', 20)).content;
            var member = message.guild.members.cache.get(guestId.toString()); // get member object by id
            // if they are a guest, verify them to the specified role, otherwise print that they are already verified
            if (!discordServices.checkForRole(member, discordServices.roleIDs.guestRole)) {
                message.channel.send('<@' + guestId.toString() + '> is not a guest!').then(msg => msg.delete({ timeout: 3000 }));
            } else {
                discordServices.replaceRoleToMember(member, discordServices.roleIDs.guestRole, discordServices.roleIDs.memberRole);
                newRoles.each(role => {
                    discordServices.addRoleToMember(member, role);
                });
                var type = 'hacker';
                var newRoleArray = newRoles.array();
                if (newRoleArray.includes(discordServices.roleIDs.staffRole)) {
                    type = 'staff';
                } else if (newRoleArray.includes(discordServices.roleIDs.sponsorRole)) {
                    type = 'sponsor';
                } else if (newRoleArray.includes(discordServices.roleIDs.mentorRole)) {
                    type = 'mentor';
                }
                firebaseServices.addUserData(email, member, type);
                message.channel.send('Verification complete!').then(msg => msg.delete({ timeout: 3000 }));
            }
        } catch (error) {
            return;
        }
    }
}