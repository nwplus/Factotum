const { TextChannel, Collection } = require('discord.js');
const { channelMsgWaitDelete } = require('../util/discord-util');
const MessagePrompt = require('./message-prompt');

/**
 * Holds different TextChannel prompts.
 */
class ChannelPrompt {

    /**
     * Prompts the user for a text channel.
     * @param {PromptInfo} promptInfo 
     * @returns {Promise<TextChannel>}
     */
    static async single(promptInfo) {
        let channels = await ChannelPrompt.multi(promptInfo, 1);
        return channels.first();
    }   

    /**
     * Prompts the user for multiple text channels. Can be set to a specific amount.
     * @param {PromptInfo} promptInfo 
     * @param {Number} [amount=Infinity] - amount of channels to prompt for
     * @returns {Promise<Collection<String, TextChannel>>}
     * @async
     */
    static async multi(promptInfo, amount = Infinity) {
        if (amount != Infinity) promptInfo.prompt = `${promptInfo.prompt} \n* Please mention only ${amount} channel(s).`;
        let msg = await MessagePrompt.instructionPrompt(promptInfo, MessagePrompt.InstructionType.MENTION);

        let channels = msg.mentions.channels;
        if (amount != Infinity && channels.size != amount) {
            await channelMsgWaitDelete(promptInfo.channel, promptInfo.userId, `You should only mention ${amount} channel(s)! Try again!`);
            return await ChannelPrompt.multi(promptInfo, amount);
        } else if (channels.size === 0) {
            await channelMsgWaitDelete(promptInfo.channel, promptInfo.userId, 'You need to mention channels with "@"! Try again!');
            return await ChannelPrompt.multi(promptInfo, amount);
        } else {
            return channels;
        }
    }
}
module.exports = ChannelPrompt;