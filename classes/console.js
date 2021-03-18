const { Collection, Message, TextChannel, MessageEmbed, DMChannel, MessageReaction, User, ReactionCollectorOptions, ReactionCollector } = require('discord.js');
const { randomColor } = require('../discord-services');

/**
 * @typedef Feature
 * @property {String} emojiName
 * @property {String} name
 * @property {String} description
 * @property {FeatureCallback} callback
 * @property {FeatureCallback} [removeCallback]
 */

/**
 * @callback FeatureCallback
 * @param {User} user - the user that reacted
 * @param {MessageReaction} reaction - the reaction
 * @param {StopInteractingCallback} stopInteracting - callback to let the console know the user has
 * stopped interacting.
 * @param {Console} console - the console this feature is working on
 * @async
 */

/**
 * @callback StopInteractingCallback
 * @param {User} user
 */

/**
 * @typedef ConsoleInfo
 * @property {String} title - the console title
 * @property {String} description - the description of the console
 * @property {TextChannel | DMChannel} channel - the channel this console lives in
 * @property {Collection<String, Feature>} [features] - the collection of features mapped by emoji name
 * @property {String} [color] - console color in hex
 * @property {ReactionCollectorOptions} [options] collector options
 */

/**
 * The console class represents a Discord UI console. A console is an embed with options users 
 * can interact with my reacting with emojis.
 * @class
 */
class Console {

    /**
     * @constructor
     * @param {ConsoleInfo} args
     */
    constructor({title, description, channel, features = new Collection(), color = randomColor(), options}) {

        /**
         * @type {String}
         */
        this.title = title;

        /**
         * @type {String}
         */
        this.description = description;

        /**
         * @type {Collection<String, Feature>} - <Emoji Name, Button Info>
         */
        this.features = features;

        /**
         * @type {String} - hex color
         */
        this.color = color;

        /**
         * The collector options.
         * @type {ReactionCollectorOptions}
         */
        this.collectorOptions = options;
        this.collectorOptions.dispose = true;

        /**
         * The message holding the console.
         * @type {Message}
         */
        this.message;

        /**
         * Users the console is interacting with;
         * @type {Collection<String, User>} - <User.id, User>
         */
        this.interacting = new Collection();

        /**
         * @type {ReactionCollector}
         */
        this.collector;

        /**
         * The channel this console lives in.
         * @type {TextChannel | DMChannel}
         */
        this.channel = channel;
    }

    /**
     * Sends the console to a channel
     * @param {String} [messageText] - text to add to the message used to send the embed
     * @async
     */
    async sendConsole(messageText = '') {
        let embed = new MessageEmbed().setColor(this.color)
            .setTimestamp()
            .setTitle(this.title)
            .setDescription(this.description);
        
        this.features.forEach(feature => embed.addField(`${feature.emojiName} ${feature.name}`, `${feature.description}`));

        this.message = await this.channel.send(messageText ,embed);

        this.features.forEach(feature => this.message.react(feature.emojiName));

        this.collector = this.message.createReactionCollector((reaction, user) => 
            !user.bot && 
            this.features.has(reaction.emoji.name) && 
            !this.interacting.has(user.id)
        , this.collectorOptions);

        this.collector.on('collect', (reaction, user) => {
            this.interacting.set(user.id, user);
            this.features.get(reaction.emoji.name)?.callback(user, reaction, this.stopInteracting, this);
            if (this.channel.type != 'dm') reaction.users.remove(user);
        });

        this.collector.on('remove', (reaction, user) => {
            this.interacting.set(user.id, user);
            this.features.get(reaction.emoji.name)?.removeCallback(user, reaction, this.stopInteracting, this);
        });
    }

    /**
     * Adds a feature to this console.
     * @param {Feature} feature - the feature to add
     * @async
     */
    async addFeature(feature) {
        this.features.set(feature.emojiName, feature);

        if (this.message) {
            await this.message.edit(this.message.embeds[0].addField(`${feature.emojiName} ${feature.name}`, `${feature.description}`));
            this.message.react(feature.emojiName);
        }
    }

    /**
     * Adds a field to this console without adding a feature.
     * @param {String} name - the new field name
     * @param {String} value - the description on this field
     * @param {Boolean} [inline] 
     * @async
     */
    async addField(name, value, inline) {
        await this.message.edit(this.message.embeds[0].addField(name, value, inline));
    }

    /**
     * Changes the console's color.
     * @param {String} color - the new color in hex
     * @async
     */
    async changeColor(color) {
        await this.message.edit(this.message.embeds[0].setColor(color));
    }

    /**
     * Removes a feature from this console. TODO remove from embed too!
     * @param {String | Feature} identifier - feature name, feature emoji name or feature
     */
    removeFeature(identifier) {
        if (typeof identifier === String) {
            let isDone = this.features.delete(identifier);
            if (!isDone) {
                let feature = this.features.find(feature => feature.name === identifier);
                this.features.delete(feature.emojiName);
            }
        } else if (typeof identifier === Object) {
            this.features.delete(identifier?.emojiName);
        } else {
            throw Error(`Was not given an identifier to work with when deleting a feature from this console ${this.title}`);
        }
    }

    /**
     * Stop the console from interacting with any users.
     */
    stopConsole() {
        this.collector.stop();
    }

    /**
     * Deletes this console from discord.
     */
    delete() {
        this.stopConsole();
        this.message.delete();
    }

    /**
     * Callback for users to call when the user interacting with the console is done.
     * @param {User} user - the user that stopped interacting with this console.
     * @private
     */
    stopInteracting(user) {
        this.interacting.delete(user.id);
    }
}
module.exports = Console;