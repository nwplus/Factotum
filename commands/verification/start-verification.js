const { Command } = require('@sapphire/framework');
const BotGuild = require('../../db/mongo/BotGuild');
const BotGuildModel = require('../../classes/Bot/bot-guild');
const { Message, MessageEmbed, Modal, MessageActionRow, MessageButton, TextInputComponent } = require('discord.js');
const firebaseServices = require('../../db/firebase/firebase-services');
const { discordLog } = require('../../discord-services');

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
        ),
        {
            idHints: 1060545714133938309
        };
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message 
     */
    async chatInputRun(interaction) {
        this.botGuild = await BotGuild.findById(interaction.guild.id);

        const embed = new MessageEmbed()
            .setTitle(`Please click the button below to check-in to the ${interaction.guild.name} server! Make sure you know which email you used to apply to ${interaction.guild.name}!`);
        // modal timeout warning?
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('verify')
                    .setLabel('Check-in')
                    .setStyle('PRIMARY'),
            );
        interaction.reply({ content: 'Verification started!', ephemeral: true });
        const msg = await interaction.channel.send({ content: 'If you have not already, make sure to enable emojis and embeds/link previews in your personal Discord settings! If you have any issues, please find an organizer!', embeds: [embed], components: [row] });

        const checkInCollector = msg.createMessageComponentCollector({ filter: i => !i.user.bot});
        checkInCollector.on('collect', async i => {
            if (!interaction.guild.members.cache.get(i.user.id).roles.cache.has(this.botGuild.verification.guestRoleID)) {
                await i.reply({ content: 'You are not eligible to be checked in! If you don\'t have correct access to the server, please contact an organizer.', ephemeral: true});
                return;
            }
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
                let types;
                try {
                    types = await firebaseServices.verify(email, submitted.user.id, submitted.guild.id);
                } catch {
                    submitted.reply({ content: 'Your email could not be found! Please try again or ask an admin for help.', ephemeral: true });
                    discordLog(interaction.guild, `VERIFY FAILURE : <@${submitted.user.id}> Verified email: ${email} but was a failure, I could not find that email!`);
                    return;
                }
                
                if (types.length === 0) {
                    submitted.reply({ content: 'You have already verified!', ephemeral: true });
                    discordLog(interaction.guild, `VERIFY WARNING : <@${submitted.user.id}> Verified email: ${email} but they are already verified for all types!`);
                    return;
                }

                var correctTypes = [];
                types.forEach(type => {
                    if (this.botGuild.verification.verificationRoles.has(type)) {
                        const member = interaction.guild.members.cache.get(submitted.user.id);
                        let roleId = this.botGuild.verification.verificationRoles.get(type);
                        member.roles.add(roleId);
                        if (correctTypes.length === 0) member.roles.remove(this.botGuild.verification.guestRoleID);
                        correctTypes.push(type);
                    } else {
                        discordLog(`VERIFY WARNING: <@${submitted.user.id}> was of type ${type} but I could not find that type!`);
                    }
                });

                if (correctTypes.length > 0) {
                    submitted.reply({ content: 'You have successfully verified as a ' + correctTypes.join(', ') + '!', ephemeral: true });
                }
            }
        });
    }
}
module.exports = StartVerification;