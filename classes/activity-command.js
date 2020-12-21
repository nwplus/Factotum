const PermissionCommand = require('./permission-command');
const discordServices = require('../discord-services');
const { CommandoClient } = require('discord.js-commando');
const Activity = require('./activity');
const Prompt = require('./prompt');

/**
 * The ActivityCommand class is a special class used for activity commands. It extends
 * the PermissionCommand to support role and channel validation.
 * This command adds category voice and text channel searches, and validation.
 */
class ActivityCommand extends PermissionCommand {

    /**
     * Constructor for our Activity command, it needs the Command and PermissionCommand parameters.
     * @param {import('discord.js-commando').CommandoClientOptions} client - the client the command is for
     * @param {import('discord.js-commando').CommandInfo} info - the information for this commando command
     * No need for a PermissionInformation because the ActivityCommand always has the same permission!
     * @param {Activity} activity - the activity this command is for
     */
    constructor(client, info, activity){
        super(client, info, 
            {
                roleID: discordServices.staffRole,
                roleMessage: 'You do not have permision for this command, only staff can use it!',
                channelID: discordServices.adminConsoleChannel,
                channelMessage: 'This command can only be used in the admin console!',
            }
        );

        /**
         * The activity being used in this command
         * @type {Activity}  
         */
        this.activity = activity || null;
    }

    /**
     * Asked by our parent PermissionCommand, will contain the code specific to acticity commands.
     */
    runCommand(message) {
        if (this.activity === null) {
            let activityName = await Prompt.messagePrompt('What is the activity name?', 'string', message.channel, message.author.id);

            var category = await message.guild.channels.cache.find(channel => channel.type === 'category' && channel.name.endsWith(activityName));
        }
    }


    /**
     * Required class by children, should contain the command code.
     * @abstract
     */
    runActivityCommand(message, args, fromPattern, result) {
        throw new Error('You need to implement the runActivityCommand method!');
    }
}

module.exports = ActivityCommand;