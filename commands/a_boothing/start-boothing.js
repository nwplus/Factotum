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
            if ((await discordServices.checkForRole(message.member, discordServices.staffRole))) {
                
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

                // send wait list message to sponsors
                var sponsorChannel = await message.guild.channels.resolve('748397163997954108');

                const sponsorEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.embedColor)
                    .setTitle('The Wait List')
                    .setDescription('This is the wait list, it will always stay up to date! To get the next group react to this message with 🤝');

                var sponsorMsg = await sponsorChannel.send(sponsorEmbed);

                await sponsorMsg.react('🤝');

                // add reacton to get next in this message!
                const getNextFilter = ((reaction, user) => user.bot === false && reaction.emoji.name === '🤝');

                const getNextCollector = sponsorMsg.createReactionCollector(getNextFilter);

                getNextCollector.on('collect', async (reaction, user) => {
                    reaction.users.remove(user.id);

                    // grab the sponsors voice channel
                    var sponsor = await message.guild.members.fetch(user.id);
                    var sponsorVoice = sponsor.voice.channel;

                    if (sponsorVoice === null) {
                        sponsorChannel.send('<@' + user.id + '> Please join a voice channel before asking me to assing you a group!').then(msg => msg.delete({timeout: 5000}));
                    }

                    if (sponsorVoice != null) {
                        var listOrStatus = await firebaseServices.getNextForBooth(boothName);

                        // if failure let sponsor know there are no groups
                        if (listOrStatus === firebaseServices.status.FAILURE) {
                            sponsorChannel.send('<@' + user.id + '> There are no groups waiting!').then(msg => msg.delete({timeout: 5000}));
                        } else {
                            // get groups
                            var currentGroup = listOrStatus['current group'];
                            var nextGroup = listOrStatus['next group'];

                            // let next group know they are next
                            nextGroup.forEach(async username => {
                                var member = await message.guild.members.cache.find(member => member.user.username === username);
                                discordServices.sendMessageToMember(member, 'You are next! Get ready to talk to a sponsor, make sure you are in the waitlist voice channel!');
                            });
                            
                            // bool to see if someone was added to the voice channel
                            var isAdded = false;
                            
                            for (var i = 0; i < currentGroup.length; i++) {
                                var member = await message.guild.members.cache.find(member => member.user.username === currentGroup[i]);
                                try {
                                    await member.voice.setChannel(sponsorVoice);
                                    isAdded = true;
                                    discordServices.sendMessageToMember(member, 'Hey hey, a sponsor is ready to talk to you! You are now live!');
                                } catch(err) {
                                    discordServices.sendMessageToMember(member, 'Hi there! We tried to get you in a voice channel with a sponsor but you were not available. ' +
                                    'Remember you need to stay in the wait list voice channel! If you would like to try again please call the command again in the boothin-wait-list text chanel.' + 
                                    'If you were in a group and one of your friends made it into the private call then join the waitlist voicechannel ASAP so the sponsor can add you manualy!');
                                }
                            }

                            // if no one was added skip this team and let the sponsor know!
                            if (isAdded.length === false) {
                                sponsorChannel.send('<@' + user.id + '> The team is not available right now! They have been skiped, please try again.').then(msg => msg.delete({timeout: 5000}));
                            } else {
                                sponsorChannel.send('<@' + user.id + '> The group has been added! Happy talking!!!').then(msg => msg.delete({timeout: 5000}));
                            }
                            // remove user from wait list in channel
                            var embed = sponsorMsg.embeds[0];
                            var fields = embed.fields;
                            fields = fields.filter(field => !field.name.includes('#0 '));
                            embed.fields = fields;
                            sponsorMsg.edit(embed);

                        }
                    }
                });

                // booth name
                var boothName = 'Example Name';

                // init the booth in firebase
                firebaseServices.startBooth(boothName, sponsorMsg.id);

                // filter to be used for emoji collector
                const filter = (reaction, user) => {
                    return user.bot === false && reaction.emoji.name === '😎' || reaction.emoji.name === '👨‍👩‍👦‍👦';
                };
                
                // collector will run forever since no time limit set
                const collector = msg.createReactionCollector(filter);

                // run when something is collected
                collector.on('collect', async (reaction, user) => {
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

                    var statusOrSpot = await firebaseServices.addGroupToBooth(boothName, username, usernameList);

                    // If the user is alredy in the waitlist then tell him that
                    if (statusOrSpot === firebaseServices.status.HACKER_IN_USE) {
                        discordServices.sendMessageToMember(user, 'Hey there! It seems you are already on the wait list, if you would like to ' +
                        'know your spot please run the !requestposition command right here!');
                    } else {
                        // get number of hackers in wait list
                        var number = statusOrSpot;
                        
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
                                var status = await firebaseServices.removeGroupFromBooth(boothName, username);

                                discordServices.sendMessageToMember(user, 'Hey there! You have ben removed from the waitlist, thanks for letting us know!', true);

                                // udpate sponsor channel list
                                var embed = sponsorMsg.embeds[0];
                                var fields = embed.fields;
                                fields = fields.filter(field => {
                                    console.log(field);
                                    console.log(field.name);
                                    return ! field.name.includes(user.username);
                                });
                                embed.fields = fields;
                                sponsorMsg.edit(embed);
                                   
                            });

                        // get boothing sponsor console channel
                        var embed = sponsorMsg.embeds[0];
                        embed.addField('#' + embed.fields.length + ' ' + user.username, 'Is waiting to talk with someone!');
                        sponsorMsg.edit(embed);
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