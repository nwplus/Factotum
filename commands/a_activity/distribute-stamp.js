const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

//placeholder role names mostly taken from actual scout ranks:
//0-1 stamps: rookie
//2-4 stamps: star
//5-9 stamps: life
//10+ stamps: eagle

module.exports = class DistributeStamp extends Command {
    constructor(client) {
        super(client, {
            name: 'distribute-stamp',
            group: 'a_activity',
            memberName: 'gives stamps',
            description: 'gives a stamp to everyone who reacted within the timeframe',
            args: [
                {   key: 'activityName',
                    prompt: 'the workshop/activity name',
                    type: 'string'
                },
                {
                    key: 'timeLimit',
                    prompt: 'How many seconds will the reactions be open for?',
                    type: 'integer',
                }
            ],
        });
    }

    async run(message, {activityName,timeLimit}) {
    //doesn't run if it is called by someone who is not staff nor admin or if it is not called in admin console
        if (!await(discordServices.checkForRole(message.member,discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            return;
        } else if (!discordServices.isAdminConsole) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;
        }

    //sends embedded message to the activity's text channel
        var targetChannel = message.guild.channels.cache.find(channel => channel.name === (activityName + "-text"));
        const qEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('React within the next ' + timeLimit + ' seconds to get a stamp for ' + activityName + '!');
        targetChannel.send(qEmbed).then((msg) => {
            const emojiFilter = (reaction,user) => user.id != msg.author.id;
            let emoji = '👍';
            msg.react(emoji);
            const collector = msg.createReactionCollector(emojiFilter, {time: (1000 * timeLimit)});
            //seenUsers keeps track of which users have already reacted to the message
            var seenUsers = [];

        //switch hacker role upon collection of their react
            collector.on('collect', async(reaction,user) => {
                //for each role the user has, check if it ends with a number and if it does, change to
                //next stamp number
                const member = message.guild.member(user);
                member.roles.cache.forEach(role => seenUsers = this.parseRole(member,user,role,message,activityName,seenUsers));
            });
            //edits the embedded message to notify people when it stops collecting reacts
            collector.on('end', collected => {
                msg.edit(qEmbed.addField('Time\'s up! No more responses are being collected.',
                'Thanks for participating in ' + activityName + '!'));
            })
        })
    }

    //replaces user's current role with the next one
    parseRole(member,user,curRole,message,activityName,seenUsers) {
        if (seenUsers.includes(user.id)) {
            return seenUsers;
        }
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
                newRole = message.guild.roles.cache.find(role => role.id === discordServices.life6Role);
            } else if (stampNumber === 9) {
                //manually set newRole to Eagle - 10 since it transitions between single and double digits
                newRole = message.guild.roles.cache.find(role => role.id === discordServices.eagle10Role);
            } else {
                //look in all the server's roles to find one that matches the stampNumber
                stampNumber++;
                newRole = message.guild.roles.cache.find(role => 
                    !isNaN(role.name.substring(role.name.length - 1)) &&
                    parseInt(role.name.substring(role.name.length - 1)) === stampNumber);
            }
        } else {
            //if role doesn't end in a digit then return
            return seenUsers;
        }
        seenUsers.push(user.id); //adds user to seen users list

        //shouldn't happen but check just in case something goes wrong and no matching role was found
        //then remain at the same role. most likely case would be getting more than the number of stamps 
        //we have provided
        if (newRole == null) {
            newRole = curRole;
            user.send('A problem occurred. Please contact an organizer/admin.');
        } 
        //replace curRole with newRole and send dm with details
        discordServices.replaceRoleToMember(member, curRole, newRole);
        user.send('You have been upgraded from ' + curRole.name + ' to ' + newRole.name + ' for attending ' + activityName + '!');
        return seenUsers;
    } 
};