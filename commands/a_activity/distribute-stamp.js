const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

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
                    prompt: 'How many seconds will the reactions be open for',
                    type: 'integer',
                },
                {
                    key: 'targetChannelKey',
                    prompt: 'what channel is the poll being sent to in snowflake',
                    type: 'string',
                    default: '',
                },
            ],
        });
    }

    async run(message, {activityName, timeLimit, targetChannelKey}) {
    //doesn't run if it is called by someone who is not staff nor admin or if it is not called in admin console
        if (!await(discordServices.checkForRole(message.member,discordServices.staff))) {
            discordServices.replyAndDelete(message, 'You do not have permision for this command, only staff can use it!');
            return;
        }

    //sends embedded message to the activity's text channel

        // grab channel, depending on if given targetChannelKey
        if (targetChannelKey === '') {
            var targetChannel = message.guild.channels.cache.find(channel => channel.type === 'text' && channel.name.endsWith("activity-banter"));
        } else {
            var targetChannel = message.guild.channels.resolve(targetChannelKey);
        }


        const qEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('React within ' + timeLimit + ' seconds of the posting of this message to get a stamp for ' + activityName + '!');
        
        targetChannel.send(qEmbed).then(async (msg) => {
            let emoji = '👍';
            msg.react(emoji);

            const collector = await msg.createReactionCollector((reaction, user) => !user.bot, {time: (1000 * timeLimit)});
            
            //seenUsers keeps track of which users have already reacted to the message
            var seenUsers = new Discord.Collection();

        //switch hacker role upon collection of their react
            collector.on('collect', async(reaction, user) => {
                //for each role the user has, check if it ends with a number and if it does, change to
                //next stamp number
                const member = message.guild.member(user);
                if (!seenUsers.has(user.id)) {
                    member.roles.cache.filter(role => !isNaN(role.name.substring(role.name.length - 2))).forEach(async role => (await this.parseRole(member,user,role,message,activityName)));
                    seenUsers.set(user.id, user.username);
                }
            });
            //edits the embedded message to notify people when it stops collecting reacts
            collector.on('end', collected => {
                if (msg.guild.channels.cache.find(channel => channel.name === targetChannel.name)) {
                    msg.edit(qEmbed.setTitle('Time\'s up! No more responses are being collected. Thanks for participating in ' + activityName + '!'));
                }
            })
        })
    }

    
    //replaces user's current role with the next one
    async parseRole(member,user,curRole,message,activityName) {
        var stampNumber; //keep track of which role should be next based on number of stamps
        var newRole; //next role based on stampNumber
        
        //case for if curRole ends in 2 digits
        if (!isNaN(curRole.name.substring(curRole.name.length - 2, curRole.name.length))) {
            stampNumber = parseInt(curRole.name.substring(curRole.name.length - 2));
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
        await user.send('You have been upgraded from ' + curRole.name + ' to ' + newRole.name + ' for attending ' + activityName + '!');
    } 
};