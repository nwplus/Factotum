const { Message } = require("discord.js");

/**
 * The Prompt class has usefull static functions to prompt the user for information.
 */
class Prompt {

    /**
     * Prompt the user for some text.
     * @param {String} prompt - the text prompt to send to user
     * @param {String} responseType - the type of response, one of string, number, boolean
     * @param {Channel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @returns {Promise<Message>} - the message response to the prompt
     * @async
     */
    static async messagePrompt(prompt, responseType, channel, userID) {
        // send prompt
        let promptMsg = await channel.send('<@' + userID + '> ' + prompt + responseType === 'number' ? ' Respond a number only!' : '');

        let msgs = await channel.awaitMessages(message => message.author.id === userID, {max: 1});

        let msg = msgs.first();

        promptMsg.delete();
        msg.delete();

        return msg;
    }


    /**
     * Prompt a user for a number, will ask again if not given a number.
     * @param {String} prompt - the text prompt to send to user
     * @param {Channel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @async
     * @returns {Promise<Number>} - the number gotten from the prompt
     */
    static async numberPrompt(prompt, channel, userID) {
        let promtMsg = await this.messagePrompt(prompt, 'number', channel, userID);
        let number = parseInt(promtMsg.content);
        if (isNan(number)) return this.numberPrompt(prompt, channel, userId);
        else return number;

    }
}

module.exports = Prompt;