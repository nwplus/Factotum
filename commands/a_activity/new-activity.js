// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Activity = require('../../classes/activity');
const { numberPrompt } = require('../../classes/prompt');
const { Document } = require('mongoose');


// Command export
module.exports = class NewActivity extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'new-activity',
            group: 'a_activity',
            memberName: 'create a new activity',
            description: 'Will create a category, a text channel and voice channel for the given activity name.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the activity name, can use emojis!',
                    type: 'string',
                },
            ],
        },
        {
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'This command can only be used in the admin console!',
            role: PermissionCommand.FLAGS.ADMIN_ROLE,
            roleMessage: 'You do not have permission for this command, only admins can use it!',
        });
    }

    /**
     * @param {Document} botGuild
     * @param {Discord.Message} message - the message in which the command was run
     */
    async runCommand(botGuild, message, {activityName}) {

        let activity = await new Activity(activityName, message.guild).init();

        // report success of activity creation
        discordServices.replyAndDelete(message,'Activity session named: ' + activity.name + ' created successfully. Any other commands will require this name as paramter.');

        // send message to console with emoji commands
        // message embed
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('Activity: ' + activity.name + ' console.')
            .setDescription('This activity\'s information is below. For any changes you can use the emojis or direct commands.\n' + 
                '🧑🏽‍💼 Will make this activity a workshop.\n' + 
                '☕ Will make this activity a coffee chat!\n' + 
                '⏫ Will add voice channels, will be private if this is a workshop.\n' + 
                '⏬ Will remove voice channels.\n' + 
                '⛔ Will remove the activity and this message!\n' + 
                '🌬️ Will shuffle all the users in the general voice channel over all possible channels.\n' +
                '🔃 Will callback all users from all channels to the general channel.\n' + 
                '👨‍👩‍👧‍👦 Will shuffle all the groups around the available channels.\n' + 
                '🦜 Will shuffle all the mentors around the available channels.\n' +
                '🏕️ Will activate a stamp distribution that will be open for ' + botGuild.stamps.stampCollectionTime + ' seconds.\n' +
                '🏎️ [FOR WORKSHOPS] Will send an embedded message asking how the speed is.\n' +
                '✍️ [FOR WORKSHOPS] Will send an embedded message asking how the difficulty is.\n' +
                '🧑‍🏫 [FOR WORKSHOPS] Will send an embedded message asking how good the explanations are.\n' + 
                '🕵🏽 Will make this activity a among us activity!\n' + 
                '💼 Will archive the activity, removing all channels except the text channel which will be sent to archive category.\n' // +
            );  

        // send message
        var msgConsole = await message.channel.send(msgEmbed);

        // emojis
        var emojis = ['🧑🏽‍💼', '☕', '⏫', '⏬', '⛔', 
                        '🌬️', '🔃', '👨‍👩‍👧‍👦', '🦜','🏕️','🏎️',
                        '✍️','🧑‍🏫', '🕵🏽', '💼', 
                    ];

        // respond to message with emojis
        emojis.forEach(emoji => msgConsole.react(emoji));

        // create collector
        const emojiCollector = await msgConsole.createReactionCollector((reaction, user) => user.bot != true && emojis.includes(reaction.emoji.name));

        // on emoji reaction
        emojiCollector.on('collect', async (reaction, user) => {
            // get commando registry
            var commandRegistry = this.client.registry;

            // emoji name
            var emojiName = reaction.emoji.name;

            // remove new reaction
            reaction.users.remove(user.id);

            // init workshop
            if (emojiName === emojis[0] && activity.isRegularActivity()) {
                activity.state.isWorkshop = true;

                // init workshop command
                commandRegistry.findCommands('init-workshop', true)[0].runActivityCommand(message, activity);
                //activity.changeVoiceChannelPermissions(true); // TODO check if this is necessary
                
                // update embed
                msgConsole.edit(msgConsole.embeds[0].addField('Update', 'The activity is now a Workshop!'));
            } else if (emojiName === emojis[1] && activity.isRegularActivity()) {
                activity.state.isCoffeeChats = true;

                try {
                    var numOfGroups = (await numberPrompt({prompt: 'How many groups do you want?', channel: message.channel, userId: user.id}))[0];
                } catch (error) {
                    var numOfGroups = 0;
                }

                commandRegistry.findCommands('init-coffee-chats', true)[0].runActivityCommand(message, activity, { numOfGroups: numOfGroups });
                activity.changeVoiceChannelPermissions(true); // TODO check if this is necessary

                // update embed
                msgEmbed.addField('Update', 'The activity is now a Coffee Chat!');
                msgConsole.edit(msgEmbed);
            } else if (emojiName === emojis[4]) {
                commandRegistry.findCommands('remove-activity', true)[0].runActivityCommand(message, activity);
                msgConsole.delete({timeout: 3000});
            } else if (emojiName === emojis[2]) {
                commandRegistry.findCommands('add-voice-channels', true)[0].runActivityCommand(message, activity, { number: 1, isPrivate: !activity.isRegularActivity() || activity.isHidden, maxUsers: activity.state.isAmongUs ? 12 : 0});
            } else if (emojiName === emojis[3]) {
                commandRegistry.findCommands('remove-voice-channels', true)[0].runActivityCommand(message, activity, { number: 1 });
            } else if (emojiName === emojis[5]) {
                commandRegistry.findCommands('shuffle', true)[0].runActivityCommand(message, activity);
            } else if (emojiName === emojis[6]) {
                commandRegistry.findCommands('callback', true)[0].runActivityCommand(message, activity);
            } else if (emojiName === emojis[7]) {
                commandRegistry.findCommands('shuffle-groups', true)[0].runActivityCommand(message, activity);
            } else if (emojiName === emojis[8]) {
                commandRegistry.findCommands('shuffle-mentors', true)[0].runActivityCommand(message, activity);
            } else if (emojiName === emojis[9]) {
                commandRegistry.findCommands('distribute-stamp', true)[0].runCommand(message, activity, { timeLimit: botGuild.stamps.stampCollectTime });
            } else if (emojiName === emojis[10]) {
                commandRegistry.findCommands('workshop-polls',true)[0].runCommand(message, activity, { questionType: 'speed' });
            } else if (emojiName === emojis[11]) {
                commandRegistry.findCommands('workshop-polls',true)[0].runCommand(message, activity, { questionType: 'difficulty' });
            } else if (emojiName === emojis[12]) {
                commandRegistry.findCommands('workshop-polls',true)[0].runCommand(message, activity, { questionType: 'explanations' });
            } else if (emojiName === emojis[13] && activity.isRegularActivity()) {
                activity.state.isAmongUs = true;
                await activity.addLimitToVoiceChannels(12);
                commandRegistry.findCommands('init-among-us', true)[0].runActivityCommand(message, activity, { numOfChannels: 3 });
                activity.changeVoiceChannelPermissions(true);
            } else if (emojiName === emojis[14]) {
                commandRegistry.findCommands('archive', true)[0].runActivityCommand(message, activity);
                msgConsole.delete({timeout: 3000});
                emojiCollector.stop();
            } 
        });
    }
};