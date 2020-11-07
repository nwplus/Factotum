// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services/firebase-services');

const firebaseWorkshops = require('../../firebase-services/firebase-services-workshops');
const discordServices = require('../../discord-services');

// Command export
module.exports = class GiveHelp extends Command {
    constructor(client) {
        super(client, {
            name: 'givehelp',
            group: 'm_workshop',
            memberName: 'get next hacker help',
            description: 'Will get the next hacker that needs TA help and move them to the command caller\'s voice channel. If no one needs help then the caller is notified.',
            guildOnly: true,
            args: [],
        });
    }

    // Run function -> command body
    async run(message) {
        message.delete();
            // only memebers with the Hacker tag can run this command!
            if ((await discordServices.checkForRole(message.member, discordServices.mentorRole))) {

                // get workshop name and make sure command is called in a workshop ta-console channel
                var workshop = message.channel.name;

                var index = workshop.indexOf('ta-console');

                // make sure it is a workshop ta-console channel
                if (index != -1) {

                    workshop = workshop.slice(0, index - 1);

                    // grab the voice channel to move the memeber to, uses the channel the command sender is in
                    var voiceChannel = message.member.voice.channel;

                    // make sure the mentor is in a voice channel
                    if (voiceChannel != undefined) {

                        // get status if no one in list or a map of current group and next group up
                        let userOrStatus = await firebaseWorkshops.getNext(workshop);

                        // if the function returns the FAILURE status then the call was made in a wrong channel
                        // a mentor in use will be called when no one needs help
                        if (userOrStatus === firebaseServices.status.MENTOR_IN_USE) {
                            discordServices.replyAndDelete(message, 'No one needs help rn, we will let you know when someone does!');
                        } else if (userOrStatus === firebaseServices.status.FAILURE) {
                            discordServices.replyAndDelete(message, 'This can only be called in a ta console!');
                        } else {
                            // bool to check if someone was added
                            var isAdded = false;

                            var channelToSearch = await message.guild.channels.cache.find(channel => channel.name === workshop + '-general-voice');

                            // get the member from the general workshop voice channel using firebase's stored username
                            var memberToAdd = await channelToSearch.members.find(member => member.user.username === userOrStatus);

                            try {
                                // tries to add the user to the voice channel, it will fail if the user is currently not on the general voice channel!
                                await memberToAdd.voice.setChannel(voiceChannel);
                                isAdded = true;
                                discordServices.sendMessageToMember(memberToAdd, 'Hey hey, a TA is ready to talk to you! You are now live!');
                            } catch(err) {
                                discordServices.sendMessageToMember(memberToAdd, 'Hi there! We tried to get you in a voice channel with a TA but you were not available. ' +
                                'Remember you need to stay in the voice channel! If you would like to try again please call the command again.');
                            }
                            

                            // If no one was added then skip the hacker and let the TA know!
                            if (isAdded === false) {
                                discordServices.replyAndDelete(message, 'The hacker is not in the voice channel, they have been skiped, please call the function again!');
                            } else {
                                // If someone was added then continue on
                                discordServices.replyAndDelete(message, 'Someone has been moved successfully to the requested channel. Happy helping!');
                                var number = await firebaseWorkshops.leftToHelp(workshop);
                                message.channel.send('There are: ' + number + ' in the TA help wait list.');
                            }
                        }
                    } else {
                    discordServices.replyAndDelete(message, 'You need to be in a voice channel to call this command!');
                    }
                } else {
                    discordServices.replyAndDelete(message, 'This command can only be called in a ta-console channel.');
                }
            
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only mentors can use it!');
            }

    }

};