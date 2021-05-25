const { GuildEmojiManager, User, MessageReaction } = require('discord.js');
const Console = require('./console');


/**
 * The function to be called when a feature is activated.
 * @callback FeatureCallback
 * @param {User} user - the user that reacted
 * @param {MessageReaction} reaction - the reaction
 * @param {StopInteractingCallback} stopInteracting - callback to let the console know the user has
 * stopped interacting.
 * @param {Console} console - the console this feature is working on
 * @async
 */

/**
 * The function used to signal the console the user interacting has finished.
 * @callback StopInteractingCallback
 * @param {User} user
 */

/**
 * A feature is an object with information to make an action from a console.
 * The emojiName can be either a custom emoji ID or a unicode emoji name.
 * @class Feature
 */
class Feature {


    /**
     * Creates a feature object when you have a GuildEmoji or a ReactionEmoji.
     * Used for when adding features programmatically!
     * @param {Object} args
     * @param {String} args.name
     * @param {String} args.description
     * @param {GuildEmoji | ReactionEmoji | String} args.emoji
     * @param {FeatureCallback} args.callback
     * @param {FeatureCallback} [args.removeCallback]
     * @returns {Feature}
     */
    static create({name, description, emoji, callback, removeCallback}) {
        return {
            name,
            description,
            emojiName: typeof emoji === 'string' ? emoji : emoji.id || emoji.name,
            callback,
            removeCallback,
        };
    }

    /**
     * 
     * @param {Object} args arguments
     * @param {String} args.name the name of the feature
     * @param {String} args.emojiName the name of the emoji
     * @param {String} args.description the description of the feature
     * @param {FeatureCallback} args.callback the callback for when the feature is activated
     * @param {FeatureCallback} [args.removeCallback=undefined] the callback for when the feature is deactivated
     */
    constructor({name, emojiName, description, callback, removeCallback = undefined}) {

        /**
         * @type {String}
         */
        this.name = name;

        /**
         * @type {String}
         */
        this.emojiName = emojiName;

        /**
         * @type {String}
         */
        this.description = description;

        /**
         * @type {FeatureCallback}
         */
        this.callback = callback;

        /**
         * @type {FeatureCallback}
         */
        this.removeCallback = removeCallback;

    }

    /**
     * Returns a string with the emoji and the feature name:
     * <emoji> - Feature 1
     * @param {GuildEmojiManager} guildEmojiManager
     * @returns {String} 
     */
    getFieldName(guildEmojiManager) {
        let emoji = guildEmojiManager.resolve(this.emojiName);

        return `${emoji ? emoji.toString() : this.emojiName} - ${this.name}`;
    }

    /**
     * Returns the feature's value string for when adding it to a embed field.
     * @returns {String}
     */
    getFieldValue() {
        return this.description;
    }

}
module.exports = Feature;