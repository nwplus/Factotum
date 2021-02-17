// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');
const Prompt = require('../../classes/prompt.js');
const TeamFormation = require('../../classes/team-formation');

// Command export
module.exports = class StartTeamFormation extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'start-team-formation',
            group: 'a_start_commands',
            memberName: 'start team formation',
            description: 'Send a message with emoji collector, one emoji for recruiters, one emoji for team searchers. Instructions will be sent via DM.',
            guildOnly: true,
        },
        {
            role: PermissionCommand.FLAGS.ADMIN_ROLE,
            roleMessage: 'Hey there, the !start-team-formation command is only for admins!',
            channel: PermissionCommand.FLAGS.ADMIN_CONSOLE,
            channelMessage: 'Hey there, the !start-team-formation command is only available in the admin console.',
        });
    }

    /**
     * 
     * @param {Discord.Message} message - the message in which the command was run
     */
    async runCommand(message) {

        let channel = message.channel;
        let userID = message.author.id;

        try {
            
            var teamFormation = new TeamFormation({
                teamInfo: {
                    emoji: await Prompt.reactionPrompt('What emoji do you want to use for teams to sign up?', channel, userID),
                    role: (await Prompt.yesNoPrompt('Have you created the role teams will get when they sign up? If not its okay, I will create it for you!', channel, userID)) ? 
                        (await Prompt.rolePrompt('What role should team users get?', channel, userID)).first() :
                        await TeamFormation.createTeamRole(message.guild.roles),
                },
                prospectInfo: {
                    emoji: await Prompt.reactionPrompt('What emoji do you want to use for prospects to sign up?', channel, userID),
                    role: (await Prompt.yesNoPrompt('Have you created the role prospects will get when they sign up? Worry not if you don\'t I can create it for you!', channel, userID)) ? 
                        (await Prompt.rolePrompt('What role should prospects get?', channel, userID)).first() : 
                        await TeamFormation.createProspectRole(message.guild.roles),
                },
                guild: message.guild,
                channels: await TeamFormation.createChannels(message.guild.channels),
                isNotificationsEnabled: await Prompt.yesNoPrompt('Do you want to notify users when the opposite party has a new post?', channel, userID),
            });

        } catch (error) {
            console.log(error);
            message.channel.send('<@' + message.author.id + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        message.channel.send('<@' + userID + '> The team formation activity is ready to go! <#' + teamFormation.channels.info + '>');

        teamFormation.start();
    }
}