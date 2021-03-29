const { Collection, MessageReaction } = require('discord.js');
const { TimeOutError } = require('../errors');
const { channelMsg, channelMsgWaitDelete } = require('../util/discord-util');
const MessagePrompt = require('./message-prompt');


class SpecialPrompts {

    /**
     * Prompts the user for one emoji by reacting to a message.
     * @param {PromptInfo} promptInfo - cancelable is not used! user can not cancel this prompt!
     * @returns {Promise<MessageReaction>}
     * @throws {TimeOutError} if the user takes longer than the given time to react
     * @async
     */
    static async singleReaction(promptInfo) {
        let reactions = await SpecialPrompts.multiReactionPrompt(promptInfo, 1);
        return reactions.first();
    }

    /**
     * Prompts the use for an emoji. If the emoji is part of the unavailable emojis, they will be re-prompted.
     * @param {PromptInfo} promptInfo 
     * @param {Collection<String, *>} unavailableEmojis - <Emoji Name, any> the emojis the user can not choose!
     * @returns {Promise<MessageReaction>}
     * @throws {TimeOutError} if the user takes longer than the given time to react
     * @async
     */
    static async singleRestrictedReaction(promptInfo, unavailableEmojis) {
        let reaction = await SpecialPrompts.singleReaction(promptInfo);
        if (unavailableEmojis.has(reaction.emoji.name)) {
            channelMsgWaitDelete(promptInfo.channel, promptInfo.userId, 'That emoji is already in use! Select another emoji!');
            return await SpecialPrompts.singleRestrictedReaction(promptInfo, unavailableEmojis);
        } else {
            return reaction;
        }
    }

    /**
     * Prompts the user to react to a message with a specific amount of reactions.
     * @param {PromptInfo} promptInfo - cancelable is not used! User can not cancel this prompt!
     * @param {Number} amount - the amount of reactions to prompt and wait for.
     * @returns {Promise<Collection<String, MessageReaction>>}
     * @throws {TimeOutError} if the user takes longer than the given time to react
     * @async
     */
    static async multiReaction(promptInfo, amount) {
        let finalPrompt = `${promptInfo.prompt} \n* React to this message with the emojis. \n* You should react with ${amount} different emoji(s).`;
        let prompt = await channelMsg(promptInfo.channel, promptInfo.userId, finalPrompt);

        try {
            const filter = (reaction, user) => !user.bot && user.id === promptInfo.userId;
            var reactions = await prompt.awaitReactions(filter, {max: amount, time: (promptInfo.time ? promptInfo.time : null), errors: ['time']});
        } catch (error) {
            if (error.name == 'time') {
                await channelMsg(promptInfo.channel, promptInfo.userId, 'Time is up, please try again once you are ready, we recommend you think of the emoji to use first.');
                throw new TimeOutError();
            } else {
                throw error;
            }
        } finally {
            prompt.delete();
        }
        
        return reactions;
    }

    /**
     * Prompts the user for a yes/no prompt to return a boolean.
     * @param {PromptInfo} promptInfo 
     * @returns {Promise<Boolean>}
     * @throws {TimeOutError} if the user does not respond within the given time.
     * @throws {CancelError} if the user cancels the prompt.
     * @async
     */
    static async boolean(promptInfo) {
        let response = await MessagePrompt.instructionPrompt(promptInfo, MessagePrompt.InstructionType.BOOLEAN);

        if (response.cleanContent.toLowerCase() === 'no') return false;
        else if (response.cleanContent.toLowerCase() === 'yes') return true;
        else return await SpecialPrompts.booleanPrompt(promptInfo);
    }

}
module.exports = SpecialPrompts;