// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class StartMentors extends Command {
    constructor(client) {
        super(client, {
            name: 'startm',
            group: 'a_start_commands',
            memberName: 'start the mentor\'s experience',
            description: 'Will create a private category for mentors with channels for them to use!',
            guildOnly: true,
            args: [],
        });
    }

    // Run function -> command body
    async run(message) {
        discordServices.deleteMessage(message);

    // Command Checks
        // make sure command is only used in the admin console
        if (!discordServices.isAdminConsole(message.channel)) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;    
        }
        // only memebers with the Hacker tag can run this command!
        if (!(discordServices.checkForRole(message.member, discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            return;
        }

    // Mentor Cave Category and Channel Creation
        // check if mentor cave category has not been already created!
        var possibleMentorCaveCategorys = await message.guild.channels.cache.filter((channel => channel.type === 'category' && channel.name.endsWith('Mentors Cave')));

        if (possibleMentorCaveCategorys.array().length === 0) {
            // Create category
            var mentorCaveCategory = await message.guild.channels.create('🧑🏽‍🎓Mentors Cave', {type: 'category',  permissionOverwrites: [
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
                    deny: ['SEND_MESSAGES'],
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
            message.guild.channels.create('✍mentor-banter', {
                type: 'text', 
                parent: mentorCaveCategory,
                topic: 'For any and all social interactions between mentors. This entire category is only for mentors and staff!',
            }).then(channel => channel.updateOverwrite(discordServices.mentorRole, {SEND_MESSAGES: true}));


            // mentor console channel to ask for tags
            var mentorConsole = await message.guild.channels.create('📝mentor-console', {
                type: 'text', 
                parent: mentorCaveCategory,
                topic: 'Sign yourself up for specific mentor roles! New roles will be added as requested, only add yourself to one if you feel comfortable responing to questions about the topic.',
            });

            // mentor incoming tickets
            var incomingTicketsChannel = await message.guild.channels.create('📨incoming-tickets', {
                type: 'text', 
                parent: mentorCaveCategory,
                topic: 'All incoming tickets! Those in yellow still need help!!! Those in green have been handled by someone.',
            });

            // create a couple of voice channels for mentors to use
            for (var i = 0; i < 3; i++) {
                message.guild.channels.create('🗣️ Room ' + i, {type: 'voice', parent: mentorCaveCategory});
            }

            // report success of activity creation
            discordServices.replyAndDelete(message,'The mentor cateogry has been create succesfully!');
        } else {
            discordServices.replyAndDelete(message, 'A mentor cave has been found, nothing created!');
            var mentorCaveCategory = possibleMentorCaveCategorys.first();
            var mentorConsole = mentorCaveCategory.children.find(channel => channel.name === '📝mentor-console');
            var incomingTicketsChannel = mentorCaveCategory.children.find(channel => channel.name === '📨incoming-tickets');
            
            // remove messages in mentor console and incoming tickets
            mentorConsole.bulkDelete(100, true);
            incomingTicketsChannel.bulkDelete(100, true);
        }

        // if we couldnt find the mentor console channel ask for the name of the channel!   
        if (mentorConsole === undefined || incomingTicketsChannel === undefined) {
            discordServices.replyAndDelete(message, 'The mentor cave is already created but is missing the mentor-console or incoming-tickets text channels. Please fix and try again.');
            return;
            // TODO ask for name of channel and fetch it
        }


    // Public Help Cateogry and Ticket Channel Creation
        // check for public mentor help category
        var publicHelpCategory = await message.guild.channels.cache.find((channel => channel.type === 'category' && channel.name.endsWith('Mentor Help')));

        if (publicHelpCategory === undefined) {
            // create mentor help public channels category
            publicHelpCategory = await message.guild.channels.create('👉🏽👈🏽Mentor Help', {type: 'category', permissionOverwrites: [
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
            var requestTicketChannel = await message.guild.channels.create('🎫request-ticket', {
                type: 'text', 
                parent: publicHelpCategory,
                topic: 'Do you need help? Request a ticket here! Do not send messages, they will be automatically removed!',
            });
        } else {
            // look for request ticket channel
            var requestTicketChannel = await publicHelpCategory.children.find(channel => channel.name === '🎫request-ticket');
            if (requestTicketChannel === undefined) {
                // create request ticket channel
                var requestTicketChannel = await message.guild.channels.create('🎫request-ticket', {type: 'text', parent: publicHelpCategory});
            }

            // delete everything from request ticket channel
            requestTicketChannel.bulkDelete(100, true);
        }

        // add request ticket channel to black list
        discordServices.blackList.set(requestTicketChannel.id, 5000);

        
    // Send message to admin console with add role functionality
        // message embed
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Mentor Category Console')
            .setDescription('Mentor category options are found below.')
            .addField('Add a mentor role', 'To add a mentor role please click the 🧠 emoji.');
        
        var msgConsole = await message.channel.send(msgEmbed);
        var adminEmojis = ['🧠'];
        adminEmojis.forEach(emoji => msgConsole.react(emoji));


    // Send message to mentor console with select role funcionality
        // embed for mentor console
        const mentorEmbed = new Discord.MessageEmbed()
            .setColor(( await message.guild.roles.resolve(discordServices.mentorRole)).color)
            .setTitle('Mentor Role Console')
            .setDescription('Hi mentor! Thank you for being here. \n* Please read over all the available roles. \n* Choose those you would feel ' + 
            'comfortable answering questions for. \n* When someone sends a help ticket, and has specificed one of your roles, you will get pinged!');

        // mentor emojis with title, we will use a map, 
        // key :  emoji name, 
        // value : [role name, role snowflake]
        var mentorEmojis = new Map();

        // send message
        var mentorConsoleMsg = await mentorConsole.send(mentorEmbed);
        mentorConsoleMsg.pin();


    // Send message to request-ticket channel with request ticket functionality
        var requestTicketEmoji = '🎫';

        const requestTicketEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Ticket Request System')
            .setDescription('If you or your team want to talk with a mentor follow the instructions below:' + 
            '\n* React to this message with the correct emoji and follow instructions' + 
            '\n* Once done, wait for a mentor to accept your ticket!')
            .addField('For a general ticket:', 'React with ' + requestTicketEmoji);
        
        var requestTicketMsg = await requestTicketChannel.send(requestTicketEmbed);
        requestTicketMsg.pin();
        requestTicketMsg.react(requestTicketEmoji);


    // Check for excisting mentor roles that start with M- and promt admin for emoji
        var roleMan = await message.guild.roles.fetch();

        var initialMentorRoles = await roleMan.cache.filter(role => role.name.startsWith('M-'));
        
        if (initialMentorRoles.array().length != 0) {
            // let user know we found roles
            message.channel.send('<@' + message.author.id + '> I have found Mentor roles already created, please react to each role with the corresponding emoji!').then(msg => msg.delete({timeout: 5000}));
        }

        // for each found role, ask what emoji they want to use for it!
        await initialMentorRoles.each(async role => {
            var getInitialEmojiMsg = await message.channel.send('<@' + message.author.id + '> React with emoji for role named: ' + role.name);
            
            // contains a check to make sure the emoji is not already in use!
            const reactionFilter = (reaction, user) => user.id === message.author.id && !(mentorEmojis.has(reaction.emoji.name) || reaction.emoji.name === requestTicketEmoji);

            getInitialEmojiMsg.awaitReactions(reactionFilter, {max: 1}).then(reactions => {
                var reaction = reactions.first();

                // add emoji to list with role name, role id and waitlist message id
                mentorEmojis.set(reaction.emoji.name, [role.name.substring(2), role.id]);

                // update mentor message and react
                mentorConsoleMsg.edit(mentorConsoleMsg.embeds[0].addField(role.name.substring(2), 'Click the ' + reaction.emoji.name + ' emoji!'));
                mentorConsoleMsg.react(reaction.emoji.name);

                // add to ticket system embed and react
                requestTicketMsg.edit(requestTicketMsg.embeds[0].addField('If your question involves ' + role.name.substring(2) + ':', 'React to this message with ' + reaction.emoji.name));
                requestTicketMsg.react(reaction.emoji.name);

                // remove msgs
                getInitialEmojiMsg.delete();
            })
        });


    // Admin console collector to add new mentor roles
        // create collector
        const adminCollector = await msgConsole.createReactionCollector((reaction, user) => !user.bot && adminEmojis.includes(reaction.emoji.name));

        // on emoji reaction
        adminCollector.on('collect', async (reaction, admin) => {
            // remove reaction
            reaction.users.remove(admin.id);

            // ask for role name, we will add TA- at the beginning
            var roleNameMsg = await message.channel.send('<@' + admin.id + '> What is the name of this new role? Do not add M-, I will add that already!');

            message.channel.awaitMessages(m => m.author.id === admin.id, {max: 1}).then(msgs => {
                var nameMsgContent = msgs.first().content;

                msgs.first().delete();
                roleNameMsg.delete();

                message.channel.send('<@' + admin.id + '> Please react to this message with the associated emoji!').then(msg => {
                    msg.awaitReactions((r, u) => u.id === admin.id, {max: 1}).then(async rcs => {
                        var reaction = rcs.first();

                        // make sure the emoji is not in use already!
                        if (mentorEmojis.has(reaction.emoji.name)) {
                            message.channel.send('<@' + admin.id + '> This emoji is already in use! Please try again!').then(msg => msg.delete({timeout: 5000}));
                        } else {
                            // add role to server
                            var newRole = await message.guild.roles.create({
                                data: {
                                    name: 'M-' + nameMsgContent,
                                    color: 'ORANGE',
                                }
                            });

                            // add new role and emoji to list
                            mentorEmojis.set(reaction.emoji.name, [nameMsgContent, newRole.id]);

                            // add role to mentor embed and react
                            mentorConsoleMsg.edit(mentorConsoleMsg.embeds[0].addField(nameMsgContent, 'Click the ' + reaction.emoji.name + ' emoji!'));
                            mentorConsoleMsg.react(reaction.emoji.name);

                            // add to ticket system embed
                            requestTicketMsg.edit(requestTicketMsg.embeds[0].addField('If your question involves ' + nameMsgContent + ':', 'React to this message with ' + reaction.emoji.name));
                            requestTicketMsg.react(reaction.emoji.name);

                            // ask admin if public channel should be created for this role
                            var promt = await message.channel.send('<@' + admin.id + '> Do you want me to create a public text channel for this mentor help role? yes or no?');
                            await message.channel.awaitMessages(m => m.author.id === admin.id, {max: 1}).then(msgs => {
                                if (msgs.first().content.toLowerCase() === 'yes') {
                                    // add public text channel
                                    message.guild.channels.create(nameMsg.content + '-help', {
                                        type: 'text', 
                                        parent: publicHelpCategory, 
                                        topic: 'For hackers to ask question related to the channel title. Mentors will help you out when they can!'
                                    });
                                }

                                msgs.each(msg => msg.delete());
                                promt.delete();
                            });

                            // let admin know the action was succesfull
                            message.channel.send('<@' + admin.id + '> The role has been added!').then(msg => msg.delete({timeout: 5000}));
                        }
                        
                        msg.delete();
                    });
                });
            });
        });

    // Mentor collector to auto asign roles
        const mentorCollector = await mentorConsoleMsg.createReactionCollector((reaction, user) => !user.bot && mentorEmojis.has(reaction.emoji.name));

        mentorCollector.on('collect', async (reaction, user) => {
            // member
            var mbr = message.guild.member(user.id);
            // role
            var role = await message.guild.roles.fetch(mentorEmojis.get(reaction.emoji.name)[1]);

            discordServices.addRoleToMember(mbr, role);

            mentorConsole.send('<@' + user.id + '> You have been granted the ' + mentorEmojis.get(reaction.emoji.name)[0] + ' role!').then(msg => msg.delete({timeout: 3000}));
        });


    // Hacker request ticket collector to request a ticket
        // count of tickets created
        var ticketCount = 0;
        
        const requestTicketCollector = await requestTicketMsg.createReactionCollector((reaction, user) => !user.bot && (mentorEmojis.has(reaction.emoji.name) || reaction.emoji.name === requestTicketEmoji));

        requestTicketCollector.on('collect', async (reaction, hacker) => {
            // prmot for team members and the one liner
            requestTicketChannel.send('<@' + hacker.id + '> Please send ONE message with: \n* A one liner of your problem \n* Mention your team members.\n* Do it within 30 seconds!').then(promtMsg => {
                requestTicketChannel.awaitMessages(m => m.author.id === hacker.id, {max: 1, time: 30000, errors: ['time'] }).then(msgs => {
                    // remove reaction from ticket system
                    reaction.users.remove(hacker.id);

                    // get mentor role associated to reaction, if no mentor info means its a general mentor
                    var mentorInfo = mentorEmojis.get(reaction.emoji.name);
                    if (mentorInfo === undefined) {
                        var mentorRoleID = discordServices.mentorRole;
                    } else {
                        var mentorRoleID = mentorInfo[1];
                    }

                    var hackerTicketMentions = msgs.first().mentions;
                    var hackerTicketContent = msgs.first().content;
                    var hackerTicketuser = msgs.first().author;

                    // delete message and promt
                    promtMsg.delete();
                    msgs.each(msg => msg.delete());
                
                // Send ticket to mentor channel
                    // mentor side ticket embed
                    const mentorTicketEmbed = new Discord.MessageEmbed()
                        .setColor(discordServices.embedColor)
                        .setTitle('New Ticket! - ' + ticketCount)
                        .setDescription('<@' + hackerTicketuser.id + '> has the question: ' + hackerTicketContent)
                        .addField('They are requesting:', '<@&' + mentorRoleID + '>')
                        .addField('Can you help them?', 'If so, react to this message with 🤝.');
                    
                    // send ticket to mentor side
                    incomingTicketsChannel.send('<@&' + mentorRoleID + '>', mentorTicketEmbed).then(ticketMsg => {
                        var joinTicketEmoji = '🏃🏽';
                        var giveHelpEmoji = '🤝'
                        ticketMsg.react(giveHelpEmoji);

                        // collection of available emojis
                        const ticketEmojis = new Discord.Collection();
                        ticketEmojis.set(giveHelpEmoji, 1);

                        // need this scope to work with different reactions
                        var ticketCategory;
                        var ticketTextChannel;
                        var ticketVoiceChannel;
                        var maxReactions = 0;

                        const ticketReactionCollector = ticketMsg.createReactionCollector((reaction, user) => !user.bot && ticketEmojis.has(reaction.emoji.name));

                        ticketReactionCollector.on('collect', async (reaction, mentor) => {

                            if (reaction.emoji.name === joinTicketEmoji) {
                            // More mentors can join functionality
                                // add mentor to category
                                ticketCategory.updateOverwrite(mentor, {'VIEW_CHANNEL': true, 'USE_VAD': true}).then( category => 
                                    // let the team know someone has joined the conversation
                                    ticketTextChannel.send('<@' + mentor.id + '> Has joined the ticket!').then(msg => msg.delete({timeout: 5000}))
                                    );
                                maxReactions += 1;
                            } else {
                            // Ticket has been accepted -> creating ticket category
                                // remove give help emoji and add join ticket emoji to collection
                                ticketEmojis.delete(giveHelpEmoji);
                                ticketEmojis.set(joinTicketEmoji, 10);
                            
                                // update embed to reflect someone is help
                                ticketMsg.edit(ticketMsg.embeds[0].setColor('#80c904')
                                                                    .addField('This ticket is being handled!', '<@' + mentor.id + '> Is helping this team!')
                                                                    .addField('Still want to help?', 'Click the ' + joinTicketEmoji + ' emoji to join the ticket!'));
                                ticketMsg.react(joinTicketEmoji);

                                // create category with channels
                                ticketCategory = await message.guild.channels.create('Ticket-' + ticketCount, {
                                    type: 'category',
                                    permissionOverwrites: [
                                        {
                                            id: discordServices.everyoneRole,
                                            deny: ['VIEW_CHANNEL']
                                        }
                                    ]
                                });

                                // text channel
                                ticketTextChannel = await message.guild.channels.create('banter', {
                                    type: 'text', 
                                    parent: ticketCategory
                                });
                                // voice channel
                                ticketVoiceChannel = await message.guild.channels.create('discussion', {
                                    type: 'voice', 
                                    parent: ticketCategory
                                });

                                await ticketCategory.updateOverwrite(mentor, {'VIEW_CHANNEL': true, 'USE_VAD': true});
                                await ticketCategory.updateOverwrite(hacker, {'VIEW_CHANNEL': true, 'USE_VAD': true});
                                await hackerTicketMentions.members.each(member => ticketCategory.updateOverwrite(member, {'VIEW_CHANNEL': true, 'USE_VAD': true}));
                            
                            // Info msg and close ticket collector
                                // send message to text channel taging the team and mentor
                                const newChannelEmbed = new Discord.MessageEmbed()
                                    .setColor(discordServices.embedColor)
                                    .setTitle('Original Question')
                                    .setDescription('<@' + hackerTicketuser.id + '> has the question: ' + hackerTicketContent)
                                    .addField('Thank you for helping this team.', '<@' + mentor + '> Best of luck!')
                                    .addField('When done:', '* React to this message with 👋🏽 to lose access to these channels!');

                                ticketTextChannel.send(newChannelEmbed).then(async infoMsg => {
                                    var reactionCount = 0;
                                    maxReactions += hackerTicketMentions.members.array().length + 2;

                                    await infoMsg.react('👋🏽');
                                    const loseAccessCollector = await infoMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '👋🏽');
                                    
                                    loseAccessCollector.on('collect', async (reaction, user) => {
                                        reactionCount += 1;
                                        
                                        if (reactionCount === maxReactions) {
                                            await ticketTextChannel.delete();
                                            await ticketVoiceChannel.delete();
                                            await ticketCategory.delete();
                                            ticketReactionCollector.stop();
                                            loseAccessCollector.stop();
                                        } else {
                                            ticketCategory.updateOverwrite(user, {VIEW_CHANNEL: false, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: false});
                                        }
                                    });
                                });

                                // send message with parties involved and delete immediately, just so they get notified
                                ticketTextChannel.send('<@' + mentor + '>').then(msg => msg.delete());
                                ticketTextChannel.send('<@' + hacker.id + '>').then(msg => msg.delete());
                                hackerTicketMentions.members.each(member => ticketTextChannel.send('<@' + member.id + '>').then(msg => msg.delete()));
                            }
                        });
                    });
                }).catch(error => {
                    promtMsg.delete();
                    requestTicketChannel.send('<@' + hacker.id + '> Time is up! Please try again!').then(msg => msg.delete({timeout: 3000}));
                });
            });

            // update number of tickets
            ticketCount += 1;
        });

    }

};