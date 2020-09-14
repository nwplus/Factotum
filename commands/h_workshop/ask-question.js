// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class AskQuestion extends Command {
    constructor(client) {
        super(client, {
            name: 'askquestion',
            group: 'h_workshop',
            memberName: 'ask a question to the ta team',
            description: 'Will add a question to the workshop question list and notify TAs about the question.',
            guild: true,
            args: [
                {
                    key: 'question',
                    prompt: 'Question to ask the TAs',
                    type: 'string',
                }
            ],
        });
    }

    // Run function -> command body
    async run(message, {question}) {
                
        message.delete();

        // only memebers with the Hacker tag can run this command!
        if (discordServices.checkForRole(message.member, discordServices.attendeeRole)) {
                
            // name of user
            var username = message.member.user.username;       
            
            // get workshop name
            var workshop = message.channel.name;

            var index = workshop.indexOf('text');

            // check if the channel is a workshop text channel
            if(index != -1) {
                workshop = workshop.slice(0, index - 1);

                var status = await firebaseServices.addQuestionTo(workshop, question, username);

                // If the user is alredy in the waitlist then tell him that
                if (status === firebaseServices.status.FAILURE) {
                    discordServices.sendMessageToMember(message.member, 'Hey there! This command can not be used because the TA functionality is not in use for this workshop');
                } else {
                    discordServices.sendMessageToMember(message.member, 'Hey there! We got your question! Expect an answer from one of our TAs soon or for it to be answered during '
                    + 'the workshop! If you need emidiate help please ask to see a TA.');

                    // get ta console
                    var channel = await message.guild.channels.cache.find(channel => channel.name === workshop + '-ta-console');
                    var finalMessage = await channel.send('A new quesiton has been asked: ' + question + '. Please react to this message to start a conversation.');
                    await finalMessage.react('✅');
                    const filter = (reaction, user) => {
                        return reaction.emoji.id === '✅';
                    }

                    var collector = await finalMessage.createReactionCollector(filter, {time : 10000, max : 2});
                    console.log(collector);
                    collector.on('collect', (reaction, user) => {
                        console.log('reacted by: ' + user.tag);
                        //this.stop(); 
                    });

                }
            }
        }    
    }

};