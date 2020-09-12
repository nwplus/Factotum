// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class GetNext extends Command {
    constructor(client) {
        super(client, {
            name: 'getnext',
            group: 'boothing',
            memberName: 'get the next member in the wait',
            description: 'Will get the next member in the wait list into the voice channel where the command sender is',
            guildOnly: true,
            args: [],
        });
    }

    // Run function -> command body
    async run(message, {channelName}) {
        message.delete();
        // make sure command is only used in the boothing-sponsor-console channel
        if (message.channel.name === 'boothing-sponsor-console') {
            // only memebers with the Hacker tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.sponsorRole)) {

                // grab the voice channel to move the memeber to, uses the parameter channelName
                var voiceChannel = message.member.voice.channel;

                // make sure the sponsor is in a voice channel
                if (voiceChannel != undefined) {
                    // get status if no one in list or a map of current group and next group up
                    let listOrStatus = await firebaseServices.getFromWaitList();

                    // if the function returns the FAILURE status then there are no more hackers in the waitlist
                    if (listOrStatus === firebaseServices.status.FAILURE) {
                        discordServices.replyAndDelete(message, 'There is no more poeple waiting, we will let you know when there is!');
                    } else {
                        // user to add rn
                        var currentGroup = listOrStatus.get('currentGroup');

                        // user that is next in the waitlist as a list
                        var nextUserID = listOrStatus.get('nextGroup');

                        // get the boothing wait list channel for use later
                        var channelToSearch = message.guild.channels.cache.get(discordServices.boothingWaitList);

                        // make sure there is someone next
                        if (nextUserID.length > 0) {
                            for (var i = 0; i < nextUserID.length ; i++) {
                                // get next member and notify that he is next
                                var nextMember = channelToSearch.members.find(member => member.user.username === nextUserID[i]);
                                discordServices.sendMessageToMember(nextMember, 'You are next! Get ready to talk to a sponsor, make sure you are in the waitlist voice channel!');
                            }
                        }

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
                            message.channel.send('There are: ' + number + ' in the wait list.');
                            
                        }
                        

                    }
                } else {
                    discordServices.replyAndDelete(message, 'The given voice channel to talk in, is non excistent!');
                }
            
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only sponsors can use it!');
            }
        } else {
            discordServices.replyAndDelete(message, 'This command can only be used in the boothing sponsor console channel!');
        }
    }

};