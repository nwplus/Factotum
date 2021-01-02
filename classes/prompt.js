const Discord  = require("discord.js");
const discordServices = require('../discord-services');


/**
 * The Prompt class has usefull static functions to prompt the user for information.
 */
class Prompt {

    /**
     * Prompt the user for some text.
     * @param {String} prompt - the text prompt to send to user
     * @param {String} responseType - the type of response, one of string, number, boolean
     * @param {Discord.TextChannel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @param {Number} time - the time in seconds to wait for the response, if 0 then wait forever
     * @returns {Promise<Discord.Message | Boolean>} - the message response to the prompt or false if it timed out!
     * @async
     */
    static async messagePrompt(prompt, responseType, channel, userID, time = 0) {

        let finalPrompt = '<@' + userID + '> ' + prompt + (responseType == 'number' ? ' Respond with a number only!' : responseType == 'boolean' ? ' (yes/no)' : '' + 
                        (time === 0 ? '' : 'Respond within ' + time + ' secodns.') + 'Respond with cancel to cancel.');

        // send prompt
        let promptMsg = await channel.send(finalPrompt);

        try {
            var msgs = await channel.awaitMessages(message => message.author.id === userID, {max: 1, time: time == 0 ? null : time * 1000, errors: ['time']});
            let msg = msgs.first();

            discordServices.deleteMessage(promptMsg);
            discordServices.deleteMessage(msg);

            // check if they responded with cancel
            if (msg.content.toLocaleLowerCase() === 'cancel') {
                return false;
            }

            return msg;
        } catch (error) {
            channel.send('<@' + userID + '> Time is up, please try again once you are ready, we recommend you write the text, then react, then send!').then(msg => msg.delete({timeout: 10000}));
            discordServices.deleteMessage(promptMsg);
            return false;
        }
    }


    /**
     * Prompt a user for a number, will ask again if not given a number.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} channel - the channel to send the prompt to
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


    /**
     * Prompt the user for a yes/no answer and return true/false.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @async
     * @returns {Promise<Boolean>} - yes == true, no == false
     */
    static async yesNoPrompt(prompt, channel, userID) {
        let promtMsg = await this.messagePrompt(prompt, 'boolean', channel, userID);
        if (promtMsg.content.toLowerCase() === 'no') return false;
        else if (promtMsg.content.toLowerCase() === 'yes') return true;
        else this.yesNoPrompt(prompt, channel, userID);
    }
}

module.exports = Prompt;