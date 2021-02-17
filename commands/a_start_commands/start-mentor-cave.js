// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Cave = require('../../classes/cave');
const Prompt = require('../../classes/prompt');

// Command export
module.exports = class StartMentors extends PermissionCommand {
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
     * 
     * @param {Discord.Message} message - a message
     */
    async runCommand(message) {
        try {
            var emojis = new Discord.Collection(); //collection to keep the names of the emojis used so far, used to check for duplicates

            //ask user for each emoji
            let joinTicketEmoji = await checkForDuplicateEmojis('What is the join ticket emoji?');
            let giveHelpEmoji = await checkForDuplicateEmojis('What is the give help emoji?');
            let requestTicketEmoji = await checkForDuplicateEmojis('What is the request ticket emoji?');
            let addRoleEmoji = await checkForDuplicateEmojis('What is the add mentor role emoji?');
            let deleteChannelsEmoji = await checkForDuplicateEmojis('What is the delete ticket channels emoji?');
            let excludeFromAutoDeleteEmoji = await checkForDuplicateEmojis('What is the emoji to opt tickets in/out for the garbage collector?');

            var role;
            if (await Prompt.yesNoPrompt('Have you created the mentor role? If not it is okay, I can make it for you!', message.channel, message.author.id)) {
                role = (await Prompt.rolePrompt('Please mention the mentor role now!', message.channel, message.author.id)).first();
            } else {
                role = await message.guild.roles.create({
                    data: {
                        name: 'Mentor',
                        color: discordServices.randomColor(),
                    }
                });
            }

            /**
             * 
             * @param {String} prompt - message to ask user to choose an emoji for a function
             * 
             * Gets user's reaction and adds them to the emoji collection.
             */
            async function checkForDuplicateEmojis(prompt) {
                var emoji = await Prompt.reactionPrompt(prompt, message.channel, message.author.id, emojis);
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
                    inactivePeriod: (await Prompt.numberPrompt('How long, in minutes, does a ticket need to be inactive for before asking to delete it?',
                        message.channel, message.author.id))[0],
                    bufferTime: (await Prompt.numberPrompt('How long, in minutes, will the bot wait for a response to its request to delete a ticket?',
                        message.channel, message.author.id))[0],
                    reminderTime: (await Prompt.numberPrompt('How long, in minutes, shall a ticket go unaccepted before the bot sends a reminder to all mentors?',
                        message.channel, message.author.id))[0],
                }
            });


            let adminConsole = message.guild.channels.resolve(discordServices.channelIDs.adminConsoleChannel);

            try {
                let isCreated = await Prompt.yesNoPrompt('Are the categories and channels already created?', message.channel, message.author.id);

                if (isCreated) await cave.find(message.channel, message.author.id);
                else await cave.init(message.guild.channels);
            } catch (error) {
                // if prompt canceled then init then take it as false
                await cave.init(message.guild.channels);
            }

            await cave.sendConsoleEmbeds(adminConsole);

            cave.checkForExistingRoles(message.guild.roles, adminConsole, message.author.id);
          
        } catch (error) {
            message.channel.send('Due to a prompt cancel, the mentor cave creation was unsuccessful.').then(msg => msg.delete({timeout: 5000})); 
        }
    }

};