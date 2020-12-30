// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Activity = require('../../classes/activity');
const { numberPrompt } = require('../../classes/prompt');

// Command export
module.exports = class NewActivity extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'newactivity',
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
                // {
                //     key: 'startsHidden',
                //     prompt: 'do you want the activity to start hidden?',
                //     type: 'boolean',
                //     default: true,
                // }
            ],
        },
        {
            channelID: discordServices.adminConsoleChannel,
            channelMessage: 'This command can only be used in the admin console!',
            roleID: discordServices.adminRole,
            roleMessage: 'You do not have permision for this command, only admins can use it!',
        });
    }

    async runCommands(message, {activityName}) {

        let activity = await new Activity(activityName, message.guild).init();

        // report success of activity creation
        discordServices.replyAndDelete(message,'Activity session named: ' + activity.name + ' created succesfully. Any other commands will require this name as paramter.');

        // send message to console with emoji commands
        // message embed
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
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
                '🏕️ Will activate a stamp distribution that will be open for ' + discordServices.stampCollectTime + ' seconds.\n' +
                '🏎️ [FOR WORKSHOPS] Will send an embedded message asking how the speed is.\n' +
                '✍️ [FOR WORKSHOPS] Will send an embedded message asking how the difficulty is.\n' +
                '🧑‍🏫 [FOR WORKSHOPS] Will send an embedded message asking how good the explanations are.\n' + 
                '🕵🏽 Will make this activity a among us activity!\n' + 
                '💼 Will archive the activity, removing all channels except the text channel which will be sent to archive category.\n' // +
                // '🤫 Will change the visibility of the activity, can only change twice! Look at category name to know if hidden or not.'
            );  

        // send message
        var msgConsole = await message.channel.send(msgEmbed);

        // emojis
        var emojis = ['🧑🏽‍💼', '☕', '⏫', '⏬', '⛔', 
                        '🌬️', '🔃', '👨‍👩‍👧‍👦', '🦜','🏕️','🏎️',
                        '✍️','🧑‍🏫', '🕵🏽', '💼', 
                        // '🤫' we are not using hide/unhide functionality
                    ];

        // respond to message with emojis
        emojis.forEach(emoji => msgConsole.react(emoji));

        // hide the activity if asked to
        // if (startsHidden) {
        //     this.client.registry.findCommands('hide_unhide', true)[0].run(message, {activityName: activityName, toHide: true, categoryChannelKey: category.id});
        //     msgConsole.edit(msgConsole.embeds[0].addField('Activity is now HIDDEN', 'The activity is marked as HIDDEN, no one can see it!'));
        // }

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
                commandRegistry.findCommands('initw', true)[0].runActivityCommand(message, activity);
                discordServices.changeVoiceChannelPermissions(activity.name, activity.category, true); // TODO check if this is necessary
                
                // update embed
                msgConsole.edit(msgConsole.embeds[0].addField('Update', 'The activity is now a Workshop!'));
            } else if (emojiName === emojis[1] && activity.isRegularActivity()) {
                activity.state.isCoffeeChats = true;

                let numOfGroups = await numberPrompt('How many groups do you want?', message.channel, user.id);

                commandRegistry.findCommands('initcc', true)[0].runActivityCommand(message, activity, { numOfGroups: numOfGroups });
                discordServices.changeVoiceChannelPermissions(activity.name, category, true); // TODO check if this is necessary

                // update embed
                msgEmbed.addField('Update', 'The activity is now a Coffee Chat!');
                msgConsole.edit(msgEmbed);
            } else if (emojiName === emojis[4]) {
                commandRegistry.findCommands('removeactivity', true)[0].runActivityCommand(message, activity);
                msgConsole.delete({timeout: 3000});
            } else if (emojiName === emojis[2]) {
                commandRegistry.findCommands('addvoiceto', true)[0].runActivityCommand(message, activity, { number: 1, isPrivate: !activity.isRegularActivity() || activity.isHidden, maxUsers: activity.state.isAmongUs ? 12 : 0});
            } else if (emojiName === emojis[3]) {
                commandRegistry.findCommands('removevoiceto', true)[0].runActivityCommand(message, activity, { number: 1 });
            } else if (emojiName === emojis[5]) {
                commandRegistry.findCommands('shuffle', true)[0].runActivityCommand(message, activity);
            } else if (emojiName === emojis[6]) {
                commandRegistry.findCommands('callback', true)[0].runActivityCommand(message, activity);
            } else if (emojiName === emojis[7]) {
                commandRegistry.findCommands('gshuffle', true)[0].runActivityCommand(message, activity);
            } else if (emojiName === emojis[8]) {
                commandRegistry.findCommands('mshuffle', true)[0].runActivityCommand(message, activity);
            } else if (emojiName === emojis[9]) {
                commandRegistry.findCommands('distribute-stamp', true)[0].runActivityCommand(message, activity, { timeLimit: discordServices.stampCollectTime });
            } else if (emojiName === emojis[10]) {
                commandRegistry.findCommands('workshop-polls',true)[0].runActivityCommand(message, activity, { question: 'speed' });
            } else if (emojiName === emojis[11]) {
                commandRegistry.findCommands('workshop-polls',true)[0].runActivityCommand(message, activity, { question: 'difficulty' });
            } else if (emojiName === emojis[12]) {
                commandRegistry.findCommands('workshop-polls',true)[0].runActivityCommand(message, activity, { question: 'explanations' });
            } else if (emojiName === emojis[13] && activity.isRegularActivity()) {
                activity.state.isAmongUs = true;

                await discordServices.addLimitToVoiceChannels(activity.name, activity.category, 12);
                commandRegistry.findCommands('initau', true)[0].runActivityCommand(message, activity, { numOfChannels: 3 });
                discordServices.changeVoiceChannelPermissions(activity.name, activity.category, true);
            } else if (emojiName === emojis[14]) {
                commandRegistry.findCommands('archive', true)[0].runActivityCommand(message, activity);
                msgConsole.delete({timeout: 3000});
                emojiCollector.stop();
            } 
            // NOT USING HIDDEN FUNCTIONALITY -> BREAKS TOO MANY PERMISION STUFF!
            // else if (emojiName === emojis[15]) {
            //     isHidden = !isHidden;
                
            //     // guard to make sure the hide functinoality is not used more than possible due to discord API constraints
            //     if (hiddenChanges >= maxHiddenChanges) {
            //         discordServices.replyAndDelete(message, 'This activity can\'t be hidden/unhidden anymore!');
            //         return;
            //     }

            //     // update HIDDEN/UNHIDDEN in the console
            //     msgEmbed.addField('Activity is now HIDDEN', 'The activity is marked as HIDDEN, no one can see it!')

            //     commandRegistry.findCommands('hide_unhide', true)[0].run(message, {activityName: activityName, toHide: isHidden, categoryChannelKey: category.id });
            //     if (!isHidden && !(isWorkshop || isAmongUs || isCoffeeChats)) {
            //         discordServices.changeVoiceChannelPermissions(activityName, category, false);
            //         msgConsole.edit(msgConsole.embeds[0].addField('Activity is now HIDDEN', 'The activity is marked as HIDDEN, no one can see it!'));
            //     } else {
            //         discordServices.changeVoiceChannelPermissions(activityName, category, true);
            //         msgConsole.edit(msgConsole.embeds[0].addField('Activity is now not HIDDEN', 'The activity is viewable by everyone!'));
            //     }

            //     hiddenChanges += 1;
            // }
        });
    }
};