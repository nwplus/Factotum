// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Prompt = require('../../classes/prompt.js');
const Team = require('../../classes/team');

// Command export
module.exports = class StartTeamRoulette extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'starttr',
            group: 'a_start_commands',
            memberName: 'start team roulette',
            description: 'Send a message with emoji collector, solos, duos or triplets can join to get assigned a random team.',
            guildOnly: true,
        },
        {
            roleID: discordServices.staffRole,
            roleMessage: 'Hey there, the !starttr command is only for staff!',
            channelID: discordServices.adminConsoleChannel,
            channelMessage: 'Hey there, th !starttr command is only available on the admin console.',
        });
    }

    /**
     * 
     * @param {Discord.Message} message - the message in which the command was run
     */
    async runCommand(message) {

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
         * @type {Discord.Collection<Number, Array<Team>} - <Team Size, List of Teams>
         */
        this.teamList = new Discord.Collection();

        /**
         * The current team number.
         * @type {Number}
         */
        this.teamNumber = 0;

        /**
         * All the users that have participated in the activity.
         * @type {Discord.Collection<Discord.Snowflake, User>}
         */
        this.participants = new Discord.Collection();

        this.initList();

        // ask for channel to use, this will also give us the category to use
        let channel = await this.getOrCreateChannel(message.channel, message.author.id, message.guild.channels);
                
        // create and send embed message to channel with emoji collector
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Team Roulette Information')
            .setDescription('Welcome to the team rulette section! If you are looking to join a random team, you are in the right place!')
            .addField('How does this work?', 'Reacting to this message will get you or your team on a list. I will try to assing you a team of 4 as fast as possible. When I do I will notify you on a private text channel with your new team!')
            .addField('Disclaimer!!', 'By participating in this activity, you will be assigned a random team with random hackers! You can only use this activity once!')
            .addField('If you are solo', 'React with ' + this.soloEmoji + ' and I will send you instructions.')
            .addField('If you are in a team of two or three', 'React with ' + this.teamEmoji + ' and I will send you instructions.');
        
        var cardMessage = await channel.send(msgEmbed);
        cardMessage.react(this.soloEmoji);
        cardMessage.react(this.teamEmoji);

        // collect form reaction collector and its filter
        const emojiFilter = (reaction, user) => !user.bot && (reaction.emoji.name === this.soloEmoji || reaction.emoji.name === this.teamEmoji);
        var mainCollector = cardMessage.createReactionCollector(emojiFilter);

        mainCollector.on('collect', async (reaction, teamLeaderUser) => {
            // creator check
            if (this.participants.has(teamLeaderUser.id)) {
                discordServices.sendEmbedToMember(teamLeaderUser, {
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
                let groupMsg = await Prompt.messagePrompt('Please mention all your current team members in one message. You mention by typing @friendName .', 'string', message.channel, teamLeaderUser.id, 30);

                if (groupMsg === null) {
                    reaction.users.remove(newTeam.leader);
                    return;
                }

                let groupMembers = groupMsg.mentions.users;

                // remove any self mentions
                groupMembers.delete(newTeam.leader);

                // check if they have more than 4 team members
                if (groupMembers.array().length > 2) {
                    discordServices.sendEmbedToMember(teamLeaderUser, {
                        title: 'Team Roulette',
                        description: 'You just tried to use the team roulette, but you mentioned more than 2 members. That should mean you have a team of 4 already! If you mentioned yourself by accident, try again!',
                    }, true);
                    return;
                }

                // delete any mentions of users already in the activity.
                groupMembers.forEach((teamMember, index) => {
                    if (this.participants.has(teamMember.id)) {
                        discordServices.sendEmbedToMember(teamLeaderUser, {
                            title: 'Team Roulette',
                            description: 'We had to remove ' + teamMember.username + ' from your team roulette team because he already participated in the roulette.',
                        }, true);
                    } else {
                        // push member to the team list and activity list
                        newTeam.addTeamMember(teamMember);
                        this.participants.set(teamMember.id, teamMember);

                        discordServices.sendEmbedToMember(teamMember, {
                            title: 'Team Roulette',
                            description: 'You have been added to ' + teamLeaderUser.username + ' team roulette team! I will ping you as soon as I find a team for all of you!',
                            color: '#57f542',
                        }).then(memberMsg => {
                            // reaction to leave the team only works before the team has been completed!!
                            memberMsg.awaitReactions((reaction, user) => !user.bot && !newTeam.hasBeenComplete && reaction.emoji.name === leaveTeamEmoji).then(reactions => {
                                // remove member from list
                                let newSize = this.removeMemberFromTeam(newTeam, teamMember, memberMsg);

                                // add team without user to correct teamList and notify team leader
                                if(newSize > 0) {
                                    this.teamList.get(newSize).push(newTeam);
                                    discordServices.sendEmbedToMember(newTeam.members.get(newTeam.leader), {
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
            let leaderDM = await discordServices.sendEmbedToMember(teamLeaderUser, {
                title: 'Team Roulette',
                description: 'You' + (reaction.emoji.name === this.teamEmoji ? ' and your team' : '') + ' have been added to the roulette. I will get back to you as soon as I have a team for you!',
                color: '#57f542',
            });

            // reaction to destroy the team only works before the team is completed
            leaderDM.awaitReactions((reaction, user) => !user.bot && !newTeam.hasBeenComplete && reaction.emoji.name === destroyTeamEmoji).then(reactions => {
                // remove the team from the list, remove the team leader mssg and send a confirmation message
                this.teamList.get(newTeam.size()).splice(this.teamList.get(newTeam.size()).indexOf(newTeam), 1);
                leaderDM.delete();
                discordServices.sendEmbedToMember(teamLeaderUser, {
                    title: 'Team Roulette',
                    description: 'Your team has been removed from the roulette!',
                }, true);

                // remove all users from the activity and let them know
                newTeam.members.forEach(user => {
                    this.participants.delete(user.id);
                    discordServices.sendEmbedToMember(user, {
                        title: 'Team Roulette',
                        description: 'Your team with <@' + newTeam.leader + '> has been destroyed!',
                    });
                });
            })

            this.runTeamCreator(message.guild.channels);
        });
        
    }

    /**
     * Ask user if new channels are needed, if so create them, else ask for current channels to use for TR.
     * @param {Discord.TextChannel} promptChannel - channel to prompt on
     * @param {Discord.Snowflake} promptId - user's ID to prompt
     * @param {Discord.GuildChannelManager} guildChannelManager - manager to create channels
     * @async
     * @returns {Promise<Discord.TextChannel>}
     */
    async getOrCreateChannel(promptChannel, promptId, guildChannelManager) {
        let needChannel = await Prompt.yesNoPrompt('Do you need a new channel and category or have you created one already?', promptChannel, promptId);

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
            channel = await Prompt.channelPrompt('What channel would you like to use for team roulette, this channels category will be used for the new team channels.', promptChannel, promptId);
            channel.bulkDelete(100, true);
        }

        // let user know everything is good to go
        promptChannel.send('<@' + promptId + '> All set! <#' + channel.id + '>.').then(msg => msg.delete({ timeout: 10000 }));

        // add channel to black list
        discordServices.blackList.set(channel.id, 5000);
        return channel;
    }


    /**
     * Will remove the team member from the team, notify the user of success, and remove the team from the teamList
     * @param {Team} team - the team to remove user from 
     * @param {Discord.User} teamMember - the user to remove from the team
     * @param {Discord.Message} memberMsg - the message to remove if any
     * @returns {Number} - the new size of the team
     */
    removeMemberFromTeam(team, teamMember, memberMsg = null) {
        // remove the team from the list
        if (!team.isComplete()) this.teamList.get(team.size()).splice(this.teamList.get(team.size()).indexOf(team), 1);

        // remove user from team and notify
        this.participants.delete(user.id);
        let newSize = team.removeTeamMember(teamMember);
        if (memberMsg) memberMsg.delete();
        discordServices.sendEmbedToMember(teamMember, {
            title: 'Team Roulette',
            description: 'You have been removed from the team!'
        }, true);
        return newSize;
    }

    /**
     * Will try to create a team and set them up for success!
     * @param {Discord.GuildChannelManager} channelManager
     * @async
     */
    async runTeamCreator(channelManager) {
        // call the team creator
        let team = await this.findTeam();

        // if no team then just return
        if (!team) return;

        // if team does NOT have a text channel
        if (!team?.textChannel) {
            let privateChannelCategory = channelManager.resolve(discordServices.channelcreationChannel).parent;

            await team.createTextChannel(channelManager, privateChannelCategory);

            let leaveEmoji = '👋';

            const infoEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('WELCOME TO YOUR NEW TEAM!!!')
                .setDescription('This is your new team, please get to know each other by creating a voice channel in a new Discord server or via this text channel. Best of luck!')
                .addField('Leav the Team', 'If you would like to leave this team react to this message with ' + leaveEmoji);

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
     * 1 -> empy array
     * 2 -> empy array
     * 3 -> empy array
     * @private
     */
    initList() {
        this.teamList.set(1, []);
        this.teamList.set(2, []);
        this.teamList.set(3, []);
    }
}