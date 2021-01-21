const Discord = require("discord.js");


/**
 * A Team represents a real life team with members. Teams can merge together, have channels and each team has a unique ID.
 */
class Team {

    constructor(teamNumber) {
        /**
         * The team ID
         * @type {Number}
         */
        this.id = teamNumber;

        /**
         * All the team members
         * @type {Discord.Collection<Discord.Snowflake, Discord.User | Discord.GuildMember>} - <user ID, User or Member>
         */
        this.members = new Discord.Collection()

        /**
         * The team's text channel if any
         * @type {Discord.TextChannel}
         */
        this.textChannel;

        /**
         * The team leader.
         * @type {Discord.Snowflake} - ID of the team leader
         */
        this.leader;
    }

    /**
     * Create a text channel for this team and add all the team members. 
     * Will notify the members of the channel creation
     * @param {Discord.ChannelManager} channelManager - the channel manager to create the text channel
     * @param {Discord.CategoryChannel} category - the category where to create the channel
     * @async
     * @returns {Promise<Discord.TextChannel>}
     */
    async createTextChannel(channelManager, category) {
        this.textChannel = await channelManager.create('Team-' + this.id, {
            type: 'text',
            topic: 'Welcome to your new team, good luck!',
            parent: category,
        });

        let usersMentions = '';

        this.members.forEach((user, id) => {
            usersMentions += '<@' + id + '>, ';
            this.addUserToTextChannel(user);
        });

        this.textChannel.send(usersMentions).then(msg => msg.delete({timeout: 5000}));

        return this.textChannel;
    }

    /**
     * Merge a team into this team and if text channel, add them to the channel
     * @param {Team} team - team to merge into this team
     * @async
     */
    async mergeTeams(team) {
        team.members.forEach((user, id) => {
            this.members.set(id, user);
            await this.addUserToTextChannel(user);
        });
    }

    /**
     * Add a user to the team's text channel by giving them permission
     * @param {Discord.User} user
     * @private
     * @async
     */
    async addUserToTextChannel(user) {
        if (this.textChannel) await this.textChannel.createOverwrite(user.id, {
            'VIEW_CHANNEL' : true,
            'SEND_MESSAGES' : true,
        });
    }

    /**
     * Add a new user to the team.
     * @param {Discord.User | Discord.GuildMember} user - the user to add to the team
     * @async
     */
    async addTeamMember(user) {
        if (!this.members.has(user.id)) {
            this.members.set(user.id, user);
            await this.addUserToTextChannel(user);

            if (this.members.array().length === 1) {
                this.leader = user.id;
                
            }
        }
    }

}
module.exports = Team;