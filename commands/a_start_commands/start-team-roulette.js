const PermissionCommand = require('../../classes/permission-command');
const { sendEmbedToMember } = require('../../discord-services');
const { TextChannel, Snowflake, Message, MessageEmbed, Collection, GuildChannelManager, User } = require('discord.js');
const Team = require('../../classes/team');
const BotGuildModel = require('../../classes/bot-guild');
const { MemberPrompt, SpecialPrompt, ChannelPrompt } = require('advanced-discord.js-prompts');

/**
 * The team roulette activity is a special type of team formation activity. Users can join the activity by reacting to a message embed (console). They can join
 * as a solo or a group of up to 3 members (them included). The bot will then create teams of 4 as they become available.
 * When a team is created, the new team members are invited to a text channel only available to them. Users can leave the team and the bot will 
 * add a new member from the list (if any available).
 * Admins can check the list of users waiting on a team by reacting to a message embed (console) sent to the admin channel.
 * @category Commands
 * @subcategory Start-Commands
 * @extends PermissionCommand
 */
class StartTeamRoulette extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'start-team-roulette',
            group: 'a_start_commands',
            memberName: 'start team roulette',
            description: 'Send a message with emoji collector, solos, duos or triplets can join to get assigned a random team.',
            guildOnly: true,
        },
        {
            role: PermissionCommand.FLAGS.ADMIN_ROLE,
            roleMessage: 'Hey there, the !start-team-roulette command is only for staff!',
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'Hey there, th !start-team-roulette command is only available on the admin console.',
        });

        // collection of reaction collectors listening for team leaders to delete teams; used for scope so collectors can be stopped
        // when a team forms
        this.destroyCollectors = new Collection();
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message - the message in which the command was run
     */
    async runCommand(botGuild, message) {

        this.botGuild = botGuild;

        /**
         * The solo join emoji.
         * @type {String} - an emoji string
         */
        this.soloEmoji = '🏃🏽';

        /**
         * The non solo join emoji.
         * @type {String} - an emoji string
         */
        this.teamEmoji = '👯';

        /**
         * The team list from which to create teams.
         * @type {Collection<Number, Array<Team>>} - <Team Size, List of Teams>
         */
        this.teamList = new Collection();

        /**
         * The current team number.
         * @type {Number}
         */
        this.teamNumber = 0;

        /**
         * All the users that have participated in the activity.
         * @type {Collection<Snowflake, User>}
         */
        this.participants = new Collection();

        /**
         * Channel used to send information about team roulette.
         * @type {TextChannel}
         */
        this.textChannel;

        this.initList();

        try {
            // ask for channel to use, this will also give us the category to use
            this.textChannel = await this.getOrCreateChannel(message.channel, message.author.id, message.guild.channels);
        } catch (error) {
            message.channel.send('<@' + message.author.id + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }
                
        // create and send embed message to channel with emoji collector
        const msgEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle('Team Roulette Information')
            .setDescription('Welcome to the team roulette section! If you are looking to join a random team, you are in the right place!')
            .addField('How does this work?', 'Reacting to this message will get you or your team on a list. I will try to assign you a team of 4 as fast as possible. When I do I will notify you on a private text channel with your new team!')
            .addField('Disclaimer!!', 'By participating in this activity, you will be assigned a random team with random hackers! You can only use this activity once!')
            .addField('If you are solo', 'React with ' + this.soloEmoji + ' and I will send you instructions.')
            .addField('If you are in a team of two or three', 'React with ' + this.teamEmoji + ' and I will send you instructions.');
        
        var cardMessage = await this.textChannel.send(msgEmbed);
        cardMessage.react(this.soloEmoji);
        cardMessage.react(this.teamEmoji);

        // collect form reaction collector and its filter
        const emojiFilter = (reaction, user) => !user.bot && (reaction.emoji.name === this.soloEmoji || reaction.emoji.name === this.teamEmoji);
        var mainCollector = cardMessage.createReactionCollector(emojiFilter);

        mainCollector.on('collect', async (reaction, teamLeaderUser) => {
            // creator check
            if (this.participants.has(teamLeaderUser.id)) {
                sendEmbedToMember(teamLeaderUser, {
                    title: 'Team Roulette',
                    description: 'You are already signed up on the team roulette activity!',
                }, true);
                return;
            }

            // add team or solo to their team
            let newTeam = new Team(this.teamNumber);
            this.teamNumber ++;

            // add team leader
            newTeam.addTeamMember(teamLeaderUser);

            // the emoji used to leave a team
            let leaveTeamEmoji = '👎';
            // the emoji used to remove a team from the roulette
            let destroyTeamEmoji = '🛑';

            if (reaction.emoji.name === this.teamEmoji) {
                
                try {
                    var groupMembers = await MemberPrompt.multi({
                        prompt: 'Please mention all your current team members in one message.', 
                        channel: this.textChannel, userId: teamLeaderUser.id,
                        time: 30,
                    });
                } catch (error) {
                    reaction.users.remove(newTeam.leader);
                    return;
                }

                // remove any self mentions
                groupMembers.delete(newTeam.leader);

                // check if they have more than 4 team members
                if (groupMembers.size > 2) {
                    sendEmbedToMember(teamLeaderUser, {
                        title: 'Team Roulette',
                        description: 'You just tried to use the team roulette, but you mentioned more than 2 members. That should mean you have a team of 4 already! If you mentioned yourself by accident, try again!',
                    }, true);
                    return;
                }

                // delete any mentions of users already in the activity.
                groupMembers.forEach((teamMember, index) => {
                    if (this.participants.has(teamMember.id)) {
                        sendEmbedToMember(teamLeaderUser, {
                            title: 'Team Roulette',
                            description: 'We had to remove ' + teamMember.username + ' from your team roulette team because he already participated in the roulette.',
                        }, true);
                    } else {
                        // push member to the team list and activity list
                        newTeam.addTeamMember(teamMember);
                        this.participants.set(teamMember.id, teamMember);

                        sendEmbedToMember(teamMember, {
                            title: 'Team Roulette',
                            description: 'You have been added to ' + teamLeaderUser.username + ' team roulette team! I will ping you as soon as I find a team for all of you!',
                            color: '#57f542',
                            fields: [{
                                title:'Leave the team',
                                description: 'To leave the team please react to this message with ' + leaveTeamEmoji,
                            }]
                        }).then(memberMsg => {
                            memberMsg.react(leaveTeamEmoji);

                            // reaction to leave the team only works before the team has been completed!!
                            memberMsg.awaitReactions((reaction, user) => !user.bot && !newTeam.hasBeenComplete && !newTeam.deleted && reaction.emoji.name === leaveTeamEmoji, {max: 1}).then(reactions => {
                                // remove member from list
                                let newSize = this.removeMemberFromTeam(newTeam, teamMember);

                                memberMsg.delete();

                                // add team without users to correct teamList and notify team leader
                                if(newSize > 0) {
                                    this.teamList.get(newSize).push(newTeam);
                                    sendEmbedToMember(newTeam.members.get(newTeam.leader), {
                                        title: 'Team Roulette',
                                        description: teamMember.username + ' has left the team, but worry not, we are still working on getting you a team!',
                                    });
                                }
                                
                            });
                        });
                    }
                });
            }

            this.teamList.get(newTeam.size()).push(newTeam);

            // add team leader to activity list and notify of success
            this.participants.set(teamLeaderUser.id, teamLeaderUser);
            let leaderDM = await sendEmbedToMember(teamLeaderUser, {
                title: 'Team Roulette',
                description: 'You' + (reaction.emoji.name === this.teamEmoji ? ' and your team' : '') + ' have been added to the roulette. I will get back to you as soon as I have a team for you!',
                color: '#57f542',
                fields: [{
                    title: 'Destroy your team',
                    description: 'If you want to leave the roulette queue react to this message with ' + destroyTeamEmoji + '\n' 
                    + 'Note that once you destroy your team, you will have to re-join the roulette and wait for longer!',
                }]
            });
            leaderDM.react(destroyTeamEmoji);

            // reaction to destroy the team only works before the team is completed
            const destroyTeamCollector = leaderDM.createReactionCollector((reaction,user) => !user.bot && !newTeam.hasBeenComplete && reaction.emoji.name === destroyTeamEmoji, {max: 1});
            this.destroyCollectors.set(teamLeaderUser.id, destroyTeamCollector);
            destroyTeamCollector.on('collect', (reaction, leader) => {
                // remove team from team list
                this.teamList.get(newTeam.size()).splice(this.teamList.get(newTeam.size()).indexOf(newTeam), 1);
                
                // remove leader DM
                leaderDM.delete();

                // mark the team as deleted
                newTeam.deleted = true;

                // notify users of team deletion 
                newTeam.members.forEach(user => {
                    this.participants.delete(user.id);
                    if (user.id === leader.id) {
                        sendEmbedToMember(leader, {
                            title: 'Team Roulette',
                            description: 'Your team has been removed from the roulette!',
                        }, true);
                    } else {
                        sendEmbedToMember(user, {
                            title: 'Team Roulette',
                            description: 'Your team with <@' + newTeam.leader + '> has been destroyed!',
                        });
                    }
                });
            });
            this.runTeamCreator(message.guild.channels);
        });
    }

    /**
     * Ask user if new channels are needed, if so create them, else ask for current channels to use for TR.
     * @param {TextChannel} promptChannel - channel to prompt on
     * @param {Snowflake} promptId - user's ID to prompt
     * @param {GuildChannelManager} guildChannelManager - manager to create channels
     * @async
     * @returns {Promise<TextChannel>}
     * @throws Throws an error if the user cancels either of the two Prompts, the command should quit!
     */
    async getOrCreateChannel(promptChannel, promptId, guildChannelManager) {
        let needChannel = await SpecialPrompt.boolean({prompt: 'Do you need a new channel and category or have you created one already?', channel: promptChannel, userId: promptId});

        let channel;

        if (needChannel) {
            let category = await guildChannelManager.create('Team Roulette', {
                type: 'category',
            });

            channel = await guildChannelManager.create('team-roulette-info', {
                type: 'text',
                topic: 'Channel should only be used for team roulette.',
                parent: category,
            });
        } else {
            channel = await ChannelPrompt.single({prompt: 'What channel would you like to use for team roulette, this channels category will be used for the new team channels.', channel: promptChannel, userId: promptId});
            channel.bulkDelete(100, true);
        }

        // let user know everything is good to go
        let listEmoji = '📰';

        const adminEmbed = new MessageEmbed()
            .setColor(this.botGuild.colors.embedColor)
            .setTitle('Team Roulette Console')
            .setDescription('Team roulette is ready and operational! <#' + channel.id + '>.')
            .addField('Check the list!', 'React with ' + listEmoji + ' to get a message with the roulette team lists.');

        let adminEmbedMsg = await promptChannel.send(adminEmbed);
        adminEmbedMsg.react(listEmoji);

        // emoji reaction to send team roulette information
        let adminEmbedMsgCollector = adminEmbedMsg.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === listEmoji);
        adminEmbedMsgCollector.on('collect', (reaction, user) => {
            reaction.users.remove(user.id);

            let infoEmbed = new MessageEmbed()
                .setColor(this.botGuild.colors.embedColor)
                .setTitle('Team Roulette Information')
                .setDescription('These are all the teams that are still waiting.');

            // loop over each list type and add them to one field
            this.teamList.forEach((teams, key) => {
                let teamListString = '';

                teams.forEach((team, index) => {
                    teamListString += team.toString() + ' ; ';
                });

                infoEmbed.addField('Lists of size: ' + key, '[ ' + teamListString + ' ]');
            });

            promptChannel.send(infoEmbed);
        });

        // add channel to black list
        this.botGuild.blackList.set(channel.id, 5000);
        this.botGuild.save();
        return channel;
    }


    /**
     * Will remove the team member from the team, notify the user of success, and remove the team from the teamList
     * @param {Team} team - the team to remove user from 
     * @param {User} teamMember - the user to remove from the team
     * @returns {Number} - the new size of the team
     */
    removeMemberFromTeam(team, teamMember) {
        // remove the team from the list
        if (!team.isComplete()) this.teamList.get(team.size()).splice(this.teamList.get(team.size()).indexOf(team), 1);

        // remove user from team and notify
        this.participants.delete(teamMember.id);
        let newSize = team.removeTeamMember(teamMember);
        sendEmbedToMember(teamMember, {
            title: 'Team Roulette',
            description: 'You have been removed from the team!'
        }, true);
        return newSize;
    }

    /**
     * Will try to create a team and set them up for success!
     * @param {GuildChannelManager} channelManager
     * @async
     */
    async runTeamCreator(channelManager) {
        // call the team creator
        let team = await this.findTeam();

        // if no team then just return
        if (!team) return;

        // if team does NOT have a text channel
        if (!team?.textChannel) {
            // disable the ability to destroy a team after team has been formed
            team.members.forEach((user,id) => {
                if (this.destroyCollectors.has(id)) {
                    this.destroyCollectors.get(id).stop();
                    this.destroyCollectors.delete(id);
                }
            });

            let privateChannelCategory = this.textChannel.parent;

            await team.createTextChannel(channelManager, privateChannelCategory);

            let leaveEmoji = '👋';

            const infoEmbed = new MessageEmbed()
                .setColor(this.botGuild.colors.embedColor)
                .setTitle('WELCOME TO YOUR NEW TEAM!!!')
                .setDescription('This is your new team, please get to know each other by creating a voice channel in a new Discord server or via this text channel. Best of luck!')
                .addField('Leave the Team', 'If you would like to leave this team react to this message with ' + leaveEmoji);

            let teamCard = await team.textChannel.send(infoEmbed);

            let teamCardCollection = teamCard.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === leaveEmoji);

            teamCardCollection.on('collect', (reaction, exitUser) => {
                // remove user from team
                this.removeMemberFromTeam(team, exitUser);

                // search for more members depending on new team size
                if (team.size()) {
                    team.textChannel.send('<@' + exitUser.id + '> Has left the group, but worry not, we are working on getting you more members!');

                    this.teamList.get(team.size()).push(team);
                    this.runTeamCreator(channelManager);
                }
            });
        }
    }


    /**
     * Will try to create teams with the current groups signed up!
     * @param {Number} teamSize - the size of the new team
     * @private
     * @returns {Promise<Team | null>}
     * @async
     */
    async findTeam(teamSize) {
        let newTeam;

        if (teamSize === 3) newTeam = await this.assignGroupOf3();
        else if (teamSize === 2) newTeam = await this.assignGroupOf2();
        else {
            if (this.teamList.get(3).length >=1) newTeam = await this.assignGroupOf3();
            else if (this.teamList.get(2).length >= 1) newTeam = await this.assignGroupOf2();
            else newTeam = await this.assignGroupsOf1();
        }
        return newTeam;
    }


    /**
     * Will assign a team of 3 with a team of 1.
     * @returns {Promise<Team | null>}
     * @requires this.groupList to have a team of 3.
     * @async
     */
    async assignGroupOf3() {
        let listOf1 = this.teamList.get(1);
        if (listOf1.length === 0) return null;
        let teamOf3 = this.teamList.get(3).shift();
        return await teamOf3.mergeTeam(listOf1.shift());
    }

    /**
     * Will assign a team of 2 with a team of 2 or two of 1
     * @returns {Promise<Team | null>}
     * @requires this.groupList to have a team of 2
     * @async
     */
    async assignGroupOf2() {
        let listOf2 = this.teamList.get(2);
        if (listOf2.length >= 2) {
            return listOf2.shift().mergeTeam(listOf2.shift());
        } else {
            let listOf1 = this.teamList.get(1);
            if (listOf1.length <= 1) return null;
            return await (await listOf2.shift().mergeTeam(listOf1.shift())).mergeTeam(listOf1.shift());
        }
    }

    /**
     * Assigns 4 groups of 1 together.
     * @returns {Promise<Team | null>}
     * @async
     */
    async assignGroupsOf1() {
        let groupOf1 = this.teamList.get(1);
        if (groupOf1.length < 4) return null;
        else return await (await (await groupOf1.shift().mergeTeam(groupOf1.shift())).mergeTeam(groupOf1.shift())).mergeTeam(groupOf1.shift());
    }


    /**
     * Initializes the team list by creating three key value pairs.
     * 1 -> empty array
     * 2 -> empty array
     * 3 -> empty array
     * @private
     */
    initList() {
        this.teamList.set(1, []);
        this.teamList.set(2, []);
        this.teamList.set(3, []);
    }
}
module.exports = StartTeamRoulette;
