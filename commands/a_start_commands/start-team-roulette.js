// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Prompt = require('../../classes/prompt.js');

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
            roleMessage: 'Hey there, the !starttf command is only for staff!',
            channelID: discordServices.teamRouletteChannel,
            channelMessage: 'Hey there, the !starttf command is only available in the team formation channel.',
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
         * The group list from which to create teams.
         * @type {Discord.Collection<Number, Array<Array<String>>>} - <Group Size, list of user's IDs>
         */
        this.groupList = new Discord.Collection();

        /**
         * The current group number.
         * @type {Number}
         */
        this.teamNumber = 0;

        /**
         * All the users that have participated in the activity.
         * @type {Discord.Collection<Discord.Snowflake, User>}
         */
        this.participants = new Discord.Collection();

        this.initList();

        // grab current channel
        var channel = message.channel;
                
        // create and send embed message to channel with emoji collector
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Team Roulette Information')
            .setDescription('Welcome to the team rulette section! If you are looking to join a random team, you are in the right place!')
            .addField('How does this work?', 'Reacting to this message will get you or your group on a list. I will try to assing you a team of 4 as fast as possible. When I do I will notify you on a private text channel with your new team!')
            .addField('Disclaimer!!', 'By participating in this activity, you will be assigned a random team with random hackers! You can only use this activity once!')
            .addField('If you are solo', 'React with ' + this.soloEmoji + ' and I will send you instructions.')
            .addField('If you are in a group of two or three', 'React with ' + this.teamEmoji + ' and I will send you instructions.');
        
        var cardMessage = await channel.send(msgEmbed);
        cardMessage.react(this.soloEmoji);
        cardMessage.react(this.teamEmoji);

        // collect form reaction collector and its filter
        const emojiFilter = (reaction, user) => !user.bot && (reaction.emoji.name === this.soloEmoji || reaction.emoji.name === this.teamEmoji);
        var mainCollector = cardMessage.createReactionCollector(emojiFilter);

        mainCollector.on('collect', async (reaction, user) => {
            // creator check
            if (this.participants.has(user.id)) {
                discordServices.sendEmbedToMember(user, {
                    title: 'Team Roulette',
                    description: 'You are already signed up on the team roulette activity!',
                }, true);
                return;
            }

            if (reaction.emoji.name === this.soloEmoji) {
                // solo user
                this.groupList.get(1).push([user.id]);
                
            } else {
                let groupMsg = await Prompt.messagePrompt('Please mention all your current group members in one message. You mention by typing @friendName .', 'string', message.channel, user.id, 15);

                if (groupMsg === null) {
                    reaction.users.remove(user.id);
                    return;
                }

                let groupMembers = groupMsg.mentions.users;

                // remove any self mentions
                groupMembers.delete(user.id);

                // check if they have more than 4 group members
                if (groupMembers.array().length > 2) {
                    discordServices.sendEmbedToMember(user, {
                        title: 'Team Roulette',
                        description: 'You just tried to use the team roulette, but you mentioned more than 2 members. That should mean you have a group of 4 already! If you mentioned yourself by accident, try again!',
                    }, true);
                    return;
                }

                // list of all team members
                let list = [];

                // delete any mentions of users already in the activity.
                groupMembers.forEach((sr, index) => {
                    if (this.participants.has(sr.id)) {
                        groupMembers.delete(sr.id);
                        discordServices.sendEmbedToMember(user, {
                            title: 'Team Roulette',
                            description: 'We had to remove ' + sr.username + ' from your team roulette group because he already participated in the roulette.',
                        }, true);
                    } else {
                        // push member to the team list and activity list
                        list.push(sr.id);
                        this.participants.set(sr.id, sr);

                        discordServices.sendEmbedToMember(sr, {
                            title: 'Team Roulette',
                            description: 'You have been added to ' + user.username + ' team roulette group! I will ping you as soon as I find a team for all of you!',
                            color: '#57f542',
                        });
                    }
                });
                
                // team leader joins list and add list to collection
                list.push(user.id);
                this.groupList.get(list.length).push(list);
            }

            // add team leader or solo to activity list and notify of success
            this.participants.set(user.id, user);
            discordServices.sendEmbedToMember(user, {
                title: 'Team Roulette',
                description: 'You' + (reaction.emoji.name != this.soloEmoji ? ' and your team' : '') + ' have been added to the roulette. I will get back to you as soon as I have a team for you!',
                color: '#57f542',
            }, true);

            // call the team creator
            let group = this.runTeamCreator();

            // if no group then just return
            if (group === null) return;

        // create the text channel and invite all the users
            let privateChannelCategory = message.guild.channels.resolve(discordServices.channelcreationChannel).parent;

            let groupTextChannel = await message.guild.channels.create('Team ' + this.teamNumber, {
                type: 'text',
                topic: 'Welcome to your new team, good luck!',
                parent: privateChannelCategory,
            });
            this.teamNumber ++;
            let usersMentions = '';

            group.forEach(userID => {
                usersMentions += '<@' + userID + '>';
                groupTextChannel.createOverwrite(userID, {
                    'VIEW_CHANNEL' : true,
                    'SEND_MESSAGES' : true,
                });
            });

            let leaveEmoji = '👋';

            const infoEmbed = new Discord.MessageEmbed()
                .setColor(discordServices.embedColor)
                .setTitle('WELCOME TO YOUR NEW TEAM!!!')
                .setDescription('This is your new team, please get to know each other by creating a voice channel in a new Discord server or via this text channel. Best of luck!')
                .addField('Leav the Team', 'If you would like to leave this team react to this message with ' + leaveEmoji);

            let teamCard = await groupTextChannel.send(usersMentions, {embed: infoEmbed});

            let teamCardCollection = teamCard.createReactionCollector((reaction, user) => !user.bot && reaction.emoji.name === leaveEmoji);

            teamCardCollection.on('collect', (reaction, exitUser) => {
                // remove user from channel
                groupTextChannel.createOverwrite(exitUser.id, {
                    VIEW_CHANNEL: false,
                    SEND_MESSAGES: false,
                });

                // reduce team size
                

                // remove user from activity list

                // search for more members depending on new team size
            });
        });
        
    }


    /**
     * Will try to create teams with the current groups signed up!
     * @param {Number} groupSize - the size of the new group
     * @private
     * @returns {Array<String> | null}
     */
    runTeamCreator(groupSize) {
        let newGroup = [];

        if (groupSize === 3) newGroup = this.assignGroupOf3();
        else if (groupSize === 2) newGroup = this.assignGroupOf2();
        else {
            if (this.groupList.get(3).length >=1) newGroup = this.assignGroupOf3();
            else if (this.groupList.get(2).length >= 1) newGroup = this.assignGroupOf2();
            else newGroup = this.assignGroupsOf1();
        }
        return newGroup;
    }


    /**
     * Will assign a group of 3 with a group of 1.
     * @returns {Array<String> | null}
     * @requires this.groupList to have a group of 3.
     */
    assignGroupOf3() {
        let listOf1 = this.groupList.get(1);
        if (listOf1.length === 0) return null;
        let groupOf3 = this.groupList.get(3).shift();
        return groupOf3.concat(listOf1.shift());
    }

    /**
     * Will assign a group of 2 with a group of 2 or two of 1
     * @returns {Array<String> | null}
     * @requires this.groupList to have a group of 2
     */
    assignGroupOf2() {
        let listOf2 = this.groupList.get(2);
        if (listOf2.length >= 2) {
            return listOf2.shift().concat(listOf2.shift());
        } else {
            let listOf1 = this.groupList.get(1);
            if (listOf1.length <= 1) return null;
            return listOf2.shift().concat(listOf1.shift()).concat(listOf1.shift());
        }
    }

    /**
     * Assigns 4 groups of 1 together.
     * @returns {Array<String> | null}
     */
    assignGroupsOf1() {
        let groupOf1 = this.groupList.get(1);
        if (groupOf1.length < 4) return null;
        else return groupOf1.shift().concat(groupOf1.shift()).concat(groupOf1.shift()).concat(groupOf1.shift());
    }


    /**
     * Initializes the group list by creating three key value pairs.
     * 1 -> empy array
     * 2 -> empy array
     * 3 -> empy array
     * @private
     */
    initList() {
        this.groupList.set(1, []);
        this.groupList.set(2, []);
        this.groupList.set(3, []);
    }
}