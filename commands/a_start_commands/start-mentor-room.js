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
            name: 'startm',
            group: 'a_start_commands',
            memberName: 'start the mentor\'s experience',
            description: 'Will create a private category for mentors with channels for them to use!',
            guildOnly: true,
            args: [],
        },
        {
            channelID: discordServices.adminConsoleChannel,
            channelMessage: 'This command can only be used in the admin console!',
            roleID: discordServices.adminRole,
            roleMessage: 'You do not have permision for this command, only admins can use it!',
        });
    }

    /**
     * 
     * @param {Discord.Message} message - a message
     */
    async runCommand(message) {

        var emojis = []; //array to keep the names of the emojis used so far, used to check for duplicates
        
        //ask user for each emoji
        let joinTicketEmoji = await checkForDuplicateEmojis('What is the join ticket emoji?');
        let giveHelpEmoji = await checkForDuplicateEmojis('What is the give help emoji?');
        let requestTicketEmoji = await checkForDuplicateEmojis('What is the request ticket emoji?');
        let addRoleEmoji = await checkForDuplicateEmojis('What is the add mentor role emoji?');
        let deleteChannelsEmoji = await checkForDuplicateEmojis('What is the delete ticket channels emoji?');
        let excludeFromAutodeleteEmoji = await checkForDuplicateEmojis('What is the emoji to opt tickets in/out for the garbage collector?') 
        
        /**
         * 
         * @param {String} prompt - message to ask user to choose an emoji for a function
         * 
         * Gets user's react and compares its name with that of the other emojis already in the array and keeps asking if the given
         * emoji is a duplicate. Returns the emoji as soon as the user gives a valid one.
         */
        async function checkForDuplicateEmojis(prompt) {
            var emoji = await Prompt.reactionPrompt(prompt, message.channel, message.author.id);
            while (emojis.includes(emoji.name)) {
                emoji = await Prompt.reactionPrompt('No duplicate emojis allowed! ' + prompt, message.channel, message.author.id);
            }
            emojis.push(emoji.name);
            return emoji;
        }

        let cave = new Cave({
            name: 'Mentor',
            preEmojis: '🧑🏽🎓',
            preRoleText: 'M',
            color: 'ORANGE',
            role: message.guild.roles.resolve(discordServices.mentorRole),
            emojis: {
                joinTicketEmoji: joinTicketEmoji,
                giveHelpEmoji: giveHelpEmoji,
                requestTicketEmoji: requestTicketEmoji,
                addRoleEmoji: addRoleEmoji,
                deleteChannelsEmoji: deleteChannelsEmoji,
                excludeFromAutodeleteEmoji: excludeFromAutodeleteEmoji,
            }
           
        });

        let adminConsole = message.guild.channels.resolve(discordServices.adminConsoleChannel);

        let isCreated = await Prompt.yesNoPrompt('Are the categories and channels already created?', message.channel, message.author.id);

        if (isCreated) await cave.find(message.channel, message.author.id);
        else await cave.init(message.guild.channels);

        await cave.sendConsoleEmbeds(adminConsole);

        cave.checkForExcistingRoles(message.guild.roles, adminConsole, message.author.id);
    }

};