// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { Command } = require('@sapphire/framework');
const { Message, MessageEmbed, MessageActionRow, Modal, TextInputComponent, MessageSelectMenu, Guild } = require('discord.js');
const firebaseUtil = require('../../db/firebase/firebaseUtil');

const newTransferEmoji = '🆕';
const emojisMap = new Map();

/**
 * Make a message embed (console) available on the channel for users to react and un-react for roles. Staff can dynamically add 
 * roles to the console. Users can react to get the role, then un-react to loose the role.
 * @category Commands
 * @subcategory Admin-Utility
 * @extends PermissionCommand
 */
class RoleSelector extends PermissionCommand {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'role-selector',
            description: 'Will let users transfer roles. Useful for sponsor reps that are also mentors!',
        }, {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the command !role-selector is only available to staff!',
        });
    }

    /**
     * 
     * @param {Command.Registry} registry 
     */
    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description),
        { idHints: '1262581324657725521' });
    }

    /**
     * 
     * @param {Command.ChatInputInteraction} interaction 
     */
    async chatInputRun(interaction) {
        const guild = interaction.guild;
        const userId = interaction.user.id;
        const initBotInfo = await firebaseUtil.getInitBotInfo(guild.id);

        if (!guild.members.cache.get(userId).roles.cache.has(initBotInfo.roleIDs.staffRole) && !guild.members.cache.get(userId).roles.cache.has(initBotInfo.roleIDs.adminRole)) {
            await interaction.reply({ content: 'You do not have permissions to run this command!', ephemeral: true });
            return;
        }

        const savedMessagesCol = firebaseUtil.getSavedMessagesSubCol(guild.id);
        const roleSelectorDoc = await savedMessagesCol.doc('role-selector').get();
        const roleSelectorData = roleSelectorDoc.data();
        if (roleSelectorData?.emojis) {
            for (const [emoji, name] of Object.entries(
                roleSelectorData.emojis
            )) {
                emojisMap.set(emoji, name);
            }
        }

        let embed = await makeRoleSelectionEmbed();
        
        let messageEmbed = await interaction.channel.send({embeds: [embed] });
        messageEmbed.react(newTransferEmoji);

        for (const key of emojisMap.keys()) {
            messageEmbed.react(key);
        }

        listenToRoleSelectorReaction(initBotInfo, guild, messageEmbed);

        savedMessagesCol.doc('role-selector').set({
            messageId: messageEmbed.id,
            channelId: messageEmbed.channelId
        }, { merge: true });
        
        interaction.reply({content: 'Role selector created!', ephemeral: true});
    }

    /**
     * Checks Firebase for an existing stored reaction listener -
     * restores the listeners for the reaction if it exists, otherwise does nothing
     * @param {Guild} guild 
     */
    async tryRestoreReactionListeners(guild) {
        const savedMessagesCol = firebaseUtil.getSavedMessagesSubCol(guild.id);
        const roleSelectorDoc = await savedMessagesCol.doc('role-selector').get();
        if (roleSelectorDoc.exists) {
            const { messageId, channelId, emojis } = roleSelectorDoc.data();

            if (emojis) {
                for (const [emoji, name] of Object.entries(emojis)) {
                    emojisMap.set(emoji, name);
                }
            }
            const channel = await this.container.client.channels.fetch(channelId);
            if (channel) {
                try {
                    /** @type {Message} */
                    const message = await channel.messages.fetch(messageId);
                    const initBotInfo = await firebaseUtil.getInitBotInfo(guild.id);
                    listenToRoleSelectorReaction(initBotInfo, guild, message);
                } catch (e) {
                    // message doesn't exist anymore
                    return e;
                }
            } else {
                return 'Saved message channel does not exist';
            }
        } else {
            return 'No existing saved message for role-selector command';
        }
    }
}

async function makeRoleSelectionEmbed() {
    const roleSelectionEmbed = new MessageEmbed()
        .setTitle('Role Selector!')
        .setDescription(
            'React to the specified emoji to get the role, un-react to remove the role.'
        );

    if (emojisMap.size > 0) {
        roleSelectionEmbed.setFields(
            Array.from(emojisMap).map(([k, v]) => ({name: k, value: `${v.title} - ${v.description}`}))
        );
    }

    return roleSelectionEmbed;
}

/**
 * 
 * @param {FirebaseFirestore.DocumentData | null | undefined} initBotInfo 
 * @param {Guild} guild 
 * @param {Message} messageEmbed 
 */
async function listenToRoleSelectorReaction(
    initBotInfo,
    guild,
    messageEmbed
) {
    const reactionCollector = messageEmbed.createReactionCollector({
        dispose: true,
    });

    reactionCollector.on('collect', async (reaction, user) => {
        if (user.bot) return;
        if (
            !guild.members.cache
                .get(user.id)
                .roles.cache.has(initBotInfo.roleIDs.staffRole) &&
            !guild.members.cache
                .get(user.id)
                .roles.cache.has(initBotInfo.roleIDs.adminRole)
        ) {
            await user.send({
                content: 'You do not have permissions to run this command!',
                ephemeral: true,
            });
            return;
        }
        if (reaction.emoji.name === newTransferEmoji) {
            const allRoles = await guild.roles.fetch();
            const roleSelectRow = new MessageActionRow().setComponents(
                new MessageSelectMenu()
                    .setOptions(
                        ...allRoles
                            .map((r) => ({
                                label: r.name,
                                value: r.id,
                            }))
                            .slice(-25)
                    )
                    .setCustomId('transfer_role')
            );
            const roleSelectEmbed = new MessageEmbed()
                .setTitle('New role selector')
                .setDescription(
                    'Select the role that you want to add to the role selector embed:'
                );

            const roleSelectMenu = await user.send({
                components: [roleSelectRow],
                embeds: [roleSelectEmbed],
            });

            const roleSelectListener = roleSelectMenu.createMessageComponentCollector();
            roleSelectListener.on('collect', async (i) => {
                const role = await guild.roles.fetch(i.values[0]);
                if (i.customId === 'transfer_role') {
                    if (
                        !guild.members.cache
                            .get(i.user.id)
                            .roles.cache.has(initBotInfo.roleIDs.staffRole) &&
                        !guild.members.cache
                            .get(i.user.id)
                            .roles.cache.has(initBotInfo.roleIDs.adminRole)
                    ) {
                        await i.reply({
                            content: 'You do not have permissions to run this command!',
                            ephemeral: true,
                        });
                        return;
                    }
                    const newReactionModal = new Modal()
                        .setTitle('New role reaction for ' + role.name)
                        .setCustomId('new_role')
                        .setComponents(
                            new MessageActionRow().setComponents(
                                new TextInputComponent()
                                    .setLabel('What is the transfer title?')
                                    .setStyle('SHORT')
                                    .setRequired(true)
                                    .setCustomId('transfer_title')
                            ),
                            new MessageActionRow().setComponents(
                                new TextInputComponent()
                                    .setLabel('What is the transfer description?')
                                    .setStyle('SHORT')
                                    .setRequired(true)
                                    .setCustomId('transfer_desc')
                            )
                        );
                    await i.showModal(newReactionModal);

                    const submitted = await i
                        .awaitModalSubmit({
                            time: 300000,
                            filter: (j) => j.user.id === i.user.id,
                        })
                        .catch(() => {});

                    if (submitted) {
                        await roleSelectMenu.delete();
                        const title = submitted.fields.getTextInputValue('transfer_title');
                        const description = submitted.fields.getTextInputValue('transfer_desc');

                        await submitted.reply('New role selector details successfully submitted!');

                        const askForEmoji = await user.send('React to this message with the emoji for the role!');
                        const emojiCollector = askForEmoji.createReactionCollector();
                        emojiCollector.on('collect', async (reaction, user) => {
                            const savedMessagesCol = firebaseUtil.getSavedMessagesSubCol(guild.id);
                            const roleSelectorData = (await savedMessagesCol.doc('role-selector').get()).data();
                            if (roleSelectorData?.emojis && reaction.emoji.name in roleSelectorData.emojis) {
                                user.send('Emoji is already used in another role. Please react again.').then(msg => {
                                    setTimeout(() => msg.delete(), 5000);
                                });
                            } else {
                                emojiCollector.stop();
                                firebaseUtil.getSavedMessagesSubCol(guild.id).doc('role-selector').set({
                                    emojis: {
                                        [reaction.emoji.name]: {
                                            title,
                                            description,
                                            roleId: role.id
                                        }
                                    }
                                }, { merge: true });
                                emojisMap.set(reaction.emoji.name, { title, description, roleId: role.id });
                                user.send('Role added!').then(msg => {
                                    setTimeout(() => msg.delete(), 5000);
                                });
                                messageEmbed.edit({ embeds: [new MessageEmbed(await makeRoleSelectionEmbed())] });
                                messageEmbed.react(reaction.emoji.name);

                                askForEmoji.delete();
                            }
                        });
                    }
                }
            });
        } else {
            if (emojisMap.has(reaction.emoji.name)) {
                const value = emojisMap.get(reaction.emoji.name);
                const findRole = await guild.roles.cache.get(value.roleId);
                await guild.members.cache.get(user.id).roles.add(findRole);
            }
        }
    });
    reactionCollector.on('remove', async (reaction, user) => {
        if (emojisMap.has(reaction.emoji.name)) {
            const member = guild.members.cache.get(user.id);
            const value = emojisMap.get(reaction.emoji.name);
            const findRole = await member.roles.cache.get(value.roleId);
            if (findRole)
                await guild.members.cache.get(user.id).roles.remove(findRole);
        }
    });
}

module.exports = RoleSelector;

