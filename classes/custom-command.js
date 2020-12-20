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
     * @property {string} roleID - the role this command can be run by
     * @property {string} channelID - the channel ID where this command can be run
     * @property {string} roleMessage - the message to be sent for an incorrect role
     * @property {string} channelMessage - the message to be sent for an incorrect channel
     */

    /**
     * Constructor for our custom command, calls the parent constructor.
     * @param {CommandoClient} client - the client the command is for 
     * @param {CommandInfo} info - the information for this commando command 
     * @param {CommandPermissionInfo} permissionInfo - the custom information for this command 
     */
    constructor(client, info, permissionInfo) {
        super(client, info);

        // Make sure permissionInfo is an object, if not given then create empty object
        if (typeof permissionInfo != 'object') permissionInfo = {};

        /**
         * Channel where this command can be run.
         * @type {string} snowflake/id
         */
        this.permittedChannel = permissionInfo.channelID || null;

        /**
         * The permitted role to call this command.
         * @type {string} snowflake/id
         */
        this.permittedRole = permissionInfo.roleID || null;

        /**
         * The message to be sent to the member if they call the command on the wrong channel
         * @type {string}
         */
        this.channelMessage = 'channelMessage' in permissionInfo ? permissionInfo.channelMessage : 'Hi, the command you just used is not available on that channel!';

        /**
         * The message to be sent to the member if they call the command without having the permitted role
         * @type {string}
         */
        this.roleMessage = 'roleMessage' in permissionInfo ? permissionInfo.roleMessage : 'Hi, the command you just used is not available to your current role!';
    }

    /**
     * Run command used by Command class. Has the permission checks and runs the child runCommand method.
     * @param {CommandoMessage} message 
     * @param {Object|string|string[]} args 
     * @param {boolean} fromPattern 
     * @param {Promise<?Message|?Array<Message>>} result 
     */
    async run(message, args, fromPattern, result){
        // delete the message
        discordServices.deleteMessage(message);

        // Make sure it is only used in the permitted channel
        if (this.permittedChannel != null && message.channel.id != this.permittedChannel) {
            discordServices.sendMessageToMember(message.member, this.channelMessage, true);
            return;
        }

        // Make sure only the permitted role can call it
        if (this.permittedRole != null && !(discordServices.checkForRole(message.member, this.permittedRole))) {
            discordServices.sendMessageToMember(message.member, this.roleMessage, true);
            return;
        }

        this.runCommand(message, args, fromPattern, result);
    }

    /**
     * Required class by children, will throw error if not implemented!
     * @abstract
     */
    runCommand() {
        throw new Error('You need to implement the runCommand method!');
    }
}

module.exports = PermissionCommand;