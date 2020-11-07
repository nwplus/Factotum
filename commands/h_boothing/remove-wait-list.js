// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services/firebase-services');

const firebaseBoothing = require('../../firebase-services/firebase-services-boothing');
const discordServices = require('../../discord-services');

// Command export
module.exports = class RemoveFromWaitList extends Command {
    constructor(client) {
        super(client, {
            name: 'removefromwaitlist',
            group: 'h_boothing',
            memberName: 'remove user from the wait list',
            description: 'Will remove the command caller (user) from the sponsor wait list as well as any other users tagged on the original command.',
            args: [],
        });
    }

    // Run function -> command body
    async run(message) {
                
        // grab username from the message author, we need to use author and not member because we are outside the guild
        var username = message.author.username;

        // call the firebase function
        var status = await firebaseBoothing.removeFromWaitList(username);

        // if there was an error it is because there are no users in the wait list
        if (status === firebaseServices.status.FAILURE) {
            discordServices.sendMessageToMember(message.author, 'Hey there! We could not remove you from the list, becuase you are not in it!');
        } else if (status === firebaseServices.status.HACKER_SUCCESS) {
            discordServices.sendMessageToMember(message.author, 'Hey there! You have ben removed from the waitlist, thanks for letting us know!');
        }       
    }

};