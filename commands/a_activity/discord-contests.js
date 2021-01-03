const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const { messagePrompt } = require('../../classes/prompt');

var interval;

/**
 * The DiscordContests class handles all functions related to Discord contests. It will ask questions in set intervals and pick winners
 * based on keywords for those questions that have correct answers. For other questions it will tag staff and staff will be able to tell
 * it the winner. It can also be paused and unpaused, and questions can be removed.
 * 
 * Note: all answers are case-insensitive but any extra or missing characters will be considered incorrect.
 * 
 * Command activated by running !contests with optional arguments
 * @param {string} timeInMinutes - the amount of time between when one question is asked and the next
 * @param {boolean} startNow - if true, the first question will be sent as soon as the command is sent, else it will be sent one interval
 * later
 */
module.exports = class DiscordContests extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'contests',
            group: 'a_utility',
            memberName: 'handle discord contests',
            description: 'Sends each Discord contest question once at designated times and determines winners.',
            guildOnly: true,
            args: [
                {
                    key: 'timeInMinutes',
                    prompt: 'time between questions in minutes',
                    type: 'integer',
                    default: 30,
                },
                {
                    key: 'startNow',
                    prompt: 'True if posting first question now, false if waiting for next interval.',
                    type: 'boolean',
                    default: true,
                },
            ]
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
    async runCommand(message, { timeInMinutes, startNow }) {
        //id of role to mention when new questions come out
        var role;
        await messagePrompt('What is the hacker role to notify for Discord contests? Tag it in your next message.', 'string', message.channel, message.author.id, 15)
        .then((msg) => {
            if (msg != null && msg.mentions.roles.first() != null) {
                role = msg.mentions.roles.first().id;
            } else if (msg.mentions.roles.first() == null) {
                message.channel.send('No role mentions detected! Please try again.');
                return;
            } else {
                return;
            }
        });
        const time = new Date();
        //calculate time till next interval to display as the start time if startNow is false
        var timeInterval = 1000 * 60 * timeInMinutes;
        const nextQTime = time.valueOf() + timeInterval;
        //paused keeps track of whether it has been paused
        var paused = false;
        //all correct answers are listed in the arrays that are the values; any that cannot be automatically marked have an empty array
        var listOfQ = new Map([
            ['What is the command to exit Vim?', [":wq", ":q"]],
            ['What is the name of the Linux mascot?', ['tux']],
            ['Draw the nwPlus logo in 1 pen stroke.', []],
            ['In "The Office", who teams up with Dwight to prank Jim into giving them a week\'s supply of meatballs?', ['stanley']],
            ['Who invented the Java programming language?', ['james gosling']],
            ['What is nwPlus\' next hackathon after nwHacks?', ['cmd-f']],
            ['Draw your team out. We\'ll pick the funniest picture.', []],
            ['What does the MEAN web-stack acronym stand for?', ['mongodb', 'express', 'angularjs', 'node.js']],
            ['What ancestral and unceded Indigenous territory is UBC\'s Vancouver Campus situated on?', ['musqueam']],
            ['What does a 503 error code mean?', ['service unavailable']],
            ['Who created Flutter?', ['google']],
            ['What is the capital of Uruguay?', ['montevideo']],
            ['What is Dumbledore\'s full name?', ['albus wulfric percival brian dumbledore']],
            ['Which of these is not a white wine: Pinot Grigio, Zifandel, Chardonnay?', ['zifandel']],
            ['Take a picture of your lunch.', []],
            ['What is the strongly-typed and compiled alternative of JavaScript called?', ["typescript"]],
            ['What is CocoaPods?', []],
            ['Which is the oldest web front-end framework: Angular, React or Vue?', ['angular']],
            ['Complete the Star Wars line: Hello there! ______ ______. (2 words)', ['general kenobi']],
            ['Give your best tech pickup line.', []],
        ]);
        //array of winners' ids
        const winners = [];
        //iterator of all keys in listOfQ
        var keys = listOfQ.keys();
        var string;
        if (startNow) {
            string = "Discord contests starting now!";
        } else {
            string = "Discord contests starting at " + new Date(nextQTime) + " !";
        }
        const startEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle(string)
            .setDescription('Note: Questions with correct answers are non-case sensitive but any extra or missing symbols will be considered incorrect.\n' +
                'For Staff only:\n' +
                '⏸️ to pause\n' +
                '⏯️ to resume\n' +
                '⛔ to remove a question\n');

        message.channel.send(startEmbed).then((msg) => {
            msg.pin();
            msg.react('⏸️');
            msg.react('⏯️');
            msg.react('⛔');
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
                } else if (reaction.emoji.name === '⛔') {
                    //prompt user in DMs which question to remove
                    user.send("Enter the question to remove. (Needs to be exact including punctuation, refer to the Notion page with the list of questions. Automatically cancels in 30 seconds.)")
                        .then((prompt) => {
                            prompt.channel.awaitMessages(message => message.author.id === user.id, { max: 1, time: 30 * 1000, errors: ['time'] })
                                .then((remove) => {
                                    var removeKey = remove.first().content;
                                    if (listOfQ.has(removeKey)) {
                                        listOfQ.delete(removeKey);
                                        user.send("Deleted \"" + removeKey + "\"");
                                    } else {
                                        user.send("The question isn't in our list!");
                                    }
                                });
                        });
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
            //get next question from iterator
            var nextQ = keys.next().value;
            //if a question has been removed already and there are still more questions, get the next question
            if (!listOfQ.has(nextQ) && nextQ != null) {
                nextQ = keys.next().value;
            }
            //if iterator isn't empty, send it
            if (nextQ != null) {
                const qEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.embedColor)
                    .setTitle(nextQ);
                if (listOfQ.get(nextQ).length == 0) {
                    qEmbed.setDescription('Staff: click the 👑 emoji to announce a winner!');
                }

                await message.channel.send('<@&' + role + '>', {embed: qEmbed}).then((msg) => {
                    if (listOfQ.get(nextQ).length == 0) {
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
                            if (!nextQ.includes('MEAN')) {
                                //for most questions, an answer that contains at least once item of the answer array is correct
                                if (listOfQ.get(nextQ).some(correctAnswer => m.content.toLowerCase().includes(correctAnswer))) {
                                    message.channel.send("Congrats <@" + m.author.id + "> for getting the correct answer! The answer key is " + listOfQ.get(nextQ).join(' or ') + ".");
                                    winners.push(m.author.id);
                                    collector.stop();
                                }
                            } else {
                                //for the question asking about the MEAN acronym, participants need to get all correct
                                if (listOfQ.get(nextQ).every((answer) => m.content.toLowerCase().includes(answer))) {
                                    message.channel.send("Congrats <@" + m.author.id + "> for getting the correct answer! The answer key is " + listOfQ.get(nextQ).join(' or ') + ".");
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
