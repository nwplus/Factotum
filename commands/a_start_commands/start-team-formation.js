// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { Message } = require('discord.js');
const { reactionPrompt, yesNoPrompt, rolePrompt, } = require('../../classes/prompt.js');
const TeamFormation = require('../../classes/team-formation');

/**
 * The start team formation command starts the team formation activity. 
 * @category Commands
 * @subcategory Start-Commands
 * @extends PermissionCommand
 * @guildonly
 */
class StartTeamFormation extends PermissionCommand {
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
     * @param {Message} message - the message in which the command was run
     */
    async runCommand(botGuild, message) {
        // helpful prompt vars
        let channel = message.channel;
        let userId = message.author.id;

        try {
            
            var teamFormation = new TeamFormation({
                teamInfo: {
                    emoji: await reactionPrompt({prompt: 'What emoji do you want to use for teams to sign up?', channel, userId}),
                    role: (await yesNoPrompt({prompt: 'Have you created the role teams will get when they sign up? If not its okay, I will create it for you!', channel, userId})) ? 
                        (await rolePrompt({prompt: 'What role should team users get?', channel, userId})).first() :
                        await TeamFormation.createTeamRole(message.guild.roles),
                },
                prospectInfo: {
                    emoji: await reactionPrompt({prompt: 'What emoji do you want to use for prospects to sign up?', channel, userId}),
                    role: (await yesNoPrompt({prompt: 'Have you created the role prospects will get when they sign up? Worry not if you don\'t I can create it for you!', channel, userId})) ? 
                        (await rolePrompt({prompt: 'What role should prospects get?', channel, userId})).first() : 
                        await TeamFormation.createProspectRole(message.guild.roles),
                },
                guild: message.guild,
                channels: await TeamFormation.createChannels(message.guild.channels),
                isNotificationsEnabled: await yesNoPrompt({prompt: 'Do you want to notify users when the opposite party has a new post?', channel, userId}),
            });

        } catch (error) {
            console.log(error);
            message.channel.send('<@' + message.author.id + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        message.channel.send('<@' + userId + '> The team formation activity is ready to go! <#' + teamFormation.channels.info + '>');

        teamFormation.start();
    }
}
module.exports = StartTeamFormation;
