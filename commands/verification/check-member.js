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

    async runCommand(message, { emailOrName }) {
        if (emailOrName.split('-').length === 1) { // check for similar emails if given argument is an email
            var result = await firebaseServices.checkEmail(emailOrName);
            if (result.length > 0) { // if similar emails were found, print them
                var listMembers = '';
                result.forEach(member => {
                    var listMember = member.email + ' (' + member.type + ') ';
                    listMembers += listMember;
                });
                message.channel.send('Here are the results I found similar to ' + emailOrName + ': ' + listMembers);
            } else { // message if no similar emails found
                message.channel.send('No matches to this email were found').then(msg => msg.delete({ timeout: 8000 }));
            }
        } else { // check for members of the given name if argument was a name
            var firstName = emailOrName.split('-')[0];
            var lastName = emailOrName.split('-')[1];
            var result = firebaseServices.checkName(firstName, lastName);
            if (result != null) { // print email if member was found
                message.channel.send('Email found for ' + firstName + ' ' + lastName + ' is: ' + result);
            } else { // message if member was not found
                message.channel.send('The name does not exist in our database!').then(msg => msg.delete({ timeout: 8000 }));
            }
        }
    }
}