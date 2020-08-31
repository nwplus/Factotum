// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseServices = require('../../firebase-services');
const discordServices = require('../../discord-services');

// Command export
module.exports = class GiveHelp extends Command {
    constructor(client) {
        super(client, {
            name: 'givehelp',
            group: 'workshop',
            memberName: 'get next hacker help',
            description: 'Will get the next hacker that needs TA help',
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
            // only memebers with the Hacker tag can run this command!
            if (discordServices.checkForRole(message.member, discordServices.mentorRole)) {

                // get workshop name
                var workshop = message.channel.name;

                workshop = workshop.slice(0, workshop.indexOf('ta-console') - 1);

                // get status if no one in list or a map of current group and next group up
                let userOrStatus = await firebaseServices.getFromTAHelpList(workshop);

                // if the function returns the FAILURE status then the call was made in a wrong channel
                // a mentor in use will be called when no one needs help
                if (userOrStatus === firebaseServices.status.MENTOR_IN_USE) {
                    discordServices.replyAndDelete(message, 'No one needs help rn, we will let you know when someone does!');
                } else if (userOrStatus === firebaseServices.status.FAILURE) {
                    discordServices.replyAndDelete(message, 'This can only be called in a ta console!');
                } else {

                    // grab the voice channel to move the memeber to, uses the parameter channelName
                    var voiceChannel = await message.guild.channels.cache.find(channel => channel.name === channelName);

                    // make sure the given voice channel is correct
                    if (voiceChannel != undefined) {
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
                            var mesg = await message.reply('The hacker is not in the voice channel, they have been skiped, please call the function again!');
                                mesg.delete({timeout : 5000})
                        } else {
                            // If someone was added then continue on
                            var replyMessage = await message.reply('Someone has been moved successfully to the requested channel. Happy helping!');
                            replyMessage.delete({timeout: 5000});
                            var number = await firebaseServices.numberInWaitList();
                            message.reply('There are: ' + number + ' in the TA help wait list.');
                            
                        }
                    } else {
                        discordServices.replyAndDelete(message, 'The given voice channel to talk in, is non excistent!');
                    }
                }
            
            } else {
                discordServices.replyAndDelete(message, 'You do not have permision for this command, only mentors can use it!');
            }

    }

};