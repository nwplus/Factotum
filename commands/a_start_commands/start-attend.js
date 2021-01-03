const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const { messagePrompt } = require('../../classes/prompt');

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
            args: [
                {
                    key: 'existsChannel',
                    prompt: 'Is there already a channel that exists that hackers will be using !attend in? Type "true" for yes and "false" for no.',
                    type: 'boolean',
                },
            ],
        },
            {
                channelID: discordServices.adminConsoleChannel,
                channelMessage: 'This command can only be used in the admin console!',
                roleID: discordServices.adminRole,
                roleMessage: 'Hey there, the command !startatt is only available to Admins!',
            });
    }

    /**
     * If existsChannel is true, asks user to indicate the channel to use. Else asks user to indicate the category under which the
     * channel should be created, and then creates it. In both cases it will send an embed containing the instructions for hackers to 
     * check in.
     * @param {Discord.Message} message - message containing command
     * @param {boolean} existsChannel - boolean representing whether to use an existing channel(true) or new channel(false) 
     */
    async runCommand(message, { existsChannel }) {
        var channel;
        if (existsChannel) {
            //ask user to mention channel to be used for !attend
            var channelMention = await messagePrompt('Please mention the channel to be used for the !attend command. ', 'string', message.channel, message.author.id, 20);
            if (channelMention == null) {
                return;
            }
            channel = channelMention.mentions.channels.first();
            if (channel == null) {
                message.channel.send('No channels mentioned. Please try the command again.')
                .then((msg) => msg.delete({timeout: 3000}));
                return;
            }
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
        const embed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Hey there!')
            .setDescription('In order to indicate that you are participating at nwHacks 2021, please send the **!attend** command to this channel followed by the email you used to sign up. \nFor example: !attend example@gmail.com')
            .addField('Do you need assistance?', 'Head over to the support channel and ping the admins!')
            .addField('Worry Not! Your email will be kept private!', 'All messages to this channel are automatically removed!');
        await channel.send('<@&' + discordServices.hackerRole + '>', {embed: embed}).then(msg => msg.pin());
        discordServices.blackList.set(channel.id, 5000);
        this.client.registry.commands.get('attend').setEnabledIn(message.guild, true);
    }
}
