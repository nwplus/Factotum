const { Collection, Message, TextChannel, MessageEmbed, DMChannel } = require("discord.js");
const { randomColor } = require("../discord-services");

/**
 * The console class represents a Discord UI console. A console is an embed with options users 
 * can interact with my reacting with emojis.
 * @class
 */
class Console {

    /**
     * @typedef Feature
     * @property {String} emojiName
     * @property {String} name
     * @property {String} description
     * @property {Function} callback
     */

     /**
      * @constructor
      * @param {String} title - the console title
      * @param {String} description - the description of the console
      * @param {Collection<String, Feature>} [features] - the collection of features mapped by emoji name
      * @param {String} [color] - console color in hex
      */
    constructor(title, description, features = new Collection(), color = randomColor()) {

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
         * The message holding the console.
         * @type {Message}
         */
        this.message;
    }

    /**
     * Sends the console to a channel
     * @param {TextChannel | DMChannel} channel - channel to send console to
     * @async
     */
    async sendConsole(channel) {
        let embed = new MessageEmbed().setColor(this.color)
            .setTimestamp()
            .setTitle(this.title)
            .setDescription(this.description);
        
        this.features.forEach(feature => embed.addField(`${feature.emojiName} ${feature.name}`, `${feature.description}`));

        this.message = await channel.send(embed);

        this.features.forEach(feature => this.message.react(feature.emojiName));

        const collector = this.message.createReactionCollector((reaction, user) => !user.bot && this.features.has(reaction.emoji.name));

        collector.on('collect', (reaction, user) => {
            this.features.get(reaction.emoji.name)?.callback(user)
            if (channel.type != 'dm') reaction.users.remove(user);
        });
    }

    /**
     * Adds a feature to this console.
     * @param {Feature} feature - the feature to add
     */
    addFeature(feature) {
        this.features.set(feature.emojiName, feature);

        if (this.message) {
            this.message.edit(this.message.embeds[0].addField(`${feature.emojiName} ${feature.name}`, `${feature.description}`));
            this.message.react(feature.emojiName);
        }
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
}
module.exports = Console;