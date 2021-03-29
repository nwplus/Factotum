const { MessageEmbed } = require('discord.js');
const { TimeOutError } = require('../errors');
const { channelMsgDelete, channelMsgWaitDelete } = require('../util/discord-util');
const NumberPrompt = require('./number-prompt');


class ListPrompts {

    /**
     * Prompts the user with a lit of options. The user can react to the message to select an option.
     * This prompt works best with a low number of options (less than 5)!
     * @param {PromptInfo} promptInfo - cancelable is not used, users can't cancel this prompt!
     * @param {PickerOption[]} options 
     * @returns {Promise<PickerOption>}    
     * @throws {TimeOutError} if the user takes longer than the given time to choose the options.
     * @async
     */
    static async singleReactionPicker(promptInfo, options) {
        let optionList =  await ListPrompts.multiReactionPicker(promptInfo, options, 1);
        return optionList[0];
    }   

    /**
     * Prompts the user with a list of options. The user can react to the message to select options.
     * This prompt works best with a low number of options (less than 5)!
     * @param {PromptInfo} promptInfo - cancelable is not used, users can't cancel this prompt!
     * @param {PickerOption[]} options 
     * @param {Number} amount
     * @returns {Promise<PickerOption[]>}
     * @throws {TimeOutError} if the user takes longer than the given time to choose the options.
     * @async
     */
    static async multiReactionPicker(promptInfo, options, amount) {
        const embed = new MessageEmbed()
            .setTitle(`Choose ${amount} option(s)!`)
            .setDescription(`${promptInfo.prompt} \n* React to this message with the emoji to select that option! \n* You should select ${amount} options(s).`);
        
        options.forEach((option, index, list) => embed.addField(`${option.emojiName} - ${option.name}`, option.description));
        
        const msg = await promptInfo.channel.send(`<@${promptInfo.userId}>`, { embed: embed});
        options.forEach((option, index, list) => msg.react(option.emojiName));

        try {
            const filter = (reaction, user) => !user.bot && user.id === promptInfo.userId && options.find((option) => option.emojiName === reaction.emoji.name);
            var emojiResponses = await msg.awaitReactions(filter, { max: amount, time: (promptInfo.time ? promptInfo.time : null), errors: ['time'] });
        } catch (error) {
            if (error.name == 'time') {
                await channelMsgDelete(promptInfo.channel, promptInfo.userId, 'Time is up, please try again once you are ready.', 10);
                throw new TimeOutError();
            } else {
                throw error;
            }
        } finally {
            msg.delete();
        }

        return options.filter((option, index, list) => emojiResponses.find((reaction) => reaction.emoji.name === option.emojiName));
    }

    /**
     * Prompts the user with a list of options, the user will select one option by writing down the chosen option index.
     * @param {PromptInfo} promptInfo 
     * @param {*[]} list 
     * @returns {*} - the item the user chooses
     * @throws {TimeOutError} if the user takes longer than the given time to react
     * @async
     */
    static async singleListChooser(promptInfo, list) {
        let returnList = await ListPrompts.multiListChooser(promptInfo, list, 1);
        return returnList[0];
    }

    /**
     * Prompts the user with a list of options, the user will select options by writing down the option's index.
     * @param {PromptInfo} promptInfo 
     * @param {*[]} list - the items in this list must have a valid toString() function
     * @param {Number} amount 
     * @return {Promise<*[]>} - list of items the user choose
     * @throws {TimeOutError} if the user takes longer than the given time to react
     * @async
     */
    static async multiListChooser(promptInfo, list, amount) {
        let text = '';
        list.forEach((value, index) => `\n${index} - ${value.toString()}`);

        const embed = new MessageEmbed()
            .setTitle(`Select ${amount} option(s)!`)
            .setDescription(`${promptInfo.prompt} ${text}`);
        let msg = await promptInfo.channel.send(`<@${promptInfo.userId}>`, { embed: embed });

        let numbers = await NumberPrompt.multi({ 
            prompt: 'Please write down the option numbers you would like to choose.', 
            channel: promptInfo.channel, 
            userId: promptInfo.userId,
            time: promptInfo.time,
            cancelable: false,
        }, amount);

        let finalList = list.filter((value, index, list) => numbers.includes(index));

        if (finalList.length != amount) {
            channelMsgWaitDelete(promptInfo.channel, promptInfo.userId, `You need to respond with ${amount} valid number(s).`);
        } else {
            return finalList;
        }
    }
}
module.exports = ListPrompts;