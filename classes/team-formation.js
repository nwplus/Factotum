const { GuildEmoji, ReactionEmoji, Role, TextChannel, MessageEmbed, Guild, Collection, User, Message, RoleManager } = require('discord.js');
const { sendEmbedToMember, addRoleToMember, deleteMessage, sendMessageToMember, removeRolToMember } = require('../discord-services');
const BotGuild = require('../db/mongo/BotGuild');
const winston = require('winston');
const Activity = require('./activities/activity');
const BotGuildModel = require('./bot-guild');
const Console = require('./console');
const { StringPrompt } = require('advanced-discord.js-prompts');

/**
 * @class TeamFormation
 * 
 * The team formation class represents the team formation activity. It helps teams and prospects 
 * find each other by adding their respective information to a catalogue of sorts. Admins have the 
 * ability to customize the messages sent, emojis used, and if they want users to be notified of new
 * posts in the catalogue.
 * 
 */
class TeamFormation extends Activity {
    
    static defaultTeamForm = 'Team Member(s): \nTeam Background: \nObjective: \nFun Fact About Team: \nLooking For: ';
    static defaultProspectForm = 'Name: \nSchool: \nPlace of Origin: \nSkills: \nFun Fact: \nDeveloper or Designer?:';
    static defaultTeamColor = '#60c2e6';
    static defaultProspectColor = '#d470cd';

    /**
     * Creates the team role and returns it.
     * @param {RoleManager} roleManager
     * @returns {Promise<Role>}
     * @static
     * @async
     */
     static async createTeamRole(roleManager) {
        winston.loggers.get(roleManager.guild.id).verbose(`Team formation team role has been created!`, { event: "Team Formation" });
        return await roleManager.create({
            data: {
                name: 'tf-team-leader',
                color: TeamFormation.defaultTeamColor,
            }
        });
    }

    /**
     * Creates the prospect role and returns it.
     * @param {RoleManager} roleManager
     * @returns {Promise<Role>}
     * @static
     * @async
     */
    static async createProspectRole(roleManager) {
        winston.loggers.get(roleManager.guild.id).verbose(`Team formation prospect role has been created!`, { event: "Team Formation" });
        return await roleManager.create({
            data: {
                name: 'tf-prospect',
                color: TeamFormation.defaultProspectColor,
            }
        });
    }

    /**
     * @typedef TeamFormationPartyInfo
     * @property {GuildEmoji | ReactionEmoji} emoji - the emoji used to add this party to the team formation
     * @property {Role} role - the role given to the users of this party
     * @property {String} [form] - the form added to the signup embed for users to respond to. Will not be added if signupEmbed given!
     * @property {MessageEmbed} [signupEmbed] - the embed sent to users when they sign up, must include the form!
     */

    /**
     * @typedef TeamFormationChannels
     * @property {TextChannel} info - the info channel where users read about this activity
     * @property {TextChannel} teamCatalogue - the channel where team info is posted
     * @property {TextChannel} prospectCatalogue - the channel where prospect info is posted
     */

    /**
     * @callback SignupEmbedCreator
     * @param {String} teamEmoji - the emoji used by teams to sign up
     * @param {String} prospectEmoji - the emoji used by prospects to sign up
     * @param {Boolean} isNotificationEnabled - true if parties will be notified when the other party has a new post
     * @return {MessageEmbed}
     */

    /**
     * @typedef TeamFormationInfo
     * @property {TeamFormationPartyInfo} teamInfo
     * @property {TeamFormationPartyInfo} prospectInfo
     * @property {Guild} guild
     * @property {BotGuildModel} botGuild
     * @property {Collection<string, Role>} activityRoles
     * @property {Boolean} [isNotificationsEnabled]
     * @property {SignupEmbedCreator} [signupEmbedCreator]
     */

     /**
      * Create a new team formation.
      * @param {TeamFormationInfo} teamFormationInfo - the team formation information
      */
    constructor(teamFormationInfo) {

        super({
            activityName: 'Team Formation',
            guild: teamFormationInfo.guild,
            roleParticipants: teamFormationInfo.activityRoles,
            botGuild: teamFormationInfo.botGuild
        });

        if (!teamFormationInfo?.teamInfo || !teamFormationInfo?.prospectInfo) throw new Error('Team and prospect info must be given!');
        this.validatePartyInfo(teamFormationInfo.teamInfo);
        this.validatePartyInfo(teamFormationInfo.prospectInfo);
        if (!teamFormationInfo?.guild) throw new Error('A guild is required for a team formation!');

        /**
         * The team information, those teams willing to join will use this.
         * @type {TeamFormationPartyInfo}
         */
        this.teamInfo = {
            emoji : teamFormationInfo.teamInfo.emoji,
            role : teamFormationInfo.teamInfo.role,
            form: teamFormationInfo.teamInfo?.form || TeamFormation.defaultTeamForm,
            signupEmbed : teamFormationInfo.teamInfo?.signupEmbed,
        }

        /**
         * The prospect info, those solo users that want to join a team will use this info.
         * @type {TeamFormationPartyInfo}
         */
        this.prospectInfo = {
            emoji: teamFormationInfo.prospectInfo.emoji,
            role: teamFormationInfo.prospectInfo.role,
            form: teamFormationInfo.prospectInfo?.form || TeamFormation.defaultProspectForm,
            signupEmbed : teamFormationInfo.prospectInfo?.signupEmbed,
        }

        /**
         * The channels that a team formation activity needs.
         * @type {TeamFormationChannels}
         */
        this.channels = {};

        /**
         * True if the parties will be notified when the opposite party has a new post.
         * @type {Boolean}
         */
        this.isNotificationEnabled = teamFormationInfo?.isNotificationsEnabled || false;

        /**
         * A creator of the info embed in case you want it to be different.
         * @type {SignupEmbedCreator}
         */
        this.signupEmbedCreator = teamFormationInfo?.signupEmbedCreator || null;

        winston.loggers.get(this.guild.id).event(`A Team formation has been created!`, { event: "Team Formation"});
        winston.loggers.get(this.guild.id).verbose(`A Team formation has been created!`, { event: "Team Formation", data: {teamFormationInfo: teamFormationInfo}});
    }

    /**
     * Validates a TeamFormationPartyInfo object
     * @param {TeamFormationPartyInfo} partyInfo - the party info to validate
     * @private
     */
    validatePartyInfo(partyInfo) {
        if (!partyInfo?.emoji && typeof partyInfo.emoji != (GuildEmoji || ReactionEmoji)) throw new Error('A Discord emoji is required for a TeamFormationPartyInfo');
        if (!partyInfo?.role && typeof partyInfo.role != Role) throw new Error ('A Discord Role is required in a TeamFormationPartyInfo');
        if (partyInfo.signupEmbed && typeof partyInfo.signupEmbed != MessageEmbed) throw new Error('The message embed must be a Discord Message Embed');
        if (partyInfo.form && typeof partyInfo.form != 'string') throw new Error('The form must be a string!');
    }

    async init() {
        await super.init();
        await this.createChannels();
    }

    /**
     * Will create the TeamFormationChannels object with new channels to use with a new TeamFormation
     * @async
     */
    async createChannels() {

        this.room.channels.category.setName('🏅Team Formation');
        this.room.channels.generalText.delete();
        this.room.channels.generalVoice.delete();

        this.channels.info = await this.room.addRoomChannel({
            name: '👀team-formation',
            permissions: [{ id: this.botGuild.roleIDs.everyoneRole, permissions: { SEND_MESSAGES: false }}],
            isSafe: true,
        });

        this.channels.prospectCatalogue = await this.room.addRoomChannel({
            name: '🙋🏽prospect-catalogue',
            info: {
                topic: 'Information about users looking to join teams can be found here. Happy hunting!!!',
            },
            permissions: [{ id: this.botGuild.roleIDs.everyoneRole, permissions: { SEND_MESSAGES: false }}],
            isSafe: true,
        });

        this.channels.teamCatalogue = await this.room.addRoomChannel({
            name: '💼team-catalogue',
            info: {
                topic: 'Channel for teams to post about themselves and who they are looking for! Expect people to send you private messages.',
            },
            permissions: [{ id: this.botGuild.roleIDs.everyoneRole, permissions: { SEND_MESSAGES: false }}],
            isSafe: true,
        });

        winston.loggers.get(this.guild.id).verbose(`Team formation channels have been created!`, { event: "Team Formation" });
    }

    /**
     * Will start the activity!
     * @param {SignupEmbedCreator} [signupEmbedCreator] - embed creator for the sign in
     * @async
     */
    async start(signupEmbedCreator = null) {
        let embed;

        if (signupEmbedCreator) {
            embed = signupEmbedCreator(this.teamInfo.emoji, this.prospectInfo.emoji, this.isNotificationEnabled);
        } else {
            embed = new MessageEmbed()
            .setColor((await (BotGuild.findById(this.guild.id))).colors.embedColor)
            .setTitle('Team Formation Information')
            .setDescription('Welcome to the team formation section! If you are looking for a team or need a few more members to complete your ultimate group, you are in the right place!')
            .addField('How does this work?', '* Once you react to this message, I will send you a template you need to fill out and send back to me via DM. \n* Then I will post your information in the channels below. \n* Then, other members, teams, or yourself can browse these channels and reach out via DM!')
            .addField('Disclaimer!!', 'By participating in this activity, you consent to other server members sending you a DM.')
            .addField('Teams looking for new members', 'React with ' + this.teamInfo.emoji.toString() + ' and the bot will send you instructions.')
            .addField('Prospects looking for a team', 'React with ' + this.prospectInfo.emoji.toString() + ' and the bot will send you instructions.');
        }

        let signupMsg = await this.channels.info.send(embed);
        signupMsg.react(this.teamInfo.emoji);
        signupMsg.react(this.prospectInfo.emoji);

        winston.loggers.get(this.guild.id).event(`The team formation has started. ${signupEmbedCreator ? 'A custom embed creator was used' : 'The default embed was used.'}`, { event: "Team Formation"});
        winston.loggers.get(this.guild.id).verbose(`The team formation has started. ${signupEmbedCreator ? 'A custom embed creator was used' : 'The default embed was used.'}`, { event: "Team Formation", data: { embed: embed }});

        const signupCollector = signupMsg.createReactionCollector((reaction, user) => !user.bot && (reaction.emoji.name === this.teamInfo.emoji.name || reaction.emoji.name === this.prospectInfo.emoji.name));

        signupCollector.on('collect', (reaction, user) => {
            let isTeam = reaction.emoji.name === this.teamInfo.emoji.name;
            winston.loggers.get(this.guild.id).userStats(`The user ${user.id} is signing up to the team formation as a ${isTeam ? "team" : "prospect"}.`, { event: "Team Formation" })
            this.reachOutToUser(user, isTeam);
        });
    }

    /**
     * Will reach out to the user to ask for the form response to add to the catalogue.
     * @param {User} user - the user joining the team formation activity
     * @param {Boolean} isTeam - true if the user represents a team, else false
     * @async
     */
    async reachOutToUser(user, isTeam) {
        let logger = winston.loggers.get(this.guild.id);

        let console = new Console({
            title: `Team Formation - ${isTeam ? 'Team Format' : 'Prospect Format'}`,
            description: 'We are very excited for you to find your perfect ' + (isTeam ? 'team members.' : 'team.') + '\n* Please **copy and paste** the following format in your next message. ' +
            '\n* Try to respond to all the sections! \n* Once you are ready to submit, react to this message with 🇩 and then send me your information!\n' +
            '* Once you fill your team, please come back and click the ⛔ emoji.',
            channel: await user.createDM(),
            guild: this.guild,
        });

        if (this.isNotificationEnabled) console.addField('READ THIS!', 'As soon as you submit your form, you will be notified of every new ' + (isTeam ? 'available prospect.' : 'available team.') + 
        ' Once you close your form, you will stop receiving notifications!');

        await console.addField('Format:', isTeam ? this.teamInfo.form || TeamFormation.defaultTeamForm : this.prospectInfo.form || TeamFormation.defaultProspectForm);

        await console.addFeature({
            name: 'Send completed form',
            description: 'React to this emoji, wait for my prompt, and send the finished form.',
            emojiName: '🇩',
            callback: async (user, reaction, stopInteracting, console) => {
                // gather and send the form from the user
                try {
                    var catalogueMsg = await this.gatherForm(user, isTeam);
                    logger.verbose(`I was able to get the user's team formation response: ${catalogueMsg.cleanContent}`, { event: "Team Formation" });
                } catch (error) {
                    logger.warning(`While waiting for a user's team formation response I found an error: ${error}`, { event: "Team Formation" });
                    user.dmChannel.send('You have canceled the prompt. You can try again at any time!').then(msg => msg.delete({timeout: 10000}));
                    stopInteracting();
                    return;
                }
        
                // confirm the post has been received
                sendEmbedToMember(user, {
                    title: 'Team Formation',
                    description: 'Thanks for sending me your information, you should see it pop up in the respective channel under the team formation category.' +
                    `Once you find your ${isTeam ? 'members' : 'ideal team'} please react to my original message with ⛔ so I can remove your post. Good luck!!!`,
                }, 15);
                logger.event(`The user ${user.id} has successfully sent their information to the team formation feature.`, { event: "Team Formation" });

                // add role to the user
                addRoleToMember(this.guild.member(user), isTeam ? this.teamInfo.role : this.prospectInfo.role);

                // add remove post feature
                await console.addFeature({
                    name: 'Done with team formation!',
                    description: 'React with this emoji if you are done with team formation.',
                    emojiName: '⛔',
                    callback: (user, reaction, stopInteracting, console) => {
                        // remove message sent to channel
                        deleteMessage(catalogueMsg);
            
                        // confirm deletion
                        sendMessageToMember(user, 'This is great! You are all set! Have fun with your new team! Your message has been deleted.', true);
            
                        removeRolToMember(this.guild.member(user), isTeam ? this.teamInfo.role : this.prospectInfo.role);

                        logger.event(`The user ${user.id} has found a team and has been removed from the team formation feature.`, { event: "Team Formation" });

                        console.delete();
                    }
                });

                console.removeFeature('🇩');

                stopInteracting();
            }
        });

        console.sendConsole();
    }

    /**
     * Will gather the form from a user to add to the catalogues and send it to the correct channel.
     * @param {User} user - the user being prompted
     * @param {Boolean} isTeam - true if the user is a team looking for members
     * @returns {Promise<Message>} - the catalogue message
     * @async
     * @throws Error if user cancels or takes too long to respond to prompt
     */
    async gatherForm(user, isTeam) {
        
        var formMsg = await StringPrompt.single({
            prompt: 'Please send me your completed form, if you do not follow the form your post will be deleted!', 
            channel: user.dmChannel, userId: user.id, time: 30, cancelable: true,
        });

        const embed = new MessageEmbed()
                .setTitle('Information about them can be found below:')
                .setDescription(formMsg.content + '\nDM me to talk -> <@' + user.id + '>')
                .setColor(isTeam ? this.teamInfo.role.hexColor : this.prospectInfo.role.hexColor);

        let channel = isTeam ? this.channels.teamCatalogue : this.channels.prospectCatalogue;

        let catalogueMsg = await channel.send(
            (this.isNotificationEnabled ? '<@&' + (isTeam ? this.prospectInfo.role.id : this.teamInfo.role.id) + '>, ' : '') + 
            '<@' + user.id + (isTeam ? '> and their team are looking for more team members!' : '>  is looking for a team to join!'), {embed: embed});

        winston.loggers.get(channel.guild.id).verbose(`A message with the user's information has been sent to the channel ${channel.name} with id ${channel.id}.`, { event: "Team Formation", data: embed});

        return catalogueMsg;
    }

}
module.exports = TeamFormation;