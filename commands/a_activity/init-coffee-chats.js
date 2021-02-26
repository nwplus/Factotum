const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Activity = require('../../classes/activities/activity');
const ActivityCommand = require('../../classes/activities/activity-command');

// Command export
module.exports = class InitCoffeeChats extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'init-coffee-chats',
            group: 'a_activity',
            memberName: 'initialize coffee chat functionality for activity',
            description: 'Will initialize the coffee chat functionality for the given workshop.',
            guildOnly: true,
            args: [
                
                {
                    key: 'numOfGroups',
                    prompt: 'number of groups to participate in coffee chat',
                    type: 'integer'
                },
            ],
        });
    }

    /**
     * Required class by children, should contain the command code.
     * @param {Message} message - the message that has the command
     * @param {Activity} activity - the activity for this activity command
     */
    async activityCommand(botGuild, message, activity, { numOfGroups }) {

        let joinActivityChannel = await activity.makeCoffeeChats(numOfGroups);

        // reaction to use
        var emoji = '⛷️';

        // send embed and react with emoji
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('Join the activity!')
            .setDescription('If you want to join this activity, please react to this message with ' + emoji +' and follow my instructions!\n If the emojis are not working' +
            ' it means the activity is full. Check the activity text channel for other activity times!');
        var joinMsg = await joinActivityChannel.send(msgEmbed);
        await joinMsg.react(emoji);

        // reactor collector and its filter
        const emojiFilter = (reaction, user) => reaction.emoji.name === emoji && user.id != joinMsg.author.id;
        const emojiCollector = joinMsg.createReactionCollector(emojiFilter, {max: numOfGroups});

        emojiCollector.on('collect', async (reaction, user) => {
            await this.createGroup(user, joinActivityChannel, activity);
        });

        // report success of coffee chat creation
        discordServices.replyAndDelete(message,'Activity named: ' + activity.name + ' now has coffee chat functionality.');
    }


    /**
     * Will create a group for the coffee chats to firebase.
     * @param {Discord.User} user - the user that created the group
     * @param {Discord.TextChannel} joinActivityChannel - the text channel where the user will send group members
     * @param {Activity} activity - the activity
     * @private
     */
    async createGroup(user, joinActivityChannel, activity) {
        // filter for message await
        const msgFilter = m => m.author.id === user.id;

        // send prompt and expect a response within 20 seconds!
        var prompt = await joinActivityChannel.send('<@' + user.id + '> Please mention (tag) all your group members in one message and send it here! You have 20 seconds.');

        joinActivityChannel.awaitMessages(msgFilter, { max: 1, time: 20000, errors: ['time'] }).then(msgs => {
            var groupMsg = msgs.first();

            var group = groupMsg.mentions.members;

            var groupMembers = [];

            // add user and group users to list
            groupMembers.push(user.username);
            group.each(member => {
                groupMembers.push(member.user.username);
            });

            activity.teams.push({members: groupMembers});

            prompt.delete();
            joinActivityChannel.send('<@' + user.id + '> Your team has been added to the activity! Make sure you follow the instructions in the main channel.').then(msg => {
                msg.delete({ timeout: 5000 });
                groupMsg.delete({ timeout: 5000 });
            });

        }).catch(error => {
            prompt.delete();
            joinActivityChannel.send('<@' + user.id + '> Time has run out! Please try again!').then(msg => msg.delete({timeout: 3000}));
        });
    }
};