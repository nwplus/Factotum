const { Collection, Message, TextChannel, MessageEmbed, DMChannel, MessageReaction, User, ReactionCollectorOptions, ReactionCollector, Guild, GuildEmoji, ReactionEmoji } = require('discord.js');
const { randomColor } = require('../../../discord-services');
const getEmoji = require('get-random-emoji');
const Feature = require('./feature');

/**
 * @typedef ConsoleInfo
 * @property {String} title - the console title
 * @property {String} description - the description of the console
 * @property {TextChannel | DMChannel} channel - the channel this console lives in
 * @property {Collection<String, Feature>} [features] - the collection of features mapped by emoji name
 * @property {Collection<String, String>} [fields] - a collection of fields
 * @property {String} [color] - console color in hex
 * @property {ReactionCollectorOptions} [options={}] collector options
 */

/**
 * The console class represents a Discord UI console. A console is an embed with options users 
 * can interact with by reacting with emojis.
 * @class
 */
class Console {

    /**
     * @constructor
     * @param {ConsoleInfo} args
     */
    constructor({title, description, channel, features = new Collection(), fields = new Collection(), color = randomColor(), options = {}}) {

        /**
         * @type {String}
         */
        this.title = title;

        /**
         * @type {String}
         */
        this.description = description;

        /**
         * The fields this console has, not including feature fields.
         * <Field Name, Field Description>
         * @type {Collection<String, String>}
         */
        this.fields = new Collection();

        /**
         * @type {String} - hex color
         */
        this.color = color;

        /**
         * @type {Collection<String, Feature>} - <Emoji Name, Button Info>
         */
        this.features = new Collection();

        /**
         * @type {ReactionCollector}
         */
        this.collector;

        /**
         * The collector options.
         * @type {ReactionCollectorOptions}
         */
        this.collectorOptions = options;
        this.collectorOptions.dispose = true;

        /**
         * Users the console is interacting with;
         * @type {Collection<String, User>} - <User.id, User>
         */
        this.interacting = new Collection();

        /**
         * The message holding the console.
         * @type {Message}
         */
        this.message;

        /**
         * The channel this console lives in.
         * @type {TextChannel | DMChannel}
         */
        this.channel = channel;

        features.forEach(feature => this.addFeature(feature));
        fields.forEach((name, description) => this.addField(name, description));
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
        
        this.features.forEach(feature => embed.addField(feature.getFieldName(this.channel?.guild?.emojis), feature.getFieldValue()));
        this.fields.forEach((description, name) => embed.addField(name, description));

        this.message = await this.channel.send(messageText ,embed);

        this.features.forEach(feature => {
            this.message.react(feature.emojiName).catch((reason) => {
                // the emoji is probably custom we need to find it!
                let emoji = this.message.guild.emojis.cache.find(guildEmoji => guildEmoji.name === feature.emojiName);
                this.message.react(emoji);
            });
        });

        this.createReactionCollector(this.message);
    }

    /**
     * Creates the reaction collector in the message.
     * @param {Message} message
     */
    createReactionCollector(message) {
        // make sure we don't have two collectors going!
        if (this.collector) this.stopConsole();

        this.collector = message.createReactionCollector((reaction, user) => !user.bot &&
            this.features.has(reaction.emoji.id || reaction.emoji.name) &&
            !this.interacting.has(user.id),
        this.collectorOptions);

        this.collector.on('collect', (reaction, user) => {
            this.interacting.set(user.id, user);
            let feature = this.features.get(reaction.emoji.id || reaction.emoji.name);
            feature?.callback(user, reaction, () => this.stopInteracting(user), this);
            if (this.channel.type != 'dm' && !feature?.removeCallback)
                reaction.users.remove(user);
        });

        this.collector.on('remove', (reaction, user) => {
            let feature = this.features.get(reaction.emoji.id || reaction.emoji.name);
            if (feature && feature?.removeCallback) {
                this.interacting.set(user.id, user);
                feature?.removeCallback(user, reaction, () => this.stopInteracting(user), this);
            }
        });
    }

    /**
     * Adds a feature to this console.
     * @param {Feature} feature - the feature to add
     * @async
     */
    async addFeature(feature) {
        if (!(feature instanceof Feature)) {
            throw Error(`The given feature is not a Feature object! Given object: ${feature}`);
        }

        // if the channel is a DM channel, we can't use custom emojis, so if the emoji is a custom emoji, its an ID,
        // we will grab a random emoji and use that instead
        if (this.channel.type === 'dm' && !isNaN(parseInt(feature.emojiName))) {
            feature.emojiName = getEmoji();
        }

        this.features.set(feature.emojiName, feature);

        if (this.message) {
            await this.message.edit(this.message.embeds[0].addField(feature.getFieldName(this.channel?.guild?.emojis), feature.getFieldValue()));
            this.message.react(feature.emojiName).catch(reason => {
                // the emoji is probably custom we need to find it!
                let emoji = this.message.guild.emojis.cache.find(guildEmoji => guildEmoji.name === feature.emojiName);
                this.message.react(emoji);
            });
        }
    }
    
    /**
     * Removes a feature from this console.
     * @param {String | Feature} identifier - feature name, feature emojiName or feature
     */
    removeFeature(identifier) {
        if (typeof identifier === 'string') {
            let isDone = this.features.delete(identifier);
            if (!isDone) {
                let feature = this.features.find(feature => feature.name === identifier);
                this.features.delete(feature.emojiName);
            }
        } else if (typeof identifier === 'object') {
            this.features.delete(identifier?.emojiName);
        } else {
            throw Error(`Was not given an identifier to work with when deleting a feature from this console ${this.title}`);
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
        this.fields.set(name, value);
        if(this.message) await this.message.edit(this.message.embeds[0].addField(name, value, inline));
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
     * Stop the console from interacting with any users.
     */
    stopConsole() {
        this.collector?.stop();
    }

    /**
     * Deletes this console from discord.
     */
    delete() {
        this.stopConsole();
        this.message?.delete();
    }

    /**
     * Callback for users to call when the user interacting with the console is done.
     * @param {User} user - the user that stopped interacting with this console.
     * @private
     */
    stopInteracting(user) {
        this.interacting.delete(user.id);
    }
    
    /**
     * Creates a JSON representation of this object
     * @returns {JSON} representation of this object as JSON
     */
    toJSON() {
        return {
            'title': this.title,
            'description': this.description,
            'features': [...this.features],
            'fields': [...this.fields],
            'color': this.color,
            'collectorOptions': JSON.stringify(this.collectorOptions),
            'messageId': this.message?.id,
            'interacting': [...this.interacting],
            'channelId': this.channel.id,
        };
    }

    /**
     * Creates a Console from JSON data.
     * @param {JSON} json the json data
     * @param {Guild} guild the guild where this console lives
     * @returns {Console}
     */
    static async fromJSON(json, guild) {
        let console = new Console(
            {
                title: json['title'],
                description: json['description'],
                channel: guild.channels.resolve(json['channelId']),
                features: new Collection(json['features']),
                color: json['color'],
                options: JSON.parse(json['collectorOptions']),
                fields: new Collection(json['fields']),
            }
        );
        
        if (json['messageId'] != undefined) {
            let message = await console.channel.messages.fetch(json['messageId']);
            console.message = message;
            console.createReactionCollector(console.message);
        }
    }

}
module.exports = Console;