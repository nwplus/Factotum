// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseActivity = require('../../firebase-services/firebase-services-activities');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class StartMentors extends Command {
    constructor(client) {
        super(client, {
            name: 'startm',
            group: 'a_mentors',
            memberName: 'start the mentor\'s experience',
            description: 'Will create a private category for mentors with channels for them to use!',
            guildOnly: true,
            args: [],
        });
    }

    // Run function -> command body
    async run(message) {
        discordServices.deleteMessage(message);

        // make sure command is only used in the admin console
        if (!discordServices.isAdminConsole(message.channel)) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;    
        }
        // only memebers with the Hacker tag can run this command!
        if (!(await discordServices.checkForRole(message.member, discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            return;
        }

        // ask if they have a mentor category already created! TODO

        // check if mentor cave category has not been already created!
        var possibleMentorCaveCategorys = await message.guild.channels.cache.filter((channel => channel.type === 'category' && channel.name === 'Mentors Cave'));

        if (possibleMentorCaveCategorys.array().length === 0) {
            // Create category
            var mentorCaveCategory = await message.guild.channels.create('Mentors Cave', {type: 'category',  permissionOverwrites: [
                {
                    id: discordServices.guestRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.everyoneRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.hackerRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.attendeeRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.mentorRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.sponsorRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.staffRole,
                    allow: ['VIEW_CHANNEL'],
                }
            ]});

            // general text channel to talk
            message.guild.channels.create('mentor-banter', {type: 'text', parent: mentorCaveCategory});

            // mentor console channel to ask for tags
            var mentorConsole = await message.guild.channels.create('mentor-console', {type: 'text', parent: mentorCaveCategory});

            // mentor incoming tickets
            var incomingTicketsChannel = await message.guild.channels.create('incoming-tickets', {type: 'text', parent: mentorCaveCategory});

            // create a couple of voice channels for mentors to use
            for (var i = 0; i < 3; i++) {
                message.guild.channels.create('Room ' + i, {type: 'voice', parent: mentorCaveCategory});
            }

            // report success of activity creation
            discordServices.replyAndDelete(message,'The mentor cateogry has been create succesfully!');
        } else {
            discordServices.replyAndDelete(message, 'A mentor cave has been found, nothing created!');
            var mentorCaveCategory = possibleMentorCaveCategorys.first();
            var mentorConsole = mentorCaveCategory.children.find(channel => channel.name === 'mentor-console');
            var incomingTicketsChannel = mentorCaveCategory.children.find(channel => channel.name === 'incoming-tickets');
            // remove messages in mentor console
            mentorConsole.bulkDelete(100, true);
        }

        // if we couldnt find the mentor console channel ask for the name of the channel!   
        if (mentorConsole === undefined) {
            return;
            // TODO ask for name of channel and fetch it
        }



        // check for public mentor help category
        var publicHelpCategory = await message.guild.channels.cache.find((channel => channel.type === 'category' && channel.name === 'Mentor Help'));

        if (publicHelpCategory === undefined) {
            // create mentor help public channels category
            publicHelpCategory = await message.guild.channels.create('Mentor Help', {type: 'category', permissionOverwrites: [
                {
                    id: discordServices.everyoneRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.guestRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.hackerRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.attendeeRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.mentorRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.sponsorRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.staffRole,
                    allow: ['VIEW_CHANNEL'],
                }
            ]});

            // create request ticket channel
            var requestTicketChannel = await message.guild.channels.create('request-ticket', {type: 'text', parent: publicHelpCategory});
        } else {
            // look for request ticket channel
            var requestTicketChannel = await publicHelpCategory.children.find(channel => channel.name === 'request-ticket');
            if (requestTicketChannel === undefined) {
                // create request ticket channel
                var requestTicketChannel = await message.guild.channels.create('request-ticket', {type: 'text', parent: publicHelpCategory});
            }
        }

        
        ////// send message to admin console
        // message embed
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Mentor Cateogry Console')
            .setDescription('Mentor category options are found below.')
            .addField('Add a mentor role', 'To add a mentor role please click the 🧠 emoji.');

        // send message
        var msgConsole = await message.channel.send(msgEmbed);

        // emojis
        var adminEmojis = ['🧠'];

        // respond to message with emojis
        adminEmojis.forEach(emoji => msgConsole.react(emoji));


        ////// send message to mentor console
        // embed for mentor console
        const mentorEmbed = new Discord.MessageEmbed()
            .setColor(( await message.guild.roles.resolve(discordServices.mentorRole)).color)
            .setTitle('Mentor Role Console')
            .setDescription('Hi mentor! Thank you for being here, please read over all the available roles. And choose those you would feel ' + 
            'confortable answering questions for. When someone sends in a help ticket, and has specificed one of your roles, you will get pinged!');

        // mentor emojis with title, we will use a map, 
        // key :  emoji name, 
        // value : [role name, role snowflake]
        var mentorEmojis = new Map();
        
        // loop over all the mentor emojis and add a field explaining each
        mentorEmojis.forEach((value, key) => {
            mentorEmbed.addField(value[0], 'Click the ' + key + ' emoji!');
        });

        // send message
        var mentorConsoleMsg = await mentorConsole.send(mentorEmbed);

        // react to the message with all the emojis
        mentorEmojis.forEach((value, key) => {
            mentorConsoleMsg.react(key);
        });


        ////// send message to request-ticket channel
        var requestTicketEmoji = '🎫';

        const requestTicketEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Ticket Request System')
            .setDescription('If you or your team want to talk with a mentor follow the isntrucitons below:' + 
            '\n* React to this message with the correct emoji and follow instructions' + 
            '\n* Once done, wait for a mentor to accept your ticket!')
            .addField('For a general ticket:', 'React with ' + requestTicketEmoji);
        
        var requestTicketMsg = await requestTicketChannel.send(requestTicketEmbed);
        requestTicketMsg.react(requestTicketEmoji);


        ////// check for excisting mentor roles that start with M-
        var roleMan = await message.guild.roles.fetch();

        var initialMentorRoles = await roleMan.cache.filter(role => role.name.startsWith('M-'));
        
        if (initialMentorRoles.array().length != 0) {
            // let user know we found roles
            message.channel.send('<@' + message.author.id + '> I have found Mentor roles already clreated, please react to each role with the corresponding emoji!').then(msg => msg.delete({timeout: 8000}));
        }

        // for each found role, ask what emoji they want to use for it!
        await initialMentorRoles.each(async role => {
            var getInitialEmojiMsg = await message.channel.send('<@' + message.author.id + '> React with emoji for role named: ' + role.name);
        
            const reactionFilter = (reaction, user) => user.id === message.author.id && !mentorEmojis.has(reaction.emoji.name);

            getInitialEmojiMsg.awaitReactions(reactionFilter, {max: 1}).then(reactions => {
                var reaction = reactions.first();

                // update mentor message
                mentorConsoleMsg.edit(mentorConsoleMsg.embeds[0].addField(role.name.substring(2), 'Click the ' + reaction.emoji.name + ' emoji!'));

                // react to message
                mentorConsoleMsg.react(reaction.emoji.name);

                // add emoji to list with role name, role id and waitlist message id
                mentorEmojis.set(reaction.emoji.name, [role.name.substring(2), role.id]);

                // add to ticket system embed
                requestTicketMsg.edit(requestTicketMsg.embeds[0].addField('If your question involves ' + role.name.substring(2) + ':', 'React to this message with ' + reaction.emoji.name));
                requestTicketMsg.react(reaction.emoji.name);

                // remove msgs
                getInitialEmojiMsg.delete();
            })
        });


        ///// admin console collector
        // filter
        const emojiFilter = (reaction, user) => !user.bot && adminEmojis.includes(reaction.emoji.name);

        // create collector
        const emojiCollector = await msgConsole.createReactionCollector(emojiFilter);

        // on emoji reaction
        emojiCollector.on('collect', async (reaction, user) => {
            // remove reaction
            reaction.users.remove(user.id);

            // ask for role name, we will add TA- at the beginning
            var roleNameMsg = await message.channel.send('<@' + user.id + '> What is the name of this new role? Do not add M-, I will add that already!');

            const roleNameFilter = m => m.author.id === user.id;

            message.channel.awaitMessages(roleNameFilter, {max: 1}).then(msgs => {
                var nameMsg = msgs.first();

                message.channel.send('<@' + user.id + '> Please react to this message with the associated emoji!').then(msg => {
                    const emojiFilter = (r, u) => u.id === user.id;

                    msg.awaitReactions(emojiFilter, {max: 1}).then(async rcs => {
                        var reaction = rcs.first();

                        // make sure the emoji is not in use already!
                        if (mentorEmojis.has(reaction.emoji.name)) {
                            message.channel.send('<@' + user.id + '> This emoji is already in play! Please try again!').then(msg => msg.delete({timeout: 5000}));
                        } else {
                            // add role to mentor embed
                            // update embed
                            mentorConsoleMsg.edit(mentorConsoleMsg.embeds[0].addField(nameMsg.content, 'Click the ' + reaction.emoji.name + ' emoji!'));
                            mentorConsoleMsg.react(reaction.emoji.name);

                            // add role to server
                            var newRole = await message.guild.roles.create({
                                data: {
                                    name: 'M-' + nameMsg.content,
                                    color: 'ORANGE',
                                }
                            });

                            // add new role and emoji to list
                            mentorEmojis.set(reaction.emoji.name, [nameMsg.content, newRole.id]);

                            // add public text channel
                            message.guild.channels.create(nameMsg.content + '-help', {type: 'text', parent: publicHelpCategory});

                            // add to ticket system embed
                            requestTicketMsg.edit(requestTicketMsg.embeds[0].addField('If your question involves ' + nameMsg.content + ':', 'React to this message with ' + reaction.emoji.name));
                            requestTicketMsg.react(reaction.emoji.name);

                            // let user know the action was succesfull
                            message.channel.send('<@' + user.id + '> The role has been added!').then(msg => msg.delete({timeout: 5000}));
                        }
                        
                        // delete all messages involved with this process
                        roleNameMsg.delete();
                        nameMsg.delete();
                        msg.delete();
                    });
                });
            });
        });

        ////// mentor collector
        // filter and collector
        const mentorFilter = (reaction, user) => !user.bot && mentorEmojis.has(reaction.emoji.name);

        const mentorCollector = await mentorConsoleMsg.createReactionCollector(mentorFilter);

        mentorCollector.on('collect', async (reaction, user) => {
            // member
            var mbr = await message.guild.members.fetch(user.id);
            // role
            var role = await message.guild.roles.fetch(mentorEmojis.get(reaction.emoji.name)[1]);

            discordServices.addRoleToMember(mbr, role);

            mentorConsole.send('<@' + user.id + '> You have been granted the ' + mentorEmojis.get(reaction.emoji.name)[0] + ' role!');
        });

        ////// hacker request ticket collector

        // count of tickets created
        var ticketCount = 0;

        const hackerFilter = (reaction, user) => !user.bot && (mentorEmojis.has(reaction.emoji.name) || reaction.emoji.name === requestTicketEmoji);

        const requestTicketCollector = await requestTicketMsg.createReactionCollector(hackerFilter);

        requestTicketCollector.on('collect', async (reaction, user) => {
            // prmot for team members and the one liner
            requestTicketChannel.send('<@' + user.id + '> Please send ONE message with: \n* A one liner of your problem \n* Mention your team members.').then(msg => {
                requestTicketChannel.awaitMessages(m => m.author.id === user.id, {max: 1}).then(msgs => {
                    // remove reaction from ticket system
                    reaction.users.remove(user.id);

                    // get mentor role associated to reaction
                    var mentorInfo = mentorEmojis.get(reaction.emoji.name);
                    if (mentorInfo === undefined) {
                        var mentorRoleID = discordServices.mentorRole;
                    } else {
                        var mentorRoleID = mentorInfo[1];
                    }

                    var hackerTicketMentions = msgs.first().mentions;
                    var hackerTicketContent = msgs.first().content;

                    // delete message and promt
                    msg.delete();
                    msgs.each(msg => msg.delete());

                    // mentor side ticket embed
                    const mentorTicketEmbed = new Discord.MessageEmbed()
                        .setColor(discordServices.embedColor)
                        .setTitle('A new question has been asked!')
                        .setDescription(hackerTicketContent)
                        .addField('They are requesting:', '<@&' + mentorRoleID + '>')
                        .addField('Can you help them?', 'If so, react to this message with 🤝.');
                    
                    // send ticket to mentor side
                    incomingTicketsChannel.send('<@&' + mentorRoleID + '>', mentorTicketEmbed).then(ticketMsg => {
                        ticketMsg.react('🤝');

                        ticketMsg.awaitReactions((reaction, user) => !user.bot && reaction.emoji.name === '🤝', {max: 1}).then(async reactions => {
                            // update embed to reflect someone is help
                            ticketMsg.edit(ticketMsg.embeds[0].setColor('#80c904'));
                            
                            var mentorUser = reactions.first().users.cache.find(user => !user.bot);

                            // create category with channels
                            var ticketCategory = await message.guild.channels.create('Ticket-' + ticketCount, {type: 'category',});
                            ticketCategory.updateOverwrite(discordServices.everyoneRole, {'VIEW_CHANNEL': false});
                            ticketCategory.updateOverwrite(mentorUser, {'VIEW_CHANNEL': true, 'USE_VAD': true});
                            ticketCategory.updateOverwrite(user, {'VIEW_CHANNEL': true, 'USE_VAD': true});
                            hackerTicketMentions.members.each(member => ticketCategory.updateOverwrite(member, {'VIEW_CHANNEL': true, 'USE_VAD': true}));

                            // text channel
                            var ticketTextChannel = await message.guild.channels.create('banter', {type: 'text', parent: ticketCategory});
                            // voice channel
                            var ticketVoiceChannel = await message.guild.channels.create('discussion', {type: 'voice', parent: ticketCategory});

                            // send message to text channel taging the team and mentor
                            const newChannelEmbed = new Discord.MessageEmbed()
                                .setColor(discordServices.embedColor)
                                .setTitle('Original Question')
                                .setDescription(hackerTicketContent)
                                .addField('Thank you for helping this team.', '<@' + mentorUser + '> Best of luck!')
                                .addField('When done:', '* React to this message with 👋🏽 to lose access to these channels!');

                            ticketTextChannel.send(newChannelEmbed).then(async msg => {
                                var reactionCount = 0;
                                var maxReactions = hackerTicketMentions.members.array().length + 2;

                                msg.react('👋🏽');
                                const loseAccessCollector = await msg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '👋🏽', {max: maxReactions});
                                
                                loseAccessCollector.on('collect', async (reaction, user) => {
                                    reactionCount += 1;
                                    
                                    if (reactionCount === maxReactions) {
                                        await ticketTextChannel.delete();
                                        await ticketVoiceChannel.delete();
                                        await ticketCategory.delete();
                                    } else {
                                        ticketCategory.updateOverwrite(user, {'VIEW_CHANNEL': false});
                                    }
                                });
                            });

                            // send message with parties involved and delete immediately, just so they get notified
                            ticketTextChannel.send('<@' + mentorUser + '>').then(msg => msg.delete());
                            ticketTextChannel.send('<@' + user.id + '>').then(msg => msg.delete());
                            hackerTicketMentions.members.each(member => ticketTextChannel.send('<@' + member.id + '>').then(msg => msg.delete()));
                        });
                    });
                });
            });

            // update number of tickets
            ticketCount += 1;
        });

    }

};