const { Command, CommandoGuild } = require('discord.js-commando');
const { MessageEmbed, Message, TextChannel, Snowflake, Guild, ColorResolvable, Role, } = require('discord.js');
const { sendMsgToChannel, addRoleToMember, } = require('../../discord-services');
const { yesNoPrompt, channelPrompt, rolePrompt, messagePrompt, numberPrompt } = require('../../classes/prompt');
const jsonfile = require('jsonfile');

const BotGuild = require('../../db/mongo/BotGuild');
const winston = require('winston');

/**
 * The InitBot command initializes the bot on the guild. It will prompt the user for information needed 
 * to set up the bot. It is only usable by server administrators. It can only be run once.
 * @category Commands
 * @subcategory Essentials
 * @extends Command
 */
class InitBot extends Command {
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
     * @param {Message} message
     * @param {Object} args
     * @param {Boolean} args.isDev
     */
    async run(message, { isDev }) {
        message.delete();

        // easy constants to use
        var channel = message.channel;
        const userId = message.author.id;
        /** @type {CommandoGuild} */
        const guild = message.guild;
        const everyoneRole = message.guild.roles.everyone;

        const botGuild = await BotGuild.findById(guild.id);

        // make sure the user had manage server permission
        if (!message.member.hasPermission('MANAGE_GUILD')) {
            message.reply('Only admins can use this command!').then(msg => msg.delete({timeout: 5000}));
        }

        if (botGuild?.isSetUpComplete) {
            sendMsgToChannel(channel, userId, 'This guild is already set up!!', 30);
            return;
        }

        if (isDev) {
            const file = './dev_config.json';
            let data = await jsonfile.readFile(file);
            
            await botGuild.readyUp(this.client, {
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
            });

            if (data.isVerificationOn) {
                await botGuild.setUpVerification(this.client, data.guestRoleID, data.types, {
                    welcomeChannelID: data.welcomeChannelID,
                    welcomeChannelSupportID: data.welcomeChannelSupportID,
                });
            }

            if (data.isAttendanceOn) {
                await botGuild.setUpAttendance(this.client, data.attendeeRoleID);
            }

            if (data.isStampOn) {
                await botGuild.setUpStamps(this.client, undefined, undefined, data.stamps);
            }

            botGuild.isSetUpComplete = true;

            await botGuild.save();

            sendMsgToChannel(channel, userId, 'The bot is set and ready to hack!', 10);

            return;
        }

        const embedInfo = new MessageEmbed().setColor(botGuild.colors.embedColor)
            .setTitle('Hackabot Console')
            .setTimestamp()
            .setDescription('Bot information will be added here! You can make changes here as well!')
            .addField('Role Changes', 'You are free to change role colors and role names! However, stamp role numbers can NOT be changed. You can add permissions but don\'t remove any!');

        sendMsgToChannel(channel, userId, 'Please follow the following simple instructions!\n If you cancel any of the prompts, the selected functionality will not be used, however, try not to cancel any prompts.', 60);

        // grab the admin role
        const adminRole = await this.askOrCreate('admin', channel, userId, guild, '#008369');
        addRoleToMember(message.member, adminRole);

        // create the admin channel package
        let {adminConsole, adminLog} = await BotGuild.createAdminChannels(guild, adminRole, everyoneRole);
        await sendMsgToChannel(channel, userId, 'The admin channels have been created successfully! <#' + adminConsole.id + '>. Lets jump over there and continue yes?!', 60);

        // transition to the admin console
        channel = adminConsole;
        await sendMsgToChannel(channel, userId, 'I am over here!!! Lets continue!');
        const mainConsoleMsg = await channel.send(embedInfo);

        // ask the user to move our role up the list
        await sendMsgToChannel(channel, userId, 'Before we move on, could you please move my role up the role list as high as possible, this will give me the ability to assign roles! I will wait for at least 10 seconds!');
        await new Promise((resolve) => setTimeout(resolve, 10000));

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
            if (await yesNoPrompt({prompt: 'Will you be using the verification service?', channel, userId})) {
                // ask for guest role
                var guestRole;
                try {
                    guestRole = await this.askOrCreate('guest', channel, userId, guild, '#969C9F');
                } catch (error) {
                    sendMsgToChannel(channel, userId, 'You need to give a guest role! Please try again', 10);
                    return this.setVerification(channel, userId, guild, everyoneRole);
                }

                let types = await this.getVerificationTypes(channel, userId);

                await botGuild.setUpVerification(this.client, guestRole.id, types);
                sendMsgToChannel(channel, userId, 'The verification service has been set up correctly!', 60);
            }
        } catch (error) {
            sendMsgToChannel(channel, userId, 'Verification service was not set due to Prompt cancellation.', 10);
            winston.loggers.get(guild.id).warning(`Handled an error when setting up verification, and thus was not set up. Error was ${error.name}`, { event: 'InitBot Command', data: error });
        }
        

        // ask if attendance will be used
        try {
            if (await yesNoPrompt({prompt: 'Will you be using the attendance service?', channel, userId})) {    
                const attendeeRole = await this.askOrCreate('attendee', channel, userId, guild, '#0099E1');
                await botGuild.setUpAttendance(this.client, attendeeRole.id);
                sendMsgToChannel(channel, userId, 'The attendance service has been set up correctly!', 60);
            } else {
                sendMsgToChannel(channel, userId, 'Attendance was not set up!', 60);
            }
        } catch (error) {
            sendMsgToChannel(channel, userId, 'Attendance was not set up due to Prompt cancellation.', 10);
        }


        // ask if the announcements will be used
        try {
            if (await yesNoPrompt({prompt: 'Have firebase announcements been set up code-side? If not say no, or the bot will fail!', channel, userId})) {
                let announcementChannel = (await channelPrompt('What channel should announcements be sent to? If you don\'t have it, create it and come back, do not cancel.')).first();
                await botGuild.setUpAnnouncements(this.client, announcementChannel.id);
                sendMsgToChannel(channel, userId, 'The announcements have been set up correctly!', 60);
            } else {
                sendMsgToChannel(channel, userId, 'Announcements functionality was not set up.', 10);
            }
        } catch (error) {
            sendMsgToChannel(channel, userId, 'Announcements functionality was not set up due to a Prompt cancellation.', 10);
        }


        // ask if the stamps will be used
        try {
            if (await yesNoPrompt({prompt: 'Will you be using the stamp service?', channel, userId})) {
                let numberOfStamps = (await numberPrompt({prompt: 'How many stamps do you want?', channel, userId}))[0];

                await botGuild.setUpStamps(this.client, numberOfStamps);
                guild.setGroupEnabled('stamps', true);
                sendMsgToChannel(channel, userId, 'The stamp roles have been created, you can change their name and/or color, but their stamp number is final!', 60);
            } else {
                sendMsgToChannel(channel, userId, 'The stamp functionality was not set up.', 10);
            }
        } catch (error) {
            sendMsgToChannel(channel, userId, 'The stamp functionality will not be used due to prompt cancellation.', 10);
        }


        // ask if the user will use the report functionality
        try {
            if (await yesNoPrompt({prompt: 'Will you be using the report functionality?', channel, userId})) {
                let incomingReportChannel = (await channelPrompt({prompt: 'What channel should prompts be sent to? We recommend this channel be accessible to your staff.', channel, userId})).first();
                
                await botGuild.setUpReport(this.client, incomingReportChannel.id);
                sendMsgToChannel(channel, userId, 'The report command is available and reports will be sent to: <#' + incomingReportChannel.id + '>', 60);
            }
        } catch (error) {
            sendMsgToChannel(channel, userId, 'Report command will not be loaded due to prompt cancel.', 10);
        }


        // ask if the user wants to use the experimental !ask command
        try {
            if (await yesNoPrompt({prompt: 'Do you want to let users use the experimental !ask command?', channel, userId})) {
                botGuild.setUpAsk(this.client);
                sendMsgToChannel(channel, userId, 'The ask command is now available to the server users.', 60);
            }
        } catch (error) {
            sendMsgToChannel(channel, userId, 'Ask command will not be loaded due to prompt cancel.', 10);
        }

        await botGuild.save();

        sendMsgToChannel(channel, userId, 'The bot is set and ready to hack!', 10);
    }

    /**
     * @typedef TypeInfo
     * @property {String} type
     * @property {String} roleId
     */

    /**
     * Prompts the user for a verification type and if they want to add more. Will call itself if true 
     * for a recursive call.
     * @param {TextChannel} channel 
     * @param {String} userId 
     * @returns {Promise<TypeInfo[]>}
     * @async
     */
    async getVerificationTypes(channel, userId) {

        let typeMsg = await Prompt.messagePrompt({ prompt: 'Please tell me the type and mention the role for a verification option. Type should be equal to the firebase type. Add nothing more but type and role mention.', channel, userId });
        let type = typeMsg.content.replace(/<(@&?|#)[a-z0-9]*>/ , ''); // clean out any snowflakes
        type = type.toLowerCase().trim();
        let role = typeMsg.mentions.roles.first();

        if (await yesNoPrompt({ prompt: 'Would you like to add another verification option?', channel, userId })) {
            return (await this.getVerificationTypes(channel, userId)).concat([{
                type: type,
                roleId: role.id,
            }]);
        } else {
            return [{
                type: type,
                roleId: role.id,
            }];
        }
    }

    /**
     * Will ask the user for a channel to be used for the bot, cancellations are not allowed.
     * @param {TextChannel} channel 
     * @param {Snowflake} userId 
     * @returns {Promise<TextChannel>}
     * @async
     */
    async askForBotSupportChannel(channel, userId) {
        try {
            return (await channelPrompt({prompt: 'What channel can the bot use to contact users when DMs are not available?', channel, userId})).first();
        } catch (error) {
            channel.send('<@' + userId + '> You can not cancel this command, please try again!').then(msg => msg.delete({timeout: 15000}));
            return await this.askForBotSupportChannel(channel, userId);
        }
    }

    /**
     * Will ask the user if a role has been created, if so, then prompt it, else then create it.
     * @param {String} roleName - the role name
     * @param {TextChannel} channel - the text channel were to prompt
     * @param {Snowflake} userId - the user id to prompt to 
     * @param {Guild} guild - the current guild
     * @param {ColorResolvable} - the role color
     * @async
     * @returns {Promise<Role>}
     * @throws Error from Prompt if canceled
     */
    async askOrCreate(roleName, channel, userId, guild, color) {
        let hasRole = await yesNoPrompt({prompt: 'Have you created the ' + roleName + ' role? You can go ahead and create it if you wish, or let me do the hard work.', channel, userId});
        if (hasRole) {
            return (await rolePrompt({prompt: 'What is the ' + roleName + ' role?', channel, userId})).first();
        } else {
            return await guild.roles.create({
                data: {
                    name: (await messagePrompt({prompt: 'What name would you like the ' + roleName + ' role to have?', channel, userId}, 'string')).content,
                    color: color,
                }
            });
        }
    }
}
module.exports = InitBot;
