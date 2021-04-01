// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { Message } = require('discord.js');
const TeamFormation = require('../../classes/team-formation');
const Activity = require('../../classes/activities/activity');
const { sendMsgToChannel } = require('../../discord-services');
const { StringPrompt, SpecialPrompt, RolePrompt } = require('advanced-discord.js-prompts');

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
                    emoji: await SpecialPrompt.singleEmoji({prompt: 'What emoji do you want to use for teams to sign up?', channel, userId}),
                    role: (await SpecialPrompt.boolean({prompt: 'Have you created the role teams will get when they sign up? If not its okay, I will create it for you!', channel, userId})) ? 
                        await RolePrompt.single({prompt: 'What role should team users get?', channel, userId}) :
                        await TeamFormation.createTeamRole(message.guild.roles),
                    form: (await SpecialPrompt.boolean({ prompt: `Would you like to use the default form?: ${TeamFormation.defaultTeamForm}\n else you create your own!`, channel, userId})) ? 
                        TeamFormation.defaultTeamForm : await StringPrompt.single({ prompt: 'Please send your form for teams now:', channel, userId }),
                },
                prospectInfo: {
                    emoji: await SpecialPrompt.singleEmoji({prompt: 'What emoji do you want to use for prospects to sign up?', channel, userId}),
                    role: (await SpecialPrompt.boolean({prompt: 'Have you created the role prospects will get when they sign up? Worry not if you don\'t I can create it for you!', channel, userId})) ? 
                        await RolePrompt.single({prompt: 'What role should prospects get?', channel, userId}) : 
                        await TeamFormation.createProspectRole(message.guild.roles),
                    form: (await SpecialPrompt.boolean({ prompt: `Would you like to use the default form?: ${TeamFormation.defaultProspectForm}\n else you create your own!`, channel, userId})) ? 
                        TeamFormation.defaultProspectForm : await StringPrompt.single({ prompt: 'Please send your form for teams now:', channel, userId }),
                },
                guild: message.guild,
                botGuild: botGuild,
                activityRoles,
                isNotificationsEnabled: await SpecialPrompt.boolean({prompt: 'Do you want to notify users when the opposite party has a new post?', channel, userId}),
            });

        } catch (error) {
            console.log(error);
            message.channel.send('<@' + message.author.id + '> Command was canceled due to prompt being canceled.').then(msg => msg.delete({timeout: 5000}));
            return;
        }

        await teamFormation.init();

        sendMsgToChannel(message.channel, userId, `The team formation activity is ready to go! <#${teamFormation.channels.info.id}>`, 10);

        await teamFormation.start();
    }
}
module.exports = StartTeamFormation;
