const PermissionCommand = require('../../classes/permission-command');
const { Message, MessageEmbed, Role, Collection} = require('discord.js');
const discordServices = require('../../discord-services');
const Prompt = require('../../classes/prompt');
const BotGuildModel = require('../../classes/bot-guild');

module.exports = class BoothDirectory extends PermissionCommand {
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
            var sponsorName = await Prompt.messagePrompt({prompt: 'What is the sponsor name?', channel, userId}, 'string');
            sponsorName = sponsorName.content;

            var link = await Prompt.messagePrompt({prompt: 'What is the sponsor link?', channel, userId}, 'string');
            link = link.content;

            //ask user for role and save its id in the role variable
            var role = (await Prompt.rolePrompt({prompt: 'What role will get pinged when booths open?', channel, userId})).first().id;
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
            roomRoles = await Prompt.rolePrompt({ prompt: "What other roles can open/close the room? (Apart form staff) (Reply to cancel for none).", channel, userId });
        } catch (error) {

        }
        // add staff role
        roomRoles.set(botGuild.roleIDs.staffRole, message.guild.roles.resolve(botGuild.roleIDs.staffRole));

        // prompt user for emoji to use
        let emoji = await Prompt.reactionPrompt({prompt: 'What emoji do you want to use?', channel, userId});
    
        //variable to keep track of state (Open vs Closed)
        var closed = true;
        //embed for closed state
        const embed = new MessageEmbed()
            .setColor('#FF0000')
            .setTitle(sponsorName + ' \'s Booth is Currently Closed')
            .setDescription(sponsorName + ' \'s Zoom link: ' + link);
        
        //send closed embed at beginning (default is Closed)
        channel.send(embed).then((msg) => {
            msg.pin();
            msg.react(emoji);

            //only listen for the door react from users that have one of the roles in the room roles collection
            const emojiFilter = (reaction, user) => {
                let member = message.guild.member(user);
                return !user.bot && reaction.emoji.name === emoji.name && roomRoles.some(role => member.roles.cache.has(role.id));
            }
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
                    discordServices.deleteMessage(announcementMsg);
                }
            });
        });
    }
}
