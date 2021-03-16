const Activity = require("./activities/activity");
const TicketManager = require("./tickets/ticket-manager");
const BotGuildModel = require('./bot-guild');
const { Guild, Collection, Role, TextChannel, VoiceChannel, GuildEmoji, ReactionEmoji } = require("discord.js");
const Room = require("./room");

/**
 * @typedef CaveOptions
 * @property {String} name - the name of the cave category
 * @property {String} preEmojis - any pre name emojis
 * @property {String} preRoleText - the text to add before every role name, not including '-'
 * @property {String} color - the role color to use for this cave
 * @property {Role} role - the role associated with this cave
 * @property {Emojis} emojis - object holding emojis to use in this cave
 * @property {Times} times - object holding times to use in this cave
 */

/**
 * @typedef Emojis
 * @property {GuildEmoji | ReactionEmoji} joinTicketEmoji - emoji for mentors to accept a ticket
 * @property {GuildEmoji | ReactionEmoji} giveHelpEmoji - emoji for mentors to join an ongoing ticket
 * @property {GuildEmoji | ReactionEmoji} requestTicketEmoji - emoji for hackers to request a ticket
 * @property {GuildEmoji | ReactionEmoji} addRoleEmoji - emoji for Admins to add a mentor role
 * @property {GuildEmoji | ReactionEmoji} deleteChannelsEmoji - emoji for Admins to force delete ticket channels
 * @property {GuildEmoji | ReactionEmoji} excludeFromAutoDeleteEmoji - emoji for Admins to opt tickets in/out of garbage collector
 */

/**
 * @typedef Times
 * @property {Number} inactivePeriod - number of minutes a ticket channel will be inactive before bot starts to delete it
 * @property {Number} bufferTime - number of minutes the bot will wait for a response before deleting ticket
 * @property {Number} reminderTime - number of minutes the bot will wait before reminding mentors of unaccepted tickets
 */

/**
 * @typedef CaveChannels
 * @property {TextChannel} console
 */

class Cave extends Activity {

    /**
     * @constructor
     * @param {CaveOptions} caveOptions 
     * @param {BotGuildModel} botGuild 
     * @param {Guild} guild
     */
    constructor(caveOptions, botGuild, guild) {
        super({
            activityName: caveOptions.name,
            guild: guild,
            roleParticipants: new Collection([caveOptions.role.id, caveOptions.role]),
            botGuild: botGuild
        });

        /**
         * @type {CaveOptions}
         */
        this.caveOptions = caveOptions;

        /**
         * The emojis to use for roles.
         * key :  emoji id, 
         * value : RoleInfo
         * @type {Map<String, RoleInfo>}
         */
         this.emojis = new Map();

        /**
         * @type {TicketManager}
         */
         this.ticketManager;

         /**
          * The channels needed for a cave.
          * @type {CaveChannels}
          */
         this.channels = {};

         /**
          * The public room for this cave.
          * @type {Room}
          */
         this.publicRoom = new Room(guild, botGuild, `👉🏽👈🏽${caveOptions.name} Help`);

    }

    async init() {
        await super.init();

        this.channels.console = this.room.addRoomChannel({
            name: `📝${this.name}-role-selector`,
            info: {
                topic: 'Sign yourself up for specific roles! New roles will be added as requested, only add yourself to one if you feel comfortable responding to questions about the topic.',
            },
            isSafe: true,
        });

        for (var i = 0; i < 3; i++) {
            this.room.addRoomChannel({
                name: `🗣️ Room ${i}`,
                info: { type: 'voice' },
            });
        }

        this.publicRoom.init();

        this.ticketManager = new TicketManager(this, {
            ticketCreatorInfo: {
                channel: await this.publicRoom.addRoomChannel({
                    name: '🎫request-ticket',
                    isSafe: true,
                }),
            },
            ticketDispatcherInfo: {
                channel: await this.room.addRoomChannel({
                    name: '📨incoming-tickets',
                    isSafe: true,
                }),
                takeTicketEmoji: this.caveOptions.emojis.giveHelpEmoji,
                joinTicketEmoji: this.caveOptions.emojis.joinTicketEmoji,
                reminderInfo: {
                    isEnabled: true,
                    time: this.caveOptions.times.reminderTime,
                },
                mainHelperInfo: {
                    role: this.caveOptions.role,
                    emoji: this.caveOptions.emojis.requestTicketEmoji,
                },
                // embedCreator
            },
            systemWideTicketInfo: {
                garbageCollectorInfo: {
                    isEnabled: true,
                    inactivePeriod: this.caveOptions.times.inactivePeriod,
                    bufferTime: this.caveOptions.times.bufferTime
                },
                isAdvancedMode: true,
            }
        }, this.guild, this.botGuild);
    }

    addDefaultFeatures() {
        /** @type {Activity.ActivityFeature[]} */
        let localFeatures = [
            {
                name: 'Add Role',
                description: 'Add a new sub-role cave members can select and users can use to ask specific tickets.',
                emoji: this.caveOptions.emojis.addRoleEmoji.name,
                callback: () => {
                    
                },
            }
        ];

        localFeatures.forEach(feature => this.features.set(feature.name, feature));

        super.addDefaultFeatures();
    }
}
module.exports = Cave;