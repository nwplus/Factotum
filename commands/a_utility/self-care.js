const PermissionCommand = require('../../classes/permission-command');
const { discordLog } = require('../../discord-services');
const { Message, MessageEmbed } = require('discord.js');
const { getReminder } = require('../../db/firebase/firebase-services');
const BotGuildModel = require('../../classes/bot-guild');
const { NumberPrompt, SpecialPrompt, RolePrompt } = require('advanced-discord.js-prompts');

/**
 * The self care command will send pre made reminders from firebase to the command channel. These reminders are self
 * care reminders. Will prompt a role to mention with each reminder. We recommend that be an opt-in role. 
 * @category Commands
 * @subcategory Admin-Utility
 * @extends PermissionCommand
 */
class SelfCareReminders extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'self-care',
            group: 'a_utility',
            memberName: 'self care reminders',
            description: 'Sends self-care reminders at designated times.',
            guildOnly: true,
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the command !self-care is only available to Staff!',
        });
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message - the message in which this command was called
     */
    async runCommand(botGuild, message) {
        var interval;

        // helpful vars
        let channel = message.channel;
        let userId = message.author.id;

        //ask user for time interval between reminders
        var timeInterval;
        try {
            let num = await NumberPrompt.single({prompt: 'What is the time interval between reminders in minutes (integer only)? ', channel, userId});
            timeInterval = 1000 * 60 * num;

            // ask user whether to start sending reminders now(true) or after 1 interval (false)
            var isStartNow = await SpecialPrompt.boolean({prompt: 'Type "yes" to send first reminder now, "no" to start one time interval from now. ', channel, userId, cancelable: true});

            // id of role to mention when new reminders come out (use-case for self-care still tbd)
            var roleId = (await RolePrompt.single({prompt: 'What is the hacker role to notify for self-care reminders?', channel, userId,cancelable: true})).id;
        } catch (error) {
            channel.send('<@' + userId + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        // keeps track of whether it has been paused
        var paused = false;        

        const startEmbed = new MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('To encourage healthy hackathon habits, we will be sending hourly self-care reminders!')
            // temp
            .setDescription('For Staff:\n' +
                '⏸️ to pause\n' +
                '▶️ to resume\n');

        channel.send('<@&' + roleId + '>', { embed: startEmbed }).then((msg) => {
            msg.pin();
            msg.react('⏸️');
            msg.react('▶️');

            //filters so that it will only respond to Staff who reacted with one of the 3 emojis 
            const emojiFilter = (reaction, user) => !user.bot && (reaction.emoji.name === '⏸️' || reaction.emoji.name === '▶️') && message.guild.member(user).roles.cache.has(botGuild.roleIDs.staffRole);
            const emojiCollector = msg.createReactionCollector(emojiFilter);
            
            emojiCollector.on('collect', (reaction, user) => {
                reaction.users.remove(user.id);
                if (reaction.emoji.name === '⏸️') {
                    //if it isn't already paused, pause by clearing the interval
                    if (interval != null && !paused) {
                        clearInterval(interval);
                        paused = true;
                        channel.send('<@' + user.id + '> Self-care reminders have been paused!').then(msg => msg.delete({timeout: 10000}));
                    }
                } else if (reaction.emoji.name === '▶️') {
                    //if it is currently paused, restart the interval and send the next reminder immediately
                    if (paused) {
                        sendReminder();
                        interval = setInterval(sendReminder, timeInterval);
                        paused = false;
                        channel.send('<@' + user.id + '> Self-care reminders have been un-paused!').then(msg => msg.delete({timeout: 10000}));
                    }
                } 
            });
        });

        //starts the interval, and sends the first reminder immediately if startNow is true
        if (isStartNow) {
            sendReminder();
        }
        interval = setInterval(sendReminder, timeInterval);

        // sendReminder is the function that picks and sends the next reminder
        async function sendReminder() {
            //get reminders parameters from db 
            var data = await getReminder(message.guild.id);

            //report in admin logs that there are no more messages
            //TODO: consider having it just loop through the db again?
            if (data === null) {
                discordLog(message.guild, '<@&' + botGuild.roleIDs.staffRole + '> HI, PLEASE FEED ME more self-care messages!!');
                clearInterval(interval);
                return;
            }

            let reminder = data.reminder;

            const qEmbed = new MessageEmbed()
                .setColor(botGuild.colors.embedColor)
                .setTitle(reminder);
                // .setDescription(reminder);
            
            channel.send(`Hey <@&${roleId}> remember:`, {embed: qEmbed});
        }
    }
}
module.exports = SelfCareReminders;
