// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Activity = require('../../classes/activity');
const ActivityCommand = require('../../classes/activity-command');

// Command export
module.exports = class InitAmongUs extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'initau',
            group: 'a_activity',
            memberName: 'initialize among us funcitonality for activity',
            description: 'Will initialize the among us functionality for the given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'numOfChannels',
                    prompt: 'number of groups to participate in coffee chat',
                    type: 'integer',
                    default: 3,
                },
            ],
        });
    }


    /**
     * Required class by children, should contain the command code.
     * @param {Message} message - the message that has the command
     * @param {Activity} activity - the activity for this activity command
     */
    async activityCommand(message, activity, { numOfChannels}) {

        let joinActivityTextChannel = await activity.makeAmongUs(numOfChannels);

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
        var joinMsg = await joinActivityTextChannel.send(msgEmbed);
        joinMsg.pin();
        await joinMsg.react(emoji);

        // reactor collector and its filter
        const emojiFilter = (reaction, user) => reaction.emoji.name === emoji && user.id != joinMsg.author.id;
        const emojiCollector = joinMsg.createReactionCollector(emojiFilter);

        emojiCollector.on('collect', async (reaction, user) => {
            this.gainAccess(user, category);
        });

        // report success of coffee chat creation
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' now has among us functionality.');
    }

    /**
     * Gives a user full acccess to the category, that is, all its children!
     * @param {Discord.User} user - the user give access to
     * @param {Discord.CategoryChannel} category - the category to give access to
     */
    gainAccess(user, category) {
        category.children.each(channel => channel.updateOverwrite(user, {
            'VIEW_CHANNEL' : true,
        }));
    }
};