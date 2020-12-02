// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseWorkshops = require('../../firebase-services/firebase-services-workshops');
const firebaseServices = require('../../firebase-services/firebase-services');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class InitWorkshop extends Command {
    constructor(client) {
        super(client, {
            name: 'initw',
            group: 'a_activity',
            memberName: 'initialize workshop funcitonality for activity',
            description: 'Will initialize the workshop functionality for the given workshop. General voice channel will be muted for all hackers.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
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
    async run(message, { activityName, categoryChannelKey, textChannelKey, voiceChannelKey}) {
        discordServices.deleteMessage(message);

        // make sure command is only used in the admin console
        if (!discordServices.isAdminConsole(message.channel)) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;
        }
        // only memebers with the Hacker tag can run this command!
        if (!(discordServices.checkForRole(message.member, discordServices.staffRole))) {
            discordServices.replyAndDelete(message, 'You do not have permission for this command, only staff can use it!');
            return;
        }

        // get category
        if (categoryChannelKey === '') {
            var category = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name.endsWith(activityName));
        } else {
            var category = message.guild.channels.resolve(categoryChannelKey);
        }
        

        // make sure the workshop exists, else return
        if (category === undefined) {
            discordServices.replyAndDelete(message, 'The activity named: ' + activityName + ', does not exist! Did not create voice channels.');
            return;
        }

        // grab general voice and update permission to no speak for attendees
        if (voiceChannelKey === '') {
            var generalVoice = await category.children.find(channel.type === 'voice'  && channel.name.endsWith(activityName + '-general-voice'));
        } else {
            var generalVoice = message.guild.channels.resolve(voiceChannelKey);
        }
        
        generalVoice.updateOverwrite(discordServices.attendeeRole, {
            SPEAK: false
        });
        generalVoice.updateOverwrite(discordServices.mentorRole, {
            SPEAK: true,
            MOVE_MEMBERS: true,
        });
        generalVoice.updateOverwrite(discordServices.staffRole, {
            SPEAK: true,
            MOVE_MEMBERS: true,
        })

        // create TA console
        var taChannel = await message.guild.channels.create(':🧑🏽‍🏫:' + 'ta-console', {
            type: 'text', parent: category, permissionOverwrites: [
                {
                    id: discordServices.hackerRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.attendeeRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.sponsorRole,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.mentorRole,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: discordServices.staffRole,
                    allow: ['VIEW_CHANNEL'],
                }
            ], topic: 'The TA console, here TAs can chat, communicate with the workshop lead, look at the wait list, and send polls!',
        });


        ////// TA Side
        // embed color for mentors
        var mentorColor = (await message.guild.roles.fetch(discordServices.mentorRole)).color;

        const taInfoEmbed = new Discord.MessageEmbed()
            .setTitle('TA Information')
            .setDescription('Please read this before the workshop starts!')
            .addField('Create Private Channels', 'If you can only see one voice channel called activity room, go to the staff console and add voice channels to this activity.')
            .addField('Keep Track Of', '* The wait list will udpate but won\'t notify you about it. Keep an eye on it!\n *The activity-banter channel for any questions!')
            .setColor(mentorColor);
        taChannel.send(taInfoEmbed).then(msg => msg.pin());
        
        const consoleEmbed = new Discord.MessageEmbed()
            .setColor(mentorColor)
            .setTitle('Main console for ' + activityName)
            .setDescription('Here are some commands:\n' +
                '🏕️ Will activate a stamp distribution that will be open for ' + discordServices.stampCollectTime + ' seconds.\n' +
                '🏎️ Will send an embedded message asking how the speed is.\n' +
                '✍️ Will send an embedded message asking how the difficulty is.\n' +
                '🧑‍🏫 Will send an embedded message asking how good the explanations are.');
        
        // send message
        taChannel.send(consoleEmbed).then((msg) => {
            msg.pin();

            var emojis = ['🏕️', '🏎️', '✍️', '🧑‍🏫'];

            emojis.forEach(emoji => msg.react(emoji));

            const collector = msg.createReactionCollector((reaction, user) => !user.bot && emojis.includes(reaction.emoji.name));

            collector.on('collect', async (reaction, user) => {
                var commandRegistry = this.client.registry;

                // emoji name
                var emojiName = reaction.emoji.name;

                // remove new reaction
                reaction.users.remove(user.id);

                if (emojiName === emojis[0]) {
                    commandRegistry.findCommands('distribute-stamp', true)[0].run(message, { activityName: activityName, timeLimit: discordServices.stampCollectTime, targetChannelKey: textChannelKey });
                } else if (emojiName === emojis[1]) {
                    commandRegistry.findCommands('workshop-polls', true)[0].run(message, { activityName: activityName, question: 'speed', targetChannelKey: textChannelKey });
                } else if (emojiName === emojis[2]) {
                    commandRegistry.findCommands('workshop-polls', true)[0].run(message, { activityName: activityName, question: 'difficulty', targetChannelKey: textChannelKey });
                } else if (emojiName === emojis[3]) {
                    commandRegistry.findCommands('workshop-polls', true)[0].run(message, { activityName: activityName, question: 'explanations', targetChannelKey: textChannelKey });
                }
            });
        })

        // embed message for TA console
        const taEmbed = new Discord.MessageEmbed()
            .setColor(mentorColor)
            .setTitle('Hackers in need of help waitlist')
            .setDescription('* Make sure you are on a private voice channel not the general voice channel \n* To get the next hacker that needs help click 🤝');

        // send taConsole message and react with emoji
        var taConsole = await taChannel.send(taEmbed);
        taConsole.pin();
        taConsole.react('🤝');


        ////// Hacker Side
        // create question and help channel for hackers
        var helpChannel = await message.guild.channels.create('🙋🏽' + 'assistance', { type: 'text', parent: category, topic: 'For hackers to request help from TAs for this workshop, please don\'t send any other messages!' });

        // add helpChannel to the black list
        discordServices.blackList.set(helpChannel.id, 5000);

        // message embed for helpChannel
        const helpEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle(activityName + ' Help Desk')
            .setDescription('Welcome to the ' + activityName + ' help desk. There are two ways to get help explained below:')
            .addField('Simple or Theoretical Questions', 'If you have simple or theory questions, use the !ask command on the text channel ' + '<#' + textChannelKey + '>' + '!')
            .addField('Advanced Question or Code Assistance', 'If you have a more advanced question, or need code assistance, click the 🧑🏽‍🏫 emoji for live TA assistance! Join the general voice channel if not already there!');

        // send message with embed and react with emoji
        var helpMessage = await helpChannel.send(helpEmbed);
        helpMessage.pin();
        await helpMessage.react('🧑🏽‍🏫');

        // filter collector and event handler for help emoji from hackers
        const helpCollector = helpMessage.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🧑🏽‍🏫');

        // wait list Collection
        // key -> user id
        // value -> username
        const waitlist = new Discord.Collection();

        helpCollector.on('collect', async (reaction, user) => {
            // remove the emoji
            reaction.users.remove(user.id);

            // check that the user is not already on the wait list
            if (waitlist.has(user.id)) {
                discordServices.sendMessageToMember(user, 'You are already on the TA wait list! A TA will get to you soon!', true);
                return;
            } else {
                var position = waitlist.array().length;
                // add user to wait list
                waitlist.set(user.id, user.username);
            }

            // collect the question the hacker has
            var qPromt = await helpChannel.send('<@' + user.id + '> Please send to this channel a one-liner of your problem or question. You have 10 seconds to respond');

            helpChannel.awaitMessages(m => m.author.id === user.id, { max: 1, time: 10000,error:['time'] }).then(async msgs => {
                // get question
                var question = msgs.first().content;

                const hackerEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.embedColor)
                    .setTitle('Hey there! We got you signed up to talk to a TA!')
                    .setDescription('You are number: ' + position + ' in the wait list.')
                    .addField('JOIN THE VOICE CHANNEL!', 'Sit tight in the voice channel. If you are not in the voice channel when its your turn you will be skipped, and we do not want that to happen!');

                discordServices.sendMessageToMember(user, hackerEmbed);

                // update message embed with new user in list
                taConsole.edit(taConsole.embeds[0].addField(user.username, '<@' + user.id + '> has the question:' +  question));

                // delete promt and user msg
                qPromt.delete();
                msgs.each(msg => msg.delete());
            })
            .catch(console.error);
        });

        // add reacton to get next in this message!
        const getNextCollector = taConsole.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🤝');

        getNextCollector.on('collect', (reaction, user) => {
            // remove the reaction
            reaction.users.remove(user.id);

            // grab the ta and their voice channel
            var ta = message.guild.member(user.id);
            var taVoice = ta.voice.channel;

            // check that the ta is in a voice channel
            if (taVoice === null || taVoice === undefined) {
                taChannel.send('<@' + user.id + '> Please join a voice channel to assist hackers.').then(msg => msg.delete({ timeout: 5000 }));
                return;
            }

            // check that there is someone to help
            if (waitlist.array().length === 0) {
                taChannel.send('<@' + user.id + '> No one to help right now!').then(msg => msg.delete({ timeout: 5000 }));
                return;
            }

            // get next user
            var hackerKey = waitlist.firstKey();
            waitlist.delete(hackerKey);
            var hacker = message.guild.member(hackerKey);

            // if status mentor in use there are no hackers in list
            if (hacker === undefined) {
                taChannel.send('<@' + user.id + '> There are no hackers in need of help!').then(msg => msg.delete({ timeout: 5000 }));
                return;
            }

            try {
                hacker.voice.setChannel(taVoice);
                discordServices.sendMessageToMember(hacker, 'TA is ready to help you! You are with them now!', true);
                taChannel.send('<@' + user.id + '> A hacker was moved to your voice channel! Thanks for your help!!!').then(msg => msg.delete({ timeout: 5000 }));
            } catch (err) {
                discordServices.sendMessageToMember(hacker, 'A TA was ready to talk to you, but we were not able to pull you to their voice ' +
                    'voice channel. Try again and make sure you are in the general voice channel!');
                taChannel.send('<@' + user.id + '> We had someone that needed help, but we were unable to move them to your voice channel. ' +
                    'They have been notified and skipped. Please help someone else!').then(msg => msg.delete({ timeout: 8000 }));
            }

            // remove hacker from the embed list
            taConsole.edit(taConsole.embeds[0].spliceFields(0, 1));
        });

        // report success of workshop creation
        discordServices.replyAndDelete(message, 'Activity named: ' + activityName + ' now has workshop functionality.');
    }

};