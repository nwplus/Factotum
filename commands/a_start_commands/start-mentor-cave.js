// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { randomColor } = require('../../discord-services');
const { Message, Collection } = require('discord.js');
const Cave = require('../../classes/activities/cave');
const { yesNoPrompt, rolePrompt, numberPrompt, reactionPrompt } = require('../../classes/prompt');
const winston = require('winston');
const BotGuildModel = require('../../classes/bot-guild');

/**
 * The start mentor cave command starts a cave special for mentors. 
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
            if (await yesNoPrompt({prompt: 'Have you created the mentor role? If not it is okay, I can make it for you!', channel, userId})) {
                role = (await rolePrompt({prompt: 'Please mention the mentor role now!', channel, userId})).first();
            } else {
                role = await message.guild.roles.create({
                    data: {
                        name: 'Mentor',
                        color: randomColor(),
                    }
                });
            }

            /**
             * @param {String} prompt - message to ask user to choose an emoji for a function
             * 
             * Gets user's reaction and adds them to the emoji collection.
             */
            async function checkForDuplicateEmojis(prompt) {
                var emoji = await reactionPrompt({prompt, channel, userId}, emojis);
                emojis.set(emoji.name, emoji);
                return emoji;
            }

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
                    inactivePeriod: (await numberPrompt({prompt: 'How long, in minutes, does a ticket need to be inactive for before asking to delete it?',
                        channel, userId}))[0],
                    bufferTime: (await numberPrompt({prompt: 'How long, in minutes, will the bot wait for a response to its request to delete a ticket?',
                        channel, userId}))[0],
                    reminderTime: (await numberPrompt({prompt: 'How long, in minutes, shall a ticket go unaccepted before the bot sends a reminder to all mentors?',
                        channel, userId}))[0],
                }
            }, botGuild);


            let adminConsole = message.guild.channels.resolve(botGuild.channelIDs.adminConsole);

            try {
                let isCreated = await yesNoPrompt({prompt: 'Are the categories and channels already created?', channel, userId});

                if (isCreated) await cave.find(channel, userId);
                else await cave.init(message.guild.channels);
            } catch (error) {
                // if prompt canceled then init then take it as false
                await cave.init(message.guild.channels);
            }

            await cave.sendConsoleEmbeds(adminConsole);

            cave.checkForExistingRoles(message.guild.roles, adminConsole, userId);
          
        } catch (error) {
            message.channel.send('Due to a prompt cancel, the mentor cave creation was unsuccessful.').then(msg => msg.delete({timeout: 5000}));
            winston.loggers.get(message.guild.id).warning(`An error was found but it was handled by not setting up the mentor cave. Error: ${error}`, { event: 'StartMentorCave Command' });
        }
    }
}
module.exports = StartMentorCave;