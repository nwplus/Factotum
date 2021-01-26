// Discord.js commando requirements
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Activity = require('../../classes/activity');
const ActivityCommand = require('../../classes/activity-command');

// Command export
module.exports = class InitWorkshop extends ActivityCommand {
    constructor(client) {
        super(client, {
            name: 'initw',
            group: 'a_activity',
            memberName: 'initialize workshop funcitonality for activity',
            description: 'Will initialize the workshop functionality for the given workshop. General voice channel will be muted for all hackers.',
            guildOnly: true,
        });
    }

    /**
     * Required class by children, should contain the command code.
     * @param {Message} message - the message that has the command
     * @param {Activity} activity - the activity for this activity command
     */
    async activityCommand(message, activity) {

        let channels = await activity.makeWorkshop();

        let taChannel = channels.taChannel;
        let assistanceChannel = channels.assistanceChannel;

    // important variables and embeds
        // pullInFunctionality is default to true
        var pullInFunctonality = true;

        ////// TA Side
        // embed color for mentors
        var mentorColor = (await message.guild.roles.fetch(discordServices.mentorRole)).color;

        const taInfoEmbed = new Discord.MessageEmbed()
            .setTitle('TA Information')
            .setDescription('Please read this before the workshop starts!')
            .addField('Create Private Channels', 'If you can only see one voice channel called activity room, go to the staff console and add voice channels to this activity.')
            .addField('Keep Track Of', '* The wait list will udpate but won\'t notify you about it. Keep an eye on it!\n *The activity-banter channel for any questions!')
            .addField('Low Tech Solution', '* React to this message with 🤡 to enable the low tech solution! \n* This solution will disable the public voice channel ' +
            ' and disable the pull in functionality. \n* TAs will have to DM hackers that need help and then react to the wait list.')
            .setColor(mentorColor);
        taChannel.send(taInfoEmbed).then(msg => {
            msg.pin();

            msg.react('🤡');

            msg.awaitReactions((reaction, user) => !user.bot && reaction.emoji.name === '🤡', {max: 1}).then(collected => {
                // hide general voice channel
                var name = generalVoice.name;
                generalVoice.setName('HIDDEN-' + name).catch(console.error);
                generalVoice.updateOverwrite(discordServices.attendeeRole, {VIEW_CHANNEL: false});
                generalVoice.updateOverwrite(discordServices.sponsorRole, {VIEW_CHANNEL: false});

                // disable pull in functionality
                pullInFunctonality = false;

                // let TAs know about the change!
                taChannel.send('Low tech solution has been turned on!').then(msg => msg.delete({timeout: 5000}));
                msg.edit(msg.embeds[0].addField('Low Tech Solution Is On', 'To give assistance: \n* Send a DM to the highers member on the wait list \n* Then click on the emoji to remove them from the list!'));
                helpChannel.send(new Discord.MessageEmbed().setColor(discordServices.colors.embedColor).setTitle('Quick Update!').setDescription('You do not need to join the ' +  activity.activityInfo.generalVoiceChannelName + ' voice channel. TAs will send you a DM when they are ready to assist you!'));
            });
        });
        
        const consoleEmbed = new Discord.MessageEmbed()
            .setColor(mentorColor)
            .setTitle('Polling and Stamp Console')
            .setDescription('Here are some common polls you might want to use!')
            .addField('Stamp Distribution', '📇 Will activate a stamp distribution that will be open for ' + discordServices.stampCollectTime + ' seconds.')
            .addField('Speed Poll', '🏎️ Will send an embedded message asking how the speed is.')
            .addField('Difficulty Poll', '🎓 Will send an embedded message asking how the difficulty is.')
            .addField('Explanation Poll', '🧑‍🏫 Will send an embedded message asking how good the explanations are.');
        
        // send message
        taChannel.send(consoleEmbed).then((msg) => {
            msg.pin();

            var emojis = ['📇', '🏎️', '🎓', '🧑‍🏫'];

            emojis.forEach(emoji => msg.react(emoji));

            const collector = msg.createReactionCollector((reaction, user) => !user.bot && emojis.includes(reaction.emoji.name));

            collector.on('collect', async (reaction, user) => {
                var commandRegistry = this.client.registry;

                // emoji name
                var emojiName = reaction.emoji.name;

                // remove new reaction
                reaction.users.remove(user.id);

                if (emojiName === emojis[0]) {
                    commandRegistry.findCommands('distribute-stamp', true)[0].run(message, activity, { timeLimit: discordServices.stampCollectTime });
                } else if (emojiName === emojis[1]) {
                    commandRegistry.findCommands('workshop-polls', true)[0].run(message, activity, { question: 'speed' });
                } else if (emojiName === emojis[2]) {
                    commandRegistry.findCommands('workshop-polls', true)[0].run(message, activity, { question: 'difficulty'});
                } else if (emojiName === emojis[3]) {
                    commandRegistry.findCommands('workshop-polls', true)[0].run(message, activity, { question: 'explanations'});
                }
            });
        });

        // embed message for TA console
        const taEmbed = new Discord.MessageEmbed()
            .setColor(mentorColor)
            .setTitle('Hackers in need of help waitlist')
            .setDescription('* Make sure you are on a private voice channel not the general voice channel \n* To get the next hacker that needs help click 🤝');

        // send taConsole message and react with emoji
        var taConsole = await taChannel.send(taEmbed).catch(console.error);
        taConsole.pin();
        taConsole.react('🤝');

    // Hacker Side
        // message embed for helpChannel
        const helpEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.colors.embedColor)
            .setTitle(activity.name + ' Help Desk')
            .setDescription('Welcome to the ' + activity.name + ' help desk. There are two ways to get help explained below:')
            .addField('Simple or Theoretical Questions', 'If you have simple or theory questions, use the !ask command on the text channel ' + '<#' + activity.generalText.id + '>' + '!')
            .addField('Advanced Question or Code Assistance', 'If you have a more advanced question, or need code assistance, click the 🧑🏽‍🏫 emoji for live TA assistance! Join the ' +  activity.activityInfo.generalVoiceChannelName + ' voice channel if not already there!');

        // send message with embed and react with emoji
        var helpMessage = await assistanceChannel.send(helpEmbed);
        helpMessage.pin();
        helpMessage.react('🧑🏽‍🏫');

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
            var qPromt = await helpChannel.send('<@' + user.id + '> Please send to this channel a one-liner of your problem or question. You have 20 seconds to respond').catch(console.error);

            helpChannel.awaitMessages(m => m.author.id === user.id, { max: 1, time: 20000, error:['time'] }).then(async msgs => {
                // get question
                var question = msgs.first().content;

                const hackerEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.colors.embedColor)
                    .setTitle('Hey there! We got you signed up to talk to a TA!')
                    .setDescription('You are number: ' + position + ' in the wait list.')
                    .addField(pullInFunctonality ? 'JOIN THE VOICE CHANNEL!' : 'KEEP AN EYE ON YOUR DMs', 
                    pullInFunctonality ? 'Sit tight in the voice channel. If you are not in the voice channel when its your turn you will be skipped, and we do not want that to happen!' :
                    'A TA will reach out to you soon via DM! Have your question ready and try to keep up with the workshop until then!');

                discordServices.sendMessageToMember(user, hackerEmbed);

                // update message embed with new user in list
                taConsole.edit(taConsole.embeds[0].addField(user.username, '<@' + user.id + '> has the question:' +  question));
                // send a quick message to let ta know a new user is on the wait list
                taChannel.send('A new hacker needs help!').then(msg => msg.delete({timeout: 3000}));

                // delete promt and user msg
                qPromt.delete();
                msgs.each(msg => msg.delete());
            }).catch(() => {
                qPromt.delete();
                helpChannel.send('<@' + user.id + '> Time is up! Write up your message and react again!').then(msg => msg.delete({timeout: 3000}));
            });
        });

        // add reacton to get next in this message!
        const getNextCollector = taConsole.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === '🤝');

        getNextCollector.on('collect', (reaction, user) => {
            // remove the reaction
            reaction.users.remove(user.id);

            // check that there is someone to help
            if (waitlist.array().length === 0) {
                taChannel.send('<@' + user.id + '> No one to help right now!').then(msg => msg.delete({ timeout: 5000 }));
                return;
            }

            // if pullInFunctionality is turned off then then just remove from list
            if (!pullInFunctonality) {
                // remove hacker from wait list
                var hackerKey = waitlist.firstKey();
                waitlist.delete(hackerKey);

            } else {
                // grab the ta and their voice channel
                var ta = message.guild.member(user.id);
                var taVoice = ta.voice.channel;

                // check that the ta is in a voice channel
                if (taVoice === null || taVoice === undefined) {
                    taChannel.send('<@' + user.id + '> Please join a voice channel to assist hackers.').then(msg => msg.delete({ timeout: 5000 }));
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
            }

            // remove hacker from the embed list
            taConsole.edit(taConsole.embeds[0].spliceFields(0, 1));
        });

        // report success of workshop creation
        discordServices.replyAndDelete(message, 'Activity named: ' + activity.name + ' now has workshop functionality.');
    }

};