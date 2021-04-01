// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { addUserData } = require('../../db/firebase/firebase-services');
const { sendMsgToChannel, checkForRole, validateEmail } = require('../../discord-services');
const { Message } = require('discord.js');
const Verification = require('../../classes/verification');
const BotGuildModel = require('../../classes/bot-guild');
const winston = require('winston');
const { StringPrompt, NumberPrompt } = require('advanced-discord.js-prompts');

/**
 * Will manually verify a user to the server and the database. Asks the user for a user ID, email, and type(s) to add with. 
 * @category Commands
 * @subcategory Verification
 * @extends PermissionCommand
 * @guildonly
 */
class ManualVerify extends PermissionCommand {
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
     * @param {BotGuildModel} botGuild
     * @param {Message} message 
     */
    async runCommand(botGuild, message) {
        try {
            // helpful vars
            let channel = message.channel;
            let userId = message.author.id;

            let guestId = await NumberPrompt.single({ prompt: 'What is the ID of the member you would like to verify?', channel, userId, cancelable: true});
            var member = message.guild.member(guestId); // get member object by id
            
            // check for valid ID
            if (!member) {
                sendMsgToChannel(channel, userId, `${guestId.toString()} is an invalid ID!`, 5);
                return;
            }
            // check for member to have guest role
            if (!checkForRole(member, botGuild.verification.guestRoleID)) {
                sendMsgToChannel(channel, userId, `<@${guestId.toString()}> does not have the guest role! Cant verify!`, 5);
                return;
            }

            let availableTypes = Array.from(botGuild.verification.verificationRoles.keys()).join();
            
            let types = StringPrompt.multiRestricted({ prompt: 'Please respond with the types you want this user to verify.', channel, userId}, availableTypes);

            let email = await StringPrompt.single({ prompt: 'What is their email?', channel, userId, cancelable: true});
            
            // validate the email
            if(!validateEmail(email)) {
                sendMsgToChannel(channel, userId, 'The email is not valid!', 5);
                return;
            }
            
            await addUserData(email, types, member.guild.id, member);
            try {
                await Verification.verify(member, email, message.guild, botGuild);
            } catch (error) {
                sendMsgToChannel(channel, userId, 'Email provided is not valid!', 5);
            }
            
            message.channel.send('Verification complete!').then(msg => msg.delete({ timeout: 3000 }));
            
        } catch (error) {
            winston.loggers.get(botGuild._id).warning(`While manually verifying, there was an error but it was handled. Error: ${error}.`, { event: 'Manual Verify Command' });
            return;
        }
    }
}
module.exports = ManualVerify;
