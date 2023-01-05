const { Command } = require('@sapphire/framework');
const BotGuild = require('../../db/mongo/BotGuild')
const BotGuildModel = require('../../classes/Bot/bot-guild');
const { Message, MessageEmbed, Modal, MessageActionRow, MessageButton, TextInputComponent } = require('discord.js');

class StartVerification extends Command {
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
        )
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message 
     */
    async chatInputRun(interaction) {
        this.botGuild = await BotGuild.findById(interaction.guild.id);

        const embed = new MessageEmbed()
            .setTitle(`Please click the button below to check-in to the ${interaction.guild.name} server! Make sure you know which email you used to apply to nwHacks!`)
            .setDescription('If you have not already, make sure to enable emojis and embeds/link previews in your personal Discord settings! If you have any issues, please find an organizer!')

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('verify')
                    .setLabel('Check-in')
                    .setStyle('PRIMARY'),
            )
        interaction.reply({ content: 'Verification started!', ephemeral: true });
        const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

        const checkInCollector = msg.createMessageComponentCollector({ filter: i => !i.user.bot && interaction.guild.members.cache.get(i.user.id).roles.cache.has(this.botGuild.verification.guestRoleID) })
        checkInCollector.on('collect', async i => {
            const modal = new Modal()
                .setCustomId('verifyModal')
                .setTitle('Check-in to gain access to the server!')
                .addComponents([
                    new MessageActionRow().addComponents(
                        new TextInputComponent()
                            .setCustomId('email')
                            .setLabel('Enter the email that you applied with!')
                            .setMinLength(3)
                            .setMaxLength(320)
                            .setStyle('SHORT')
                            .setPlaceholder('Email Address')
                            .setRequired(true),
                    ),
                ]);
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({ time: 300000, filter: j => j.user.id === i.user.id })
                .catch(error => {
                });

            if (submitted) {
                const email = submitted.fields.getTextInputValue('email');
                // TODO: check firebase for email and assign corresponding roles
            }
        })
    }
}
module.exports = StartVerification;