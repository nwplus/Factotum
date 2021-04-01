const PermissionCommand = require('../../classes/permission-command');
const { checkForRole, sendEmbedToMember } = require('../../discord-services');
const { MessageEmbed, Message } = require('discord.js');
const Verification = require('../../classes/verification');
const BotGuildModel = require('../../classes/bot-guild');
const { StringPrompt, SpecialPrompt, ChannelPrompt } = require('advanced-discord.js-prompts');

/**
 * StartAttend makes a new channel called #attend, or uses an existing channel of the user's choice, as the channel where an embed 
 * is sent for users to react and get attend. Users don't need to send any information to attend.
 * @category Commands
 * @subcategory Verification
 * @extends PermissionCommand
 * @guildonly
 */
class StartAttend extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'start-attend',
            group: 'attendance',
            memberName: 'initiate attend process',
            description: 'identifies/makes a channel to be used for !attend and notifies people',
            guildOnly: true,
        },
        {
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'This command can only be used in the admin console!',
            role: PermissionCommand.FLAGS.ADMIN_ROLE,
            roleMessage: 'Hey there, the command !start-attend is only available to Admins!',
        });
    }

    /**
     * If existsChannel is true, asks user to indicate the channel to use. Else asks user to indicate the category under which the
     * channel should be created, and then creates it. In both cases it will send an embed containing the instructions for hackers to 
     * check in.
     * @param {BotGuildModel} botGuild
     * @param {Message} message - message containing command
     */
    async runCommand(botGuild, message) {
        var channel;

        // register the attend command just in case its needed
        message.guild.setCommandEnabled('attend', true);

        try {
            let existsChannel = await SpecialPrompt.boolean({prompt: 'Is there already a channel that exists that hackers will be using !attend in?', channel: message.channel, userId: message.author.id, cancelable: true});

            if (existsChannel) {
                //ask user to mention channel to be used for !attend
                channel = await ChannelPrompt.single({prompt: 'Please mention the channel to be used for the !attend command. ', channel: message.channel, userId: message.author.id, cancelable: true});
            } else {
                //ask user for category to create new attend channel under
                let categoryReply = await StringPrompt.single({prompt: 'What category do you want the new attend channel under? ', channel: message.channel, userId: message.author.id, cancelable: true});
                
                var categoryName = categoryReply.content;


                let category = message.guild.channels.cache.find(c => c.type == 'category' && c.name.toLowerCase() == categoryName.toLowerCase());
                if (!category) {
                    message.channel.send('Invalid category name. Please try the command again.')
                        .then((msg) => msg.delete({timeout: 3000}));
                    return;
                }

                //create the channel
                channel = await message.guild.channels.create('attend', {
                    parent: category,
                    topic: 'Channel to attend the event!',
                });
            }
        } catch (error) {
            message.channel.send('<@' + message.author.id + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        channel.updateOverwrite(botGuild.roleIDs.everyoneRole, { SEND_MESSAGES: false });

        //send embed with information and tagging hackers
        let attendEmoji = '🔋';

        const embed = new MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('Hey there!')
            .setDescription('In order to indicate that you are participating, please react to this message with ' + attendEmoji)
            .addField('Do you need assistance?', 'Head over to the support channel and ping the admins!');
        let embedMsg = await channel.send('<@&' + botGuild.roleIDs.memberRole + '>', {embed: embed});
        embedMsg.pin();
        embedMsg.react(attendEmoji);
        botGuild.blackList.set(channel.id, 1000);
        botGuild.save();
        
        // reaction collector to attend hackers
        let embedMsgCollector = embedMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === attendEmoji);

        embedMsgCollector.on('collect', (reaction, user) => {
            let member = message.guild.member(user.id);

            // check if user needs to attend
            if (!checkForRole(member, botGuild.attendance.attendeeRoleID)) {
                Verification.attend(member, botGuild);
            } else {
                sendEmbedToMember(member, {
                    title: 'Attend Error',
                    description: 'You do not need to attend, you are already attending or you are not a hacker!'
                }, true);
            }
        });
    }
}
module.exports = StartAttend;
