// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const firebaseServices = require('../../firebase-services/firebase-services');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
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
            roleMessage: 'Hey there, the !manual-verify command is only for staff!'
        });
    }

    async runCommand(message) {
        let members = await Prompt.memberPrompt('Which member(s) would you like to verify? (They have to receive the same role!)', message.channel, message.author);
        let newRole = (await Prompt.rolePrompt('Which role would you like to verify them to?', message.channel, message.author)).first().id;
        members.each((key, member) => {
            if (!discordServices.checkForRole(member, discordServices.roleIDs.guestRole)) {
                message.channel.send(member + 'is not a guest!').then(msg => msg.delete({timeout: 3000}));
            } else {
                discordServices.replaceRoleToMember(member, newRole);
            }
        });
    }
}