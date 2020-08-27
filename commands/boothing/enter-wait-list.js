// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class EnterWaitList extends Command {
    constructor(client) {
        super(client, {
            name: 'enterwaitlist',
            group: 'boothing',
            memberName: 'enter wait list',
            description: 'Will add the author of the message to the boothing wait list',
            guildOnly: true,
            args: [],
        });
    }

    // Run function -> command body
    async run(message) {
        message.delete();
        // make sure command is only used in the boothing-wait-list channel
        if (message.channel.name === 'boothing-wait-list') {
            // only memebers with the Hacker tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.hackerRole)) {
                
                var username = message.member.user.username;

                firebaseServices.addToWaitList(username);
                
                discordServices.sendMessageToMember(message.member, 'Hey there! We got you singed up to talk to a sponsor! Sit tight in the voice channel. If you ' +
                'are not in the voice channel when its your turn you will be skipped, and we do not want that to happen!');
            }   
        }
    }

};