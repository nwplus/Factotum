const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

var interval;

// Command export
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
                    key: 'timeInSeconds',
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

    //exact answer, no mispellings, and run commands one interval before we want it to start
    async runCommand(message, {timeInSeconds, startNow}) {
        const time = new Date();
        var timeInterval = 1000 * timeInSeconds;
        const nextQTime = time.valueOf() + timeInterval;
        var paused = false;
        var listOfQ = new Map([
            ['What is the command to exit Vim?', [":wq", ":q"]],
            ['What is the strongly-typed and compiled alternative of JavaScript called?', ["typescript"]],
            ['Give your best tech pickup line.', []],
        ]);
        const winners = [];
        var keys = listOfQ.keys();
        var string;
        if (startNow) {
            string = "Discord contests starting now!";
        } else {
            string = "Discord contests starting at " + new Date(nextQTime) + " !";
        }
        const startEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle(string);

        message.channel.send(startEmbed).then((msg) => {
            msg.pin();
            const emojiFilter = (reaction, user) => (reaction.emoji.name === '⏸️' || reaction.emoji.name === '⏯️' || reaction.emoji.name === '⛔') && message.guild.member(user).roles.cache.has(discordServices.staffRole);
            const emojicollector = msg.createReactionCollector(emojiFilter);
            //maybe do this in a staff-only channel
            emojicollector.on('collect', (reaction, user) => {
                reaction.users.remove(user.id);
                if (reaction.emoji.name === '⏸️') {
                    if (interval != null) {
                        clearInterval(interval);
                        paused = true;
                    }
                } else if (reaction.emoji.name === '⏯️') {
                    if (paused) {
                        sendQuestion(keys, listOfQ, message, winners);
                        interval = setInterval(sendQuestion, timeInterval, keys, listOfQ, message, winners);
                        paused = false;
                    }
                } else if (reaction.emoji.name === '⛔') {
                    message.channel.send("Enter the question to remove.").then((msg) => {
                        msg.delete({ timeout: 15000 })
                    });
                    const filter = m => m.author === user;
                    const collector = message.channel.createMessageCollector(filter, { max: 1, time: 1000 * 15 });
                    collector.on('collect', m => {
                        if (listOfQ.has(m.content)) {
                            listOfQ.delete(m.content);
                        }
                        m.delete();
                    });
                }
            });
        })

        if (startNow) {
            sendQuestion(keys, listOfQ, message, winners);
        }
        interval = setInterval(sendQuestion, timeInterval, keys, listOfQ, message, winners); //change time interval for deployment

        function sendQuestion(keys, listOfQ, message, winners) {
            var nextQ = keys.next().value;
            if (!listOfQ.has(nextQ) && nextQ != null) {
                nextQ = keys.next().value;
            }
            if (nextQ != null) {
                const qEmbed = new Discord.MessageEmbed()
                    .setColor(discordServices.embedColor)
                    .setTitle(nextQ);

                message.channel.send(qEmbed);
                if (listOfQ.get(nextQ).length == 0) {
                    message.channel.send("<@&" + discordServices.staffRole + "> will be manually reviewing answers for this question.")
                } else {
                    const filter = m => !m.author.bot;
                    const collector = message.channel.createMessageCollector(filter, { time: 1000 * 15 });//change time interval
                    collector.on('collect', m => {
                        if (listOfQ.get(nextQ).some(correctAnswer => m.content.toLowerCase().includes(correctAnswer))) {
                            message.channel.send("Congrats <@" + m.author.id + "> for getting the correct answer! The answer key is " + listOfQ.get(nextQ)[listOfQ.get(nextQ).length - 1] + ".");
                            winners.push(m.author.id);
                            collector.stop();
                        }
                    });

                    collector.on('end', collected => {
                        message.channel.send("Answers are no longer being accepted. Stay tuned for the next question!");
                    });
                }
            } else {
                discordServices.discordLog(message.guild, "<@&" + discordServices.staffRole + "> Discord contests have ended! Winners are: <@" + winners.join('> <@') + ">");
                clearInterval(interval);
            }
        }
    }    
}