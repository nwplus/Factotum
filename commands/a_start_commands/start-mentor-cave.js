const { Command } = require('@sapphire/framework');
const { Interaction, MessageEmbed } = require('discord.js');
const { randomColor } = require('../../discord-services');
const { Message, Collection } = require('discord.js');
const BotGuild = require('../../db/mongo/BotGuild')
const winston = require('winston');
const BotGuildModel = require('../../classes/Bot/bot-guild');
const { NumberPrompt, SpecialPrompt, RolePrompt } = require('advanced-discord.js-prompts');
const { MessageActionRow } = require('discord.js');
const { MessageSelectMenu, Modal, TextInputComponent } = require('discord.js');

/**
 * The start mentor cave command creates a cave for mentors. To know what a cave is look at [cave]{@link Cave} class.
 * @category Commands
 * @subcategory Start-Commands
 * @extends PermissionCommand
 * @guildonly
 */
class StartMentorCave extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Start mentor cave'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('start-mentor-cave')
                .setDescription(this.description)
                .addIntegerOption(option =>
                    option.setName('inactivity_time')
                        .setDescription('How long (minutes) before bot asks users to delete ticket channels')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('unanswered_ticket_time')
                        .setDescription('How long (minutes) shall a ticket go unaccepted before the bot sends a reminder to all mentors?')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('request_ticket_role')
                        .setDescription('Tag the role that is allowed to request tickets')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('additional_mentor_role')
                        .setDescription('Tag up to one additional role **aside from mentors and staff** that is allowed to help with tickets')
                        .setRequired(false))
        )
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message - the message in which the command was run
     */
    async chatInputRun(interaction) {
        try {
            // helpful prompt vars
            let channel = interaction.channel;
            let userId = interaction.user.id;
            let guild = interaction.guild;
            this.botGuild = await BotGuild.findById(guild.id);
            let adminConsole = guild.channels.resolve(this.botGuild.channelIDs.adminConsole);
            this.ticketCount = 0;

            const additionalMentorRole = interaction.options.getRole('additional_mentor_role');
            console.log(additionalMentorRole);
            const publicRole = interaction.options.getRole('request_ticket_role');
            const inactivePeriod = interaction.options.getInteger('inactivity_time');
            const bufferTime = inactivePeriod / 2;
            const reminderTime = interaction.options.getInteger('unanswered_ticket_time')

            if (!guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.staffRole) && !guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.adminRole)) {
                return this.error({ message: 'You do not have permissions to run this command!', ephemeral: true })
            }

            interaction.reply({ content: 'Mentor cave activated!', ephemeral: true })

            // create channels
            let overwrites =
                [{
                    id: this.botGuild.roleIDs.everyoneRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: this.botGuild.roleIDs.mentorRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: this.botGuild.roleIDs.staffRole,
                    allow: ['VIEW_CHANNEL'],
                }]

            if (additionalMentorRole) {
                overwrites.push({
                    id: additionalMentorRole,
                    allow: ['VIEW_CHANNEL']
                })
            }

            let mentorCategory = await channel.guild.channels.create('Mentors',
                {
                    type: "GUILD_CATEGORY",
                    permissionOverwrites: overwrites
                }
            );

            const mentorRoleSelectionChannel = await channel.guild.channels.create('mentors-role-selection',
                {
                    type: "GUILD_TEXT",
                    topic: 'Sign yourself up for specific roles! New roles will be added as requested, only add yourself to one if you feel comfortable responding to questions about the topic.',
                    parent: mentorCategory
                }
            );

            //TODO: allow staff to add more roles
            const htmlCssEmoji = '💻';
            const jsTsEmoji = '🕸️';
            const pythonEmoji = '🐍';
            const sqlEmoji = '🐬';
            const reactEmoji = '⚛️';
            const noSqlEmoji = '🔥';
            const javaEmoji = '☕';
            const cEmoji = '🎮';
            const cSharpEmoji = '💼';
            const reduxEmoji = '☁️';
            const figmaEmoji = '🎨';
            const unityEmoji = '🧊';
            const rustEmoji = '⚙️';
            const awsEmoji = '🙂';
            const ideationEmoji = '💡';

            let emojisMap = new Map();
            emojisMap.set(htmlCssEmoji, 'HTML/CSS');
            emojisMap.set(jsTsEmoji, 'JavaScript/TypeScript');
            emojisMap.set(pythonEmoji, 'Python');
            emojisMap.set(sqlEmoji, 'SQL');
            emojisMap.set(reactEmoji, 'React');
            emojisMap.set(noSqlEmoji, 'NoSQL');
            emojisMap.set(javaEmoji, 'Java');
            emojisMap.set(cEmoji, 'C/C++');
            emojisMap.set(cSharpEmoji, 'C#');
            emojisMap.set(reduxEmoji, 'Redux');
            emojisMap.set(figmaEmoji, 'Figma');
            emojisMap.set(unityEmoji, 'Unity');
            emojisMap.set(rustEmoji, 'Rust');
            emojisMap.set(awsEmoji, 'AWS');
            emojisMap.set(ideationEmoji, 'Ideation');

            const mentorRoleColour = guild.roles.cache.find(role => role.id === this.botGuild.roleIDs.mentorRole).hexColor;
            for (let value of emojisMap.values()) {
                const findRole = guild.roles.cache.find(role => role.name.toLowerCase() === `M-${value}`.toLowerCase());
                if (!findRole) {
                    await guild.roles.create(
                        {
                            name: `M-${value}`,
                            color: mentorRoleColour,
                        }
                    );
                }
            }

            var fields = [];
            for (let [key, value] of emojisMap) {
                fields.push({ name: key, value: value });
            }

            const roleSelection = new MessageEmbed()
                .setTitle('Choose what you would like to help hackers with! You can un-react to deselect a role.')
                .setDescription('Note: You will be notified every time a hacker creates a ticket in one of your selected categories!')
                .addFields(fields)

            const roleSelectionMsg = await mentorRoleSelectionChannel.send({ embeds: [roleSelection] });
            for (let key of emojisMap.keys()) {
                roleSelectionMsg.react(key);
            }

            const roleFilter = i => !i.user.bot;
            const collector = roleSelectionMsg.createReactionCollector({ roleFilter, dispose: true });
            collector.on('collect', async (reaction, user) => {
                if (emojisMap.has(reaction.emoji.name)) {
                    const value = emojisMap.get(reaction.emoji.name);
                    const findRole = guild.roles.cache.find(role => role.name.toLowerCase() === `M-${value}`.toLowerCase());
                    await guild.members.cache.get(user.id).roles.add(findRole);
                }
            });

            collector.on('remove', async (reaction, user) => {
                if (emojisMap.has(reaction.emoji.name)) {
                    const member = guild.members.cache.get(user.id);
                    const value = emojisMap.get(reaction.emoji.name);
                    const findRole = member.roles.cache.find(role => role.name.toLowerCase() === `M-${value}`.toLowerCase());
                    if (findRole) await guild.members.cache.get(user.id).roles.remove(findRole);
                }
            })

            channel.guild.channels.create('mentors-general',
                {
                    type: "GUILD_TEXT",
                    topic: 'Private chat between all mentors and organizers',
                    parent: mentorCategory
                }
            );

            const incomingTicketChannel = await channel.guild.channels.create('incoming-tickets',
                {
                    type: "GUILD_TEXT",
                    topic: 'Tickets from hackers will come in here!',
                    parent: mentorCategory
                }
            );

            const mentorHelpCategory = await channel.guild.channels.create('Mentor-help',
                {
                    type: "GUILD_CATEGORY",
                    permissionOverwrites: [
                        {
                            id: this.botGuild.roleIDs.everyoneRole,
                            deny: ['VIEW_CHANNEL'],
                        },
                        {
                            id: this.botGuild.roleIDs.memberRole,
                            allow: ['VIEW_CHANNEL'],
                        },
                    ]
                }
            );

            channel.guild.channels.create('quick-questions',
                {
                    type: "GUILD_TEXT",
                    topic: 'ask questions for mentors here!',
                    parent: mentorHelpCategory
                }
            );

            const requestTicketChannel = await channel.guild.channels.create('request-ticket',
                {
                    type: "GUILD_TEXT",
                    topic: 'request 1-on-1 help from mentors here!',
                    parent: mentorHelpCategory
                }
            );

            const requestTicketEmbed = new MessageEmbed()
                .setTitle('Need 1:1 mentor help?')
                .setDescription('Select a technology you need help with and follow the instructions!')

            var options = [];
            for (let value of emojisMap.values()) {
                options.push({ label: value, value: value });
            }
            // options.push({ label: 'None of the above', value: 'None of the above'})

            const selectMenuRow = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('ticketType')
                        .addOptions(options)
                )

            const requestTicketConsole = await requestTicketChannel.send({ embeds: [requestTicketEmbed], components: [selectMenuRow] });

            const selectMenuFilter = i => !i.user.bot && guild.members.cache.get(userId).roles.cache.has(publicRole);
            const selectMenuCollector = requestTicketConsole.createMessageComponentCollector(selectMenuFilter);
            selectMenuCollector.on('collect', async i => {
                if (i.customId === 'ticketType') {
                    requestTicketConsole.edit({ embeds: [requestTicketEmbed], components: [selectMenuRow] });
                    const modal = new Modal()
                        .setCustomId('ticketSubmitModal')
                        .setTitle('Request a ticket for ' + i.values[0])
                        .addComponents([
                            new MessageActionRow().addComponents(
                                new TextInputComponent()
                                    .setCustomId('ticketDescription')
                                    .setLabel('Brief description of your problem')
                                    .setMaxLength(300)
                                    .setStyle('PARAGRAPH')
                                    .setPlaceholder('Describe your problem here')
                                    .setRequired(true),
                            ),
                        ]);
                    await i.showModal(modal);

                    const submitted = await i.awaitModalSubmit({ time: 300000, filter: j => j.user.id === i.user.id })
                        .catch(error => {
                            submitted.reply({ content: 'Something went wrong or the modal timed out!', ephemeral: true })
                        });

                    if (submitted) {
                        const role = guild.roles.cache.find(role => role.name.toLowerCase() === `M-${i.values[0]}`.toLowerCase());
                        const description = submitted.fields.getTextInputValue('ticketDescription');
                        const ticketEmbed = new MessageEmbed()
                            .setTitle('Ticket #' + this.ticketCount)
                            .setDescription(description + '\nRequested by: <@' + i.user.id + '>')
                        this.ticketCount++;
                        const ticketMsg = await incomingTicketChannel.send({ content: '<@&' + role.id + '>', embeds: [ticketEmbed] })
                        submitted.reply({ content: 'Your ticket has been submitted!', ephemeral: true })
                        // TODO: allow deletion
                    }

                }
            })

            // eslint-disable-next-line no-inner-declarations
            // async function checkForDuplicateEmojis(prompt) {
            //     let reaction = await SpecialPrompt.singleRestrictedReaction({prompt, channel, userId}, emojis);
            //     var emoji = reaction.emoji;
            //     emojis.set(emoji.name, emoji);
            //     return emoji;
            // }

            // let cave = new Cave({
            //     name: 'Mentor',
            //     preEmojis: '🧑🏽🎓',
            //     preRoleText: 'M',
            //     color: 'ORANGE',
            //     role: mentorRole,
            //     emojis: {
            //         joinTicketEmoji: '🧑🏽',
            //         giveHelpEmoji: '🧑🏽',
            //         requestTicketEmoji: '🧑🏽',
            //         addRoleEmoji: '🧑🏽',
            //         deleteChannelsEmoji: '🧑🏽',
            //         excludeFromAutoDeleteEmoji: '🧑🏽',
            //     },
            //     times: {
            //         inactivePeriod,
            //         bufferTime,
            //         reminderTime,
            //     },
            //     publicRoles: publicRole,
            // }, botGuild, interaction.guild);

            // await cave.init();

        } catch (error) {
            // winston.loggers.get(interaction.guild.id).warning(`An error was found but it was handled by not setting up the mentor cave. Error: ${error}`, { event: 'StartMentorCave Command' });
        }
    }
}
module.exports = StartMentorCave;