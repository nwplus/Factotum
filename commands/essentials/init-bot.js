// Discord.js commando requirements
const { Command, CommandoGuild } = require('discord.js-commando');
const Discord = require('discord.js');
const discordServices = require('../../discord-services');
const Prompt = require('../../classes/prompt');

// Command export
module.exports = class InitBot extends Command {
    constructor(client) {
        super(client, {
            name: 'init-bot',
            group: 'essentials',
            memberName: 'initialize the bot',
            description: 'Will start the bot given some information.',
            hidden: true,
        });
    }

    /**
     *  
     * @param {Discord.Message} message 
     */
    async run(message) {
        message.delete();

        // make sure the user had manage server permission
        if (!message.member.hasPermission('MANAGE_GUILD')) {
            message.reply('Only admins can use this command!').then(msg => msg.delete({timeout: 5000}));
        }

        const embedInfo = new Discord.MessageEmbed().setColor(discordServices.colors.embedColor)
            .setTitle('Hackabot Console')
            .setTimestamp()
            .setDescription('Bot information will be added here! You can make changes here as well!');

        // easy constants to use
        var channel = message.channel;
        const userId = message.author.id;
        /** @type {CommandoGuild} */
        const guild = message.guild;
        const everyoneRole = message.guild.roles.everyone;

        discordServices.sendMsgToChannel(channel, userId, 'Please follow the following simple instructions!\n If you cancel any of the prompts, the selected functionality will not be used, however, try not to cancel any prompts.', 60);

        // grab the admin role
        const adminRole = await this.askOrCreate('admin', channel, userId, guild, '#008369');
        await adminRole.setMentionable(true);

        // grab the staff role
        const staffRole = await this.askOrCreate('staff', channel, userId, guild, '#00D166');
        staffRole.setMentionable(true);
        staffRole.setHoist(true);
        staffRole.setPermissions(staffRole.permissions.missing(['VIEW_CHANNEL', 'MANAGE_EMOJIS', 'CHANGE_NICKNAME', 'MANAGE_NICKNAMES', 
            'KICK_MEMBERS', 'BAN_MEMBERS', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 
            'READ_MESSAGE_HISTORY', 'CONNECT', 'STREAM', 'SPEAK', 'PRIORITY_SPEAKER', 'USE_VAD', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS']));

        // create the admin channel package
        let adminConsole = await this.createAdminChannels(guild, adminRole, everyoneRole);
        await discordServices.sendMsgToChannel(channel, userId, 'The admin channels have been created successfully! <#' + discordServices.channelIDs.adminConsoleChannel + '>. Lets jump over there and continue yes?!', 60);
        
        // try giving the admins administrator perms
        try {
            if (!adminRole.permissions.has('ADMINISTRATOR')) adminRole.setPermissions(adminRole.permissions.missing(['ADMINISTRATOR']));
        } catch {
            discordServices.discordLog(guild, 'Was not able to give administrator privileges to the role <@&' + adminRole.id + '>. Please help me!')
        }

        // transition to the admin console
        var channel = adminConsole;
        await discordServices.sendMsgToChannel(channel, userId, 'I am over here!!! Lets continue!');
        const mainConsoleMsg = await channel.send(embedInfo);

        // get the regular member, staff and admin role and assign the correct permissions
        const memberRole = await this.askOrCreate('member', channel, userId, guild, '#006798');
        memberRole.setMentionable(false);

        // set discordServices roles
        discordServices.roleIDs.hackerRole = memberRole.id;
        discordServices.roleIDs.staffRole = staffRole.id;
        discordServices.roleIDs.adminRole = adminRole.id;

        
        // ask if verification will be used
        try {
            if (await Prompt.yesNoPrompt('Will you be using the verification service?', channel, userId)) {
                await this.setVerification(channel, userId, guild, everyoneRole);
                discordServices.sendMsgToChannel(channel, userId, 'The verification service has been set up correctly!', 60);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'Verification service was not set due to Prompt cancellation.', 10);
        }
        

        // ask if attendance will be used
        try {
            if (await Prompt.yesNoPrompt('Will you be using the attendance service?', channel, userId)) {
                guild.setCommandEnabled('startatt', true);
    
                const attendeeRole = await this.askOrCreate('attendee', channel, userId, guild, '#0099E1');
                discordServices.roleIDs.attendeeRole = attendeeRole.id;
                discordServices.sendMsgToChannel(channel, userId, 'The attendance service has been set up correctly!', 60);
            } else {
                // if attendance will not be used then set it to the same role ID as the regular member
                discordServices.roleIDs.attendeeRole = discordServices.roleIDs.hackerRole;
                discordServices.sendMsgToChannel(channel, userId, 'Attendance was not set up!', 60);
            }
        } catch (error) {
            discordServices.roleIDs.attendeeRole = discordServices.roleIDs.hackerRole;
            discordServices.sendMsgToChannel(channel, userId, 'Attendance was not set up due to Prompt cancellation.', 10);
        }


        // ask if the announcements will be used
        try {
            if (await Prompt.yesNoPrompt('Have firebase announcements been set up code-side? If not say no, or the bot will fail!', channel, userId)) {
                await this.setAnnouncements(channel, userId);
                discordServices.sendMsgToChannel(channel, userId, 'The announcements have been set up correctly!', 60);
            } else {
                discordServices.sendMsgToChannel(channel, userId, 'Announcements functionality was not set up.', 10);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'Announcements functionality was not set up due to a Prompt cancellation.', 10);
        }


        // ask if the stamps will be used
        try {
            if (await Prompt.yesNoPrompt('Will you be using the stamp service?', channel, userId)) {
                let numberOfStamps = await Prompt.numberPrompt('How many stamps do you want? This number is final!', channel, userId);

                for (let i = 0; i < numberOfStamps; i++) {
                    let role = await guild.roles.create({
                        data: {
                            name: 'Stamp Role #' + i,
                            hoist: true,
                            color: Math.floor(Math.random()*16777215).toString(16),
                        }
                    });
                    discordServices.stampRoles.set(i, role.id);
                }

                discordServices.sendMsgToChannel(channel, userId, 'The stamp roles have been created, you can change their name and/or color, but their stamp number is final!', 60);
            } else {
                discordServices.sendMsgToChannel(channel, userId, 'The stamp functionality was not set up.', 10);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'The stamp functionality will not be used due to prompt cancellation.', 10);
        }


        // bot support channel prompt
        await this.askForBotSupportChannel(channel, userId);


        // ask if the user will use the report functionality
        try {
            if (await Prompt.yesNoPrompt('Will you be using the report functionality?', channel, userId)) {
                let incomingReportChannel = await Prompt.channelPrompt('What channel should prompts be sent to? We recommend this channel be accessible to your staff.', channel, userId);
                discordServices.channelIDs.incomingReportChannel = incomingReportChannel.id;

                guild.setCommandEnabled('report', true);
                discordServices.sendMsgToChannel(channel, userId, 'The report command is available and reports will be sent to: <#' + incomingReportChannel.id + '>', 60);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'Report command will not be loaded due to prompt cancel.', 10);
        }


        // ask if the user wants to use the experimental !ask command
        try {
            if (await Prompt.yesNoPrompt('Do you want to let users use the experimental !ask command?', channel, userId)) {
                guild.setCommandEnabled('ask', true);
                discordServices.sendMsgToChannel(channel, userId, 'The ask command is now available to the server users.', 60);
            }
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'Ask command will not be loaded due to prompt cancel.', 10);
        }


        this.client.registry.groups.forEach((group, key, map) => {
            if (group.name.startsWith('a_')) guild.setGroupEnabled(group, true);
        });

        discordServices.sendMsgToChannel(channel, userId, 'The bot is set and ready to hack!', 10);
    }

    /**
     * Will ask the user for a channel to be used for the bot, cancellations are not allowed.
     * @param {Discord.TextChannel} channel 
     * @param {Discord.Snowflake} userId 
     * @async
     */
    async askForBotSupportChannel(channel, userId) {
        try {
            let botSupportChannel = await Prompt.channelPrompt('What channel can the bot use to contact users when DMs are not available?', channel, userId);
            discordServices.channelIDs.botSupportChannel = botSupportChannel.id;
        } catch (error) {
            channel.send('<@' + userId + '> You can not cancel this command, please try again!').then(msg => msg.delete({timeout: 15000}));
            await this.askForBotSupportChannel(channel, userId);
        }
    }

    /**
     * Will create the admin channels with the correct roles.
     * @param {Discord.Guild} guild 
     * @param {Discord.Role} adminRole 
     * @param {Discord.Role} everyoneRole 
     * @returns {Promise<Discord.TextChannel>} - the admin console channel
     */
    async createAdminChannels(guild, adminRole, everyoneRole) {
        let adminCategory = await guild.channels.create('Admins', {
            type: 'category',
            permissionOverwrites: [
                {
                    id: adminRole.id,
                    allow: 'VIEW_CHANNEL'
                },
                {
                    id: everyoneRole.id,
                    deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'CONNECT']
                }
            ]
        });

        let adminConsoleChannel = await guild.channels.create('console', {
            type: 'text',
            parent: adminCategory,
        });

        let adminLogChannel = await guild.channels.create('logs', {
            type: 'text',
            parent: adminCategory,
        });

        discordServices.channelIDs.adminConsoleChannel = adminConsoleChannel.id;
        discordServices.channelIDs.adminLogChannel = adminLogChannel.id;

        return adminConsoleChannel;
    }

    /**
     * Will set the verification process, and prep the server to use it.
     * @param {Discord.TextChannel} channel 
     * @param {Discord.Snowflake} userId 
     * @param {CommandoGuild} guild 
     * @param {Discord.Role} everyoneRole 
     */
    async setVerification(channel, userId, guild, everyoneRole) {
        guild.setCommandEnabled('verify', true);
        var guestRole;
        try {
            // ask for guest role
            guestRole = await this.askOrCreate('guest', channel, userId, guild, '#969C9F');
            guestRole.setMentionable(false);
            guestRole.setPermissions(0); // no permissions, that is how it works
        } catch (error) {
            discordServices.sendMsgToChannel(channel, userId, 'You need to give a guest role! Please try again', 10);
            return this.setVerification(channel, userId, guild, everyoneRole);
        }


        // change the everyone role permissions
        everyoneRole.setPermissions(0); // no permissions for anything like the guest role

        const isVerifiedRole = await guild.roles.create({
            data: {
                name: 'isVerified',
                permissions: ['VIEW_CHANNEL', 'CHANGE_NICKNAME', 'SEND_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY',
                    'CONNECT', 'SPEAK', 'STREAM', 'USE_VAD'],
                color: '#ae44eb',
            }
        });

        let welcomeCategory = await guild.channels.create('Welcome', {
            type: 'category',
            permissionOverwrites: [
                {
                    id: everyoneRole.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                },
                {
                    id: isVerifiedRole.id,
                    deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                },
            ],
        });

        let welcomeChannel = await guild.channels.create('welcome', {
            type: 'text',
            parent: welcomeCategory,
            permissionOverwrites: [
                {
                    id: everyoneRole.id,
                    allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
                    deny: ['SEND_MESSAGES'],
                }
            ],
        });

        let welcomeChannelSupport = await guild.channels.create('welcome-support', {
            type: 'text',
            parent: welcomeCategory,
        });

        const embed = new Discord.MessageEmbed().setTitle('Welcome to the ' + guild.name + ' Discord server!')
            .setDescription('In order to verify that you have registered for ' + guild.name + ', please respond to the bot (me) via DM!')
            .addField('Do you need assistance?', 'Head over to the welcome-support channel and ping the admins!')
            .setColor(discordServices.colors.embedColor);
        welcomeChannel.send(embed).then(msg => msg.pin());

        discordServices.channelIDs.welcomeSupport = welcomeChannelSupport.id;
        discordServices.channelIDs.welcomeChannel = welcomeChannel.id;
        discordServices.roleIDs.guestRole = guestRole.id;
        discordServices.roleIDs.isVerifiedRole = isVerifiedRole.id;
    }

    /**
     * Will set the announcements from firebase.
     * @param {Discord.TextChannel} channel 
     * @param {Discord.Snowflake} userId 
     */
    async setAnnouncements(channel, userId) {
        try {
            let announcementChannel = await Prompt.channelPrompt('What channel should announcements be sent to? If you don\'t have it, create it and come back, do not cancel.');

            // var to mark if gotten documents once
            var isInitState = true;

            // start query listener for announcements
            nwFirebase.firestore().collection('Hackathons').doc('nwHacks2021').collection('Announcements').onSnapshot(querySnapshot => {
                // exit if we are at the initial state
                if (isInitState) {
                    isInitState = false;
                    return;
                }

                querySnapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const embed = new Discord.MessageEmbed()
                            .setColor(discordServices.colors.announcementEmbedColor)
                            .setTitle('Announcement')
                            .setDescription(change.doc.data()['content']);

                        announcementChannel.send('<@&' + discordServices.roleIDs.attendeeRole + '>', { embed: embed });
                    }
                });
            });
        } catch (error) {
            channel.send('<@' + userId + '> The announcement feature was canceled!').then(msg => msg.delete({ timeout: 60000 }));
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
        let hasRole = await Prompt.yesNoPrompt('Have you created the ' + roleName + ' role? You can go ahead and create it if you wish, or let me do the hard work.', channel, userId);

        if (hasRole) {
            return await Prompt.rolePrompt('What is the ' + roleName + ' role?', channel, userId);
        } else {
            return await guild.roles.create({
                data: {
                    name: (await Prompt.messagePrompt('What name would you like the ' + roleName + ' role to have?', 'string', channel, userId)).content,
                    color: color,
                }
            });
        }
    }
}