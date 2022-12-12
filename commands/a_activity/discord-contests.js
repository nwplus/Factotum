const { Command } = require('@sapphire/framework');
const { discordLog, checkForRole } = require('../../discord-services');
const { Message, MessageEmbed, Snowflake, MessageActionRow, MessageButton, ButtonStyle } = require('discord.js');
const { getQuestion, lookupById } = require('../../db/firebase/firebase-services');
const BotGuild = require('../../db/mongo/BotGuild')
const BotGuildModel = require('../../classes/Bot/bot-guild');
const { NumberPrompt, SpecialPrompt, RolePrompt, MemberPrompt } = require('advanced-discord.js-prompts');
// const fs = require('fs');

/**
 * The DiscordContests class handles all functions related to Discord contests. It will ask questions in set intervals and pick winners
 * based on keywords for those questions that have correct answers. For other questions it will tag staff and staff will be able to tell
 * it the winner. It can also be paused and un-paused, and questions can be removed.
 * 
 * Note: all answers are case-insensitive but any extra or missing characters will be considered incorrect.
 * @category Commands
 * @subcategory Activity
 * @extends Command
 * @guildonly
 */
class DiscordContests extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Start discord contests.'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addIntegerOption(option =>
                    option.setName('interval')
                        .setDescription('Time (minutes) between questions')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('notify')
                        .setDescription('Role to notify when a question drops')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('start_question_now')
                        .setDescription('True to start first question now, false to start it after one interval')
                        .setRequired(false))
        )
    }

    /**
     * Stores a map which keeps the questions (strings) as keys and an array of possible answers (strings) as values. It iterates through
     * each key in order and asks them in the Discord channel in which it was called at the given intervals. It also listens for emojis
     * that tell it to pause, resume, or remove a specified question. 
     * @param {BotGuildModel} this.botGuild
     * @param {Message} message - the message in which this command was called
     */
    async chatInputRun(interaction) {
        // helpful prompt vars
        let channel = interaction.channel;
        let userId = interaction.user.id;
        // this.botGuild = this.botGuild;
        let guild = interaction.guild;
        this.botGuild = await BotGuild.findById(guild.id);
        let adminConsole = guild.channels.resolve(this.botGuild.channelIDs.adminConsole);

        var interval;

        //ask user for time interval between questions
        var timeInterval = interaction.options.getInteger('interval') * 60000;
        var startNow = interaction.options.getBoolean('start_question_now');
        var roleId = interaction.options.getRole('notify');

        if (!guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.staffRole) && !guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.adminRole)) {
            return this.error({ message: 'You do not have permissions to run this command!' })
        }
        // try {
        //     let num = await NumberPrompt.single({prompt: 'What is the time interval between questions in minutes (integer only)? ', channel, userId, cancelable: true});
        //     timeInterval = 1000 * 60 * num;

        //     // ask user whether to start asking questions now(true) or after 1 interval (false)
        //     var startNow = await SpecialPrompt.boolean({prompt: 'Type "yes" to start first question now, "no" to start one time interval from now. ', channel, userId, cancelable: true});

        //     // id of role to mention when new questions come out
        //     var roleId = (await RolePrompt.single({prompt: 'What role should I notify with a new Discord contest is available?', channel, userId})).id;
        // } catch (error) {
        //     channel.send('<@' + userId + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
        //     return;
        // }

        //paused keeps track of whether it has been paused
        var paused = false;

        /**
         * array of winners' ids
         * @type {Array<Snowflake>}
         */
        const winners = [];

        var string = 'Discord contests starting soon! Answer questions for a chance to win prizes!'

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('play')
                    .setLabel('Play')
                    .setStyle('PRIMARY'),
            )
            .addComponents(
                new MessageButton()
                    .setCustomId('pause')
                    .setLabel('Pause')
                    .setStyle('PRIMARY'),
            );

        await adminConsole.send({ content: 'Discord contests started by <@' + userId + '>', components: [row] });
        const filter = i => !i.user.bot && (guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.staffRole) || guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.adminRole));
        const collector = adminConsole.createMessageComponentCollector(filter);
        collector.on('collect', async i => {
            console.log('collector')
            if (interval != null && !paused && i.customId == 'pause') {
                console.log('pause')
                clearInterval(interval);
                paused = true;
                await guild.channels.resolve(this.botGuild.channelIDs.adminLog).send('Discord contest paused by <@' + i.user.id + '>!')
                await i.reply('<@' + i.user.id + '> Discord contest has been paused!');
            } else if (paused && i.customId == 'play') {
                console.log('play')
                sendQuestion(this.botGuild);
                interval = setInterval(sendQuestion, timeInterval, this.botGuild);
                paused = false;
                await guild.channels.resolve(this.botGuild.channelIDs.adminLog).send('Discord contest restarted by <@' + i.user.id + '>!');
                await i.reply('<@' + i.user.id + '> Discord contest has been un-paused!');
            } else {
                await i.reply({ content: `Wrong button`, ephemeral: true });
            }
        });

        // const playFilter = i => i.customId == 'play' && !i.user.bot && (guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.staffRole) || guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.adminRole));
        // const playCollector = adminConsole.createMessageComponentCollector(playFilter);
        // playCollector.on('collect', async i => {
        //     console.log('play collector')
        //     if (paused) {
        //         sendQuestion(this.botGuild);
        //         interval = setInterval(sendQuestion, timeInterval, this.botGuild);
        //         paused = false;
        //         await guild.channels.resolve(this.botGuild.channelIDs.adminLog).send('Discord contest restarted by <@' + i.user.id + '>!');
        //         await i.reply('<@&' + i.user.id + '> Discord contest has been un-paused!');
        //     }
        // });

        const startEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle(string)
            .setDescription('Note: Short-answer questions are non-case sensitive but any extra or missing symbols will be considered incorrect.');


        channel.send({ content: '<@&' + roleId + '>', embeds: [startEmbed] }).then((msg) => {
            msg.pin();
        });

        //starts the interval, and sends the first question immediately if startNow is true
        if (startNow) {
            sendQuestion(this.botGuild);
        }
        interval = setInterval(sendQuestion, timeInterval, this.botGuild);

        /**
         * sendQuestion is the function that picks and sends the next question, then picks the winner by matching participants' messages
         * against the answer(s) or receives the winner from Staff. Once it reaches the end it will notify Staff in the Logs channel and
         * list all the winners in order.
         */
        async function sendQuestion(botGuild) {
            //get question's parameters from db 
            var data = await getQuestion(guild.id);

            //sends results to Staff after all questions have been asked and stops looping
            if (data === null) {
                discordLog(guild, '<@&' + botGuild.roleIDs.staffRole + '> Discord contests have ended!');
                clearInterval(interval);
                return;
            }

            let question = data.question;
            let answers = data.answers;
            let needAllAnswers = data.needAllAnswers;

            const qEmbed = new MessageEmbed()
                .setTitle('A new Discord Contest Question:')
                .setDescription(question + '\n' + ((answers.length === 0) ? 'Staff: click the 👑 emoji to announce a winner!' :
                    'Exact answers only!'));


            channel.send({ content: '<@&' + roleId + '>' + ((answers.length === 0) ? (' - <@&' + botGuild.roleIDs.staffRole + '> Need manual review!') : ''), embeds: [qEmbed] }).then((msg) => {
                if (answers.length === 0) {
                    msg.react('👑');

                    const emojiFilter = (reaction, user) => !user.bot && (reaction.emoji.name === '👑') && checkForRole(guild.members.cache.get(user), botGuild.roleIDs.staffRole);
                    const emojiCollector = msg.createReactionCollector(emojiFilter);

                    emojiCollector.on('collect', (reaction, user) => {
                        //once someone from Staff hits the crown emoji, tell them to mention the winner in a message in the channel
                        reaction.users.remove(user.id);

                        MemberPrompt.single({ prompt: 'Pick a winner for the previous question by mentioning them in your next message in this channel!', channel: channel, userId: user.id, cancelable: true })
                            .then(member => {
                                winners.push(member.id);
                                channel.send('Congrats <@' + member.id + '> for the best answer to the previous question!');
                                emojiCollector.stop();
                                recordWinner(member);
                            }).catch(() => {
                                msg.channel.send('<@' + user.id + '> You have canceled the prompt, you can select a winner again at any time.').then(msg => msg.delete({ timeout: 8000 }));
                            });
                    });

                    emojiCollector.on('end', () => {
                        channel.send('Answers are no longer being accepted. Stay tuned for the next question!');
                    });
                } else {
                    //automatically mark answers
                    const filter = m => !m.author.bot && (botGuild.verification.isEnabled ? checkForRole(m.member, botGuild.verification.verificationRoles.get('hacker')) : checkForRole(m.member, botGuild.roleIDs.member));
                    const collector = channel.createMessageCollector({ filter, time: timeInterval * 0.75 });

                    collector.on('collect', m => {
                        if (!needAllAnswers) {
                            // for questions that have numbers as answers, the answer has to match at least one of the correct answers exactly
                            if (!isNaN(answers[0])) {
                                if (answers.some(correctAnswer => m.content === correctAnswer)) {
                                    channel.send('Congrats <@' + m.author.id + '> for getting the correct answer! The answer key is ' + answers.join(' or ') + '.');
                                    winners.push(m.author.id);
                                    collector.stop();
                                    recordWinner(m.member);
                                }
                            } else if (answers.some(correctAnswer => m.content.toLowerCase().includes(correctAnswer.toLowerCase()))) {
                                //for most questions, an answer that contains at least once item of the answer array is correct
                                channel.send('Congrats <@' + m.author.id + '> for getting the correct answer! The answer key is ' + answers.join(' or ') + '.');
                                winners.push(m.author.id);
                                collector.stop();
                                recordWinner(m.member);
                            }
                        } else {
                            //check if all answers in answer array are in the message
                            if (answers.every((answer) => m.content.toLowerCase().includes(answer.toLowerCase()))) {
                                channel.send('Congrats <@' + m.author.id + '> for getting the correct answer! The answer key is ' + answers.join(', ') + '.');
                                winners.push(m.author.id);
                                collector.stop();
                                recordWinner(m.member);
                            }
                        }
                    });

                    collector.on('end', () => {
                        channel.send('Answers are no longer being accepted. Stay tuned for the next question!');
                    });
                }
            });
        }

        async function recordWinner(member) {
            try {
                let email = await lookupById(guild.id, member.id)
               discordLog(`Discord contest winner: ${member.id} - ${email}`);
            } catch (error) {
                console.log(error);
            }
        }
    }
}
module.exports = DiscordContests;
