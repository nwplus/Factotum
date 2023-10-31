const { Command } = require('@sapphire/framework');
const PermissionCommand = require('../../classes/permission-command');
const { discordLog } = require('../../discord-services');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { getReminder } = require('../../db/firebase/firebase-services');
const BotGuild = require('../../db/mongo/BotGuild');
const BotGuildModel = require('../../classes/Bot/bot-guild');
const { NumberPrompt, SpecialPrompt, RolePrompt } = require('advanced-discord.js-prompts');

/**
 * The self care command will send pre made reminders from firebase to the command channel. These reminders are self
 * care reminders. Will prompt a role to mention with each reminder. We recommend that be an opt-in role. 
 * @category Commands
 * @subcategory Admin-Utility
 * @extends Command
 */
class SelfCareReminders extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Sends self-care reminders at designated times.',
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addIntegerOption(option =>
                    option.setName('interval')
                        .setDescription('Time (minutes) between reminders')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('notify')
                        .setDescription('Role to notify when a reminder drops')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('start_reminder_now')
                        .setDescription('True to start first reminder now, false to start it after one interval')
                        .setRequired(false))
        );
    }

    async chatInputRun(interaction) {
        var interval;

        let channel = interaction.channel;
        let userId = interaction.user.id;
        // this.botGuild = this.botGuild;
        let guild = interaction.guild;
        this.botGuild = await BotGuild.findById(guild.id);
        let adminConsole = guild.channels.resolve(this.botGuild.channelIDs.adminConsole);

        var timeInterval = interaction.options.getInteger('interval') * 60000;
        var startNow = interaction.options.getBoolean('start_reminder_now');
        var roleId = interaction.options.getRole('notify');

        if (!guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.staffRole) && !guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.adminRole)) {
            interaction.reply({ message: 'You do not have permissions to run this command!', ephemeral: true });
            return;
        }

        // keeps track of whether it has been paused
        var paused = false;

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('play')
                    .setLabel('Play')
                    .setStyle('PRIMARY'),
            )
            .addComponents(
                new MessageButton()
                    .setCustomId('pause')
                    .setLabel('Pause')
                    .setStyle('PRIMARY'),
            );

        const startEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle('To encourage healthy hackathon habits, we will be sending hourly self-care reminders!');

        interaction.reply({ content: 'Self-care reminders started!', ephemeral: true });

        roleId ? interaction.channel.send({ content: '<@&' + roleId + '>', embeds: [startEmbed] }) : interaction.channel.send({ embeds: [startEmbed] });

        const controlPanel = await adminConsole.send({ content: 'Self care reminders started by <@' + userId + '>', components: [row] });
        const filter = i => !i.user.bot && (guild.members.cache.get(i.user.id).roles.cache.has(this.botGuild.roleIDs.staffRole) || guild.members.cache.get(i.user.id).roles.cache.has(this.botGuild.roleIDs.adminRole));
        const collector = controlPanel.createMessageComponentCollector(filter);
        collector.on('collect', async i => {
            if (interval != null && !paused && i.customId == 'pause') {
                clearInterval(interval);
                paused = true;
                await guild.channels.resolve(this.botGuild.channelIDs.adminLog).send('Self care reminders paused by <@' + i.user.id + '>!');
                await i.reply({ content: 'Self care reminders has been paused!', ephemeral: true });
            } else if (paused && i.customId == 'play') {
                await sendReminder(this.botGuild);
                interval = setInterval(sendReminder, timeInterval, this.botGuild);
                paused = false;
                await guild.channels.resolve(this.botGuild.channelIDs.adminLog).send('Self care reminders restarted by <@' + i.user.id + '>!');
                await i.reply({ content: 'Self care reminders has been un-paused!', ephemeral: true });
            } else {
                await i.reply({ content: 'Wrong button or wrong permissions!', ephemeral: true });
            }
        });


        //starts the interval, and sends the first reminder immediately if startNow is true
        if (startNow) {
            sendReminder(this.botGuild);
        }
        interval = setInterval(sendReminder, timeInterval, this.botGuild);

        // sendReminder is the function that picks and sends the next reminder
        async function sendReminder(botGuild) {
            //get reminders parameters from db 
            var data = await getReminder(guild.id);

            //report in admin logs that there are no more messages
            //TODO: consider having it just loop through the db again?
            if (data === null) {
                discordLog(guild, '<@&' + botGuild.roleIDs.staffRole + '> HI, PLEASE FEED ME more self-care messages!!');
                clearInterval(interval);
                return;
            }

            let reminder = data.reminder;

            const qEmbed = new MessageEmbed()
                .setColor(botGuild.colors.embedColor)
                .setTitle(reminder);

            roleId ? channel.send({ content: 'Hey <@&' + roleId + '> remember:', embeds: [qEmbed] }) : channel.send({ embeds: [qEmbed] });
        }
    }
}
module.exports = SelfCareReminders;
