// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { checkForRole, addRoleToMember, removeRolToMember } = require('../../discord-services');
const { MessageEmbed, Message, Role, Collection } = require('discord.js');
const BotGuildModel = require('../../classes/bot-guild');
const { MessagePrompt, SpecialPrompt } = require('advanced-discord.js-prompts');

/**
 * Make a message embed (console) available on the channel for users to react and un-react for roles. Staff can dynamically add 
 * roles to the console. Users can react to get the role, then un-react to loose the role.
 * @category Commands
 * @subcategory Admin-Utility
 * @extends PermissionCommand
 */
class RoleSelector extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'role-selector',
            group: 'a_utility',
            memberName: 'transfer role',
            description: 'Will let users transfer roles. Useful for sponsor reps that are also mentors!',
            guildOnly: true,
        },
        {
            role: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the command !role-selector is only available to staff!',
        });
    }


    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message - the command message
     */
    async runCommand (botGuild, message) {

        // the emoji for staff to add new transfers
        let newTransferEmoji = '🆕';

        /**
         * @typedef Transfer
         * @property {String} name - the transfer name
         * @property {String} description - the transfer description
         * @property {Role} role - the transfer role
         */

        /**
         * The transfers on this role transfer card.
         * @type {Collection<String, Transfer>}
         */
        let transfers = new Collection();

        const cardEmbed = new MessageEmbed().setColor(botGuild.colors.embedColor)
            .setTitle('Role Selector!')
            .setDescription('React to the specified emoji to get the role, un-react to remove the role.');

        let cardMsg = await message.channel.send(cardEmbed);
        cardMsg.react(newTransferEmoji);

        let filter = (reaction, user) => !user.bot && (transfers.has(reaction.emoji.name) || reaction.emoji.name === newTransferEmoji);
        let reactionCollector = cardMsg.createReactionCollector(filter, {dispose: true});

        // add role or a transfer depending on the emoji
        reactionCollector.on('collect', async (reaction, user) => {
            // admin add new transfer
            if (reaction.emoji.name === newTransferEmoji && checkForRole(message.guild.member(user), botGuild.roleIDs.staffRole)) {
                
                try {
                    var newTransferMsg = await MessagePrompt.prompt({
                        prompt: 'What new transfer do you want to add? Your response should have (in this order, not including <>): @role <transfer name> - <transfer description>',
                        channel: message.channel, 
                        userId: user.id
                    });
                } catch (error) {
                    reaction.users.remove(user.id);
                    return;
                }
                
                // grab the role, name and description from the prompt message
                let role = newTransferMsg.mentions.roles.first();
                let firstStop = newTransferMsg.cleanContent.indexOf('-');
                let name = newTransferMsg.cleanContent.substring(0, firstStop);
                let description = newTransferMsg.cleanContent.substring(firstStop + 1);

                let emoji = await SpecialPrompt.singleEmoji({prompt: 'What emoji to you want to use for this transfer?', channel: message.channel, userId: message.author.id});

                transfers.set(emoji.name, {
                    name: name,
                    description: description,
                    role: role,
                });

                // edit original embed with transfer information and react with new role
                reaction.message.edit(reaction.message.embeds[0].addField(name + ' -> ' + emoji.toString(), description));
                reaction.message.react(emoji);
                
                reaction.users.remove(user.id);
            }

            // user add role
            if (transfers.has(reaction.emoji.name)) {
                let role = transfers.get(reaction.emoji.name).role;
                addRoleToMember(message.guild.member(user), role);
                message.channel.send('<@' + user.id + '> You have been given the role: ' + role.name).then(msg => msg.delete({timeout: 4000}));
            }
        });

        // remove the role from the user if the emoji is a transfer emoji
        reactionCollector.on('remove', (reaction, user) => {
            if (transfers.has(reaction.emoji.name)) {
                let role = transfers.get(reaction.emoji.name).role;
                removeRolToMember(message.guild.member(user), role);
                message.channel.send('<@' + user.id + '> You have lost the role: ' + role.name).then(msg => msg.delete({timeout: 4000}));
            }
        });
    }
}
module.exports = RoleSelector;
