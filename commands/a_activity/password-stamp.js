const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

module.exports = class DistributeStamp extends Command {
    constructor(client) {
        super(client, {
            name: 'password-stamp',
            group: 'a_activity',
            memberName: 'gives stamps requiring passwords',
            description: 'gives a stamp to everyone who reacted and gave the correct password',
            args: [
                {   key: 'sponsorName',
                    prompt: 'the workshop/activity name',
                    type: 'string',
                    default: '',
                },
                {
                    key: 'password',
                    prompt: 'the password for hackers to use to get stamp',
                    type: 'string',
                    default: '',
                },
                {
                    key: 'stopTime',
                    prompt: 'time for stamp collector to be open for, in minutes.',
                    type: 'integer',
                    default: 120,
                }
            ],
        });
    }

    async run(message, {sponsorName, password, stopTime}) {
        discordServices.deleteMessage(message);

        //check that it has been called by admin or staff
        if (!await(discordServices.checkForRole(message.member,discordServices.staffRole)) && !await(discordServices.checkForRole(message.member,discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'You do not have permission for this command, only admins and staff can use it!');
            return;
        }

        // check if arguments have been given
        if (sponsorName === '') {
            var promt = await message.reply('Please respond with the workshop/activity name.');
            await message.channel.awaitMessages(m => m.author.id === message.author.id, {max: 1}).then(msgs => {
                sponsorName = msgs.first().content;
                promt.delete();
                msgs.each(msg => msg.delete());
            });
        }
        if(password === '') {
            var promt = await message.reply('Please respond with the password for hackers to use to get stamp.');
            await message.channel.awaitMessages(m => m.author.id === message.author.id, {max: 1}).then(msgs => {
                password = msgs.first().content;
                promt.delete();
                msgs.each(msg => msg.delete());
            });
        }

        // target channel is where the collector will be sent, at this point is the message's channel
        var targetChannel = message.channel;

        const qEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('React with anything to claim a stamp for attending ' + sponsorName + '\'s booth!')
            .setDescription('Once you react to this message, check for a DM from this bot. There you will have 3 attempts in the next 60 seconds to enter the correct password. **You can only emoji this message once!**');
        
        targetChannel.send(qEmbed).then((msg) => {

            // fitler emoji reaction and collector
            const emojiFilter = (reaction,user) => user.id != msg.author.id;
            let emoji = '👍';
            msg.react(emoji);
            const collector = msg.createReactionCollector(emojiFilter, {time: (1000 * stopTime * 60)});  // stopTime is in minutes, mulitply to get seconds, then milliseconds 
            
            //seenUsers keeps track of which users have already reacted to the message so there are no duplicates
            var seenUsers = [];

            //send hacker a dm upon reaction
            collector.on('collect', async(reaction,user) => {
                //check if user has reacted already
                if (seenUsers.includes(user.id)) {
                    return;
                } else {
                    seenUsers.push(user.id);
                }

                const member = message.guild.member(user);

                // promt member for password
                var dmMessage = await user.send("You have 60 seconds and 3 attempts to type the password correctly to get the " + sponsorName + " stamp.\n" +
                "Please enter the password (leave no stray spaces or anything):");

                var correctPassword = false;
                var incorrectPasswords = 0;

                const filter = m => user.id === m.author.id;
                //message collector for the user's password attempts
                const pwdCollector = await dmMessage.channel.createMessageCollector(filter,{time: 60000, max: 3});

                pwdCollector.on('collect', async m => {
                    //update role and stop collecting if password matches
                    if (m.content === password) {
                        member.roles.cache.forEach(async role => (await this.parseRole(member, user, role, message, sponsorName)));
                        correctPassword = true;
                        //discordServices.deleteMessage(msgs);
                        //discordServices.deleteMessage(dmMessage);
                        pwdCollector.stop();
                    } else if (incorrectPasswords < 2) {
                        //add 1 to number of incorrect guesses and prompts user to try again
                        await user.send("Incorrect. Please try again.");
                    }
                    incorrectPasswords++;
                });
                pwdCollector.on('end', collected => {
                    //show different messages after password collection expires depending on circumstance
                    if (!correctPassword) {
                        if (incorrectPasswords < 3) {
                            user.send("Time's up! You took too long to enter the password for the " + sponsorName + " stamp. If you have extenuating circumstances please contact an organizer.");
                        } else {
                            user.send("Incorrect. You have no attempts left. If you have extenuating circumstances please contact an organizer.");
                        }
                    }
                });
            });
            //edits the embedded message to notify people when it stops collecting reacts
            collector.on('end', collected => {
                if (msg.guild.channels.cache.find(channel => channel.name === targetChannel.name)) {
                    msg.edit(qEmbed.setTitle('Time\'s up! No more responses are being collected. Thanks for participating in ' + sponsorName + '\'s booth!'));
                }
            });
        });
    }

    //replaces user's current role with the next one
    async parseRole(member,user,curRole,message,sponsorName) {
        console.log(curRole.name);
        var stampNumber; //keep track of which role should be next based on number of stamps
        var newRole; //next role based on stampNumber
        
        
        //case for if curRole ends in 2 digits
        if (!isNaN(curRole.name.substring(curRole.name.length - 2, curRole.name.length))) {
            stampNumber = parseInt(curRole.name.substring(curRole.name.length - 2));
            console.log(stampNumber);
            stampNumber++;
            
            if (stampNumber === 6) {
                //manually set newRole to Stamp - 6 if stampNumber = 6 because otherwise it will end up being MEE6
                newRole = message.guild.roles.cache.find(role => role.id === discordServices.stamp6Role);
            }
            newRole = message.guild.roles.cache.find(role => 
                !isNaN(role.name.substring(role.name.length - 2)) &&
                parseInt(role.name.substring(role.name.length - 2)) === stampNumber);
        } else {
            //if role doesn't end in a digit then return
            return;
        }
        //shouldn't happen but check just in case something goes wrong and no matching role was found
        //then remain at the same role. most likely case would be getting more than the number of stamps 
        //we have provided
        if (newRole == null) {
            newRole = curRole;
            await user.send('A problem occurred. Please contact an organizer/admin.');
        } 
        //replace curRole with newRole and send dm with details
        discordServices.replaceRoleToMember(member, curRole, newRole);
        await user.send('You have been upgraded from ' + curRole.name + ' to ' + newRole.name + ' for attending ' + sponsorName + '\'s booth!');
    } 
}
