const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const { messagePrompt } = require('../../classes/prompt');
const Prompt = require('../../classes/prompt');

/**
 * StartAttend makes a new channel called #attend, or uses an existing channel of the user's choice, as the channel where the attend
 * command will be used by hackers.
 * @param existsChannel - boolean representing whether to use an existing channel(true) or new channel(false) 
 */
module.exports = class StartAttend extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'startatt',
            group: 'a_utility',
            memberName: 'initiate attend process',
            description: 'identifies/makes a channel to be used for !attend and notifies people',
            guildOnly: true,
        },
            {
                channelID: discordServices.adminConsoleChannel,
                channelMessage: 'This command can only be used in the admin console!',
                roleID: discordServices.roleIDs.adminRole,
                roleMessage: 'Hey there, the command !startatt is only available to Admins!',
            });
    }

    /**
     * If existsChannel is true, asks user to indicate the channel to use. Else asks user to indicate the category under which the
     * channel should be created, and then creates it. In both cases it will send an embed containing the instructions for hackers to 
     * check in.
     * @param {Discord.Message} message - message containing command
     */
    async runCommand(message) {
        var channel;

        let existsChannel = await Prompt.yesNoPrompt('Is there already a channel that exists that hackers will be using !attend in?', message.channel, message.author.id);

        if (existsChannel) {
            //ask user to mention channel to be used for !attend
            var channel = await Prompt.channelPrompt('Please mention the channel to be used for the !attend command. ', message.channel, message.author.id);
        } else {
            //ask user for category to create new attend channel under
            let categoryReply = await messagePrompt('What category do you want the new attend channel under? ', 'string', message.channel, message.author.id, 20);
            if (categoryReply == null) {
                return;
            }
            var categoryName = categoryReply.content;
            //create the channel
            let newChannel = await message.guild.channels.create('attend')
            // .then(newChannel => {
            let category = message.guild.channels.cache.find(c => c.name.toLowerCase() == categoryName.toLowerCase() && c.type == 'category');
            if (category) {
                newChannel.setParent(category.id);
            } else {
                message.channel.send('Invalid category name. Please try the command again.')
                .then((msg) => msg.delete({timeout: 3000}));
                return;
            }
            channel = newChannel;
        }
        //send embed with information and tagging hackers
        let attendEmoji = '🔋';

        const embed = new Discord.MessageEmbed()
            .setColor(discordServices.colors.embedColor)
            .setTitle('Hey there!')
            .setDescription('In order to indicate that you are participating, please react to this message with ' + attendEmoji)
            .addField('Do you need assistance?', 'Head over to the support channel and ping the admins!')
        let embedMsg = await channel.send('<@&' + discordServices.roleIDs.hackerRole + '>', {embed: embed});
        embedMsg.pin();
        embedMsg.react(attendEmoji);
        discordServices.blackList.set(channel.id, 1000);
        
        // reaction collector to attend hackers
        let embedMsgCollector = embedMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === attendEmoji);

        embedMsgCollector.on('collect', (reaction, user) => {
            let member = message.guild.member(user.id);

            // check if user needs to attend
            if (discordServices.checkForRole(member, discordServices.roleIDs.hackerRole) && 
                !discordServices.checkForRole(member, discordServices.roleIDs.attendeeRole)) {
                    discordServices.addRoleToMember(member, discordServices.roleIDs.attendeeRole)
                    discordServices.sendEmbedToMember(user, {
                        title: 'Attend Success!',
                        description: 'You have been marked as attending! Happy hacking!!!'
                    });
            } else {
                discordServices.sendEmbedToMember(member, {
                    title: 'Attend Error',
                    description: 'You do not need to attend, you are already attending or you are not a hacker!'
                }, true);
            }
        });
    }
}
