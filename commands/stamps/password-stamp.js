const { sendEmbedToMember, sendMessageToMember, deleteMessage } = require('../../discord-services');
const { MessageEmbed, Message, Snowflake, Collection } = require('discord.js');
const PermissionCommand = require('../../classes/permission-command');
const BotGuildModel = require('../../classes/bot-guild');
const StampsManager = require('../../classes/stamps-manager');
const { StringPrompt, ChannelPrompt } = require('advanced-discord.js-prompts');

/**
 * Sends a reaction collector for users to react, send a password and receive a stamp. Used to give out stamps for activities that don't have 
 * an activity instance. The user who starts the password stamp must give the activity name, password, and stop time defaults to 120 seconds. Users 
 * have 3 attempts to get the password right within the stop time.
 * @category Commands
 * @subcategory Stamps
 * @extends PermissionCommand
 */
class PasswordStamp extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'password-stamp',
            group: 'stamps',
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
     * @param {BotGuildModel} botGuild
     * @param {Message} message
     * @param {Object} args
     * @param {String} args.activityName
     * @param {String} args.password
     * @param {Number} args.stopTime
     */
    async runCommand(botGuild, message, {activityName, password, stopTime}) {
        // helpful vars
        let channel = message.channel;
        let userId = message.author.id;
        // check if arguments have been given and prompt for the channel to use
        try {
            if (activityName === '') {
                activityName = await StringPrompt.single({prompt: 'Please respond with the workshop/activity name.', channel, userId, cancelable: true});
            }

            if(password === '') {
                password = await StringPrompt.single({prompt: 'Please respond with the password for hackers to use to get stamp.', channel, userId, cancelable: true});
            }

            var targetChannel = await ChannelPrompt.single({prompt: 'What channel do you want to send the stamp collector to? Users should have access to this channel!', channel, userId, cancelable: true});
        } catch (error) {
            channel.send('<@' + userId + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        const qEmbed = new MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('React with anything to claim a stamp for attending ' + activityName)
            .setDescription('Once you react to this message, check for a DM from this bot. **You can only emoji this message once!**')
            .addField('A Password Is Required!', 'Through the Bot\'s DM, you will have 3 attempts in the first 60 seconds to enter the correct password.');
        
        targetChannel.send(qEmbed).then((msg) => {

            let emoji = '👍';
            msg.react(emoji);
            
            /**
             * keeps track of which users have already reacted to the message so there are no duplicates
             * @type {Collection<Snowflake, String>} - <User.id, User.username>
             */
            var seenUsers = new Collection();

            // filter emoji reaction and collector
            const emojiFilter = (reaction, user) => !user.bot && !seenUsers.has(user.id);
            const collector = msg.createReactionCollector(emojiFilter, {time: (1000 * stopTime * 60)});  // stopTime is in minutes, multiply to get seconds, then milliseconds 

            //send hacker a dm upon reaction
            collector.on('collect', async(reaction, user) => {
                seenUsers.set(user.id, user.username);

                const member = message.guild.member(user);

                // prompt member for password
                var dmMessage = await sendEmbedToMember(user, {
                    description: 'You have 60 seconds and 3 attempts to type the password correctly to get the ' + activityName + ' stamp.\n' +
                    'Please enter the password (leave no stray spaces or anything):',
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
                    if (m.content.toLowerCase() === password.toLowerCase()) {

                        StampsManager.parseRole(member, activityName, botGuild);
                        
                        correctPassword = true;
                        pwdCollector.stop();
                    } else if (incorrectPasswords < 2) {
                        //add 1 to number of incorrect guesses and prompts user to try again
                        await sendMessageToMember(user, 'Incorrect. Please try again.', true);
                    }
                    incorrectPasswords++;
                });
                pwdCollector.on('end', collected => {
                    deleteMessage(dmMessage);

                    //show different messages after password collection expires depending on circumstance
                    if (!correctPassword) {
                        if (incorrectPasswords < 3) {
                            sendEmbedToMember(user, {
                                title: 'Stamp Collector',
                                description: 'Time\'s up! You took too long to enter the password for the ' + activityName + ' stamp. If you have extenuating circumstances please contact an organizer.',
                            });
                        } else {
                            sendEmbedToMember(user, {
                                title: 'Stamp Collector',
                                description: 'Incorrect. You have no attempts left for the ' + activityName + ' stamp. If you have extenuating circumstances please contact an organizer.',
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
}
module.exports = PasswordStamp;
