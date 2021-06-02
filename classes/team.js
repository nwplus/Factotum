const Discord = require('discord.js');
const winston = require('winston');
const discordServices = require('../discord-services');


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
        this.members = new Discord.Collection();

        /**
         * The team's text channel if any
         * @type {Discord.TextChannel | null}
         */
        this.textChannel;

        /**
         * The team leader.
         * @type {Discord.Snowflake} - ID of the team leader
         */
        this.leader;

        /**
         * True if the team has been complete at least once.
         * @type {Boolean}
         */
        this.hasBeenComplete = false;

        /**
         * True if the team has been deleted, else false.
         * @type {Boolean}
         */
        this.deleted = false;        
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
     * Merge two teams. Team with a text channel, if any will be kept. New 
     * members will be added to the text channel, if any.
     * @param {Team} team - team to merge into this team
     * @async
     */
    async mergeTeam(team) {
        if (this?.textChannel || !team?.textChannel) {
            team.members.forEach((user, id) => {
                this.members.set(id, user);
                this.addUserToTextChannel(user);
            });
            return this;
        } else {
            return await team.mergeTeam(this);
        }
    }

    /**
     * Add a user to the team's text channel by giving them permission. 
     * Will also introduce them to the team.
     * @param {Discord.User} user
     * @private
     * @async
     */
    async addUserToTextChannel(user) {
        if (this?.textChannel) {
            await this.textChannel.createOverwrite(user.id, {
                'VIEW_CHANNEL' : true,
                'SEND_MESSAGES' : true,
            });
            this.textChannel.send('Hello <@' + user.id + '>, welcome to the team!').then(msg => msg.delete({timeout: 30000}));
        }
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

            if (this.members.size === 1) {
                this.leader = user.id;
                
            }
        }

        if (this.size() === 4) this.hasBeenComplete = true;
    }

    /**
     * Removes a user from the team.
     * @param {Discord.User} user - the user to remove from the team
     * @returns {Number} - the new size of this team
     */
    removeTeamMember(user) {
        this.members.delete(user.id);
        if (this?.textChannel) this.textChannel.createOverwrite(user.id, {
            VIEW_CHANNEL: false,
            SEND_MESSAGES: false,
        });

        // if user is the team leader appoint another team member
        if (this.leader === user.id) {
            this.leader = this.members.first().id;
        }

        return this.size();
    }

    /**
     * Return the length of the members collection.
     * @returns {Number}
     */
    size() {
        return this.members.size;
    }

    /**
     * True if the team has 4 members, false otherwise.
     */
    isComplete() {
        return this.size() === 4;
    }

    /**
     * Returns a string with the team id and all the team members.
     * @returns {String}
     */
    toString() {
        let teamMemberString = '';

        this.members.forEach((user, key) => {
            teamMemberString += user.username + ', ';
        });

        return 'Team ' + this.id + ': ' + teamMemberString;
    }

}
module.exports = Team;