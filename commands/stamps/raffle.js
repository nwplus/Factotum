const PermissionCommand = require('../../classes/permission-command');
const { Message, MessageEmbed } = require('discord.js');

/**
 * Picks x amount of winners from the stamp contest. The more stamps a user has, the more chances they have of winning.
 * @category Commands
 * @subcategory Stamps
 * @extends PermissionCommand
 */
class Raffle extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'raffle',
            group: 'stamps',
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
     * @param {FirebaseFirestore.DocumentData | null | undefined} initBotInfo
     * @param {Message} message - message used to call the command
     * @param {Object} args
     * @param {integer} args.numberOfWinners - number of winners to be drawn
     */
    async runCommand(initBotInfo, message, {numberOfWinners}) {

        //check that numberOfWinners is less than the number of people with stamp roles or it will infinite loop
        let validMembers = message.guild.members.cache.filter(member => member.roles.cache.has(initBotInfo.roleIDs.memberRole));
        var memberCount = validMembers.size;
        if (memberCount <= numberOfWinners) {
            message.channel.send('Whoa there, you want more winners than hackers!').then((msg) => {
                msg.delete({ timeout: 5000 });
            });
            return;
        }

        //array to contain the ids
        var entries = new Array(); 
        
        validMembers.forEach(member => {
            let roleId = member.roles.cache.find(role => initBotInfo.stamps.stampRoleIDs.has(role.id));
            if (!roleId) return;
            let stampNumber = initBotInfo.stamps.stampRoleIDs.get(roleId);

            for (let i = 0; i < stampNumber; i++) {
                entries.push(member.user.id);
            }
        });

        //number of array spaces that are actually occupied by ids
        var length = entries.length;

        //set to keep track of winners
        let winners = new Set();
        //randomly generate a number and add the corresponding winner into the set
        while (winners.size < numberOfWinners) {
            let num = Math.floor(Math.random() * length);
            let winner = entries[num];
            if (!winners.has(winner)) winners.add(winner);
        }
        let winnersList = Array.from(winners);
        const embed = new MessageEmbed()
            .setColor(initBotInfo.colors.embedColor)
            .setTitle('The winners of the raffle draw are:')
            .setDescription( winnersList.map(id => `<@${id}>`).join(', '));
        await message.channel.send(embed);
    }
}
module.exports = Raffle;
