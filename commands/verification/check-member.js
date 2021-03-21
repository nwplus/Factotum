// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const firebaseServices = require('../../db/firebase/firebase-services');
const BotGuildModel = require('../../classes/bot-guild');
const { Message } = require('discord.js');

/**
 * User can check if a member is in the database by email or name.
 * @category Commands
 * @subcategory Verification
 * @extends PermissionCommand
 */
class CheckMember extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'check-member',
            group: 'verification',
            memberName: 'check if member is in database',
            description: 'If given email, will tell user if email is valid, or suggest similar emails if not. If given name, returns corresponding email.',
            args: [
                {
                    key: 'emailOrName',
                    prompt: 'Please provide the email address or name to check (write names in the format firstName-lastName)',
                    type: 'string',
                    default: '',
                },

            ],
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the !check-member command is only for staff!',
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'Hey there, the !check-member command is only available in the admin console channel.',
        });
    }

    /**
     * @param {BotGuildModel} botGuild 
     * @param {Message} message 
     * @param {Object} args
     * @param {String} args.emailOrName
     */
    async runCommand(botGuild, message, { emailOrName }) {
        if (emailOrName.split('-').length === 1) { // check for similar emails if given argument is an email
            let result = await firebaseServices.checkEmail(emailOrName, message.guild.id);
            if (result.length > 0) { // if similar emails were found, print them
                let listMembers = '';
                result.forEach(member => {
                    let listMember = member.email + ' (' + member.types.join(', ') + ') ';
                    listMembers += listMember;
                });
                message.channel.send('Here are the results I found similar to ' + emailOrName + ': ' + listMembers);
            } else { // message if no similar emails found
                message.channel.send('No matches to this email were found').then(msg => msg.delete({ timeout: 8000 }));
            }
        } else { // check for members of the given name if argument was a name
            let firstName = emailOrName.split('-')[0];
            let lastName = emailOrName.split('-')[1];
            let result = firebaseServices.checkName(firstName, lastName, message.guild.id);
            if (result != null) { // print email if member was found
                message.channel.send('Email found for ' + firstName + ' ' + lastName + ' is: ' + result);
            } else { // message if member was not found
                message.channel.send('The name does not exist in our database!').then(msg => msg.delete({ timeout: 8000 }));
            }
        }
    }
}
module.exports = CheckMember;
