const { Message } = require('discord.js');
const { TimeOutError, CancelError } = require('../errors');
const { channelMsg, channelMsgDelete } = require('../util/discord-util');


/**
 * Holds different Discord Message prompts.
 */
class MessagePrompt {

    /**
     * Simple message prompt.
     * @param {PromptInfo} promptInfo - the common data, prompt, channel, userId
     * @returns {Promise<Message>} - the message response to the prompt or false if it timed out!
     * @throws {TimeOutError} if the user does not respond within the given time.
     * @throws {CancelError} if the user cancels the prompt.
     * @async
     */
    static async prompt({prompt, channel, userId, time = 0, cancelable = true}) {
        let finalPrompt = `<@${userId}> ${prompt}`;
        if (time != 0) finalPrompt = `${finalPrompt} \n* Respond within ${time} seconds.`;
        finalPrompt = `${finalPrompt} \n* ${cancelable ? 'Write "cancel" to cancel the prompt' : 'You can not cancel this prompt'}.`;

        let promptMsg = await channel.send(`<@${userId}> ${prompt} ${time != 0 ? `\n* Respond within ${time} seconds.` : ""}`);

        try {
            const filter = (message) => message.author.id === userId;
            var msgs = await channel.awaitMessages(filter, {max: 1, time: time == 0 ? null : time * 1000, errors: ['time']});
        } catch (error) {
            if (error.name == 'time') {
                await channelMsgDelete(channel, userId, 'Time is up, please try again once you are ready, we recommend you write the message first, then react, then send the message.', 10);
                throw new TimeOutError();
            } else {
                throw error;
            }
        } finally {
            if (!promptMsg.deleted) await promptMsg.delete();
        }

        let msg = msgs.first();

        if (promptMsg.channel.type != 'dm' && !msg.deleted) await msg.delete();

        if (cancelable && msg.content.toLowerCase() === 'cancel') {
            throw new CancelError();
        }

        return msg;
    }

    /**
     * Message prompt with custom prompt message depending on responseType.
     * @param {PromptInfo} promptInfo 
     * @param {InstructionType} instructionType - the type of response, one of string, number, boolean, mention
     * @returns {Promise<Message>} - the message response to the prompt or false if it timed out!
     * @throws {TimeOutError} if the user does not respond within the given time.
     * @throws {CancelError} if the user cancels the prompt.
     * @async
     */
    static async instructionPrompt({prompt, channel, userId, time = 0}, instructionType) {
        let instruction = '';

        switch(instructionType) {
            case MessagePrompt.InstructionType.NUMBER: instruction = 'Respond with a number only!';
            case MessagePrompt.InstructionType.BOOLEAN: instruction = 'Respond with "yes" or "no" only!';
            case MessagePrompt.InstructionType.MENTION: instruction = 'To mention a user or a role use "@"! Ex: @Hacker or @John.'; 
            case MessagePrompt.InstructionType.CHANNEL: instruction = 'To mention a channel use "#"! Ex: #banter.';
        }

        let finalPrompt = `${prompt} \n* ${instruction}`;
        return await MessagePrompt.prompt({finalPrompt, channel, userId, time});
    }

    /**
     * The instruction types available for a prompt to explain.
     * @enum {Number}
     */
    static InstructionType = {
        NUMBER: 0,
        BOOLEAN: 1,
        MENTION: 2,
        CHANNEL: 3,
    }
}
module.exports = MessagePrompt;