// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const firebaseServices = require('../../firebase-services/firebase-services');
const discordServices = require('../../discord-services');
const { Message } = require('discord.js');
const Prompt = require('../../classes/prompt');
const Verification = require('../../classes/verification');
const { messagePrompt } = require('../../classes/prompt');

// Command export
module.exports = class ManualVerify extends PermissionCommand {
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

            let availableTypes = discordServices.verificationRoles.array().join();

            let guestId = (await Prompt.numberPrompt({ prompt: 'What is the ID of the member you would like to verify?', channel, userId}))[0];
            var member = message.guild.members.cache.get(guestId.toString()); // get member object by id
            
            // check for valid ID
            if (!member) {
                discordServices.sendMsgToChannel(channel, userId, `${guestId.toString()} is an invalid ID!`, 5);
                return;
            }
            // check for member to have guest role
            if (!discordServices.checkForRole(member, discordServices.roleIDs.guestRole)) {
                discordServices.sendMsgToChannel(channel, userId, `<@${guestId.toString()}> does not have the guest role! Cant verify!`, 5);
                return;
            }
            
            let types = (await Prompt.messagePrompt({ prompt: `These are the available types: ${availableTypes}, please respond with the types you want this user to verify separated by commas.`, channel, userId })).content.split(',');
            types = types.filter((type, index, array) => discordServices.verificationRoles.has(type)); // filter types for those valid

            let email = (await Prompt.messagePrompt({ prompt: 'What is their email?', channel, userId }, 'string', 20)).content;
            // validate the email
            if(!discordServices.validateEmail(email)) {
                discordServices.sendMsgToChannel(channel, userId, 'The email is not valid!', 5);
                return;
            }
            
            firebaseServices.addUserData(email, member, types);
            try {
                await Verification.verify(member, email, guild);
            } catch (error) {
                discordServices.sendMsgToChannel(channel, userId, 'Email provided is not valid!', 5);
            }
            
            message.channel.send('Verification complete!').then(msg => msg.delete({ timeout: 3000 }));
            
        } catch (error) {
            return;
        }
    }
}