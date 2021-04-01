const PermissionCommand = require('../../classes/permission-command');
const { Message, MessageEmbed, Role, Collection} = require('discord.js');
const { deleteMessage } = require('../../discord-services');
const BotGuildModel = require('../../classes/bot-guild');
const winston = require('winston');
const { StringPrompt, RolePrompt, SpecialPrompt } = require('advanced-discord.js-prompts');

/**
 * Shows an embed with a link used for activities happening outside discord. Initial intent was to be used for 
 * sponsor booths. A specified role can open and close the rooms as they want. When rooms open, a specified role is notified.
 * @category Commands
 * @subcategory Boothing
 * @extends PermissionCommand
 * @guildonly
 */
class ERoomDirectory extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'e-room-directory',
            group: 'a_boothing',
            memberName: 'keep track of booths',
            description: 'Sends embeds to booth directory to notify hackers of booth statuses',
            guildOnly: true,
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'This command can only be ran by staff!',
        });
    }

    /**
     * Sends an embed same channel with the sponsor's name and link to their Zoom boothing room. The embed has 2 states: Open and Closed. 
     * In the Closed state the embed will be red and say the booth is closed, which is the default, and the bot will react to the embed with 
     * a door emoji at the beginning. In the Open state the embed will be green and say the booth is open. Any time a staff or sponsor clicks 
     * on that emoji, the embed changes to the other state. When a booth goes from Closed to Open, it will also notify a role (specified by 
     * the user) that it is open.
     * 
     * @param {Message} message - messaged that called this command
     * @param {BotGuildModel} botGuild
     */
    async runCommand(botGuild, message) {

        // helpful vars
        let channel = message.channel;
        let userId = message.author.id;

        try {
            var sponsorName = await StringPrompt.single({prompt: 'What is the room name?', channel, userId, cancelable: true});
            sponsorName = sponsorName.content;

            var link = await StringPrompt.single({prompt: 'What is the room link? We will add no words to it! (ex. <Room Name> is Currently Open).', channel, userId, cancelable: true});
            link = link.content;

            //ask user for role and save its id in the role variable
            var role = (await RolePrompt.single({prompt: 'What role will get pinged when the rooms open?', channel, userId})).id;
        } catch (error) {
            channel.send('<@' + userId + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        /**
         * prompt for roles that can open/close the room
         * @type {Collection<String, Role>}
         */
        var roomRoles;
        try {
            roomRoles = await RolePrompt.multi({ prompt: 'What other roles can open/close the room? (Apart form staff).', channel, userId, cancelable: true });
        } catch (error) {
            // do nothing as this is fine
            winston.loggers.get(message.guild.id).warning(`Got an error: ${error} but I let it go since we expected it from the prompt.`, { event: 'E-Room-Directory Command' });
        }
        // add staff role
        roomRoles.set(botGuild.roleIDs.staffRole, message.guild.roles.resolve(botGuild.roleIDs.staffRole));

        // prompt user for emoji to use
        let emoji = await SpecialPrompt.singleEmoji({prompt: 'What emoji do you want to use to open/close the room?', channel, userId});
    
        //variable to keep track of state (Open vs Closed)
        var closed = true;
        //embed for closed state
        const embed = new MessageEmbed()
            .setColor('#FF0000')
            .setTitle(sponsorName + ' is Currently Closed')
            .setDescription('Room link: ' + link);
        
        //send closed embed at beginning (default is Closed)
        channel.send(embed).then((msg) => {
            msg.pin();
            msg.react(emoji);

            //only listen for the door react from users that have one of the roles in the room roles collection
            const emojiFilter = (reaction, user) => {
                let member = message.guild.member(user);
                return !user.bot && reaction.emoji.name === emoji.name && roomRoles.some(role => member.roles.cache.has(role.id));
            };
            const emojiCollector = msg.createReactionCollector(emojiFilter);
            
            var announcementMsg;

            emojiCollector.on('collect', async (reaction, user) => {
                reaction.users.remove(user);
                if (closed) {
                    //embed for open state
                    const openEmbed = new MessageEmbed()
                        .setColor('#008000')
                        .setTitle(sponsorName + ' \'s Booth is Currently Open')
                        .setDescription('Please visit this Zoom link to join: ' + link);
                    //change to open state embed if closed is true
                    msg.edit(openEmbed);
                    closed = false;
                    //notify people of the given role that booth is open and delete notification after 5 mins
                    announcementMsg = await channel.send('<@&' + role + '> ' + sponsorName + ' \'s booth has just opened!');
                    announcementMsg.delete({timeout: 300 * 1000});
                } else {
                    //change to closed state embed if closed is false
                    msg.edit(embed);
                    closed = true;
                    deleteMessage(announcementMsg);
                }
            });
        });
    }
}
module.exports = ERoomDirectory;
