const Discord = require("discord.js");
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
     * @returns {Promise<Discord.Message | null>} - the message response to the prompt or false if it timed out!
     * @async
     */
    static async messagePrompt(prompt, responseType, channel, userID, time = 0) {

        let finalPrompt = '<@' + userID + '> ' + prompt + (responseType == 'number' ? ' Respond with a number only!' : responseType == 'boolean' ? ' (yes/no)' : responseType == 'mention' ? ' To make a mention use the @ or # for a user or channel respectively!' : '' + 
                        (time === 0 ? '' : '\n* Respond within ' + time + ' seconds.') + '\n* Respond with cancel to cancel.');

        // send prompt
        let promptMsg = await channel.send(finalPrompt);

        try {
            var msgs = await channel.awaitMessages(message => message.author.id === userID, {max: 1, time: time == 0 ? null : time * 1000, errors: ['time']});
            let msg = msgs.first();

            discordServices.deleteMessage(promptMsg);
            discordServices.deleteMessage(msg);

            // check if they responded with cancel
            if (msg.content.toLowerCase() === 'cancel') {
                return null;
            }

            return msg;
        } catch (error) {
            channel.send('<@' + userID + '> Time is up, please try again once you are ready, we recommend you write the text, then react, then send!').then(msg => msg.delete({timeout: 10000}));
            discordServices.deleteMessage(promptMsg);
            return null;
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
        let promptMsg = await this.messagePrompt(prompt, 'number', channel, userID);
        if(promptMsg === null) return null;
        let number = parseInt(promptMsg.content);
        if (isNan(number)) return this.numberPrompt(prompt, channel, userId);
        else return number;

    }
    /**
     * Prompts the user to respond to a message with an emoji.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @async
     * @returns {Promise<Discord.MessageReaction>} - the message reaction
     */
    static async reactionPrompt(prompt, channel, userID) {
        let reactionMsg = await channel.send('<@' + userID + '> ' + prompt + ' React to this message with the emoji.');
        let reactions = await reactionMsg.awaitReactions((reaction, user) => !user.bot, {max: 1});
        discordServices.deleteMessage(reactionMsg);
        return reactions.first();
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
        let promptMsg = await this.messagePrompt(prompt, 'boolean', channel, userID);
        if (promptMsg === null) return null;
        if (promptMsg.content.toLowerCase() === 'no') return false;
        else if (promptMsg.content.toLowerCase() === 'yes') return true;
        else this.yesNoPrompt(prompt, channel, userID);
    }


    /**
     * Prompt the user for a channel mention.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @async
     * @returns {Promise<Discord.TextChannel>} - the text channel prompted
     */
    static async channelPrompt(prompt, channel, userID) {
        let promptMsg = await this.messagePrompt(prompt, 'mention', channel, userID);
        if (promptMsg === null) return null;
        return promptMsg.mentions.channels.first();
    }
}

module.exports = Prompt;