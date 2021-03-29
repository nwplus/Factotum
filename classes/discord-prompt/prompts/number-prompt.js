const { channelMsgWaitDelete } = require('../util/discord-util');
const MessagePrompt = require('./message-prompt');

/**
 * Holds different number prompts.
 */
class NumberPrompt {

    /**
     * Prompts the user for one number.
     * @param {PromptInfo} promptInfo 
     * @returns {Number}
     * @throws {TimeOutError} if the user does not respond within the given time.
     * @throws {CancelError} if the user cancels the prompt.
     * @async
     */
    static async single(promptInfo) {
        let numbers = await NumberPrompt.multi(promptInfo, 1);
        return numbers[0];
    }

    /**
     * Prompts the user for multiple numbers. Can specify the amount of numbers to prompt for.
     * @param {PromptInfo} promptInfo 
     * @param {Number} amount - the amount of numbers to prompt and accept
     * @returns {Promise<Number[]>}
     * @throws {TimeOutError} if the user does not respond within the given time.
     * @throws {CancelError} if the user cancels the prompt.
     * @async
     */
    static async multi(promptInfo, amount = Infinity) {
        if (amount != Infinity) promptInfo.prompt = `${promptInfo.prompt} \n* Please write ${amount} number(s) separated by a space.`;
        let msg = await MessagePrompt.instructionPrompt(promptInfo, MessagePrompt.InstructionType.NUMBER);

        let invalid = false;

        let string = msg.cleanContent;
        let stringNumbers = string.split(' ');
        let numbers = [];
        stringNumbers.forEach(num => {
            if (isNaN(num)) invalid = true;
            else numbers.push(parseInt(num));
        });

        if (amount != Infinity && numbers.size != amount) {
            await channelMsgWaitDelete(promptInfo.channel, promptInfo.userId, `You should only write ${amount} number(s)! Try again!`);
            return await NumberPrompt.multi(promptInfo, amount);
        } else if (numbers.size === 0 || invalid) {
            await channelMsgWaitDelete(promptInfo.channel, promptInfo.userId, 'You need to write numbers only! Try again!');
            return await NumberPrompt.multi(promptInfo, amount);
        } else {
            return numbers;
        }
    }
}
module.exports = NumberPrompt;