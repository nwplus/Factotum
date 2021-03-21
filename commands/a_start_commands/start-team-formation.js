// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { Message } = require('discord.js');
const { reactionPrompt, yesNoPrompt, rolePrompt, } = require('../../classes/prompt.js');
const TeamFormation = require('../../classes/team-formation');
const Activity = require('../../classes/activities/activity');

/**
 * The team formation activity is the most basic team formation activity available. This activity works like a menu or directory of available teams and solo participants.
 * To join, a participant reacts to a message. The bot then sends instructions via DM, including a set of questions the user must respond to and send back to the bot. The responses 
 * are then sent to either a looking-for-team channel or looking-for-members channel. Other parties can then browse these channels and create teams over DMs. Members cannot send 
 * messages to these channels. 
 * There is an option for users in the activity to be notified of new posts of interest. For example, a team leader will get notified of new solo participants looking for a team.
 * When someone finds a team, they can go back to their DMs with the bot and react to a message to remove their post from the channels and stop receiving notifications of new posts.
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

        let activityRoles = await Activity.promptForRoleParticipants(channel, userId, true);

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
                botGuild: botGuild,
                activityRoles,
                isNotificationsEnabled: await yesNoPrompt({prompt: 'Do you want to notify users when the opposite party has a new post?', channel, userId}),
            });

        } catch (error) {
            console.log(error);
            message.channel.send('<@' + message.author.id + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        teamFormation.init();

        message.channel.send('<@' + userId + '> The team formation activity is ready to go! <#' + teamFormation.channels.info + '>');

        teamFormation.start();
    }
}
module.exports = StartTeamFormation;
