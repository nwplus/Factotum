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
                }
            ],
        });
    }

    // Run function -> command body
    async run(message, { activityName }) {
        discordServices.deleteMessage(message);

        // make sure command is only used in the admin console
        if (!discordServices.isAdminConsole(message.channel)) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;
        }
        // only memebers with the Hacker tag can run this command!
        if (!(await discordServices.checkForRole(message.member, discordServices.staffRole))) {
            discordServices.replyAndDelete(message, 'You do not have permission for this command, only staff can use it!');
            return;
        }

        // get category
        var category = await message.guild.channels.cache.find(channel => channel.name === activityName);

        // make sure the workshop exists, else return
        if (category === undefined) {
            discordServices.replyAndDelete(message, 'The activity named: ' + activityName + ', does not exist! Did not create voice channels.');
            return;
        }

        // grab general voice and update permission to no speak for attendees
        var generalVoice = await category.children.find(channel => channel.name === activityName + '-general-voice');
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

        firebaseWorkshops.initWorkshop(activityName);

        // create TA console
        var taChannel = await message.guild.channels.create(activityName + '-TA-console', {
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
            ]
        });

        //makes ta console for workshop
        var targetChannel = message.guild.channels.cache.find(channel => channel.name === (activityName + "-ta-console"));
        const consoleEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Main console for ' + activityName)
            .setDescription('Here are some commands:\n' +
                '🏕️ Will activate a stamp distribution that will be open for 20 seconds.\n' +
                '🏎️ Will send an embedded message asking how the speed is.\n' +
                '✍️ Will send an embedded message asking how the difficulty is.\n' +
                '🧑‍🏫 Will send an embedded message asking how good the explanations are.');
        // send message
        targetChannel.send(consoleEmbed).then((msg) => {
            var emojis = ['🏕️', '🏎️', '✍️', '🧑‍🏫'];
            const emojiFilter = (reaction, user) => user.bot != true && emojis.includes(reaction.emoji.name);
            emojis.forEach(emoji => msg.react(emoji));
            const collector = msg.createReactionCollector(emojiFilter);

            collector.on('collect', async (reaction, user) => {
                var commandRegistry = this.client.registry;

                // emoji name
                var emojiName = reaction.emoji.name;

                // remove new reaction
                reaction.users.remove(user.id);

                if (emojiName === emojis[0]) {
                    commandRegistry.findCommands('distribute-stamp', true)[0].run(message, { activityName: activityName, timeLimit: 20 });
                } else if (emojiName === emojis[1]) {
                    commandRegistry.findCommands('workshop-polls', true)[0].run(message, { activityName: activityName, question: 'speed' });
                } else if (emojiName === emojis[2]) {
                    commandRegistry.findCommands('workshop-polls', true)[0].run(message, { activityName: activityName, question: 'difficulty' });
                } else if (emojiName === emojis[3]) {
                    commandRegistry.findCommands('workshop-polls', true)[0].run(message, { activityName: activityName, question: 'explanations' });
                }
            });
        })


        // embed message for TA console
        const taEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('The Wait List')
            .setDescription('This is the wait list, it will always stay up to date! To get the next hacker that needs help click 🤝');

        // send taConsole message and react with emoji
        var taConsole = await taChannel.send(taEmbed);
        await taConsole.react('🤝');

        // create question and help channel for hackers
        var helpChannel = await message.guild.channels.create(activityName + '-assistance', { type: 'text', parent: category });

        // message embed for helpChannel
        const helpEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle(activityName + ' Help Desk')
            .setDescription('Welcome to the ' + activityName + ' help desk. There are two ways to get help explained below:')
            .addField('Simple or Theoretical Questions', 'If you have simple or theory questions, use the !ask command here!')
            .addField('Advanced Question or Code Assistance', 'If you have a more advanced question, or need code assistance, click the 🧑🏽‍🏫 emoji for in-person TA assistance!');

        // send message with embed and react with emoji
        var helpMessage = await helpChannel.send(helpEmbed);
        await helpMessage.react('🧑🏽‍🏫');

        // filter collector and event handler for help emoji from hackers
        const helpFilter = (reaction, user) => user.bot === false && reaction.emoji.name === '🧑🏽‍🏫';

        const helpCollector = helpMessage.createReactionCollector(helpFilter);

        helpCollector.on('collect', async (reaction, user) => {
            // remove the emoji
            reaction.users.remove(user.id);

            // collect the question the hacker has
            const questionFilter = m => m.author.id === user.id;

            var qPromt = await helpChannel.send('<@' + user.id + '> Please send to this channel a one-liner of your problem or question. You have 10 seconds to respond');

            helpChannel.awaitMessages(questionFilter, { max: 1, time: 10000,error:['time'] }).then(async msgs => {
                // get question
                var question = msgs.first().content;

                // add hacker to list via firebase
                var response = await firebaseWorkshops.addHacker(activityName, user.username);
                var status = response[0];
                var position = response[1];

                // If the user is alredy in the waitlist then tell him that
                if (status === firebaseServices.status.HACKER_IN_USE) {
                    discordServices.sendMessageToMember(user, 'Hey there! It seems you are already on the wait list, if you would like to ' +
                        'know your spot please run the !requestposition command right here!', true);
                } else if (status === firebaseServices.status.FAILURE) {
                    discordServices.sendMessageToMember(user, 'Hey there! This command can not be used because the TA functionality is not in use for this workshop', true);
                } else {
                    discordServices.sendMessageToMember(user, 'Hey there! We got you signed up to talk to a TA! Sit tight in the voice channel. If you ' +
                        'are not in the voice channel when its your turn you will be skipped, and we do not want that to happen! You are number: ' + position + ' in the wait list.');

                    // update message embed with new user in list
                    var embed = taConsole.embeds[0];
                    taConsole.edit(embed.addField('#' + embed.fields.length + ' ' + user.username, question));
                }

                // delete promt and user msg
                qPromt.delete();
                msgs.first().delete();
            })
            .catch (() => {
                qPromt.delete();
            })
        });

        // add reacton to get next in this message!
        const getNextFilter = ((reaction, user) => user.bot === false && reaction.emoji.name === '🤝');

        const getNextCollector = taConsole.createReactionCollector(getNextFilter);

        getNextCollector.on('collect', async (reaction, user) => {
            // remove the reaction
            reaction.users.remove(user.id);

            // grab the ta and their voice channel
            var ta = await message.guild.members.fetch(user.id);
            var taVoice = ta.voice.channel;

            // check that the ta is in a voice channel
            if (taVoice === null) {
                taChannel.send('<@' + user.id + '> Please join a voice channel to assist hackers.').then(msg => msg.delete({ timeout: 5000 }));
                return;
            }

            var userNameOrStatus = await firebaseWorkshops.getNext(activityName);

            // if status mentor in use there are no hackers in list
            if (userNameOrStatus === firebaseServices.status.MENTOR_IN_USE) {
                taChannel.send('<@' + user.id + '> There are no hackers in need of help!').then(msg => msg.delete({ timeout: 5000 }));
                return;
            }

            // get hacker guild member, we know its username
            var hacker = await message.guild.members.cache.find(member => member.user.username === userNameOrStatus);

            // try to add user to voice channel
            var isAdded = false;

            try {
                hacker.voice.setChannel(taVoice);
                isAdded = true;
                discordServices.sendMessageToMember(hacker, 'TA is ready to help you! You are with them now!');
            } catch (err) {
                discordServices.sendMessageToMember(hacker, 'A TA was ready to talk to you, but we were not able to pull you to their voice ' +
                    'voice channel. Try again and make sure you are in the general voice channel!');
            }

            // let TA know if hacker was moved or not
            if (isAdded) {
                taChannel.send('<@' + user.id + '> A hacker was moved to your voice channel! Thanks for your help!!!').then(msg => msg.delete({ timeout: 5000 }));
            } else {
                taChannel.send('<@' + user.id + '> We had someone that needed help, but we were unable to move them to your voice channel. ' +
                    'They have been notified and skipped. Please help someone else!').then(msg => msg.delete({ timeout: 8000 }));
            }

            // remove hacker from the embed list
            var embed = taConsole.embeds[0];
            embed.fields = embed.fields.filter(field => !field.name.includes('#0'));
            taConsole.edit(embed);
        });

        // report success of workshop creation
        discordServices.replyAndDelete(message, 'Activity named: ' + activityName + ' now has workshop functionality.');
    }

};