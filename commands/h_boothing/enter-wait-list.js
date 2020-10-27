// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class EnterWaitList extends Command {
    constructor(client) {
        super(client, {
            name: 'enterwaitlist',
            group: 'h_boothing',
            memberName: 'enter wait list',
            description: 'Will add the command caller (user) to the sponsor wait list as well as any users tagged on the message. User and tagged friends need to be in the sponsor\'s general voice channel to work.',
            guildOnly: true,
            args: [
                {
                    key: 'buddy1',
                    prompt: 'A friend to join the conversation with',
                    type: 'member',
                    default: '',
                },
                {
                    key: 'buddy2',
                    prompt: 'A friend to join the conversation with',
                    type: 'member',
                    default: '',
                },
                {
                    key: 'buddy3',
                    prompt: 'A friend to join the conversation with',
                    type: 'member',
                    default: '',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {buddy1, buddy2, buddy3}) {
        message.delete();
        // make sure command is only used in the boothing-wait-list channel
        if (message.channel.name === 'boothing-wait-list') {
            // only memebers with the Attendee tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.attendeeRole)) {
                
                var username = message.member.user.username;

                // creat list of usernames of buddies
                var usernameList = [];
                if (buddy1 != '') {
                    usernameList.push(buddy1.user.username);
                }
                if (buddy2 != '') {
                    usernameList.push(buddy2.user.username);
                }
                if (buddy3 != '') {
                    usernameList.push(buddy3.user.username);
                }                

                var status = await firebaseServices.addToWaitList(username, usernameList);

                // If the user is alredy in the waitlist then tell him that
                if (status === firebaseServices.status.HACKER_IN_USE) {
                    discordServices.sendMessageToMember(message.member, 'Hey there! It seems you are already on the wait list, if you would like to ' +
                    'know your spot please run the !requestposition command right here!');
                } else {
                    var number = await firebaseServices.numberInWaitList();

                    discordServices.sendMessageToMember(message.member, 'Hey there! We got you singed up to talk to a sponsor! Sit tight in the voice channel. If you ' +
                    'are not in the voice channel when its your turn you will be skipped, and we do not want that to happen! You are number: ' + number + ' in the wait list.');

                    // get boothing sponsor console channel
                    var channel = await message.guild.channels.cache.get('748397163997954108');
                    channel.send('There are: ' + number + ' hackers waiting in line!');
                }
            } else {
                discordServices.replyAndDelete(message, 'This command can only be ran by hackers!');
            }   
        } else {
            discordServices.replyAndDelete(message, 'This command can only be ran in the boothing-wait-list channel!');
        }
    }

};