// Discord.js commando requirements
const { Command } = require('discord.js-commando');
const discordServices = require('../../discord-services');

// Command export
module.exports = class CreatePrivatesFor extends Command {
    constructor(client) {
        super(client, {
            name: 'addvoiceto',
            group: 'a_activity',
            memberName: 'create private voice channels for a workshop',
            description: 'Will create x number of private voice channels for given workshop.',
            guildOnly: true,
            args: [
                {
                    key: 'activityName',
                    prompt: 'the workshop name',
                    type: 'string',
                },
                {
                    key: 'number',
                    prompt: 'number of private channels',
                    type: 'integer',
                },
                {
                    key: 'categoryChannelKey',
                    prompt: 'snowflake of the activiti\'s category',
                    type: 'string',
                    default: '',
                },
                {
                    key: 'isPrivate',
                    prompt: 'if the new voice channels should be privates',
                    type: 'boolean',
                    default: false,
                }
            ],
        });
    }

    // Run function -> command body
    async run(message, {activityName, number, categoryChannelKey, isPrivate}) {
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
        if (categoryChannelKey === '') {
            var category = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name.endsWith(activityName));
        } else {
            var category = message.guild.channels.resolve(categoryChannelKey);
        }

        
        // if no category then report failure and return
        if (category === undefined) {
            // if the category does not excist
            discordServices.replyAndDelete(message,'The workshop named: ' + activityName +', does not excist! Did not create voice channels.');
            return;
        }
        
        var final = await discordServices.addVoiceChannelsToActivity(activityName, number, category, message.guild.channels, isPrivate);

        // report success of workshop creation
        discordServices.replyAndDelete(message,'Workshop session named: ' + activityName + ' now has ' + final + ' voice channels.');
    }

};