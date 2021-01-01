const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Collection = require('discord.js');

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
                    key: 'option',
                    prompt: 'type "start" to start Discord contests, "pause" to pause, "edit" to edit questions or time',
                    type: 'string',
                },
            ],
        },
        {
            roleID: discordServices.staffRole,
            roleMessage: 'Hey there, the command !contests is only available to Staff!',
        });
    }

    //exact answer, no mispellings, and run commands one interval before we want it to start
    async runCommand(message, {option}) {
        if (option === 'start') {
            var listOfQ = new Map([
                ['q0', ["ao","a0"]], 
                ['q1', "a1"], 
                ['q2', "a2"],
            ]);
            var inbetween = 1000 * 20;
            const winners = [];
            var keys = listOfQ.keys();
            var interval = setInterval(function() {
                var nextQ = keys.next().value;
                if (nextQ != null) {
                 message.channel.send(nextQ);
                 const filter = m => !m.author.bot;
                 const collector = message.channel.createMessageCollector(filter, {time: 1000 * 15});
                 collector.on('collect', m => {
                     if (Array.isArray(listOfQ.get(nextQ))) {
                        if (listOfQ.get(nextQ).some(correctAnswer => m.content.toLowerCase().includes(correctAnswer))) {
                            message.channel.send("Congrats <@" + m.author.id + "> for getting the correct answer! The answer key is " + listOfQ.get(nextQ)[listOfQ.get(nextQ).length - 1] + ".");
                            winners.push(m.author.id);
                            collector.stop();
                        }
                     } else {
                        if (listOfQ.get(nextQ) == m.content.toLowerCase()) {
                            message.channel.send("Congrats <@" + m.author.id + "> for getting the correct answer!");
                            winners.push(m.author.id);
                            collector.stop();
                        }
                     }
                 });

                 collector.on('end', collected => {
                    const time = new Date();
                    const nextQTime = time.valueOf() + inbetween;
                     message.channel.send("Answers are no longer being taken. Stay tuned for the next question at " + new Date(nextQTime) + " !");
                 });
                } else {
                    discordServices.discordLog(message.guild,"Discord contests have ended! Winners are: <@" + winners.join('> <@') + ">");
                    clearInterval(interval);
                }
            }, inbetween); //change time interval for deployment

        } else if (option === 'pause') {
            //pause
        } else if (option === 'edit') {
            //edit
        }
    }
}