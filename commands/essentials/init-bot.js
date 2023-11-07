const { Command } = require('@sapphire/framework');
const { TextChannel, Snowflake, Guild, ColorResolvable, Role, Permissions, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const { sendMsgToChannel, addRoleToMember, discordLog, } = require('../../discord-services');
const BotGuild = require('../../db/mongo/BotGuild');
const winston = require('winston');
const fetch = require('node-fetch');
const { MessagePrompt, StringPrompt, NumberPrompt, SpecialPrompt, RolePrompt, ChannelPrompt } = require('advanced-discord.js-prompts');

/**
 * The InitBot command initializes the bot on the guild. It will prompt the user for information needed 
 * to set up the bot. It is only usable by server administrators. It can only be run once.
 * @category Commands
 * @subcategory Essentials
 * @extends Command
 */
class InitBot extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Configurations for this guild.'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('init-bot')
                .setDescription(this.description)
                .addChannelOption(option =>
                    option.setName('admin_console')
                        .setDescription('Mention the admin console channel')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('admin')
                        .setDescription('Mention the admin role')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('admin_log')
                        .setDescription('Mention the admin log channel')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('staff')
                        .setDescription('Mention the staff role')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('member')
                        .setDescription('Mention the member (general participant) role')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('mentor')
                        .setDescription('Mention the mentor role')
                        .setRequired(true))
                .addBooleanOption(option => 
                    option.setName('use_verification')
                        .setDescription('Whether verification will be used')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('guest')
                        .setDescription('Mention the guest role.')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('welcome_support_channel')
                        .setDescription('Mention the channel for verification issues (must be viewable to guests)!')
                        .setRequired(true))
                .addAttachmentOption(option =>
                    option.setName('verification_roles')
                        .setDescription('File: array of objects! Each role string in the participants\' database and corresponding role ID.')
                        .setRequired(true))
                // .addBooleanOption(option => 
                //     option.setName('use_stamps')
                //         .setDescription('Whether stamps will be used')
                //         .setRequired(true))
                // .addIntegerOption(option => 
                //     option.setName('number_of_stamps')
                //         .setDescription('Number of stamps **if stamps is on**')
                //         .setRequired(false))
                // .addIntegerOption(option => 
                //     option.setName('stamp_time')
                //         .setDescription('Time, in seconds, each stamp is open for claiming **if stamps is on**')
                //         .setRequired(false))
                // .addRoleOption(option =>
                //     option.setName('0th_stamp_role')
                //         .setDescription('Mention the starting stamp role **if stamps is on**')
                //         .setRequired(false))
                .addStringOption(option =>
                    option.setName('embed_colour')
                        .setDescription('Hex code of embed colour')
                        .setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ),
        {
            idHints: 1051737348502728764
        };
    }

    /**
     * @param {Message} message
     */
    async chatInputRun(interaction) {

        // easy constants to use
        var channel = interaction.channel;
        const userId = interaction.user.id;
        /** @type {CommandoGuild} */
        const guild = interaction.guild;
        const everyoneRole = interaction.guild.roles.everyone;

        const botGuild = await BotGuild.findById(guild.id);

        // make sure the user had manage server permission
        if (!interaction.member.permissionsIn(interaction.channel).has('ADMINISTRATOR')) {
            await interaction.reply({ content: 'You do not have permissions to run this command!', ephemeral: true });
            return;
        }

        if (botGuild?.isSetUpComplete) {
            await interaction.reply({ content: 'This server is already set up!', ephemeral: true });
            return;
        }

        const adminConsole = interaction.options.getChannel('admin_console');
        const admin = interaction.options.getRole('admin');
        const adminLog = interaction.options.getChannel('admin_log');
        const staff = interaction.options.getRole('staff');
        const member = interaction.options.getRole('member');
        const mentor = interaction.options.getRole('mentor');
        const useVerification = interaction.options.getBoolean('use_verification');
        let guest;
        let welcomeSupportChannel;
        let verificationRoles;
        const verification = {
            isEnabled: useVerification
        };
        if (useVerification) {
            guest = interaction.options.getRole('guest').id;
            welcomeSupportChannel = interaction.options.getChannel('welcome_support_channel').id;
            verificationRoles = interaction.options.getAttachment('verification_roles');
            // if ()
            try {
                const response = await fetch(verificationRoles.url);
                let res = await response.json();
                await botGuild.setUpVerification(guild, guest, res, welcomeSupportChannel);
            } catch (error) {
                console.error('error: ' + error);
                interaction.reply({ content: 'An error occurred with the file upload or verification roles upload!', ephemeral: true});
            }
        }
        // const useStamps = interaction.options.getBoolean('use_stamps');
        // let numberOfStamps;
        // let stampTime;
        // let firstStampRole;
        // const stamps = {
        //     isEnabled: useStamps
        // };
        // if (useStamps) {
        //     numberOfStamps = interaction.options.getInteger('number_of_stamps');
        //     stampTime = interaction.options.getInteger('stamp_time');
        //     firstStampRole = interaction.options.getInteger('0th_stamp_role');
        //     botGuild.setUpStamps(this.client, numberOfStamps, stampTime, firstStampRole);
        // }
        const embedColor = interaction.options.getString('embed_colour') || '#26fff4';

        // ask the user to move our role up the list
        await interaction.reply({content: 'Before we move on, could you please move my role up the role list as high as possible, this will give me the ability to assign roles!', ephemeral: true});

        await botGuild.readyUp(guild, {
            verification,
            embedColor,
            roleIDs: {
                adminRole: admin.id,
                staffRole: staff.id,
                everyoneRole: everyoneRole.id,
                memberRole: member.id,
                mentorRole: mentor.id
            },
            channelIDs: {
                adminLog: adminLog.id,
                adminConsole: adminConsole.id
            }
        });
        await botGuild.save();
        // botGuild.setCommandStatus(this.client);

        await interaction.followUp('The bot is set and ready to hack!');
        discordLog(guild, '<@' + userId + '> ran init-bot!');
    }

    /**
     * @typedef TypeInfo
     * @property {String} type
     * @property {String} roleId
     */

    async getValidVerificationTypes(channel, userId, guestRole, memberRole) {
        let typeMsg = await MessagePrompt.prompt({
            prompt: `Please tell me the type and mention the role for a verification option. 
            For example: hacker @hacker . Make sure you add nothing more to the message!`, channel, userId
        });
        let type = typeMsg.content.replace(/<(@&?|#)[a-z0-9]*>/, ''); // clean out any snowflakes
        type = type.toLowerCase().trim();
        let role = typeMsg.mentions.roles.first();

        if (role.id === guestRole.id || role.id === memberRole.id) {
            sendMsgToChannel(channel, userId, 'Guest and member roles cannot be used for verification. ' +
                'Please try again.', 30);
            return await this.getValidVerificationTypes(channel, userId, guestRole, memberRole);
        }
        return { type, role };
    }
}
module.exports = InitBot;