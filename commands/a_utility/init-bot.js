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

        // ask if verification will be used
        let isVerification = await Prompt.yesNoPrompt('Will you be using the verification service?', channel, userId);

        if (isVerification) {
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
                .setDescription('In order to verify that you have registered for ' + guild.name +', please respond to the bot (me) via DM!')
                .addField('Do you need assistance?', 'Head over to the welcome-support channel and ping the admins!')
                .setColor(discordServices.colors.embedColor);
            welcomeChannel.send(embed).then(msg => msg.pin());

            discordServices.channelIDs.welcomeSupport = welcomeChannelSupport.id;
            discordServices.channelIDs.welcomeChannel = welcomeChannel.id;
            discordServices.roleIDs.guestRole = guestRole.id;
            // todo add the isVerified role to discord services
        }

        let isAnnouncementsSet = await Prompt.yesNoPrompt('Have firebase announcements been set code-side? If not say no, or the bot will fail!');

        if (isAnnouncementsSet) {
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
                            
                                announcementChannel.send('<@&' + discordServices.roleIDs.attendeeRole + '>', {embed: embed});
                        }
                    });
                });
            } catch (error) {
                channel.send('<@' + userId + '> The announcement feature was canceled!').then(msg => msg.delete({timeout: 60000}));
            }
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