const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const PermissionCommand = require('../../classes/permission-command');
const Prompt = require('../../classes/prompt');

module.exports = class DistributeStamp extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'password-stamp',
            group: 'a_activity',
            memberName: 'gives stamps requiring passwords',
            description: 'gives a stamp to everyone who reacted and gave the correct password',
            args: [
                {   key: 'activityName',
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
        }, 
        {
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'This command is only available on the admin console!',
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'This command can only available to staff!',
        });
    }

    /**
     * 
     * @param {Discord.Message} message
     */
    async runCommand(message, {activityName, password, stopTime}) {
        // helpful vars
        let channel = message.channel;
        let userId = message.author.id;

        // check if arguments have been given and prompt for the channel to use
        try {
            if (activityName === '') {
                var prompt = await Prompt.messagePrompt({prompt: 'Please respond with the workshop/activity name.', channel, userId}, 'string');
                activityName = prompt.content;
            }

            if(password === '') {
                var prompt = await Prompt.messagePrompt({prompt: 'Please respond with the password for hackers to use to get stamp.', channel, userId}, 'string');
                password = prompt.content;
            }

            var targetChannel = (await Prompt.channelPrompt({prompt: 'What channel do you want to send the stamp collector to? Users should have access to this channel!', channel, userId})).first();
        } catch (error) {
            channel.send('<@' + userId + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        const qEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.colors.embedColor)
            .setTitle('React with anything to claim a stamp for attending ' + activityName)
            .setDescription('Once you react to this message, check for a DM from this bot. **You can only emoji this message once!**')
            .addField('A Password Is Required!', 'Through the Bot\'s DM, you will have 3 attempts in the first 60 seconds to enter the correct password.');
        
        targetChannel.send(qEmbed).then((msg) => {

            let emoji = '👍';
            msg.react(emoji);
            
            /**
             * keeps track of which users have already reacted to the message so there are no duplicates
             * @type {Discord.Collection<Discord.Snowflake, String>} - <User.id, User.username>
             */
            var seenUsers = new Discord.Collection();

            // filter emoji reaction and collector
            const emojiFilter = (reaction, user) => !user.bot && !seenUsers.has(user.id);
            const collector = msg.createReactionCollector(emojiFilter, {time: (1000 * stopTime * 60)});  // stopTime is in minutes, multiply to get seconds, then milliseconds 

            //send hacker a dm upon reaction
            collector.on('collect', async(reaction, user) => {
                seenUsers.set(user.id, user.username);

                const member = message.guild.member(user);

                // prompt member for password
                var dmMessage = await discordServices.sendEmbedToMember(user, {
                    description: "You have 60 seconds and 3 attempts to type the password correctly to get the " + activityName + " stamp.\n" +
                    "Please enter the password (leave no stray spaces or anything):",
                    title: 'Stamp Collector For ' + activityName,
                    color: '#b2ff2e',
                });

                var correctPassword = false;
                var incorrectPasswords = 0;

                const filter = m => user.id === m.author.id;
                //message collector for the user's password attempts
                const pwdCollector = dmMessage.channel.createMessageCollector(filter,{time: 60000, max: 3});

                pwdCollector.on('collect', async m => {
                    //update role and stop collecting if password matches
                    if (m.content === password) {
                        member.roles.cache.forEach(async role => (await this.parseRole(member, user, role, message, activityName)));
                        correctPassword = true;
                        //discordServices.deleteMessage(msgs);
                        discordServices.deleteMessage(dmMessage);
                        pwdCollector.stop();
                    } else if (incorrectPasswords < 2) {
                        //add 1 to number of incorrect guesses and prompts user to try again
                        await discordServices.sendMessageToMember(user, "Incorrect. Please try again.", true);
                    }
                    incorrectPasswords++;
                });
                pwdCollector.on('end', collected => {
                    discordServices.deleteMessage(dmMessage);

                    //show different messages after password collection expires depending on circumstance
                    if (!correctPassword) {
                        if (incorrectPasswords < 3) {
                            discordServices.sendEmbedToMember(user, {
                                title: 'Stamp Collector',
                                description: "Time's up! You took too long to enter the password for the " + activityName + " stamp. If you have extenuating circumstances please contact an organizer.",
                            });
                        } else {
                            discordServices.sendEmbedToMember(user, {
                                title: 'Stamp Collector',
                                description: "Incorrect. You have no attempts left for the " + activityName + " stamp. If you have extenuating circumstances please contact an organizer.",
                            });
                        }
                    }
                });
            });

            //edits the embedded message to notify people when it stops collecting reacts
            collector.on('end', collected => {
                if (msg.guild.channels.cache.find(channel => channel.name === targetChannel.name)) {
                    msg.edit(qEmbed.setTitle('Time\'s up! No more responses are being collected. Thanks for participating in ' + activityName + '\'s booth!'));
                }
            });
        });
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
                newRole = message.guild.roles.cache.find(role => role.id === discordServices.stampRoles.stamp6Role);
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
            await discordServices.sendMessageToMember(user, 'A problem occurred. Please contact an organizer/admin.', true);
        } 
        //replace curRole with newRole and send dm with details
        discordServices.replaceRoleToMember(member, curRole, newRole);
        await discordServices.sendEmbedToMember(user, {
            title: 'Stamp Collector for ' + activityName,
            description: 'You have been upgraded from ' + curRole.name + ' to ' + newRole.name + ' for attending ' + activityName + '\'s booth!',
            color: '#b2ff2e',
        });
    } 
}
