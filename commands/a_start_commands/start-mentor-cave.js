// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { randomColor } = require('../../discord-services');
const { Message, Collection } = require('discord.js');
const Cave = require('../../classes/activities/cave');
const winston = require('winston');
const BotGuildModel = require('../../classes/bot-guild');
const { NumberPrompt, SpecialPrompt, RolePrompt } = require('advanced-discord.js-prompts');

/**
 * The start mentor cave command creates a cave for mentors. To know what a cave is look at [cave]{@link Cave} class.
 * @category Commands
 * @subcategory Start-Commands
 * @extends PermissionCommand
 * @guildonly
 */
class StartMentorCave extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'start-mentor-cave',
            group: 'a_start_commands',
            memberName: 'start the mentor\'s experience',
            description: 'Will create a private category for mentors with channels for them to use!',
            guildOnly: true,
        },
        {
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'This command can only be used in the admin console!',
            role: PermissionCommand.FLAGS.ADMIN_ROLE,
            roleMessage: 'You do not have permission for this command, only admins can use it!',
        });
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message - the message in which the command was run
     */
    async runCommand(botGuild, message) {
        try {
            // helpful prompt vars
            let channel = message.channel;
            let userId = message.author.id;


            var emojis = new Collection(); //collection to keep the names of the emojis used so far, used to check for duplicates

            //ask user for each emoji
            let joinTicketEmoji = await checkForDuplicateEmojis('What is the join ticket emoji?');
            let giveHelpEmoji = await checkForDuplicateEmojis('What is the give help emoji?');
            let requestTicketEmoji = await checkForDuplicateEmojis('What is the request ticket emoji?');
            let addRoleEmoji = await checkForDuplicateEmojis('What is the add mentor role emoji?');
            let deleteChannelsEmoji = await checkForDuplicateEmojis('What is the delete ticket channels emoji?');
            let excludeFromAutoDeleteEmoji = await checkForDuplicateEmojis('What is the emoji to opt tickets in/out for the garbage collector?');

            var role;
            if (await SpecialPrompt.boolean({prompt: 'Have you created the mentor role? If not it is okay, I can make it for you!', channel, userId})) {
                role = await RolePrompt.single({prompt: 'Please mention the mentor role now!', channel, userId});
            } else {
                role = await message.guild.roles.create({
                    data: {
                        name: 'Mentor',
                        color: randomColor(),
                    }
                });
            }

            let publicRoles = await RolePrompt.multi({ prompt: 'What roles can request tickets?', channel, userId });

            /**
             * @param {String} prompt - message to ask user to choose an emoji for a function
             * 
             * Gets user's reaction and adds them to the emoji collection.
             */
            // eslint-disable-next-line no-inner-declarations
            async function checkForDuplicateEmojis(prompt) {
                let reaction = await SpecialPrompt.singleRestrictedReaction({prompt, channel, userId}, emojis);
                var emoji = reaction.emoji;
                emojis.set(emoji.name, emoji);
                return emoji;
            }

            let inactivePeriod = await NumberPrompt.single({prompt: 'How long, in minutes, does a ticket need to be inactive for before asking to delete it?',
                channel, userId});
            var bufferTime = inactivePeriod;
            while (bufferTime >= inactivePeriod) {
                bufferTime = await NumberPrompt.single({prompt: `How long, in minutes, will the bot wait for a response to its request to delete a ticket? Must be less than inactive period: ${inactivePeriod}.`,
                    channel, userId});
            }
            let reminderTime = await NumberPrompt.single({prompt: 'How long, in minutes, shall a ticket go unaccepted before the bot sends a reminder to all mentors?',
                channel, userId});

            let cave = new Cave({
                name: 'Mentor',
                preEmojis: '🧑🏽🎓',
                preRoleText: 'M',
                color: 'ORANGE',
                role: role,
                emojis: {
                    joinTicketEmoji: joinTicketEmoji,
                    giveHelpEmoji: giveHelpEmoji,
                    requestTicketEmoji: requestTicketEmoji,
                    addRoleEmoji: addRoleEmoji,
                    deleteChannelsEmoji: deleteChannelsEmoji,
                    excludeFromAutoDeleteEmoji: excludeFromAutoDeleteEmoji,
                },
                times: {
                    inactivePeriod,
                    bufferTime,
                    reminderTime,
                },
                publicRoles: publicRoles,
            }, botGuild, message.guild);

            await cave.init();
          
        } catch (error) {
            message.channel.send('Due to a prompt cancel, the mentor cave creation was unsuccessful.').then(msg => msg.delete({timeout: 5000}));
            winston.loggers.get(message.guild.id).warning(`An error was found but it was handled by not setting up the mentor cave. Error: ${error}`, { event: 'StartMentorCave Command' });
        }
    }
}
module.exports = StartMentorCave;