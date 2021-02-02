// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const Discord = require('discord.js');
const discordServices = require('../../discord-services');
const Prompt = require('../../classes/prompt');

// Command export
module.exports = class InitBot extends Command {
    constructor(client) {
        super(client, {
            name: 'unknown-command',
            group: 'init-bot',
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

        let embedInfo = new Discord.MessageEmbed().setColor(discordServices.colors.embedColor)
            .setTitle('Hackabot Setup')
            .setTimestamp()
            .setDescription('Please follow the following simple instructions!');
        
        message.channel.send(embedInfo);

        // easy constants to use
        const channel = message.channel;
        const userId = message.author.id;
        const guild = message.guild;
        const everyoneRole = message.guild.roles.everyone;

        // get the regular member, staff and admin role

        const memberRole = await this.askOrCreate('member', channel, userId, guild, '#006798');
        memberRole.setMentionable(false);
        
        const staffRole = await this.askOrCreate('staff', channel, userId, guild, '#00D166');
        staffRole.setMentionable(true);
        staffRole.setHoist(true);
        staffRole.setPermissions(staffRole.permissions.missing(['VIEW_CHANNEL', 'MANAGE_EMOJIS', 'CHANGE_NICKNAME', 'MANAGE_NICKNAMES', 
            'KICK_MEMBERS', 'BAN_MEMBERS', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 
            'READ_MESSAGE_HISTORY', 'CONNECT', 'STREAM', 'SPEAK', 'PRIORITY_SPEAKER', 'USE_VAD', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS']));

        const adminRole = await this.askOrCreate('admin', channel, userId, guild, '#008369');
        adminRole.setMentionable(true);
        adminRole.setPermissions(adminRole.permissions.missing(['ADMINISTRATOR']));

        discordServices.roleIDs.hackerRole = memberRole.id;
        discordServices.roleIDs.staffRole = staffRole.id;
        discordServices.roleIDs.adminRole = adminRole.id;

        // ask if verification will be used
        if (await Prompt.yesNoPrompt('Will you be using the verification service?', channel, userId)) {
            await this.setVerification(channel, userId, guild, everyoneRole);
            channel.send('<@' + userId + '> The verification service has been set up correctly!').then(msg => msg.delete({timeout: 60000}));
        }

        // ask if attendance will be used
        if (await Prompt.yesNoPrompt('Will you be using the attendance service?', channel, userId)) {
            this.client.registry.registerCommand(this.client.registry.commands.find('startatt'));

            const attendeeRole = await this.askOrCreate('attendee', channel, userId, guild, '#0099E1');
            discordServices.roleIDs.attendeeRole = attendeeRole.id;
            channel.send('<@' + userId + '> The attendance service has been set up correctly!').then(msg => msg.delete({timeout: 60000}));
        } else {
            // if attendance will not be used then set it to the same role ID as the regular member
            discordServices.roleIDs.attendeeRole = discordServices.roleIDs.hackerRole;
        }

        // ask if the announcements will be used
        if (await Prompt.yesNoPrompt('Have firebase announcements been set up code-side? If not say no, or the bot will fail!')) {
            await this.setAnnouncements(channel, userId);
            channel.send('<@' + userId + '> The announcements have been set up correctly!').then(msg => msg.delete({timeout: 60000}));
        }

        // ask if the stamps will be used
        if (await Prompt.yesNoPrompt('Will you be using the stamp service?', channel, userId)) {
            let numberOfStamps = await Prompt.numberPrompt('How many stamps do you want? This number is final!', channel, userId);

            for (let i = 0; i < numberOfStamps; i++) {
                let role = await guild.roles.create({
                    data: {
                        name: 'Stamp Role #' + i,
                        hoist: true,
                    }
                });
                discordServices.stampRoles.set(i, role.id);
            }

            channel.send('<@' + userId + '> The stamp roles have been created, you can change their name and/or color, but their stamp number is final!').then(msg => msg.delete({timeout: 60000}));
        }

        // create the admin channel package
        await this.createAdminChannels(guild, adminRole, staffRole);
        channel.send('<@' + userId + '> The admin channels have been created successfully! <#' + discordServices.channelIDs.adminConsolChannel + '>').then(msg => msg.delete({timeout: 60000}));
        
        // bot support channel prompt
        let botSupportChannel = await Prompt.channelPrompt('What channel can the bot use to contact users when DMs are not available?', channel, userId);
        discordServices.channelIDs.botSupportChannel = botSupportChannel.id;

        // ask if the user will use the report functionality
        if (await Prompt.yesNoPrompt('Will you be using the report functionality?', channel, userId)) {
            let incomingReportChannel = await Prompt.channelPrompt('What channel should prompts be sent to? We recommend this channel be accessible to your staff.');
            discordServices.channelIDs.incomingReportChannel = incomingReportChannel.id;

            this.client.registry.registerCommand(this.client.registry.commands.find('report'));
        }

        // ask if the user wants to use the experimental !ask command
        if (await Prompt.yesNoPrompt('Do you want to let users use the experimental !ask command?', channel, userId)) {
            this.client.registry.registerCommand(this.client.registry.commands.find('ask'));
        }
    }

    /**
     * Will create the admin channels with the correct roles.
     * @param {Discord.Guild} guild 
     * @param {Discord.Role} adminRole 
     * @param {Discord.Role} staffRole 
     */
    async createAdminChannels(guild, adminRole, staffRole) {
        let adminCategory = await guild.channels.create('Admins', {
            type: 'category',
            permissionOverwrites: [
                {
                    id: adminRole.id,
                    allow: 'VIEW_CHANNEL'
                },
                {
                    id: staffRole.id,
                    deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'CONNECT']
                },
                {
                    id: discordServices.roleIDs.isVerifiedRole,
                    deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'CONNECT']
                }
            ]
        });

        let adminConsolChannel = await guild.channels.create('console', {
            type: 'text',
            parent: adminCategory,
        });

        let adminLogChannel = await guild.channels.create('logs', {
            type: 'text',
            parent: adminCategory,
        });

        discordServices.channelIDs.adminConsolChannel = adminConsolChannel.id;
        discordServices.channelIDs.adminLogChannel = adminLogChannel.id;
    }

    /**
     * Will set the verification process, and prep the server to use it.
     * @param {Discord.TextChannel} channel 
     * @param {Discord.Snowflake} userId 
     * @param {Discord.Guild} guild 
     * @param {Discord.Role} everyoneRole 
     */
    async setVerification(channel, userId, guild, everyoneRole) {
        this.client.registry.registerCommand(this.client.registry.commands.find('verify'));

        // ask for guest role
        const guestRole = await this.askOrCreate('guest', channel, userId, guild, '#969C9F');
        guestRole.setMentionable(false);
        guestRole.setPermissions(0); // no permissions, that is how it works


        // change the everyone role permissions
        everyoneRole.setPermissions(0); // no permissions for anything like the guest role

        const isVerifiedRole = await guild.roles.create({
            data: {
                name: 'isVerified',
                permissions: ['VIEW_CHANNEL', 'CHANGE_NICKNAME', 'SEND_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY',
                    'CONNECT', 'SPEAK', 'STREAM', 'USE_VAD']
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
                    deny: ['SEND_MESSAGES']
                }
            ],
        });

        let welcomeChannelSupport = await guild.channels.create('welcome-support', {
            type: 'text',
            parent: welcomeCategory,
        });

        const embed = new Discord.MessageEmbed.setTitle('Welcome to the ' + guild.name + ' Discord server!')
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