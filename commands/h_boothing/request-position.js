// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class RequestPosition extends Command {
    constructor(client) {
        super(client, {
            name: 'requestposition',
            group: 'h_boothing',
            memberName: 'request position in wait list',
            description: 'Will return the position of the user in the sponsor wait list.',
            args: [],
        });
    }

    // Run function -> command body
    async run(message) {
                
        // grab username from the message author, we need to use author and not member because we are outside the guild
        var username = message.author.username;

        // call the firebase function
        var index = await firebaseServices.positionInWaitList(username);

        // if there was an error it is because there are no users in the wait list
        if (index === firebaseServices.status.FAILURE) {
            discordServices.sendMessageToMember(message.author, 'Hey there! There is currently no one in the list, not even you!');
        } else {
            discordServices.sendMessageToMember(message.author, 'Hey there! It seems you are in position: ' + index);
        }       
    }

};