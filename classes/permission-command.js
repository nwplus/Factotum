const Discord = require('discord.js');
const { Command } = require('discord.js-commando');
const discordServices = require('../discord-services');


/**
 * The PermissionCommand is a custom command that extends the discord js commando Command class.
 * This Command subclass adds role and channel permission checks before the command is run. It also
 * removes the message used to call the command.
 * 
 * 
 */
class PermissionCommand extends Command {
    
    /**
     * Our custom command information for validation
     * @typedef {Object} CommandPermissionInfo
     * @property {string} role - the role this command can be run by
     * @property {string} channel - the channel ID where this command can be run
     * @property {string} roleMessage - the message to be sent for an incorrect role
     * @property {string} channelMessage - the message to be sent for an incorrect channel
     * @property {Boolean} dmOnly - true if this command can only be used on a DM
     */

    /**
     * Constructor for our custom command, calls the parent constructor.
     * @param {import('discord.js-commando').CommandoClientOptions} client - the client the command is for 
     * @param {import('discord.js-commando').CommandInfo} info - the information for this commando command 
     * @param {CommandPermissionInfo} permissionInfo - the custom information for this command 
     */
    constructor(client, info, permissionInfo) {
        super(client, info);

        /**
         * The permission info
         * @type {CommandPermissionInfo}
         */
        this.permissionInfo = this.validateInfo(permissionInfo);
    }

    /**
     * Adds default values if not found on the object.
     * @param {CommandPermissionInfo} permissionInfo 
     * @returns {CommandPermissionInfo}
     */
    validateInfo(permissionInfo) {
        // Make sure permissionInfo is an object, if not given then create empty object
        if (typeof permissionInfo != 'object') permissionInfo = {};
        if (!permissionInfo?.channelMessage) permissionInfo.channelMessage = 'Hi, the command you just used is not available on that channel!';
        if (!permissionInfo?.roleMessage) permissionInfo.roleMessage = 'Hi, the command you just used is not available to your current role!';
        permissionInfo.dmOnly = permissionInfo?.dmOnly ?? false;
        return permissionInfo;
    }


    /**
     * Run command used by Command class. Has the permission checks and runs the child runCommand method.
     * @param {Discord.Message} message 
     * @param {Object|string|string[]} args 
     * @param {boolean} fromPattern 
     * @param {Promise<?Message|?Array<Message>>} result 
     */
    async run(message, args, fromPattern, result){

        // delete the message
        discordServices.deleteMessage(message);

        // check for DM only, when true, all other checks should not happen!
        if (this.permissionInfo.dmOnly) {
            if (message.channel.type != 'dm') {
                discordServices.sendEmbedToMember(message.member, {
                    title: 'Error',
                    description: 'The command you just tried to use is only usable via DM!',
                });
                return;
            }
        } else {
            // Make sure it is only used in the permitted channel
            if (this.permissionInfo?.channel) {
                let channelID = discordServices.channelIDs[this.permissionInfo.channel];

                if (channelID && message.channel.id != channelID) {
                    discordServices.sendMessageToMember(message.member, this.permissionInfo.channelMessage, true);
                    return;
                }
            }
            // Make sure only the permitted role can call it
            else if (this.permissionInfo?.role) {

                let roleID = discordServices.roleIDs[this.permissionInfo.role];

                // if staff role then check for staff and admin, else check the given role
                if (roleID && (roleID === discordServices.roleIDs.staffRole && 
                    (!discordServices.checkForRole(message.member, roleID) && !discordServices.checkForRole(message.member, discordServices.roleIDs.adminRole))) || 
                    (roleID != discordServices.roleIDs.staffRole && !discordServices.checkForRole(message.member, roleID))) {
                        discordServices.sendMessageToMember(message.member, this.permissionInfo.roleMessage, true);
                        return;
                }
            }
        }
        this.runCommand(message, args, fromPattern, result);
    }


    /**
     * Required class by children, will throw error if not implemented!
     * @abstract
     */
    runCommand(message, args, fromPattern, result) {
        throw new Error('You need to implement the runCommand method!');
    }
}

/**
 * String permission flags used for command permissions.
 * * ADMIN_ROLE : only admins can use this command
 * * STAFF_ROLE : staff and admin can use this command
 * * ADMIN_CONSOLE : can only be used in the admin console
 * @type {Object}
 */
PermissionCommand.FLAGS = {
    ADMIN_ROLE: 'adminRole',
    STAFF_ROLE: 'staffRole',
    ADMIN_CONSOLE: 'adminConsoleChannel',
}

module.exports = PermissionCommand;