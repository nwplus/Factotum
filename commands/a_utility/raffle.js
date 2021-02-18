const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const BotGuild = require('../../db/botGuildDBObject');

/**
 * The Raffle class randomly picks a set number of winners from all members in a Discord server that have a role ending in a 1-2 digit 
 * number. Can only be run in Admin console.
 * 
 * @param numberOfWinners - number of winners to be drawn
 */
module.exports = class Raffle extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'raffle',
            group: 'a_utility',
            memberName: 'draw raffle winners',
            description: 'parses each hacker for their stamps and draws winners from them, one entry per stamp',
            guildOnly: true,
            args: [
                {
                    key: 'numberOfWinners',
                    prompt: 'number of winners to be selected',
                    type: 'integer'
                },
            ]
        },
        {
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'This command can only be used in the admin console!',
            role: PermissionCommand.FLAGS.ADMIN_ROLE,
            roleMessage: 'You do not have permission for this command, only admins can use it!',
        });
    }

    /**
     * Main function which looks at every member's roles, identifies all that end in a number, and adds the member's id that many times 
     * into an array. Then it chooses random numbers and picks the id corresponding to that index until it has numberOfWinners unique 
     * winners.
     * 
     * @param {Discord.Message} message - message used to call the command
     * @param {integer} numberOfWinners - number of winners to be drawn
     */
    async runCommand(message, {numberOfWinners}) {
        let botGuild = await BotGuild.findById(message.guild.id);

        //check that numberOfWinners is less than the number of people with stamp roles or it will infinite loop
        var memberCount = message.guild.members.cache.filter(member => member.roles.cache.has(botGuild.roleIDs.memberRole)).size;
        if (memberCount <= numberOfWinners) {
            message.channel.send("Whoa there, you have more winners than hackers!").then((msg) => {
                msg.delete({ timeout: 5000 })
            });
            return;
        }

        //array to contain the ids
        var entries = new Array(); 
        
        await message.guild.members.cache.forEach(member => {
            entries = this.addEntries(member, entries);
        });

        //number of array spaces that are actually occupied by ids

        var length = entries.length;
        //set to keep track of winners
        let winners = new Set();
        //randomly generate a number and add the corresponding winner into the set
        while (winners.size < numberOfWinners) {
            var num = Math.floor(Math.random() * length);
            var winner = entries[num];
            winners.add(winner);
        }
        winners = Array.from(winners);
        const embed = new Discord.MessageEmbed()
            .setColor(discordServices.colors.embedColor)
            .setTitle('The winners of the raffle draw are:')
            .setDescription('<@' + winners.join('><@') + '>');
        await message.channel.send(embed);
    }

    /**
     * Function that takes a member and checks through all their roles to see if they have a stamp role. If they do, they get entered into
     * the entries array that many times.
     * @param {member} member - given member to check roles and add entries for
     * @param {Array} entries - array from runCommand to collect entries
    */
    addEntries(member, entries) {
        //don't add entries if member is a bot
        if (member.user.bot) {
            return entries;
        }
        
        var stampRole;
        //loop through member's roles and save the role that ends in a number, if any
        member.roles.cache.forEach(role => {
            var curr = role.name.substring(role.name.length - 2);
            if (!isNaN(curr)) {
                stampRole = role;
            }
        });
        //if member has no stamp roles, return
        if (stampRole == null) {
            return entries;
        }
        
        var stampNumber = parseInt(stampRole.name.slice(-2));

        var i;
        //starting from the first empty value in entries indicated by pos.value, add member's id stampNumber times 
        for (i = 0; i < stampNumber; i++) {
            entries.push(member.user.id);
        }
        return entries;
    }
}