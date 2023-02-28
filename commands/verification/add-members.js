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