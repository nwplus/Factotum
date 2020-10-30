// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class StartBoothing extends Command {
    constructor(client) {
        super(client, {
            name: 'startb',
            group: 'a_boothing',
            memberName: 'start boothing',
            description: 'Will send a message where hackers can react to to enter the wait list.',
            guildOnly: true,
            args: [],
        });
    }

    // Run function -> command body
    async run(message) {
        message.delete();
        // make sure command is only used in the boothing-wait-list channel
        if (message.channel.name === 'boothing-wait-list') {
            // only memebers with the Attendee tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.staffRole)) {
                
                // message to send describing the different emojis
                const textEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.embedColor)
                    .setTitle('Sponsor Boothing')
                    .setDescription('Welcome to our sponsor booth! Please react to one of the emojis below to get started!')
                    .addField('Join Wait List Alone', 'If you want to join the wait list by yourself please react to ' + ':sunglasses:')
                    .addField('Joine Wait List with Group', 'If you want to join the wait list with a group of friends, please react to ' + ':family_mwgb:' + ' and follow the promts.');

                var msg = await message.channel.send(textEmbed);
                
                // react the emojis
                await msg.react('😎');
                await msg.react('👨‍👩‍👦‍👦');

                // filter to be used for emoji collector
                const filter = (reaction, user) => {
                    return reaction.emoji.name === '😎' || reaction.emoji.name === '👨‍👩‍👦‍👦';
                };
                
                // collector will run forever since no time limit set
                const collector = msg.createReactionCollector(filter);

                // run when something is collected
                collector.on('collect', async (reaction, user) => {
                    // if bot then exit
                    if (user.id != msg.author.id) {
                        // grab username of member to join wait list
                        var username = user.username;
                        
                        // need an empty list for group
                        var usernameList = [];

                        // if reaction is of group ask for group members
                        if (reaction.emoji.name === '👨‍👩‍👦‍👦') {
                            await message.channel.send('<@' + user.id + '> Please tag all your group members in a message!').then(async msg => {
                                // filter for message collector, only from this user
                                const msgFilter = m => m.author.id === user.id;
                                
                                await msg.channel.awaitMessages(msgFilter, {max: 1}).then(ms => {
                                    // given a list of messages, so grab firts
                                    var m = ms.first();
                                    // grab all the mentions in the message
                                    var members = m.mentions.members;
                                    members.each(mem => usernameList.push(mem.user.username));

                                    // remove messages
                                    m.delete();
                                    msg.delete();
                                })
                            });
                        }

                        var status = await firebaseServices.addToWaitList(username, usernameList);

                        // If the user is alredy in the waitlist then tell him that
                        if (status === firebaseServices.status.HACKER_IN_USE) {
                            discordServices.sendMessageToMember(user, 'Hey there! It seems you are already on the wait list, if you would like to ' +
                            'know your spot please run the !requestposition command right here!');
                        } else {
                            // get number of hackers in wait list
                            var number = await firebaseServices.numberInWaitList();
                            
                            // message to be sent to hacker
                            const dmEmbed = new Discord.MessageEmbed()
                                .setColor(discordServices.embedColor)
                                .setTitle('Sponsor Boothing Wait List')
                                .setDescription('Hey there! We got you singed up to talk to a sponsor! Sit tight in the voice channel. If you ' +
                                'are not in the voice channel when its your turn you will be skipped, and we do not want that to happen!')
                                .addField('Wait list position', 'You are number: ' + number + ' in the wait list.')
                                .addField('!position', 'Command you can call in this DM to get your spot in the wait list.')
                                .addField('Remove from Wait List', 'If you want to be removed from the wait list please react this message with 🚫.');
                            
                            // send message to hacker and react with emoji 
                            var dm = await discordServices.sendMessageToMember(user, dmEmbed);
                            await dm.react('🚫');
                            
                            // filter for emoji to remove from wait list
                            const dmFilter = (reaction, sr) => {
                                return reaction.emoji.name === '🚫' && sr.id === user.id;
                            };

                            // await reaction to remove from wait list
                            dm.awaitReactions(dmFilter, {max: 1})
                                .then(async collected => {
                                    // remove original dm message
                                    dm.delete({timeout: 3000})

                                    // remove from wait list
                                    var status = await firebaseServices.removeFromWaitList(username);

                                    // if there was an error it is because there are no users in the wait list
                                    if (status === firebaseServices.status.FAILURE) {
                                        discordServices.sendMessageToMember(message.author, 'Hey there! We could not remove you from the list, becuase you are not in it!', true);
                                    } else if (status === firebaseServices.status.HACKER_SUCCESS) {
                                        discordServices.sendMessageToMember(message.author, 'Hey there! You have ben removed from the waitlist, thanks for letting us know!', true);
                                    }       
                                });

                            // get boothing sponsor console channel
                            var channel = await message.guild.channels.cache.get('748397163997954108');
                            channel.send('There are: ' + number + ' hackers waiting in line!');
                        }
                    }
                });
            } else {
                discordServices.replyAndDelete(message, 'This command can only be ran by staff!');
            }   
        } else {
            discordServices.replyAndDelete(message, 'This command can only be ran in the boothing-wait-list channel!');
        }
    }

};