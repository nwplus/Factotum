const { TimeOutError, CancelError } = require('./errors');
const MessagePrompt = require('./message-prompt');
const { channelMsgWaitDelete } = require('./util/discord-util');

class StringPrompt {
    /**
     * Prompts the user for a single string, can be as long as the user wants. Discord content will be toString()ed.
     * @param {PromptInfo} promptInfo
     * @returns {Promise<String>}
     * @throws {TimeOutError} if the user does not respond within the given time.
     * @throws {CancelError} if the user cancels the prompt.
     * @async
     */
    static async single(promptInfo) {
        let msg = await MessagePrompt.prompt(promptInfo);
        return msg.cleanContent;
    }

    /**
     * Prompts a user for one of a list of possible responses. Will re-prompt if given something different.
     * @param {PromptInfo} promptInfo 
     * @param {String[]} possibleResponses - list of responses to match the actual response or re-prompt
     */
    static async restricted(promptInfo, possibleResponses = []) {
        let finalPrompt = `${promptInfo.prompt} \n* Your options are (case sensitive): ${possibleResponses.join(', ')}`;
        
        let response = await StringPrompt.single({prompt: finalPrompt, channel: promptInfo.channel, userId: promptInfo.userId});

        if (!possibleResponses.includes(response)) {
            await channelMsgWaitDelete(promptInfo.channel, promptInfo.userId, 'Try again! You need to respond with one of the options!');
            return await StringPrompt.restricted(promptInfo, possibleResponses);
        } else {
            return response;
        }
    }
}
module.exports = StringPrompt;