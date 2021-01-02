// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Prompt = require('../../classes/prompt');

// Command export
module.exports = class RoleTransfer extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'roletransfer',
            group: 'a_utility',
            memberName: 'transfer role',
            description: 'Will let users transfer roles. Usefull for sponsor reps that are also mentors!',
            guildOnly: true,
        },
        {
            roleID: discordServices.staffRole,
            roleMessage: 'Hey there, the command !roletransfer is only available to staff!',
        });
    }


    /**
     * 
     * @param {Discord.Message} message - the command message
     */
    async runCommand (message) {

        // the emoji for staff to add new transfers
        let newTransferEmoji = '🆕';

        /**
         * @typedef Transfer
         * @property {String} name - the transfer name
         * @property {String} description - the transfer description
         * @property {Discord.Role} role - the transfer role
         */

        /**
         * The transfers on this role transfer card.
         * @type {Discord.Collection<String, Transfer>}
         */
        let transfers = new Discord.Collection();

        const cardEmbed = new Discord.MessageEmbed().setColor(discordServices.embedColor)
            .setTitle('Role Transfer!')
            .setDescription('React to the specified emoji to get the role, un-react to remove the role.');

        let cardMsg = await message.channel.send(cardEmbed);
        cardMsg.react(newTransferEmoji);

        let filter = (reaction, user) => !user.bot && (transfers.has(reaction.emoji.name) || reaction.emoji.name === newTransferEmoji);
        let reactionCollector = cardMsg.createReactionCollector(filter, {dispose: true});

        reactionCollector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name === newTransferEmoji && discordServices.checkForRole(message.guild.member(user), discordServices.staffRole)) {
                let newTransferMsg = await Prompt.messagePrompt('What new transfer do you want to add? Your response should have (in this order, not including <>): @role <transfer name> - <transfer description>',
                                                                    'string', message.channel, user.id);
                let role = newTransferMsg.mentions.roles.first();
                let firstStop = newTransferMsg.cleanContent.indexOf('-');
                let name = newTransferMsg.cleanContent.substring(0, firstStop);
                let description = newTransferMsg.cleanContent.substring(firstStop + 1);

                let roleReaction = await Prompt.reactionPrompt('What emoji to you want to use for this transfer?', message.channel, message.author.id);

                transfers.set(roleReaction.emoji.name, {
                    name: name,
                    description: description,
                    role: role,
                });

                reaction.message.edit(reaction.message.embeds[0].addField(name + ' -> ' + roleReaction.emoji.name, description));
                reaction.message.react(roleReaction.emoji.name);
                reaction.users.remove(user.id);
            }

            if (transfers.has(reaction.emoji.name)) {
                discordServices.addRoleToMember(message.guild.member(user), transfers.get(reaction.emoji.name).role);
            }
        });

        reactionCollector.on('remove', (reaction, user) => {
            if (transfers.has(reaction.emoji.name)) {
                discordServices.removeRolToMember(message.guild.member(user), transfers.get(reaction.emoji.name).role);
            }
        });

    }

}