const { Command } = require('@sapphire/framework');
const firebaseUtil = require('../../db/firebase/firebaseUtil');
const { Modal, MessageActionRow, TextInputComponent } = require('discord.js');
const { addUserData } = require('../../db/firebase/firebaseUtil');

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

    async chatInputRun(interaction) {
        this.initBotInfo = await firebaseUtil.getInitBotInfo(interaction.guild.id);
        const userId = interaction.user.id;
        const guild = interaction.guild;
        const participantsType = interaction.options.getString('participantstype');
        const overwrite = interaction.options.getBoolean('overwrite') ?? false;
        
        const userRoles = guild.members.cache.get(userId).roles.cache;
        const staffRoleID = this.initBotInfo.roleIDs.staffRole;
        const adminRoleID = this.initBotInfo.roleIDs.adminRole;
        console.log(this.initBotInfo, ' is the initBotInfo');
        console.log(this.initBotInfo.roleIDs, ' is the roleIds');
        console.log(userId);
        console.log(guild);
        console.log(participantsType);
        console.log(overwrite);
        console.log(' ');

        if (!userRoles.has(staffRoleID) && !userRoles.has(adminRoleID)) {
            return this.error({ message: 'You do not have permissions to run this command!', ephemeral: true });
        }

        console.log('PASSED');

        const roles = this.initBotInfo.verification.roles;
        const roleExists = roles.some(role => role.name === participantsType);
        if (!roleExists) {
            await interaction.reply({ content: 'The role you entered does not exist!', ephemeral: true });
            return;
        }
        console.log('PASSED AGAIN');
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
                        console.log(emailsRaw, ' is the raw emails');
                        const emails = emailsRaw.split(/[\r?\n|\r|\n|,]+/g).map(email => email.trim()).filter(Boolean);
                        emails.forEach(email => {
                            addUserData(email, participantsType, interaction.guild.id, overwrite);
                        });
                        submitted.reply({ content: emails.length + ' emails have been added as ' + participantsType, ephemeral: true })
                    }
}
}
module.exports = AddMembers;