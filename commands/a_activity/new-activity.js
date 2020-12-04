// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const firebaseActivity = require('../../firebase-services/firebase-services-activities');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class NewActivity extends Command {
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
        });
    }

    // Run function -> command body
    async run(message, {activityName, startsHidden}) {
        discordServices.deleteMessage(message);

        // make sure command is only used in the admin console
        if (discordServices.isAdminConsole(message.channel) != true) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;
        }
        // only memebers with the Hacker tag can run this command!
        if (!(discordServices.checkForRole(message.member, discordServices.adminRole))) {
            discordServices.replyAndDelete(message, 'You do not have permision for this command, only admins can use it!');
            return;
        }

        
        // replace all spaces for - in activity name 
        activityName = activityName.split(' ').join('-').trim();

        // remove all characters except numbers, letters and -
        activityName = activityName.replace(/[^0-9a-zA-Z-]/g, '').toLowerCase();

        // position is used to keep activities on top of the archive channel!
        var position = (await message.guild.channels.cache.filter(channel => channel.type === 'category')).array().length;
        var category = await message.guild.channels.create(activityName, {
            type: 'category',
            position: position - 1,
            permissionOverwrites: [
            {
                id: discordServices.hackerRole,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.attendeeRole,
                allow: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.mentorRole,
                allow: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.sponsorRole,
                allow: ['VIEW_CHANNEL'],
            },
            {
                id: discordServices.staffRole,
                allow: ['VIEW_CHANNEL'],
            }
        ]});
      
        // create text channel
        var generalText = await message.guild.channels.create('🖌️' + discordServices.activityTextChannelName, {
            type: 'text', 
            parent: category, 
            topic: 'A general banter channel to be used to communicate with other members, mentors, or staff. The !ask command is available for questions.',
        });

        // create general voice
        var generalVoice = await message.guild.channels.create('🗣️' + discordServices.activityVoiceChannelName, {
            type: 'voice', 
            parent: category, 
        });

        // create workshop in db
        firebaseActivity.create(activityName);

        // report success of activity creation
        discordServices.replyAndDelete(message,'Activity session named: ' + activityName + ' created succesfully. Any other commands will require this name as paramter.');

        // send message to console with emoji commands
        // message embed
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Activity: ' + activityName + ' console.')
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

        // guard variables
        var isWorkshop = false;
        var isCoffeeChats = false;
        var isAmongUs = false;
        // var isHidden = startsHidden;
        var isHidden = false;
        var hiddenChanges = 0;
        // var maxHiddenChanges = startsHidden ? 1 : 2;

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
            if (emojiName === emojis[0] && !isWorkshop && !isCoffeeChats && !isAmongUs) {
                isWorkshop = true;

                // init workshop command
                commandRegistry.findCommands('initw', true)[0].run(message, {activityName: activityName, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id});
                discordServices.changeVoiceChannelPermissions(activityName, category, true);
                
                // update embed
                msgConsole.edit(msgConsole.embeds[0].addField('Update', 'The activity is now a Workshop!'));
            } else if (emojiName === emojis[1] && !isCoffeeChats && !isWorkshop && !isAmongUs) {
                isCoffeeChats = true;

                // grab number of groups
                var numOfGroups = await message.channel.send('<@' + user.id + '> How many groups do you want?').then(async msg => {
                    return await msg.channel.awaitMessages(m => m.author.id === user.id, {max: 1}).then(msgs => {
                        msg.delete({timeout: 3000});
                        msgs.forEach(msg => msg.delete({timeout: 3000}));
                        return parseInt(msgs.first().content);
                    });
                });
                // check that a number was given
                if (Number.isNaN(numOfGroups)) {
                    message.channel.send('<@' + user.id + '> The number of groups is not a number, please try again!').then(msg => msg.delete({timeout: 5000}));
                    return;
                }

                commandRegistry.findCommands('initcc', true)[0].run(message, {activityName: activityName, numOfGroups: numOfGroups, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id});
                discordServices.changeVoiceChannelPermissions(activityName, category, true);

                // update embed
                msgEmbed.addField('Update', 'The activity is now a Coffee Chat!');
                msgConsole.edit(msgEmbed);
            } else if (emojiName === emojis[4]) {
                commandRegistry.findCommands('removeactivity', true)[0].run(message, {activityName: activityName, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id});
                msgConsole.delete({timeout: 3000});
            } else if (emojiName === emojis[2]) {
                commandRegistry.findCommands('addvoiceto', true)[0].run(message, {activityName: activityName, number: 1, categoryChannelKey: category.id, isPrivate: isWorkshop || isAmongUs || isCoffeeChats || isHidden, maxUsers: isAmongUs ? 12 : 0});
            } else if (emojiName === emojis[3]) {
                commandRegistry.findCommands('removevoiceto', true)[0].run(message, {activityName: activityName, number: 1, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id});
            } else if (emojiName === emojis[5]) {
                commandRegistry.findCommands('shuffle', true)[0].run(message, {activityName: activityName, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id});
            } else if (emojiName === emojis[6]) {
                commandRegistry.findCommands('callback', true)[0].run(message, {activityName: activityName, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id});
            } else if (emojiName === emojis[7]) {
                commandRegistry.findCommands('gshuffle', true)[0].run(message, {activityName: activityName, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id});
            } else if (emojiName === emojis[8]) {
                commandRegistry.findCommands('mshuffle', true)[0].run(message, {activityName: activityName, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id});
            } else if (emojiName === emojis[9]) {
                commandRegistry.findCommands('distribute-stamp', true)[0].run(message, {activityName: activityName, timeLimit: discordServices.stampCollectTime, targetChannelKey: generalText.id });
            } else if (emojiName === emojis[10]) {
                commandRegistry.findCommands('workshop-polls',true)[0].run(message, {activityName: activityName, question: 'speed', targetChannelKey: generalText.id });
            } else if (emojiName === emojis[11]) {
                commandRegistry.findCommands('workshop-polls',true)[0].run(message, {activityName: activityName, question: 'difficulty', targetChannelKey: generalText.id });
            } else if (emojiName === emojis[12]) {
                commandRegistry.findCommands('workshop-polls',true)[0].run(message, {activityName: activityName, question: 'explanations', targetChannelKey: generalText.id });
            } else if (emojiName === emojis[13] && !isAmongUs && !isWorkshop && !isCoffeeChats) {
                isAmongUs = true;
                await discordServices.addLimitToVoiceChannels(activityName, category, 12);
                commandRegistry.findCommands('initau', true)[0].run(message, {activityName: activityName, numOfChannels: 3, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id});
                discordServices.changeVoiceChannelPermissions(activityName, category, true);
            } else if (emojiName === emojis[14]) {
                commandRegistry.findCommands('archive', true)[0].run(message, {activityName: activityName, categoryChannelKey: category.id, textChannelKey: generalText.id, voiceChannelKey: generalVoice.id });
                msgConsole.delete({timeout: 3000});
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