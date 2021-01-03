const PermissionCommand = require('../../classes/permission-command');
const Discord = require('discord.js');
const { messagePrompt } = require('../../classes/prompt');
const discordServices = require('../../discord-services');

module.exports = class BoothDirectory extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'add-directory',
            group: 'a_boothing',
            memberName: 'keep track of booths',
            description: 'Sends embeds to booth directory to notify hackers of booth statuses',
            guildOnly: true,
            args: [
                {
                    key: 'sponsorName',
                    prompt: 'Name of sponsor',
                    type: 'string'
                },
                {
                    key: 'link',
                    prompt: 'Zoom link to booth',
                    type: 'string',
                },
            ],
        },
            {
                roleID: discordServices.staffRole,
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
 * @param {message} message - messaged that called this command
 * @param {string} sponsorName - Exact name of the sponsor 
 * @param {string} link - sponsor's Zoom boothing link
 */
    async runCommand(message, { sponsorName, link }) {
        //ask user for role and save its id in the role variable
        let rolemsg = await messagePrompt('What role will get pinged when booths open?','string', message.channel, message.author.id, 10);
        let role;
        if (rolemsg == null) {
            return;
        } else {
            role = rolemsg.mentions.roles.first().id;
        }
    
        //variable to keep track of state (Open vs Closed)
        var closed = true;
        //embed for closed state
        const embed = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setTitle(sponsorName + ' \'s Booth is Currently Closed')
            .setDescription(sponsorName + ' \'s Zoom link: ' + link);
        
        //send closed embed at beginning (default is Closed)
        message.channel.send(embed).then((msg) => {
            msg.pin();
            msg.react('🚪');
            //only listen for the door react from Staff and Sponsors
            const emojiFilter = (reaction, user) => (reaction.emoji.name === '🚪') && (message.guild.member(user).roles.cache.has(discordServices.staffRole) || message.guild.member(user).roles.cache.has(discordServices.sponsorRole));
            const emojicollector = msg.createReactionCollector(emojiFilter);
            emojicollector.on('collect', (reaction, user) => {
                reaction.users.remove(user);
                if (closed) {
                    //embed for open state
                    const openEmbed = new Discord.MessageEmbed()
                        .setColor('#008000')
                        .setTitle(sponsorName + ' \'s Booth is Currently Open')
                        .setDescription('Please visit this Zoom link to join: ' + link);
                    //change to open state embed if closed is true
                    msg.edit(openEmbed);
                    closed = false;
                    //notify people of the given role that booth is open and delete notification after 5 mins
                    message.channel.send('<@&' + role + '> ' + sponsorName + ' \'s booth has just opened!')
                    .then((msg) => msg.delete({timeout:300 * 1000}));
                } else {
                    //change to closed state embed if closed is false
                    msg.edit(embed);
                    closed = true;
                }
            });
        });
    }
}
