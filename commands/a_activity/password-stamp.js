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
                    type: 'string'
                },
                {
                    key: 'password',
                    prompt: 'the password for hackers to use to get stamp',
                    type: 'string',
                }
            ],
        });
    }

    async run(message, {sponsorName,password}) {
        discordServices.deleteMessage(message);
        //check that it has been called by admin or staff
        if (!await(discordServices.checkForRole(message.member,discordServices.staffRole)) && !await(discordServices.checkForRole(message.member,discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'You do not have permission for this command, only admins and staff can use it!');
            return;
        } 

        var targetChannel = message.guild.channels.cache.find(channel => channel.name === (sponsorName + "-banter"));
        const qEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('React with anything to claim a stamp for attending ' + sponsorName + '\'s booth!')
            .setDescription('Once you react to this message, you will have 3 attempts in the next minute to enter the correct password.');
        targetChannel.send(qEmbed).then((msg) => {
            const emojiFilter = (reaction,user) => user.id != msg.author.id;
            let emoji = '👍';
            msg.react(emoji);
            const collector = msg.createReactionCollector(emojiFilter, {time: (1000 * 5400)});
            //seenUsers keeps track of which users have already reacted to the message
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
                var dmMessage = await user.send("You have 30 seconds and 3 attempts to type the password correctly to get the " + sponsorName + " stamp.\n" +
                "Please enter the password (leave no stray spaces or anything):");
                var correctPassword = false;
                var incorrectPasswords = 0;
                const filter = m => user.id === m.author.id;
                //message collector for the user's password attempts
                const pwdCollector = dmMessage.channel.createMessageCollector(filter,{time: 30000, max: 3});

                pwdCollector.on('collect', m => {
                    //update role and stop collecting if password matches
                    if (m.content === password) {
                        member.roles.cache.forEach(role => this.parseRole(member, user, role, message, sponsorName));
                        correctPassword = true;
                        //discordServices.deleteMessage(msgs);
                        //discordServices.deleteMessage(dmMessage);
                        pwdCollector.stop();
                    } else if (incorrectPasswords < 2) {
                        //add 1 to number of incorrect guesses and prompts user to try again
                        incorrectPasswords++;
                        user.send("Incorrect. Please try again.");
                    } 
                })
                pwdCollector.on('end', collected => {
                    //show different messages after password collection expires depending on circumstance
                    if (!correctPassword) {
                        if (incorrectPasswords < 3) {
                            user.send("Time's up! You took too long to enter the password for the " + sponsorName + " stamp. If you have extenuating circumstances please contact an organizer.");
                        } else {
                            user.send("Incorrect. You have no attempts left. If you have extenuating circumstances please contact an organizer.");
                        }
                    }
                })
            })
            //edits the embedded message to notify people when it stops collecting reacts
            collector.on('end', collected => {
                if (msg.guild.channels.cache.find(channel => channel.name === targetChannel.name)) {
                    msg.edit(qEmbed.setTitle('Time\'s up! No more responses are being collected. Thanks for participating in ' + sponsorName + '\'s booth!'));
                }
            })
        })
    }

    //replaces user's current role with the next one
    async parseRole(member,user,curRole,message,sponsorName) {
        var stampNumber; //keep track of which role should be next based on number of stamps
        var newRole; //next role based on stampNumber
        //case for if curRole ends in 2 digits
        if (!isNaN(curRole.name.substring(curRole.name.length - 2, curRole.name.length)) &&
            parseInt(curRole.name.substring(curRole.name.length - 2, curRole.name.length)) >= 10) {
            stampNumber = parseInt(curRole.name.substring(curRole.name.length - 2, curRole.name.length));
            stampNumber++;
            newRole = message.guild.roles.cache.find(role => 
                !isNaN(role.name.substring(curRole.name.length - 2, curRole.name.length)) &&
                parseInt(role.name.substring(curRole.name.length - 2, curRole.name.length)) === stampNumber);
        } else if (!isNaN(curRole.name.substring(curRole.name.length - 1))) {
            //case for if curRole ends in 1 digit
            stampNumber = parseInt(curRole.name.substring(curRole.name.length - 1)); 
            if (stampNumber === 5) {
                //manually set newRole to Life - 6 if stampNumber = 6 because otherwise it will end up being MEE6
                newRole = message.guild.roles.cache.find(role => role.id === discordServices.stamp6Role);
            } else if (stampNumber === 9) {
                //manually set newRole to Eagle - 10 since it transitions between single and double digits
                newRole = message.guild.roles.cache.find(role => role.id === discordServices.stamp10Role);
            } else {
                //look in all the server's roles to find one that matches the stampNumber
                stampNumber++;
                newRole = message.guild.roles.cache.find(role => 
                    !isNaN(role.name.substring(role.name.length - 1)) &&
                    parseInt(role.name.substring(role.name.length - 1)) === stampNumber);
            }
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
