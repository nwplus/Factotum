const { Message } = require("discord.js");

/**
 * The Prompt class has usefull static functions to prompt the user for information.
 */
class Prompt {

    /**
     * Prompt the user for some text.
     * @param {string} prompt - the text prompt to send to user
     * @param {string} responseType - the type of response, one of string, number, boolean
     * @param {Channel} channel - the channel to send the prompt to
     * @param {string} userID - the ID of the user to prompt
     * @returns {Promise<Message>} - the message response to the prompt
     * @async
     */
    static async messagePrompt(prompt, responseType, channel, userID) {
        // send prompt
        let prompt = await channel.send('<@' + userID + '> ' + prompt);

        let msgs = await channel.awaitMessages(message => message.author.id === userID, {max: 1});

        let msg = msgs.first();

        prompt.delete();
        msg.delete();

        return msg;
    }
}

module.exports = Prompt;