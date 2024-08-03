const { checkEmail } = require("../../db/firebase/firebaseUtil");
const { Command } = require('@sapphire/framework');
const firebaseUtil = require('../../db/firebase/firebaseUtil');

class CheckEmail extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Return user information given an email.'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(option =>
                    option.setName('email')
                        .setDescription('Email to be checked')
                        .setRequired(true))
        )
    }

    // IS EDITED
    async chatInputRun(interaction) {
        this.initBotInfo = await firebaseUtil.getInitBotInfo(interaction.guild.id);
        const guild = interaction.guild;
        console.log(guild, ' is the guild');
        const email = interaction.options.getString('email');
        const userId = interaction.user.id;
        console.log(userId, ' is the userId');

        console.log(email, ' is the email');
        if (!guild.members.cache.get(userId).roles.cache.has(this.initBotInfo.roleIDs.staffRole) && !guild.members.cache.get(userId).roles.cache.has(this.initBotInfo.roleIDs.adminRole)) {
            return this.error({ message: 'You do not have permissions to run this command!', ephemeral: true })
        }
        
        let botSpamChannel = guild.channels.resolve(this.initBotInfo.channelIDs.botSpamChannel);
        if (!botSpamChannel) {
            return interaction.reply({
                content: `The channel with ID ${this.initBotInfo.channelIDs.botSpamChannel} could not be found. Please check the configuration.`,
                ephemeral: true
            });
        }

        const userData = await checkEmail(email, guild.id);       
        interaction.reply({content: 'Visit <#' + this.initBotInfo.channelIDs.botSpamChannel + '> for the results', ephemeral: true});

        if (userData) {  
            if (userData.discordId && userData.types) {
                const roleToString = await Promise.all(userData.types.map(type => (type.type + ': ' + (type.isVerified ? 'verified' : 'not verified'))));
                botSpamChannel.send('The user associated with the email "' + email + '" is <@' + userData.discordId + '>. \n'
                    + 'Their role is:\n' + roleToString.join('\n'))
                return;
            } else if (userData.discordId) {
                botSpamChannel.send('The user associated with the email "' + email + '" is <@' + userData.discordId + '>.');
                return;
            } else {
                botSpamChannel.send('Hmm. No Discord user is associated with the email "' + email + '" but we do have their email on file.');
                return;
            }
        } else {
            botSpamChannel.send('The email "' + email +'" does not exist in our database');
            return;
        }
    }
}

module.exports = CheckEmail;

// // Discord.js commando requirements
// const PermissionCommand = require('../../classes/permission-command');
// const firebaseServices = require('../../db/firebase/firebase-services');
// const BotGuildModel = require('../../classes/Bot/bot-guild');
// const { Message } = require('discord.js');

// /**
//  * User can check if a member is in the database by email or name.
//  * @category Commands
//  * @subcategory Verification
//  * @extends PermissionCommand
//  */
// class CheckMember extends PermissionCommand {
//     constructor(client) {
//         super(client, {
//             name: 'check-member',
//             group: 'verification',
//             memberName: 'check if member is in database',
//             description: 'If given email, will tell user if email is valid, or suggest similar emails if not. If given name, returns corresponding email.',
//             args: [
//                 {
//                     key: 'emailOrName',
//                     prompt: 'Please provide the email address or name to check (write names in the format firstName-lastName)',
//                     type: 'string',
//                     default: '',
//                 },

//             ],
//         },
//         {
//             role: PermissionCommand.FLAGS.STAFF_ROLE,
//             roleMessage: 'Hey there, the !check-member command is only for staff!',
//             channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
//             channelMessage: 'Hey there, the !check-member command is only available in the admin console channel.',
//         });
//     }

//     /**
//      * @param {BotGuildModel} botGuild
//      * @param {Message} message
//      * @param {Object} args
//      * @param {String} args.emailOrName
//      */
//     async runCommand(botGuild, message, { emailOrName }) {
//         if (emailOrName.split('-').length === 1) { // check for similar emails if given argument is an email
//             let result = await firebaseServices.checkEmail(emailOrName, message.guild.id);
//             if (result.length > 0) { // if similar emails were found, print them
//                 let listMembers = '';
//                 result.forEach(member => {
//                     let listMember = member.email + ' (' + member.types.join(', ') + ') ';
//                     listMembers += listMember;
//                 });
//                 message.channel.send('Here are the results I found similar to ' + emailOrName + ': ' + listMembers);
//             } else { // message if no similar emails found
//                 message.channel.send('No matches to this email were found').then(msg => msg.delete({ timeout: 8000 }));
//             }
//         } else { // check for members of the given name if argument was a name
//             let firstName = emailOrName.split('-')[0];
//             let lastName = emailOrName.split('-')[1];
//             let result = await firebaseServices.checkName(firstName, lastName, message.guild.id);
//             if (result != null) { // print email if member was found
//                 message.channel.send('Email found for ' + firstName + ' ' + lastName + ' is: ' + result);
//             } else { // message if member was not found
//                 message.channel.send('The name does not exist in our database!').then(msg => msg.delete({ timeout: 8000 }));
//             }
//         }
//     }
// }
// module.exports = CheckMember;
