// Discord.js commando requirements
const { Command, CommandoGuild } = require('discord.js-commando');
const Discord = require('discord.js');
const discordServices = require('../../discord-services');
const Prompt = require('../../classes/prompt');
const jsonfile = require('jsonfile');
const BotGuild = require('../../classes/bot-guild');

// Command export
module.exports = class InitBot extends Command {
    constructor(client) {
        super(client, {
            name: 'init-bot',
            group: 'essentials',
            memberName: 'initialize the bot',
            description: 'Will start the bot given some information.',
            hidden: true,
            args: [
                {
                    type: 'boolean',
                    key: 'isDev',
                    prompt: 'Should the dev config be used',
                    default: false,
                }
            ]
        });
    }

    /**
     *  
     * @param {Discord.Message} message 
     */
    async run(message, { isDev }) {
        message.delete();

        const botGuild = new BotGuild(message.guild.id);

        // make sure the user had manage server permission
        if (!message.member.hasPermission('MANAGE_GUILD')) {
            message.reply('Only admins can use this command!').then(msg => msg.delete({timeout: 5000}));
        }

        if (isDev) {
            const file = './dev_config.json';
            let data = await jsonfile.readFile(file);
            
            botGuild.readyUp(this.client, {
                roleIDs:{
                    adminRole: data.adminRoleID,
                    staffRole: data.staffRoleID,
                    memberRole: data.memberRoleID,
                    everyoneRole: data.everyoneRoleID,
                },
                channelIDs: {
                    adminConsole: data.adminConsoleID,
                    adminLog: data.adminLogsID,
                    botSupportChannel: data.botSupportChannelID
                }
            })

            if (data.isVerificationOn) {
                botGuild.setUpVerification(this.client, data.guestRoleID, {
                    welcomeChannelID: data.welcomeChannelID,
                    welcomeChannelSupportID: data.welcomeChannelSupportID,
                });
            }

            if (data.isAttendanceOn) {
                botGuild.setUpAttendance(this.client, data.attendeeRoleID);
            }

            if (data.isStampOn) {
                botGuild.setUpStamps(this.client, undefined, undefined, data.stamps);
            }

            discordServices.sendMsgToChannel(channel, userId, 'The bot is set and ready to hack!', 10);

            return;
        }

        const embedInfo = new Discord.MessageEmbed().setColor(botGuild.colors.embedColor)
            .setTitle('Hackabot Console')
            .setTimestamp()
            .setDescription('Bot information will be added here! You can make changes here as well!')
            .addField('Role Changes', 'You are free to change role colors and role names! However, stamp role numbers can NOT be changed. You can add permissions but don\'t remove any!');

        // easy constants to use
        var channel = message.channel;
        const userId = message.author.id;
        /** @type {CommandoGuild} */
        const guild = message.guild;
        const everyoneRole = message.guild.roles.everyone;

        discordServices.sendMsgToChannel(channel, userId, 'Please follow the following simple instructions!\n If you cancel any of the prompts, the selected functionality will not be used, however, try not to cancel any prompts.', 60);

        // grab the admin role
        const adminRole = await this.askOrCreate('admin', channel, userId, guild, '#008369');

        // create the admin channel package
        let {adminConsole, adminLog} = await BotGuild.createAdminChannels(guild, adminRole, everyoneRole);
        await discordServices.sendMsgToChannel(channel, userId, 'The admin channels have been created successfully! <#' + adminConsole.id + '>. Lets jump over there and continue yes?!', 60);

        // transition to the admin console
        var channel = adminConsole;
        await discordServices.sendMsgToChannel(channel, userId, 'I am over here!!! Lets continue!');
        const mainConsoleMsg = await channel.send(embedInfo);

        // grab the staff role
        const staffRole = await this.askOrCreate('staff', channel, userId, guild, '#00D166');

        // get the regular member, this role will have the general member permissions
        const memberRole = await this.askOrCreate('member', channel, userId, guild, '#006798');

        // bot support channel prompt
        let botSupportChannel = await this.askForBotSupportChannel(channel, userId);

        botGuild.readyUp(this.client, {
            roleIDs: {
                adminRole: adminRole.id,
                staffRole: staffRole.id,
                everyoneRole: everyoneRole.id,
                memberRole: memberRole.id,
            },
            channelIDs: {
                adminLog: adminLog.id,
                adminConsole: adminConsole.id,
                botSupportChannel: botSupportChannel.id,
            }
        });
        
        // ask if verification will be used
        try {
            if (await Prompt.yesNoPrompt({prompt: 'Will you be using the verification service?', channel, userId})) {
                // ask for guest role
                var guestRole;
                try {
                    guestRole = await this.askOrCreate('guest', channel, userId, guild, '#969C9F');
                } catch (error) {
                    discordServices.sendMsgToChannel(channel, userId, 'You need to give a guest role! Please try again', 10);
                    return this.setVerification(channel, userId, guild, everyoneRole);
                }

                await botGuild.setUpVerification(this.client, guestRole.id);
                discordServices.sendMsgToChannel(channel, userId, 'The verification service has been set up correctly!', 60);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'Verification service was not set due to Prompt cancellation.', 10);
        }
        

        // ask if attendance will be used
        try {
            if (await Prompt.yesNoPrompt({prompt: 'Will you be using the attendance service?', channel, userId})) {    
                const attendeeRole = await this.askOrCreate('attendee', channel, userId, guild, '#0099E1');
                await botGuild.setUpAttendance(this.client, attendeeRole.id);
                discordServices.sendMsgToChannel(channel, userId, 'The attendance service has been set up correctly!', 60);
            } else {
                discordServices.sendMsgToChannel(channel, userId, 'Attendance was not set up!', 60);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'Attendance was not set up due to Prompt cancellation.', 10);
        }


        // ask if the announcements will be used
        try {
            if (await Prompt.yesNoPrompt({prompt: 'Have firebase announcements been set up code-side? If not say no, or the bot will fail!', channel, userId})) {
                let announcementChannel = (await Prompt.channelPrompt('What channel should announcements be sent to? If you don\'t have it, create it and come back, do not cancel.')).first();
                botGuild.setUpAnnouncements(this.client, announcementChannel.id);
                discordServices.sendMsgToChannel(channel, userId, 'The announcements have been set up correctly!', 60);
            } else {
                discordServices.sendMsgToChannel(channel, userId, 'Announcements functionality was not set up.', 10);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'Announcements functionality was not set up due to a Prompt cancellation.', 10);
        }


        // ask if the stamps will be used
        try {
            if (await Prompt.yesNoPrompt({prompt: 'Will you be using the stamp service?', channel, userId})) {
                let numberOfStamps = await Prompt.numberPrompt({prompt: 'How many stamps do you want?', channel, userId})[0];

                await botGuild.setUpStamps(this.client, numberOfStamps);
                discordServices.sendMsgToChannel(channel, userId, 'The stamp roles have been created, you can change their name and/or color, but their stamp number is final!', 60);
            } else {
                discordServices.sendMsgToChannel(channel, userId, 'The stamp functionality was not set up.', 10);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'The stamp functionality will not be used due to prompt cancellation.', 10);
        }


        // ask if the user will use the report functionality
        try {
            if (await Prompt.yesNoPrompt({prompt: 'Will you be using the report functionality?', channel, userId})) {
                let incomingReportChannel = (await Prompt.channelPrompt({prompt: 'What channel should prompts be sent to? We recommend this channel be accessible to your staff.', channel, userId})).first();
                
                botGuild.setUpReport(this.client, incomingReportChannel.id);
                discordServices.sendMsgToChannel(channel, userId, 'The report command is available and reports will be sent to: <#' + incomingReportChannel.id + '>', 60);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'Report command will not be loaded due to prompt cancel.', 10);
        }


        // ask if the user wants to use the experimental !ask command
        try {
            if (await Prompt.yesNoPrompt({prompt: 'Do you want to let users use the experimental !ask command?', channel, userId})) {
                botGuild.setUpAsk(this.client);
                discordServices.sendMsgToChannel(channel, userId, 'The ask command is now available to the server users.', 60);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'Ask command will not be loaded due to prompt cancel.', 10);
        }

        discordServices.sendMsgToChannel(channel, userId, 'The bot is set and ready to hack!', 10);
    }

    /**
     * Will ask the user for a channel to be used for the bot, cancellations are not allowed.
     * @param {Discord.TextChannel} channel 
     * @param {Discord.Snowflake} userId 
     * @returns {Promise<Discord.TextChannel>}
     * @async
     */
    async askForBotSupportChannel(channel, userId) {
        try {
            return (await Prompt.channelPrompt({prompt: 'What channel can the bot use to contact users when DMs are not available?', channel, userId})).first();
        } catch (error) {
            channel.send('<@' + userId + '> You can not cancel this command, please try again!').then(msg => msg.delete({timeout: 15000}));
            return await this.askForBotSupportChannel(channel, userId);
        }
    }

    /**
     * Will ask the user if a role has been created, if so, then prompt it, else then create it.
     * @param {String} roleName - the role name
     * @param {Discord.TextChannel} channel - the text channel were to prompt
     * @param {Discord.Snowflake} userId - the user id to prompt to 
     * @param {Discord.Guild} guild - the current guild
     * @param {Discord.ColorResolvable} - the role color
     * @async
     * @returns {Promise<Discord.Role>}
     * @throws Error from Prompt if canceled
     */
    async askOrCreate(roleName, channel, userId, guild, color) {
        let hasRole = await Prompt.yesNoPrompt({prompt: 'Have you created the ' + roleName + ' role? You can go ahead and create it if you wish, or let me do the hard work.', channel, userId});
        if (hasRole) {
            return (await Prompt.rolePrompt({prompt: 'What is the ' + roleName + ' role?', channel, userId})).first();
        } else {
            return await guild.roles.create({
                data: {
                    name: (await Prompt.messagePrompt({prompt: 'What name would you like the ' + roleName + ' role to have?', channel, userId}, 'string')).content,
                    color: color,
                }
            });
        }
    }
}