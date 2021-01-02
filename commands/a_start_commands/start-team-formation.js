// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Prompt = require('../../classes/prompt.js');

// Command export
module.exports = class StartTeamFormation extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'starttf',
            group: 'a_start_commands',
            memberName: 'start team formation',
            description: 'Send a message with emoji collector, one meoji for recruiters, one emoji for team searchers. Instructions will be sent via DM.',
            guildOnly: true,
        },
        {
            roleID: discordServices.staffRole,
            roleMessage: 'Hey there, the !starttf command is only for staff!',
            channelID: discordServices.teamformationChannel,
            channelMessage: 'Hey there, the !starttf command is only available in the team formation channel.',
        });
    }

    /**
     * 
     * @param {Discord.Message} message - the message in which the command was run
     */
    async runCommand(message) {

        /**
         * The looking for team emoji used for this command.
         * @type {String} - an emoji string
         */
        this.lftEmoji = '🏍️';

        /**
         * The looking for members emoji used for this command.
         * @type {String} - an emoji string
         */
        this.lfmEmoji = '🚎';

        /**
         * The role for those who are looking for a team!
         * @type {Discord.Role}
         */
        this.lookingForTeamRole;

        /**
         * The role for those who are looking for members!
         * @type {Discord.Role}
         */
        this.lookingForMembersRole;

        // create or find the two roles to be used
        let areCreated = await Prompt.yesNoPrompt('Are the team formation roles already created?', message.channel, message.author.id);

        if (areCreated) {
            let lftRoleMsg = await Prompt.messagePrompt('Please tag the looking for team role!', 'string', message.channel, message.author.id);
            this.lookingForTeamRole = lftRoleMsg.mentions.roles.first();
            let lfmRoleMsg = await Prompt.messagePrompt('Please tag the looking for members role!', 'string', message.channel, message.author.id);
            this.lookingForMembersRole = lfmRoleMsg.mentions.roles.first();
        } else {
            this.lookingForTeamRole = await message.guild.roles.create({
                data: {
                    name: 'looking for team',
                    color: discordServices.tfHackerEmbedColor,
                }
            });

            this.lookingForMembersRole = await message.guild.roles.create({
                data: {
                    name: 'looking for members',
                    color: discordServices.tfTeamEmbedColor,
                }
            });
        }

        // grab current channel
        var channel = message.channel;
                
        // create and send embed message to channel with emoji collector
        const msgEmbed = new Discord.MessageEmbed()
            .setColor(discordServices.embedColor)
            .setTitle('Team Formation Information')
            .setDescription('Welcome to the team formation section! If you are looking for a team or need a few more members to complete your ultimate group, you are in the right place!')
            .addField('How does this work?', '* Once you react to this message, I will send you a template you need to fill out and send back to me via DM. \n* Then I will post your information in recruiting or looking-for-team channel. \n* Then, other hackers, teams, or yourself can browse these channels and reach out via DM!')
            .addField('Disclaimer!!', 'By participating in this activity, you consent to let the nwPlus bot initiate a conversation between you and other teams or hackers.')
            .addField('Teams looking for new members', 'React with ' + this.lfmEmoji + ' and the bot will send you instructions.')
            .addField('Hacker looking for a team', 'React with ' + this.lftEmoji + ' and the bot will send you instructions.')
        
        var cardMessage = await channel.send(msgEmbed);
        cardMessage.react(this.lfmEmoji);
        cardMessage.react(this.lftEmoji);

        // collect form reaction collector and its filter
        const emojiFilter = (reaction, user) => !user.bot && (reaction.emoji.name === this.lftEmoji || reaction.emoji.name === this.lfmEmoji);
        var mainCollector = cardMessage.createReactionCollector(emojiFilter);

        mainCollector.on('collect', async (reaction, user) => {

            let isTeam = reaction.emoji.name === this.lfmEmoji;

            await this.reachOutToHacker(user, message.guild, isTeam);
        });
        
    }


    /**
     * send message with instructions to hacker, will also collect the form to send it to the correct channel
     * @param {Discord.User} user - the user
     * @param {Discord.Guild} guild - the message where the command was run
     * @param {Boolean} isTeam - weather or no the user is a team
     */
    async reachOutToHacker(user, guild, isTeam) {

        const dmMessage = new Discord.MessageEmbed();

        dmMessage.setTitle('Team Formation -' + (isTeam ? ' Team Format' : ' Hacker Format'))
            .setDescription('We are very excited for you to find your perfect ' + (isTeam ? 'team members.' : 'team.') + '\n* Please **copy and paste** the following format in your next message. ' +
                '\n* Try to respond to all the sections! \n* Once you are ready to submit, react to this message with 🇩 and then send me your information!\n' +
                '* Once you find a hacker, please come back and click the ⛔ emoji.')
            .addField('Format:', isTeam ? 'Team Member(s): \nTeam Background: \nObjective: \nFun Fact About Team: \nLooking For: ' : 
                                                'Name: \nSchool: \nPlace of Origin: \nSkills: \nFun Fact: ')
            .addField('READ THIS!', 'As soon as you submit your form, you will be notified of every new ' + (isTeam ? 'available hacker.' : 'available team.') + 
                                    'Once you close your form, you will stop receiving notifications!');

        // send message to hacker via DM
        let dmMsg = await user.send(dmMessage);
        dmMsg.react('🇩');  // emoji for user to send form to bot

        // guard
        let isResponding = false;
        
        // user sends form to bot collector and filter
        const dmCollector = dmMsg.createReactionCollector((reaction, user) => !user.bot && !isResponding && (reaction.emoji.name === '🇩'));

        dmCollector.on('collect', async (reaction, user) => {
            isResponding = !isResponding;
            await this.gatherForm(user, guild, dmMsg, dmCollector, isResponding, isTeam);
            // can not remove reaciton on DMs -> sad!
        });
    }


    /**
     * Grabs the form from the user and post it in the correct channel. Will also asign roles.
     * @param {Discord.User} user - the user
     * @param {Discord.Guild} guild - the original command message
     * @param {Discord.Message} dmMsg - the first DM message with instructions
     * @param {Discord.ReactionCollector} collector - the reaction collector
     * @param {Boolean} isResponging - if the user is already responding
     * @param {Boolean} isTeam - weather or not the user is a team
     */
    async gatherForm(user, guild, dmMsg, collector, isResponging, isTeam) {

        let formMsg = await Prompt.messagePrompt('Please send me your completed form, if you do not follow the form your post will be deleted! You have 10 seconds to send your information.', 
                                                    'string', user.dmChannel, user.id, 10);
        

        // check if the prompt timed out, if so, exit
        if (formMsg === false) {
            isResponging = !isResponging;
            return;
        }

        const publicEmbed = new Discord.MessageEmbed()
                .setTitle('Information about them can be found below:')
                .setDescription(formMsg.content + '\nDM me to talk -> <@' + user.id + '>')
                .setColor(isTeam ? discordServices.tfTeamEmbedColor : discordServices.tfHackerEmbedColor);

        let channel = guild.channels.cache.get(isTeam ? discordServices.recruitingChannel : discordServices.lookingforteamChannel);

        let sentMessage = await channel.send('<@&' + (isTeam ? this.lookingForTeamRole : this.lookingForMembersRole) + '>, <@' + 
                                                user.id + (isTeam ? '> and their team are looking for more team members!' : '>  is looking for a team to join!'), {embed: publicEmbed});


        // confirm the post has been received
        discordServices.sendMessageToMember(user ,isTeam ? 'Thanks for sending me your information, you should see it pop up in the respective channel under the team formation category.' +
            'Once you find your members please react to my original message with ⛔ so I can remove your post. Happy hacking!!!' : 
            'Thanks for sending me your information, you should see it pop up in the respective channel under the team formation category.' +
            'Once you find your ideal team please react to my original message with ⛔ so I can remove your post. Happy hacking!!!', true);

        // stop the first collector to add a new one for removal
        collector.stop();
        isResponging = !isResponging;

        // add role to the user
        discordServices.addRoleToMember(guild.member(user), isTeam ? this.lookingForMembersRole : this.lookingForTeamRole);


        // add remove form emoji and collector
        dmMsg.react('⛔');

        const removeFilter = (reaction, user) => reaction.emoji.name === '⛔' && !user.bot;
        const removeCollector = dmMsg.createReactionCollector(removeFilter, { max: 1 });

        removeCollector.on('collect', async (reac, user) => {
            // remove message sent to channel
            discordServices.deleteMessage(sentMessage);

            // confirm deletion
            discordServices.sendMessageToMember(user, 'This is great! You are now ready to hack! Have fun with your new team! Your message has been deleted.', true);

            discordServices.removeRolToMember(guild.member(user), isTeam ? this.lookingForMembersRole : this.lookingForTeamRole);

            // remove this message
            dmMsg.delete();
        });
    }
}