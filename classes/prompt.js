const Discord = require("discord.js");
const discordServices = require('../discord-services');

/**
 * The Prompt class has useful static functions to prompt the user for information.
 */
class Prompt {

    /**
     * Prompt the user for some text.
     * @param {String} prompt - the text prompt to send to user
     * @param {String} responseType - the type of response, one of string, number, boolean
     * @param {Discord.TextChannel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @param {Number} time - the time in seconds to wait for the response, if 0 then wait forever
     * @returns {Promise<Discord.Message>} - the message response to the prompt or false if it timed out!
     * @throws Will throw an error if the user cancels the Prompt or it times out.
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
            if (msg.channel.type != 'dm') discordServices.deleteMessage(msg);

            // check if they responded with cancel
            if (msg.content.toLowerCase() === 'cancel') {
                throw new Error("The prompt has been canceled.");
            }

            return msg;
        } catch (error) {
            channel.send('<@' + userID + '> Time is up, please try again once you are ready, we recommend you write the text, then react, then send!').then(msg => msg.delete({timeout: 10000}));
            discordServices.deleteMessage(promptMsg);
            throw new Error('Prompt timed out.');
        }
    }


    /**
     * Prompt a user for a number, will ask again if not given a number.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @async
     * @returns {Promise<Array<Number>>} - an array of numbers
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async numberPrompt(prompt, channel, userID) {
        let promptMsg = await Prompt.messagePrompt(prompt, 'number', channel, userID);
        var invalid = false;
        let numbers = promptMsg.content.split(' ');
        numbers.forEach(num => {
            //let number = parseInt(num);
            if (isNaN(num)) invalid = true;
        });
        if (invalid) {
            discordServices.sendMsgToChannel(channel, userID, 'One of the numbers is invalid, please try again, numbers only!', 10);
            return Prompt.numberPrompt(prompt, channel, userID);
        } else {
            return numbers;
        }
    }

 
    /**
     * Prompts the user to respond to a message with an emoji.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @param {Discord.Collection<String, Discord.Emoji>} unavailableEmojis - <emoji name, emoji>, the emojis the user can't select, re-prompt if necessary
     * @async
     * @returns {Promise<Discord.GuildEmoji | Discord.ReactionEmoji>} - the message reaction
     */
    static async reactionPrompt(prompt, channel, userID, unavailableEmojis = new Map()) {
        let reactionMsg = await channel.send('<@' + userID + '> ' + prompt + ' React to this message with the emoji.');
        let reactions = await reactionMsg.awaitReactions((reaction, user) => !user.bot && user.id === userID, {max: 1});
        discordServices.deleteMessage(reactionMsg);

        if (unavailableEmojis.has(reactions.first().emoji.name)) {
            channel.send('<@' + userID + '> The emoji you choose is already in use, please try again!').then(msg => msg.delete({timeout: 5000}));
            return this.reactionPrompt(prompt, channel, userID, unavailableEmojis);
        }

        return reactions.first().emoji;
    }
  
      
    /**
     * Prompt the user for a yes/no answer and return true/false.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} channel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @async
     * @returns {Promise<Boolean>} - yes == true, no == false
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async yesNoPrompt(prompt, channel, userID) {
        let promptMsg = await Prompt.messagePrompt(prompt, 'boolean', channel, userID);
        if (promptMsg.content.toLowerCase() === 'no') return false;
        else if (promptMsg.content.toLowerCase() === 'yes') return true;
        else return Prompt.yesNoPrompt(prompt, channel, userID);
    }


    /**
     * Prompt the user for a channel mention.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} promptChannel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @async
     * @returns {Promise<Collection<Discord.TextChannel>>} - the text channels prompted
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async channelPrompt(prompt, promptChannel, userID) {
        let promptMsg = await Prompt.messagePrompt(prompt, 'mention', promptChannel, userID);
        let channels = promptMsg.mentions.channels;
        if (channels === null) {
            promptChannel.send('<@' + userID + '> No channel was mentioned, try again!').then(msg => msg.delete({timeout: 8000}));
            return Prompt.channelPrompt(prompt, promptChannel, userID);
        }
        else return channels;
    }


    /**
     * Prompt the user for a role mention.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} promptChannel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @async
     * @returns {Promise<Collection<Discord.Role>>} - the roles prompted
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async rolePrompt(prompt, promptChannel, userID) {
        let promptMsg = await Prompt.messagePrompt(prompt, 'mention', promptChannel, userID);
        let roles = promptMsg.mentions.roles;
        if (roles === null) {
            promptChannel.send('<@' + userID + '> You did not mention a role, try again!').then(msg => msg.delete({timeout: 8000}));
            return Prompt.rolePrompt(prompt, promptChannel, userID);
        }
        else return roles;
    }

    /**
     * Prompt the user for a member mention.
     * @param {String} prompt - the text prompt to send to user
     * @param {Discord.TextChannel} promptChannel - the channel to send the prompt to
     * @param {String} userID - the ID of the user to prompt
     * @async
     * @returns {Promise<Collection<Discord.GuildMember>>} - the members prompted
     * @throws Will throw an error if the user cancels the Prompt or it times out.
     */
    static async memberPrompt(prompt, promptChannel, userID) {
        let promptMsg = await Prompt.messagePrompt(prompt, 'mention', promptChannel, userID);
        let members = promptMsg.mentions.members;
        if (members === null) {
            promptChannel.send('<@' + userID + '> You did not mention a member, try again!').then(msg => msg.delete({timeout: 8000}));
            return Prompt.rolePrompt(prompt, promptChannel, userID);
        }
        else return members;
    }
}

module.exports = Prompt;