// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');

// Command export
module.exports = class HideUnhide extends Command {
    constructor(client) {
        super(client, {
            name: 'hide_unhide',
            group: 'a_activity',
            memberName: 'hide or unhide an activity',
            description: 'Will add or remove permissions to everyone except staff to see the activity.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
                {
                    key: 'toHide',
                    prompt: 'should the activity be hidden?',
                    type: 'boolean',
                },
                {
                    key: 'categoryChannelKey',
                    prompt: 'snowflake of the activiti\'s category',
                    type: 'string',
                    default: '',
                },
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName, toHide, categoryChannelKey}) {
        discordServices.deleteMessage(message);

        // make sure command is only used in the admin console
        if (! discordServices.isAdminConsole(message.channel)) {
            discordServices.replyAndDelete(message, 'This command can only be used in the admin console!');
            return;   
        }
        // only memebers with the staff tag can run this command!
        if (!(discordServices.checkForRole(message.member, discordServices.staffRole))) {
            discordServices.replyAndDelete(message, 'You do not have permision for this command, only staff can use it!');
            return;             
        }

        // get category
        var category;
        if (categoryChannelKey === '') {
            category = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name.endsWith(activityName));
        } else {
            category = message.guild.channels.resolve(categoryChannelKey);
        }


        // if no category then report failure and return
        if (category === undefined) {
            // if the category does not excist
            discordServices.replyAndDelete(message,'The workshop named: ' + activityName +', does not excist! Did not remove voice channels.');
            return;
        }

        // NOTE:
        // * It appears that the discord api takes a LONG time to change the name once the category has been changed a few times
        // * For our purposes, we are okay with hiding it only initialy and then unhiding, after that no more hidding alowed
        // * Will make sure this rule is followed in !newactivity console


        // update overwrites
        if (toHide) {
            // console.log('will hide category named: ' + category.name);
            category = await category.setName('HIDDEN-' + category.name);
            // console.log('Name has been changed to: ' + category.name);
            category = await category.createOverwrite(discordServices.attendeeRole, {VIEW_CHANNEL: false});
        } else {
            // console.log('will un hide category named: ' + category.name);
            category = await category.setName(category.name.replace('HIDDEN-', ''));
            // console.log('Name has been changed to: ' + category.name);
            category = await category.createOverwrite(discordServices.attendeeRole, {VIEW_CHANNEL: true});
        }

        // report success of channel deletions
        discordServices.replyAndDelete(message,'Workshop session named: ' + activityName + ' has changed visibility.');
    }
};