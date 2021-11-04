// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { checkForRole, addRoleToMember, removeRolToMember } = require('../../discord-services');
const { Message, Role, Collection } = require('discord.js');
const BotGuildModel = require('../../classes/Bot/bot-guild');
const { SpecialPrompt, RolePrompt, StringPrompt } = require('advanced-discord.js-prompts');
const Console = require('../../classes/UI/Console/console');
const Feature = require('../../classes/UI/Console/feature');

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

        let addTransferFeature = Feature.create({
            name: 'Add a Role!',
            emoji: newTransferEmoji,
            description: 'Add a new emoji to this transfer console! Only staff can select this option!',
            callback: async (user, reaction, stopInteracting, console) => {
                let channel = console.channel;
                // staff add new transfer
                if (checkForRole(message.guild.member(user), botGuild.roleIDs.staffRole)) {
                    
                    try {
                        var role = await RolePrompt.single({
                            prompt: 'What role do you want to add?',
                            channel: channel,
                            userId: user.id
                        });

                        var title = await StringPrompt.single({
                            prompt: 'What is the transfer title?',
                            channel: channel,
                            userId: user.id
                        });

                        var description = await StringPrompt.single({
                            prompt: 'What is the transfer description?',
                            channel: channel,
                            userId: user.id
                        });

                    } catch (error) {
                        stopInteracting(user);
                        return;
                    }
                    
                    let emoji = await SpecialPrompt.singleEmoji({prompt: 'What emoji to you want to use for this transfer?', channel: message.channel, userId: message.author.id});
                    
                    // new feature will add the emoji transfer to the embed
                    let newFeature = Feature.create({
                        name: title,
                        description: description,
                        emoji: emoji,
                        callback: (user, reaction, stopInteracting, console) => {
                            addRoleToMember(console.channel.guild.member(user), role);
                            stopInteracting(user);
                            console.channel.send('<@' + user.id + '> You have been given the role: ' + role.name).then(msg => msg.delete({timeout: 4000}));
                        },
                        removeCallback: (user, reaction, stopInteracting, console) => {
                            removeRolToMember(console.channel.guild.member(user), role);
                            stopInteracting(user);
                            console.channel.send('<@' + user.id + '> You have lost the role: ' + role.name).then(msg => msg.delete({timeout: 4000}));
                        }
                    });
                    console.addFeature(newFeature);
                }
                
                reaction.users.remove(user);
                stopInteracting(user);
            },
        });

        let console = new Console({
            title: 'Role Selector!',
            description: 'React to the specified emoji to get the role, un-react to remove the role.',
            channel: message.channel,
        });
        console.addFeature(addTransferFeature);

        await console.sendConsole();
    }
}
module.exports = RoleSelector;
