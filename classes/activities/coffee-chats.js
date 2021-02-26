const Activity = require("./activity");
const { MessageEmbed, TextChannel, User, GuildMember, Collection, VoiceChannel } = require('discord.js');
const { memberPrompt, messagePrompt } = require("../prompt");
const winston = require("winston");
const { sendMsgToChannel } = require("../../discord-services");

/**
 * A CoffeeChat is a special activity where users join as a team. The teams are then 
 * scattered around in voice channels to talk with mentors or other teams.
 * @class
 * @extends Activity
 */
class CoffeeChats extends Activity {

    /**
     * 
     * @param {Activity.ActivityInfo} activityInfo 
     * @param {Number} numOfGroups
     */
    constructor(activityInfo, numOfGroups) {
        super(activityInfo);

        /**
         * A collection of the groups that will attend this coffee chat.
         * @type {Collection<Number, GuildMember[]>} - <group number, group members as array>
         */
        this.teams = new Collection();

        /**
         * The number of groups available in this coffee chat
         * @type {Number}
         */
        this.numOfGroups = numOfGroups || 0;

        /**
         * The channel where users join the list of groups.
         * @type {TextChannel}
         */
        this.joinGroupChannel;

        /**
         * The main voice channel where everyone starts.
         * @type {VoiceChannel}
         */
        this.mainVoiceChannel;

        winston.loggers.get(this.guild.id).event(`The activity ${this.name} was created as a coffee chats.`, {event: "Activity"});
    }

    /**
     * Initializes the activity by creating the necessary channels.
     * @returns {Promise<CoffeeChats>}
     */
    async init(channel, userId) {
        await super.init();

        // search for the main voice channel till found
        while (!this.mainVoiceChannel) {
            let mainRoomName = (await messagePrompt({ prompt: `What is the name of the voice channel where user can first join before being shuffled around? You need to be very accurate!`, channel, userId})).content;

            this.mainVoiceChannel = this.channels.voiceChannels.find(voiceChannel => voiceChannel.name.toLowerCase().includes(mainRoomName));
        }

        this.addVoiceChannels(this.numOfGroups, true);

        this.joinGroupChannel = await this.addChannel('☕' + 'join-activity', {
            type: 'text',
            topic: 'This channel is only intended to add your team to the activity list! Please do not use it for anything else!',
        });

        this.sendConsoles();

        return this;
    }

    /**
     * Will send the console for users to join the activity as a group.
     * @private
     * @async
     */
    async sendConsoles() {
        // reaction to use
        var emoji = '⛷️';

        // send embed and react with emoji
        const msgEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle('Join the activity!')
            .setDescription('If you want to join this activity, please react to this message with ' + emoji +' and follow my instructions!\n If the emojis are not working' +
            ' it means the activity is full. Check the activity text channel for other activity times!');
        var joinMsg = await this.joinGroupChannel.send(msgEmbed);
        await joinMsg.react(emoji);

        // reactor collector and its filter
        const emojiFilter = (reaction, user) => !user.bot && reaction.emoji.name === emoji;
        const emojiCollector = joinMsg.createReactionCollector(emojiFilter, {max: numOfGroups});

        emojiCollector.on('collect', async (reaction, user) => {

            // check to make sure there are spots left
            if (this.numOfGroups >= this.teams.size) {
                sendMsgToChannel(this.joinGroupChannel, user.id, "Sorry, but the activity is full!", 10);
                return;
            }

            let members = await memberPrompt({prompt: "Who are you team members? Let me know in ONE message!", channel: this.joinGroupChannel, userId: user.id});

            // add team captain to members list
            members.set(user.id, this.guild.member(user));

            // add the team to the team list
            this.teams.set(this.teams.size, members.array());

            this.joinGroupChannel.send('<@' + user.id + '> Your team has been added to the activity! Make sure you follow the instructions in the main channel.').then(msg => {
                msg.delete({ timeout: 5000 });
            });
        });
    }

    /**
     * Shuffle users in general voice as groups in firebase
     */
    groupShuffle() {

        let channels = this.channels.voiceChannels;
        let voiceChannels = channels.filter(voiceChannel => voiceChannel.id === this.mainVoiceChannel.id).array();

        // loop over the groups and channels at the same time using an index, add users for each group in a single voice channel
        for (var index = 0; index < voiceChannels.length; index++) {
            this.teams.get(index).forEach(member => {
                try {
                    member.voice.setChannel(voiceChannels[index])
                } catch (error) {
                    // do nothing, sad!
                winston.loggers.get(this.guild.id).warning(`For activity named ${this.name} I could not pull in user ${member.id} into the voice channel ${voiceChannels[index].name}.`, {event: "Coffee Chats"});
                }
            });
        }

        winston.loggers.get(this.guild.id).event(`Activity named ${this.name} had its groups shuffled.`, {event: "Coffee Chats"});
    }

    /**
     * Adds voice channels to the coffee chats, more voice channels allow for more groups to join.
     * @param {Number} number - the number of voice channels to add
     * @param {Number} maxUsers - max number of users for the voice channels
     */
    addVoiceChannels(number, maxUsers) {
        super.addVoiceChannels(number, maxUsers);

        this.numOfGroups = this.numOfGroups + number;
    }

    /**
     * Resets the teams to have no teams.
     */
    resetTeams() {
        this.teams = new Collection();
    }
    

}

module.exports = CoffeeChats;