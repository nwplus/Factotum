const { Command } = require('@sapphire/framework');
const BotGuild = require('../../db/mongo/BotGuild');
const { Modal, MessageActionRow, TextInputComponent } = require('discord.js');
const { addUserData } = require('../../db/firebase/firebase-services');

class AddMembers extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Start verification prompt in landing channel.'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(option =>
                    option.setName('participantstype')
                        .setDescription('Type of role of the added participants (i.e. hacker, sponsor)')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('overwrite')
                        .setDescription('Overwrite existing role?')
                        .setRequired(false))
        )
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message 
     */
    async chatInputRun(interaction) {
        this.botGuild = await BotGuild.findById(interaction.guild.id);
        const userId = interaction.user.id;
        const guild = interaction.guild;
        const participantsType = interaction.options.getString('participantstype');
        const overwrite = interaction.options.getBoolean('overwrite') ?? false;

        if (!guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.staffRole) && !guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.adminRole)) {
            return this.error({ message: 'You do not have permissions to run this command!', ephemeral: true })
        }

        if (!this.botGuild.verification.verificationRoles.has(participantsType)) {
            await interaction.reply({ content: 'The role you entered does not exist!', ephemeral: true });
            return;
        }
        
        const modal = new Modal()
                        .setCustomId('emailsModal')
                        .setTitle('Enter all emails to be added as ' + participantsType)
                        .addComponents([
                            new MessageActionRow().addComponents(
                                new TextInputComponent()
                                    .setCustomId('emails')
                                    .setLabel('Newline-separated Emails')
                                    .setStyle('PARAGRAPH')
                                    .setRequired(true),
                            ),
                        ]);
                    await interaction.showModal(modal);

                    const submitted = await interaction.awaitModalSubmit({ time: 300000, filter: j => j.user.id === interaction.user.id })
                        .catch(error => {
                        });

                    if (submitted) {
                        const emailsRaw = submitted.fields.getTextInputValue('emails');
                        const emails = emailsRaw.split(/\r?\n|\r|\n/g);
                        emails.forEach(email => {
                            addUserData(email, participantsType, interaction.guild.id, overwrite);
                        });
                        submitted.reply({ content: emails.length + ' emails have been added as ' + participantsType, ephemeral: true })
                    }
}
}
module.exports = AddMembers;
// /**
//  * Will prompt the user for a csv file to add members to firebase. The csv file must have the following columns with exactly those names:
//  * * email -> the user's email, must be a string
//  * * firstName -> the user's first name, must be a string
//  * * lastName -> the user's last name, must be a string
//  * * types -> the types the user will get, must be a list of strings separated by a comma, spaces are okay, types must be the same ones used when setting up verification
//  * @category Commands
//  * @subcategory Verification
//  * @extends PermissionCommand
//  * @guildOnly
//  */
// class AddMembers extends PermissionCommand {
//     constructor(client) {
//         super(client, {
//             name: 'add-members',
//             group: 'verification',
//             memberName: 'add members to verification',
//             description: 'adds members to the verification system using via file',
//             guildOnly: true,
//         },
//         {
//             role: PermissionCommand.FLAGS.STAFF_ROLE,
//             roleMessage: 'Hey there, the !add-members command is only for staff!',
//             channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
//             channelMessage: 'Hey there, the !add-members command is only available on the admin console!',
//         });
//     }

//     /**
//      * @param {BotGuildModel} botGuild 
//      * @param {Message} message 
//      */
//     async runCommand(botGuild, message) {
        
//         try {
//             // request file
//             let msg = await MessagePrompt.prompt({ prompt: 'Please send the csv file!', channel: message.channel, userId: message.author.id});

//             let fileUrl = msg.attachments.first().url;

//             https.get(fileUrl).on('error', (error) => winston.loggers.get(message.guild.id).warning(`There was an error while adding members- Error: ${error}`, { event: 'Add Member Command' }));

//             var holdMsg = await sendMsgToChannel(message.channel, message.author.id, 'Adding data please hold ...');
            
//             https.get(fileUrl, (response) => {
//                 response.pipe(csvParser()).on('data', async (data) => {

//                     if (!data.email || !data.firstName || !data.lastName || !data.types) {
//                         sendMsgToChannel(message.channel, message.author.id, 'The excel data is incomplete or the file type is not CSV (might be CSV UTF-8). Try again!', 10);
//                         return;
//                     }

//                     /** @type {String} */
//                     let typesString = data.types;
    
//                     let typesList = typesString.split(',').map(string => string.trim().toLowerCase());
    
//                     typesList = typesList.filter(type => botGuild.verification.verificationRoles.has(type));
                
//                     if (typesList.length > 0) await addUserData(data.email, typesList, message.guild.id, undefined, data.firstName, data.lastName);
//                 }).on('end', () => {
//                     holdMsg.delete();
//                     sendMsgToChannel(message.channel, message.author.id, 'The members have been added to the database!', 10);
//                     winston.loggers.get(message.guild.id).verbose(`Members have been added to the database by ${message.author.id}.`, { event: 'Add Member Command' });
//                 });
//             }).on('error', (error) => {
//                 holdMsg.delete();
//                 sendMsgToChannel(message.channel, message.author.id, `There was an error, please try again! Error: ${error}`, 10);
//                 winston.loggers.get(message.guild.id).warning(`There was an error while adding members- Error: ${error}`, { event: 'Add Member Command' });
//             });
//         } catch (error) {
//             winston.loggers.get(message.guild.id).warning(`There was an error when adding members. Error: ${error}`, { event: 'Add Member Command' });
//         }
//     }
// }
// module.exports = AddMembers;