

/**
 * Common data for all prompts.
 * @typedef PromptInfo
 * @property {String} prompt - the text prompt to send to user
 * @property {import('discord.js').TextChannel} channel - the channel to send the prompt to
 * @property {String} userId - the ID of the user to prompt
 * @property {Number} [time=0] - the time in seconds to wait for the response, if 0 then wait forever
 * @property {Boolean} [cancelable=true] - if the prompt can be canceled
 */

/**
 * An option for a list reaction picker prompt.
 * @typedef PickerOption
 * @property {String} name - name of this option
 * @property {String} description - description for this option
 * @property {String} emojiName - the name of the emoji (only unicode emojis allowed!)
 */
