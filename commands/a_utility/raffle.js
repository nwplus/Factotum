const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');

module.exports = class Raffle extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'raffle',
            group: 'a_utility',
            memberName: 'draw raffle winners',
            description: 'parses each hacker for their stamps and draws winners from them, one entry per stamp',
        },
        {
            roleID: discordServices.staffRole,
            roleMessage: 'You do not have permision for this command, only staff can use it!',
        });
    }

    async runCommand(message) {
        var entries = new Array(3000);  //array size subject to change
        var position = {value:0};
        
        await message.guild.members.cache.forEach(member => {
            entries = this.addEntries(member, entries, position);
        });
        var length = Object.keys(entries).length;
        let winners = new Set();
        var grand = entries[Math.floor(Math.random() * length)];
        winners.add(grand);
        while (winners.size < 2) {
            var secondary = entries[Math.floor(Math.random() * length)];
            winners.add(secondary);
        }
        winners = Array.from(winners);
        winners.forEach(member => {
            console.log(member); // or some other way to present winner information
        });
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
            entries[i] = member.user.username;
        }
        pos.value = i++;
        return entries;
    }
}