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
                // get status if no one in list or a map of current group and next group up
                let listOrStatus = await firebaseServices.getFromWaitList();

                // if the function returns the FAILURE status then there are no more hackers in the waitlist
                if (listOrStatus === firebaseServices.status.FAILURE) {
                    var msg = await message.reply('There is no more poeple waiting, we will let you know when there is!');
                    msg.delete({timout : 5000});
                } else {
                    // user to add rn
                    var currentGroup = listOrStatus.get('currentGroup');

                    // user that is next in the waitlist
                    var nextUserID = listOrStatus.get('nextGroup')[0];

                     // get the boothing wait list channel for use later
                    var channelToSearch = message.guild.channels.cache.find(channel => channel.name === 'boothing-wait-list');

                    // make sure there is someone next
                    if (nextUserID.length > 0) {
                        // get next member and notify that he is next
                        var nextMember = channelToSearch.members.find(member => member.user.username === nextUserID);
                        discordServices.sendMessageToMember(nextMember, 'You are next! Get ready to talk to a sponsor, make sure you are in the waitlist voice channel!');
                    }

                    // grab the voice channel to move the memeber to, uses the parameter channelName
                    var voiceChannel = message.guild.channels.cache.find(channel => channel.name === channelName);

                    // bool to check if someone was added
                    var isAdded = false;

                    // Try to add every member in the group to the voice channel
                    for (var i = 0; i < currentGroup.length; i++) {

                        // get the member from the boothing wait list channel using firebase's stored username
                        var memberToAdd = await channelToSearch.members.find(member => member.user.username === currentGroup[i]);

                        try {
                            // tries to add the user to the voice channel, it will fail if the user is currently not on the waitlist voice channel!
                            await memberToAdd.voice.setChannel(voiceChannel);
                            isAdded = true;
                            discordServices.sendMessageToMember(memberToAdd, 'Hey hey, a sponsor is ready to talk to you! You are now live!');
                        } catch(err) {
                            discordServices.sendMessageToMember(memberToAdd, 'Hi there! We tried to get you in a voice channel with a sponsor but you were not available. ' +
                            'Remember you need to stay in the wait list voice channel! If you would like to try again please call the command again in the boothin-wait-list text chanel.' + 
                            'If you were in a group and one of your friends made it into the private call then join the waitlist voicechannel ASAP so the sponsor can add you manualy!');
                        }
                    }

                    // If no one was added then skip the group and let the sponsor know!
                    if (isAdded === false) {
                        var mesg = await message.reply('This users are not in the voice channel, they have been skiped, please call the function again!');
                            mesg.delete({timeout : 5000})
                    } else {
                        // If someone was added then continue on
                        var replyMessage = await message.reply('Someone has been moved successfully to the requested channel. Happy talking!');
                        replyMessage.delete({timeout: 5000});
                        var number = await firebaseServices.numberInWaitList();
                        message.reply('There are: ' + number + ' in the wait list.');
                        
                    }
                    

                }
            
            }
        }
    }

};