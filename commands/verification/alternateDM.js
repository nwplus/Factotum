// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const { sendEmbedToMember } = require('../../discord-services');
const { Message } = require('discord.js');
const { messagePrompt } = require('../../classes/prompt');
const Verification = require('../../classes/verification');
const BotGuildModel = require('../../classes/bot-guild');

// Command export
module.exports = class AlternateDM extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'alternate-dm',
            group: 'verification',
            memberName: 'welcome channel verification activation',
            description: 'send another dm for verification',
            guildOnly: true,
        },
            {
                role: PermissionCommand.FLAGS.STAFF_ROLE,
                roleMessage: 'Hey there, the !manual-verify command is only for staff!',
            });
    }

    /**
     * @param {BotGuildModel} botGuild
     * @param {Message} message 
     */
    async runCommand(botGuild, message) {
        var embed = new Discord.MessageEmbed()
            .setTitle(`If the bot does not respond when you click on the clover emoji in your DM, react to this message with any emoji to verify!`)
        let embedMsg = await message.channel.send(embed);
        embedMsg.react('🍀');
        embedMsg.createReactionCollector((reaction, user) => !user.bot);
        verifyCollector.on('collect', async (reaction, user) => {
            let member = message.guild.members.cache.get(user.id);
            try {
                var email = (await messagePrompt({prompt: 'Thanks for joining cmd-f 2021! What email did you get accepted with? Please send it now!', channel: member.user.dmChannel, userId: member.id}, 'string', 30)).content;
            } catch (error) {
                sendEmbedToMember(member, {
                    title: 'Verification Error',
                    description: 'Email was not provided, please try again!'
                }, true);
                return;
            }

            try {
                await Verification.verify(member, email, member.guild, botGuild);
            } catch (error) {
                sendEmbedToMember(member, {
                    title: 'Verification Error',
                    description: 'Email provided is not valid! Please try again.'
                }, true);
            }
        });
    }
}