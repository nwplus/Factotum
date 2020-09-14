// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class AskForHelp extends Command {
    constructor(client) {
        super(client, {
            name: 'askta',
            group: 'h_workshop',
            memberName: 'request for ta help',
            description: 'Will add user to TA help list',
            guild: true,
            args: [],
        });
    }

    // Run function -> command body
    async run(message) {
                
        message.delete();

        // only memebers with the Hacker tag can run this command!
        if (discordServices.checkForRole(message.member, discordServices.hackerRole)) {
                
            // name of user
            var username = message.member.user.username;       
            
            // get workshop name
            var workshop = message.channel.name;

            workshop = workshop.slice(0, workshop.indexOf('text') - 1);

            var status = await firebaseServices.addToTAHelp(workshop, username);

            // If the user is alredy in the waitlist then tell him that
            if (status === firebaseServices.status.HACKER_IN_USE) {
                discordServices.sendMessageToMember(message.member, 'Hey there! It seems you are already on the wait list, if you would like to ' +
                'know your spot please run the !requestposition command right here!');
            } else if (status === firebaseServices.status.FAILURE) {
                discordServices.sendMessageToMember(message.member, 'Hey there! This command can not be used because the TA functionality is not in use for this workshop');
            } else {
                discordServices.sendMessageToMember(message.member, 'Hey there! We got you singed up to talk to a TA! Sit tight in the voice channel. If you ' +
                'are not in the voice channel when its your turn you will be skipped, and we do not want that to happen!');

                // get ta console
                var channel = await message.guild.channels.cache.find(channel => channel.name === workshop + '-ta-console');
                var number = await firebaseServices.leftInTAHelpList(workshop);
                channel.send('There are: ' + number + ' hackers waiting in line!');
            }
        }    
    }

};