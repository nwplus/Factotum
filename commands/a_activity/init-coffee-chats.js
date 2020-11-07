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
        if (discordServices.isAdminConsole(message.channel) === true) {
            // only memebers with the Staff tag can run this command!
            if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
                
                // get category
                var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

                // make sure the workshop excists
                if (category != undefined) {
                    
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

                    // embed to send and send to new channel
                    const msgEmbed = new Discord.MessageEmbed()
                        .setColor(discordServices.embedColor)
                        .setTitle('Join the activity!')
                        .setDescription('If you want to join this activity, please react to this message with ' + emoji +' and follow my instructions!\n If the emojis are not working' +
                        ' it means the activity is full. Check the activity text channel for other activity times!');
                    var joinMsg = await joinActivityChannel.send(msgEmbed);

                    // react to message
                    await joinMsg.react(emoji);

                    // filter for emoji collector, not bot
                    const emojiFilter = (reaction, user) => reaction.emoji.name === emoji && user.id != joinMsg.author.id;

                    // set max number of emojis to num of groups
                    const emojiCollector = joinMsg.createReactionCollector(emojiFilter, {max: numOfGroups});

                    emojiCollector.on('collect', async (reaction, user) => {
                        // ask for other users in the group!

                        // filter for message await
                        const msgFilter = m => m.author.id === user.id;

                        // send promt and expect a response within 20 seconds!
                        var promt = await joinActivityChannel.send('<@' + user.id + '> Please mention (tag) all your group members in one message and send it here!');

                        joinActivityChannel.awaitMessages(msgFilter, {max: 1, time: 20000, errors: ['time']}).then( msgs => {
                            var groupMsg = msgs.first();

                            var group = groupMsg.mentions.members;

                            var groupMembers = [];

                            // add user and group users to list
                            groupMembers.push(user.username);
                            group.each(member => {
                                groupMembers.push(member.user.username);
                            })

                            // add group to activity list
                            firebaseCoffeeChats.addGroup(activityName, groupMembers);

                            promt.delete();
                            joinActivityChannel.send('<@' + user.id + '> Your team has been added to the activity! Make sure you follow the instructions in the main channel.').then(msg => {
                                msg.delete({timeout: 5000});
                                groupMsg.delete({timeout: 5000});
                            });
                            
                        });
                    });

                    // report success of coffee chat creation
                    message.reply('Activity named: ' + activityName + ' now has coffee chat functionality.');
                } else {
                    // if the category does not excist
                    message.reply('The activity named: ' + activityName +', does not exist! No action taken.');
                }
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
        }
    }

};