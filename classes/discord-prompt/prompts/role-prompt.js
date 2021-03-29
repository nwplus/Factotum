const { Collection } = require('discord.js');
const MessagePrompt = require('./message-prompt');
const { channelMsgWaitDelete } = require('./util/discord-util');

/**
 * Holds different role prompts.
 */
class RolePrompt {

    /**
     * Prompts the user for a role.
     * @param {PromptInfo} promptInfo 
     * @returns {Promise<Role>}
     * @throws {TimeOutError} if the user does not respond within the given time.
     * @throws {CancelError} if the user cancels the prompt.
     * @async
     */
    static async single(promptInfo) {
        let roles = await RolePrompt.multi(promptInfo, 1);
        return roles.first();
    }

    /**
     * Prompts the user for multiple roles, can be set to an exact amount.
     * @param {PromptInfo} promptInfo 
     * @param {Number} [amount=Infinity] - the amount of roles to prompt for
     * @returns {Promise<Collection<String, Role>>}
     * @throws {TimeOutError} if the user does not respond within the given time.
     * @throws {CancelError} if the user cancels the prompt.
     * @async
     */
    static async multi(promptInfo, amount = Infinity) {
        if (amount != Infinity) promptInfo.prompt = `${promptInfo.prompt} \n* Please mention only ${amount} roles.`;
        let msg = await MessagePrompt.instructionPrompt(promptInfo, MessagePrompt.InstructionType.MENTION);

        let roles = msg.mentions.roles;
        if (amount != Infinity && roles.size != amount) {
            await channelMsgWaitDelete(promptInfo.channel, promptInfo.userId, `You should only mention ${amount} roles! Try again!`);
            return await RolePrompt.multi(promptInfo, amount);
        } else if (roles.size === 0) {
            await channelMsgWaitDelete(promptInfo.channel, promptInfo.userId, 'You need to mention roles with "@"! Try again!');
            return await RolePrompt.multi(promptInfo, amount);
        } else {
            return roles;
        }
    }

}
module.exports = RolePrompt;