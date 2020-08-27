// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class GetNextWaitList extends Command {
    constructor(client) {
        super(client, {
            name: 'getnextwaitlist',
            group: 'boothing',
            memberName: 'get the next member in the wait',
            description: 'Will get the next member in the wait list into the given voice channel',
            guildOnly: true,
            args: [
                {
                    key: 'channelName',
                    prompt: 'name of voice channel to add to',
                    type: 'string',
                }
            ],
        });
    }

    // Run function -> command body
    async run(message, {channelName}) {
        message.delete();
        // make sure command is only used in the boothing-sponsor-console channel
        if (message.channel.name === 'boothing-sponsor-console') {
            // only memebers with the Hacker tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.sponsorRole)) {
                // get the next member in the waitlist, firebase stores the member's username
                let usernameFromDB = await firebaseServices.getFromWaitList();

                // if the function returns the FAILURE status then there are no more hackers in the waitlist
                if (usernameFromDB === firebaseServices.status.FAILURE) {
                    var msg = await message.reply('There is no more poeple waiting, we will let you know when there is!');
                    msg.delete({timout : 5000});
                } else {
                     // get the boothing wait list channel for use later
                    var channelToSearch = message.guild.channels.cache.find(channel => channel.name === 'boothing-wait-list');
                    // get the member from the boothing wait list channel using firebase's stored username
                    var memberToAdd = channelToSearch.members.find(member => member.user.username === usernameFromDB);
                    console.log(usernameFromDB);
                    // grab the voice channel to move the memeber to, uses the parameter channelName
                    var voiceChannel = message.guild.channels.cache.find(channel => channel.name === channelName);

                    var fut;
                    try {
                        // tries to add the user to the voice channel, it will fail if the user is currently not on the waitlist voice channel!
                        fut = await memberToAdd.voice.setChannel(voiceChannel);
                    } catch(err) {
                        var mesg = await message.reply('This user is not in the voice channel, he has been skiped, please call the function again!');
                        mesg.delete({timeout : 5000})
                        discordServices.sendMessageToMember(memberToAdd, 'Hi there! We tried to get you in a voice channel with a sponsor but you were not available. ' +
                        'Remember you need to stay in the wait list voice channel! If you would like to try again please call the command again in the boothin-wait-list text chanel.');
                    }
                    
                    // If the attempt to add memeber to voice does not fail then proceed!
                    if (fut != null) {
                        var replyMessage = await message.reply('Someone has been moved successfully to the requested channel. Happy talking!');
                        discordServices.sendMessageToMember(memberToAdd, 'Hey hey, a sponsor is ready to talk to you! You are now live!');
                        replyMessage.delete({timeout: 5000});
                    }
                }
            
            }
        }
    }

};