const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const { messagePrompt, numberPrompt, yesNoPrompt } = require('../../classes/prompt');
const { getQuestion } = require('../../firebase-services/firebase-services');

var interval;

/**
 * The DiscordContests class handles all functions related to Discord contests. It will ask questions in set intervals and pick winners
 * based on keywords for those questions that have correct answers. For other questions it will tag staff and staff will be able to tell
 * it the winner. It can also be paused and unpaused, and questions can be removed.
 * 
 * Note: all answers are case-insensitive but any extra or missing characters will be considered incorrect.
 */
module.exports = class DiscordContests extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'contests',
            group: 'a_utility',
            memberName: 'handle discord contests',
            description: 'Sends each Discord contest question once at designated times and determines winners.',
            guildOnly: true,
        },
            {
                roleID: discordServices.staffRole,
                roleMessage: 'Hey there, the command !contests is only available to Staff!',
            });
    }

    /**
     * Stores a map which keeps the questions (strings) as keys and an array of possible answers (strings) as values. It iterates through
     * each key in order and asks them in the Discord channel in which it was called at the given intervals. It also listens for emojis
     * that tell it to pause, resume, or remove a specified question. 
     * @param {message} message - the message in which this command was called
     */
    async runCommand(message) {
        //ask user for time interval between questions
        var timeInterval;
        // await numberPrompt('What is the time interval between questions in minutes (integer only)? ', message.channel, message.author.id)
        //     .then((minutes) => {
        //         if (minutes != null) {
        //             timeInterval = 1000 * 60 * minutes;
        //         } else {
        //             return;
        //         }
        //     });
        let num = await numberPrompt('What is the time interval between questions in minutes (integer only)? ', message.channel, message.author.id);
        if (num != null) timeInterval = 1000 * 60 * num;
        else return;

        // ask user whether to start asking questions now(true) or after 1 interval (false)
        var startNow;
        let bool = await yesNoPrompt('Type "yes" to start first question now, "no" to start one time interval from now. ', message.channel, message.author.id)
        if (bool != null) startNow = bool;
        else return;

        //id of role to mention when new questions come out
        var role;
        let msg = await messagePrompt('What is the hacker role to notify for Discord contests? Tag it in your next message.', 'string', message.channel, message.author.id, 15)
        if (msg != null && msg.mentions.roles.first() != null) {
            role = msg.mentions.roles.first().id;
        } else if (msg.mentions.roles.first() == null) {
            message.channel.send('No role mentions detected! Please try again.')
                .then((msg) => msg.delete({ timeout: 3000 }));
            return;
        } else {
            return;
        }
        //paused keeps track of whether it has been paused
        var paused = false;
        //all correct answers are listed in the arrays that are the values; any that cannot be automatically marked have an empty array
        // var listOfQ = new Map([
        //     ['What is the command to exit Vim?', [":wq", ":q"]],
        //     ['What is the name of the Linux mascot?', ['tux']],
        //     ['Draw the nwPlus logo in 1 pen stroke.', []],
        //     ['In "The Office", who teams up with Dwight to prank Jim into giving them a week\'s supply of meatballs?', ['stanley']],
        //     ['Who invented the Java programming language?', ['james gosling']],
        //     ['What is nwPlus\' next hackathon after nwHacks?', ['cmd-f']],
        //     ['Draw your team out. We\'ll pick the funniest picture.', []],
        //     ['What does the MEAN web-stack acronym stand for?', ['mongodb', 'express', 'angularjs', 'node.js']],
        //     ['What ancestral and unceded Indigenous territory is UBC\'s Vancouver Campus situated on?', ['musqueam']],
        //     ['What does a 503 error code mean?', ['service unavailable']],
        //     ['Who created Flutter?', ['google']],
        //     ['What is the capital of Uruguay?', ['montevideo']],
        //     ['What is Dumbledore\'s full name?', ['albus wulfric percival brian dumbledore']],
        //     ['Which of these is not a white wine: Pinot Grigio, Zifandel, Chardonnay?', ['zifandel']],
        //     ['Take a picture of your lunch.', []],
        //     ['What is the strongly-typed and compiled alternative of JavaScript called?', ["typescript"]],
        //     ['What is CocoaPods?', []],
        //     ['Which is the oldest web front-end framework: Angular, React or Vue?', ['angular']],
        //     ['Complete the Star Wars line: Hello there! ______ ______. (2 words)', ['general kenobi']],
        //     ['Give your best tech pickup line.', []],
        // ]);
        //array of winners' ids
        const winners = [];
        var string;
        if (startNow) {
            string = "Discord contests starting now! Answer for a chance to win a prize!";
        } else {
            const time = new Date();
            //calculate time till next interval to display as the start time if startNow is false
            const nextQTime = time.valueOf() + timeInterval;
            let options = { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'};
            var nextTime = new Date(nextQTime).toLocaleString('en-US', options);
            string = "Discord contests starting at " + nextTime + "! Answer for a chance to win a prize!";
        }
        const startEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle(string)
            .setDescription('Note: Questions that have correct answers are non-case sensitive but any extra or missing symbols will be considered incorrect.\n' +
                'For Staff only:\n' +
                '⏸️ to pause\n' +
                '⏯️ to resume\n');

        message.channel.send('<@&' + role + '>', { embed: startEmbed }).then((msg) => {
            msg.pin();
            msg.react('⏸️');
            msg.react('⏯️');
            //filters so that it will only respond to Staff who reacted with one of the 3 emojis 
            const emojiFilter = (reaction, user) => (reaction.emoji.name === '⏸️' || reaction.emoji.name === '⏯️' || reaction.emoji.name === '⛔') && message.guild.member(user).roles.cache.has(discordServices.staffRole);
            const emojicollector = msg.createReactionCollector(emojiFilter);
            emojicollector.on('collect', (reaction, user) => {
                reaction.users.remove(user.id);
                if (reaction.emoji.name === '⏸️') {
                    //if it isn't already paused, pause by clearing the interval
                    if (interval != null && !paused) {
                        clearInterval(interval);
                        paused = true;
                    }
                } else if (reaction.emoji.name === '⏯️') {
                    //if it is currently paused, restart the interval and send the next question immediately
                    if (paused) {
                        sendQuestion();
                        interval = setInterval(sendQuestion, timeInterval);
                        paused = false;
                    }
                } 
            });
        })

        //starts the interval, and sends the first question immediately if startNow is true
        if (startNow) {
            sendQuestion();
        }
        interval = setInterval(sendQuestion, timeInterval);

        /**
         * sendQuestion is the function that picks and sends the next question, then picks the winner by matching participants' messages
         * against the answer(s) or receives the winner from Staff. Once it reaches the end it will notify Staff in the Logs channel and
         * list all the winners in order.
         */
        async function sendQuestion() {
            //get question's parameters from db 
            var data = await getQuestion();
            if (data != null) {
                var question = data['question'];
                var answers = data['answers'];
                var needAllAnswers = data['needAllAnswers'];
                const qEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.embedColor)
                    .setTitle('A new Discord Contest Question:')
                    .setDescription(question);
                if (answers.length == 0) {
                    qEmbed.setDescription(question + '\n' + 'Staff: click the 👑 emoji to announce a winner!');
                }

                await message.channel.send('<@&' + role + '>', { embed: qEmbed }).then((msg) => {
                    if (answers.length == 0) {
                        msg.react('👑');
                        //if it cannot be automatically marked, notify Staff and start listening for the crown emoji
                        message.channel.send("<@&" + discordServices.staffRole + "> will be manually reviewing answers for this question.");
                        const emojiFilter = (reaction, user) => (reaction.emoji.name === '👑') && message.guild.member(user).roles.cache.has(discordServices.staffRole);
                        const emojicollector = msg.createReactionCollector(emojiFilter);
                        emojicollector.on('collect', (reaction, user) => {
                            //once someone from Staff hits the crown emoji, tell them to mention the winner in a message in the channel
                            reaction.users.remove(user.id);

                            messagePrompt('Pick a winner for the previous question by mentioning them in your next message in this channel!', 'string', message.channel, user.id, 20)
                                .then(msg => {
                                    if (msg != null && msg.mentions.members.first() != null) {
                                        winners.push(msg.mentions.members.first().id);
                                        message.channel.send("Congrats <@" + msg.mentions.members.first().id + "> for the best answer to the previous question!");
                                        emojicollector.stop();
                                    }
                                });
                        });
                    } else {
                        //automatically mark answers
                        const filter = m => !m.author.bot;
                        const collector = message.channel.createMessageCollector(filter, { time: timeInterval * 0.75 });
                        collector.on('collect', m => {
                            if (!needAllAnswers) {
                                //for most questions, an answer that contains at least once item of the answer array is correct
                                if (answers.some(correctAnswer => m.content.toLowerCase().includes(correctAnswer))) {
                                    message.channel.send("Congrats <@" + m.author.id + "> for getting the correct answer! The answer key is " + answers.join(' or ') + ".");
                                    winners.push(m.author.id);
                                    collector.stop();
                                }
                            } else {
                                //check if all answers in answer array are in the message
                                if (answers.every((answer) => m.content.toLowerCase().includes(answer))) {
                                    message.channel.send("Congrats <@" + m.author.id + "> for getting the correct answer! The answer key is " + answers.join(' or ') + ".");
                                    winners.push(m.author.id);
                                    collector.stop();
                                };
                            }
                        });

                        collector.on('end', collected => {
                            message.channel.send("Answers are no longer being accepted. Stay tuned for the next question!");
                        });
                    }
                });
            } else {
                //sends results to Staff after all questions have been asked and stops looping
                await discordServices.discordLog(message.guild, "<@&" + discordServices.staffRole + "> Discord contests have ended! Winners are: <@" + winners.join('> <@') + ">");
                clearInterval(interval);
            }
        }
    }
}
