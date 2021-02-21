const firebaseActivity = require('../firebase-services/firebase-services-activities');
const firebaseCoffeeChats = require('../firebase-services/firebase-services-coffeechats');
const discordServices = require('../discord-services');
const Activity = require('./activity');
const Discord = require('discord.js');
const BotGuild = require('../db/BotGuild');
const BotGuildModel = require('./bot-guild');

/**
 * The ActivityManager class has static variables to play with activities.
 */
class ActivityManager {


    /**
     * Will get all users in the voice channels back to the main voice channel.
     * @param {Activity} activity - the activity to use
     */
    static voiceCallBack(activity) {
        activity.category.children.filter(channel => channel.type === 'voice' && channel.id != activity.generalVoice.id).forEach(channel => {
            channel.members.forEach(member => member.voice.setChannel(activity.generalVoice));
        });
    }


    /**
     * Shuffle users in general voice as groups in firebase
     * @param {Activity} activity - the activity to use
     */
    static async groupShuffle(activity) {
        let groups = await firebaseCoffeeChats.getGroup(activity.name);

        let channels = activity.category.children.filter(channel => channel.type === 'voice' && channel.id != activity.generalVoice.id);

        // loop over the groups and channels at the same time using an index, add users for each group in a single voice channel
        for (var index = 0; index < channels.size; index++) {
            groups[index]['members'].forEach(username => {
                activity.generalVoice.members.find(member => member.user.username === username).voice.setChannel(channels[index]);
            });
        }
    }


    /**
     * Shuffle mentors from the general voice channel to all the other voice channels
     * @param {Activity} activity - the activity to use
     */
    static async mentorShuffle(activity) {
        let botGuild = await BotGuild.findById(activity.guild.id);

        if (!botGuild.roleIDs?.mentorRole) return;

        let mentors = activity.generalVoice.members.filter(member => discordServices.checkForRole(member, botGuild.roleIDs.mentorRole));

        let channels = activity.category.children.filter(channel => channel.type === 'voice' && channel.id != activity.generalVoice.id);

        let channelsLength = channels.size;
        let channelIndex = 0;
        mentors.forEach(mentor => {
            mentor.voice.setChannel(channels[channelIndex % channelsLength]);
            channelIndex++;
        });
    }


    /**
     * Shuffle all the general voice members on all other voice channels
     * @param {Activity} activity - the activity to use
     */
    static async shuffle(activity) {
        let members = activity.generalVoice.members;

        this.shuffleArray(members);

        let channels = activity.category.children.filter(channel => channel.type === 'voice' && channel.id != activity.generalVoice.id);

        let channelsLength = channels.size;
        let channelIndex = 0;
        members.forEach(member => {
            member.voice.setChannel(channels[channelIndex % channelsLength]);
            channelIndex++;
        })
    }


    /**
     * will shuffle an array as best and fast as possible
     * @param {Array<*>} array - array to shuffle
     * @private
     */
    static shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }


    /**
     * Will let hackers get a stamp for attending an activity.
     * @param {Activity} activity - activity to use
     * @param {Number} [time] - time to wait till collector closes, in seconds
     * @param {BotGuildModel} botGuild
     * @async
     */
    static async distributeStamp(activity, botGuild, time = 60) {
        
        // The users already seen by this stamp distribution.
        let seenUsers = new Discord.Collection();

        const promptEmbed = new Discord.MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle('React within ' + time + ' seconds of the posting of this message to get a stamp for ' + activity.name + '!');

        let promptMsg = await activity.generalText.send(promptEmbed);
        promptMsg.react('👍');

        // reaction collector, time is needed in milliseconds, we have it in seconds
        const collector = promptMsg.createReactionCollector((reaction, user) => !user.bot, { time: (1000 * time) });

        collector.on('collect', async (reaction, user) => {
            // grab the member object of the reacted user
            const member = activity.generalText.guild.member(user);

            if (!seenUsers.has(user.id)) {

                if (role != undefined) this.parseRole(member, activity.name, botGuild);

                seenUsers.set(user.id, user.username);
            }
        });

        // edit the message to closed when the collector ends
        collector.on('end', collected => {
            if (!promptMsg.deleted) {
                promptMsg.edit(promptEmbed.setTitle('Time\'s up! No more responses are being collected. Thanks for participating in ' + activity.name + '!'));
            }
        });
    }


    /**
     * Upgrade the stamp role of a member.
     * @param {Discord.GuildMember} member - the member to add the new role to
     * @param {String} activityName - the name of the activity
     * @param {BotGuildModel} botGuild
     * @private
     */
    static parseRole(member, activityName, botGuild) {
        let role = member.roles.cache.find(role => botGuild.stamps.stampRoleIDs.has(role.id));

        if (role === undefined) {
            discordServices.addRoleToMember(member, botGuild.stamps.stamp0thRoleId);
            discordServices.sendMessageToMember(member, 'I did not find an existing stamp role for you so I gave you one for attending '
                + activityName + '. Please contact an admin if there was a problem.', true);
            return;
        }

        let stampNumber = botGuild.stamps.stampRoleIDs.get(role.id);
        if (stampNumber === botGuild.stamps.stampRoleIDs.size - 1) {
            discordServices.sendMessageToMember(member, 'You already have the maximum allowed number of stamps!', true);
        }
        let newRoleID = botGuild.stamps.stampRoleIDs.findKey(number => number === (stampNumber + 1));

        if (newRoleID != undefined) {
            discordServices.replaceRoleToMember(member, role.id, newRoleID);
            discordServices.sendMessageToMember(member, 'You have received a higher stamp for attending ' + activityName + '!', true);
        }
    }


    /**
     * Send a poll to the general text channel
     * @param {Activity} activity - activity to use
     * @param {String} title - the title of the poll
     * @param {String} question - the question to poll for
     * @param {Discord.Collection<String, String>} response - <Emoji, Response> A collection, in order of emojis with its response
     * @param {BotGuildModel} botGuild
     */
    static sendPoll(activity, title, question, response, botGuild){
        // create poll
        let description = question + '\n\n';
        for (const key of response.keys()) {
            description += '**' + response.get(key) + '->** ' + key + '\n\n';
        }
        console.log(description);

        let qEmbed = new Discord.MessageEmbed()
            .setColor(botGuild.colors.embedColor)
            .setTitle(title)
            .setDescription(description);

        // send poll
        activity.generalText.send(qEmbed).then(msg => {
            response.forEach((value, key) => msg.react(key));
        })
    }

}

module.exports = ActivityManager;