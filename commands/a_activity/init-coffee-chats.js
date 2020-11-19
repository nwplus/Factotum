// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseActivity = require('../../firebase-services/firebase-services-activities');
const firebaseCoffeeChats = require('../../firebase-services/firebase-services-coffeechats');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class InitCoffeeChats extends Command {
    constructor(client) {
        super(client, {
            name: 'initcc',
            group: 'a_activity',
            memberName: 'initialize coffee chat funcitonality for activity',
            description: 'Will initialize the coffee chat functionality for the given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
                {
                    key: 'numOfGroups',
                    prompt: 'number of groups to participate in coffee chat',
                    type: 'integer'
                }
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName, numOfGroups}) {
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
        
        // get activity category
        var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

        // if no activity category then report failure and return
        if (category === undefined) {
            discordServices.replyAndDelete(message,'The activity named: ' + activityName +', does not exist! No action taken.');
            return;
        }

        // initialize firebase fields
        firebaseCoffeeChats.initCoffeeChat(activityName);

        await discordServices.addVoiceChannelsToActivity(activityName, numOfGroups, category, message.guild.channels);

        // add group creation text channel
        var joinActivityChannel = await message.guild.channels.create(activityName + '-join-activity', {
            topic: 'This channel is only intended to add your team to the activity list! Please do not use it for anything else!',
            parent: category,
        });

        // reaction to use
        var emoji = '⛷️';

        // send embed and react with emoji
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Join the activity!')
            .setDescription('If you want to join this activity, please react to this message with ' + emoji +' and follow my instructions!\n If the emojis are not working' +
            ' it means the activity is full. Check the activity text channel for other activity times!');
        var joinMsg = await joinActivityChannel.send(msgEmbed);
        await joinMsg.react(emoji);

        // reactor collector and its filter
        const emojiFilter = (reaction, user) => reaction.emoji.name === emoji && user.id != joinMsg.author.id;
        const emojiCollector = joinMsg.createReactionCollector(emojiFilter, {max: numOfGroups});

        emojiCollector.on('collect', async (reaction, user) => {
            await this.createGroup(user, joinActivityChannel, activityName);
        });

        // report success of coffee chat creation
        discordServices.replyAndDelete(message,'Activity named: ' + activityName + ' now has coffee chat functionality.');
    }

    // will ask for group users and add the group to the coffee chat
    async createGroup(user, joinActivityChannel, activityName) {
        // filter for message await
        const msgFilter = m => m.author.id === user.id;

        // send promt and expect a response within 20 seconds!
        var promt = await joinActivityChannel.send('<@' + user.id + '> Please mention (tag) all your group members in one message and send it here!');

        joinActivityChannel.awaitMessages(msgFilter, { max: 1, time: 20000, errors: ['time'] }).then(msgs => {
            var groupMsg = msgs.first();

            var group = groupMsg.mentions.members;

            var groupMembers = [];

            // add user and group users to list
            groupMembers.push(user.username);
            group.each(member => {
                groupMembers.push(member.user.username);
            });

            // add group to activity list
            firebaseCoffeeChats.addGroup(activityName, groupMembers);

            promt.delete();
            joinActivityChannel.send('<@' + user.id + '> Your team has been added to the activity! Make sure you follow the instructions in the main channel.').then(msg => {
                msg.delete({ timeout: 5000 });
                groupMsg.delete({ timeout: 5000 });
            });

        });
    }
};