const { Command } = require('@sapphire/framework');
// const { deleteMessage, sendMessageToMember, } = require('../../discord-services');
const { Guild, Message, MessageEmbed, Modal, MessageActionRow, MessageButton, TextInputComponent } = require('discord.js');
const { discordLog } = require('../../discord-services');
const firebaseUtil = require('../../db/firebase/firebaseUtil');

/**
 * The report command allows users to report incidents from the server to the admins. Reports are made 
 * via the bot's DMs and are 100% anonymous. 
 * @category Commands
 * @subcategory Hacker-Utility
 * @extends Command
 */
class StartReport extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Will send report format to user via DM for user to send back via DM. Admins will get the report!',
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
        ),
        {
            idHints: '1214159059880517652'
        };
    }

    /**
     * 
     * @param {Command.ChatInputInteraction} interaction 
     */
    async chatInputRun(interaction) {
        // const userId = interaction.user.id;

        // const embed = new MessageEmbed()
        //     .setTitle(`See an issue you'd like to annoymously report at ${interaction.guild.name}? Let our organizers know!`);

        const embed = new MessageEmbed()
            .setTitle('Anonymously report users who are not following server or MLH rules. Help makes our community safer!')
            .setDescription('Please use the format below, be as precise and accurate as possible. \n ' + 
                            'Everything you say will be 100% anonymous. We have no way of reaching back to you so again, be as detailed as possible!\n' + 
                            'Copy paste the format and send it to me in this channel!')
            .addFields({
                name: 'Format:',
                value: 'User(s) discord username(s) (including discord id number(s)):\n' + 
                                    'Reason for report (one line):\n' + 
                                    'Detailed Explanation:\n' + 
                                    'Name of channel where the incident occurred (if possible):'
            });
        // modal timeout warning?
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('report')
                    .setLabel('Report an issue')
                    .setStyle('PRIMARY'),
            );
        interaction.reply({ content: 'Report started!', ephemeral: true });
        const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

        await this.listenToReports(interaction.guild, msg);

        const savedMessagesCol = firebaseUtil.getSavedMessagesSubCol(interaction.guild.id);
        await savedMessagesCol.doc('report').set({
            messageId: msg.id,
            channelId: msg.channel.id,
        });
    }

    /**
     * 
     * @param {Guild} guild 
     * @param {Message<boolean>} msg
     */
    async listenToReports(guild, msg) {
        const checkInCollector = msg.createMessageComponentCollector({ filter: i => !i.user.bot});

        checkInCollector.on('collect', async i => {
            const modal = new Modal()
                .setCustomId('reportModal')
                .setTitle('Report an issue')
                .addComponents([
                    new MessageActionRow().addComponents(
                        new TextInputComponent()
                            .setCustomId('issueMessage')
                            .setLabel('Reason for report:')
                            .setMinLength(3)
                            .setMaxLength(1000)
                            .setStyle(2)
                            .setPlaceholder('Type your issue here...')
                            .setRequired(true),
                    ),
                ]);
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({ time: 300000, filter: j => j.user.id === i.user.id })
                .catch(error => {
                });

            if (submitted) {
                const issueMessage = submitted.fields.getTextInputValue('issueMessage');
                
                try {
                    discordLog(guild, `<@&${guild.roleIDs.staffRole}> New anonymous report:\n\n ${issueMessage}`);
                } catch {
                    discordLog(guild, `New anonymous report:\n\n ${issueMessage}`);
                }
                submitted.reply({ content: 'Thank you for taking the time to report users who are not following server or MLH rules. You help makes our community safer!', ephemeral: true });
                return;
            }
        });
    }

    /**
     * 
     * @param {Guild} guild 
     */
    async tryRestoreReactionListeners(guild) {
        const savedMessagesCol = firebaseUtil.getSavedMessagesSubCol(guild.id);
        const reportDoc = await savedMessagesCol.doc('report').get();
        if (reportDoc.exists) {
            const { messageId, channelId } = reportDoc.data();
            const channel = await this.container.client.channels.fetch(channelId);
            if (channel) {
                try {
                    /** @type {Message} */
                    const message = await channel.messages.fetch(messageId);
                    this.listenToReports(guild, message);
                } catch (e) {
                    // message doesn't exist anymore
                    return e;
                }
            } else {
                return 'Saved message channel does not exist';
            }
        } else {
            return 'No existing saved message for pronouns command';
        }
    }
}
module.exports = StartReport;