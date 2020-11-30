// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class InitAmongUs extends Command {
    constructor(client) {
        super(client, {
            name: 'initau',
            group: 'a_activity',
            memberName: 'initialize among us funcitonality for activity',
            description: 'Will initialize the among us functionality for the given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
                {
                    key: 'numOfChannels',
                    prompt: 'number of groups to participate in coffee chat',
                    type: 'integer',
                    default: 3,
                },
                {
                    key: 'categoryChannelKey',
                    prompt: 'snowflake of the activiti\'s category',
                    type: 'string',
                    default: '',
                },
                {
                    key: 'textChannelKey',
                    prompt: 'snowflake of the general text channel for the activity',
                    type: 'string',
                    default: '',
                },
                {
                    key: 'voiceChannelKey',
                    prompt: 'snowflake of the general voice channel for the activity',
                    type: 'string',
                    default: '',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName, numOfChannels, categoryChannelKey, textChannelKey, voiceChannelKey}) {
        discordServices.deleteMessage(message);
        
        // make sure command is only used in the admin console
        if (! discordServices.isAdminConsole(message.channel)) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;   
        }
        // only memebers with the staff tag can run this command!
        if (!(await discordServices.checkForRole(message.member, discordServices.staffRole))) {
            discordServices.replyAndDelete(message, 'You do not have permision for this command, only staff can use it!');
            return;             
        }
        
        // get category
        if (categoryChannelKey === '') {
            var category = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name.endsWith(activityName));
        } else {
            var category = message.guild.channels.resolve(categoryChannelKey);
        }


        // if no activity category then report failure and return
        if (category === undefined) {
            discordServices.replyAndDelete(message,'The activity named: ' + activityName +', does not exist! No action taken.');
            return;
        }

        // add group creation text channel
        var joinActivityChannel = await message.guild.channels.create(activityName + '-join-activity', {
            topic: 'This channel is only intended for you to gain access to other channels! Please do not use it for anything else!',
            parent: category,
        });

        // add game code channel
        var gameCodesChannel = await message.guild.channels.create(activityName + '-game-codes', {
            topic: 'This channel is only intended to send game codes for others to join!',
            parent: category,
            permissionOverwrites: [
                {
                    id: discordServices.attendeeRole,
                    deny: ['VIEW_CHANNEL'],
                },
            ]
        });

        // add voice channels
        await discordServices.addVoiceChannelsToActivity(activityName, numOfChannels, category, message.guild.channels, 12);

        // reaction to use
        var emoji = '🚗';

        // send embed and react with emoji
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Join the activity!')
            .setDescription('Welcome to the Among Us Mini-Event. We have set up some voice channels for hackers to meet each other and play some Among Us. Here is how its going to work:\n' +
            '1. Accept rules listed below by clicking the 🚗 emoji.\n' +
            '2. Join a voice channel with your friends or by yourself.\n' +
            '3. You can post your game code with the voice channel name to the game code text channel (e.g "game ASDFGG in voice channel 1").\n' +
            '4. There will be max 12 people per voice channel.\n\n' +
            'Rules :\n' +
            '1. Please be respectful, remember this is just a game and the goal is to have fun and meet some fellow hackers!\n' +
            '2. Please do not leave games mid-way through.\n' +
            '3. Please do not spam the game code text channel, only send game codes!\n');
        var joinMsg = await joinActivityChannel.send(msgEmbed);
        await joinMsg.react(emoji);

        // reactor collector and its filter
        const emojiFilter = (reaction, user) => reaction.emoji.name === emoji && user.id != joinMsg.author.id;
        const emojiCollector = joinMsg.createReactionCollector(emojiFilter);

        emojiCollector.on('collect', async (reaction, user) => {
            this.gainAccess(user, category);
        });

        // report success of coffee chat creation
        discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' now has among us functionality.');
    }

    // will let the user see all the available channels in the category
    gainAccess(user, category) {
        category.children.each(channel => channel.updateOverwrite(user, {
            'VIEW_CHANNEL' : true,
        }));
    }
};