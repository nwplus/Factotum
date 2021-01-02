const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

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
            roleID: discordServices.adminRole,
            roleMessage: 'You do not have permision for this command, only admins can use it!',
        });
    }

    async runCommand(message, {numberOfWinners}) {
        var entries = new Array(3000);  //array size subject to change
        var position = {value:0};
        
        await message.guild.members.cache.forEach(member => {
            entries = this.addEntries(member, entries, position);
        });
        var length = Object.keys(entries).length;
        let winners = new Set();
        while (winners.size < numberOfWinners) {
            var num = Math.floor(Math.random() * length);
            var winner = entries[num];
            winners.add(winner);
        }
        winners = Array.from(winners);
        const embed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('The winners of the raffle draw are:')
            .setDescription('<@' + winners.join('><@') + '>');
        await message.channel.send(embed);
    }

    addEntries(member, entries, pos) {
        var stampRole;
        member.roles.cache.forEach(role => {
            var curr = role.name.substring(role.name.length - 2);
            if (!isNaN(curr)) {
                stampRole = role;
            }
        });
        if (stampRole == null) {
            return entries;
        }
        
        var stampNumber = parseInt(stampRole.name.slice(-2));

        var i;
        for (i = pos.value; i < stampNumber + pos.value; i++) {
            entries[i] = member.user.id;
        }
        pos.value = i++;
        return entries;
    }
}