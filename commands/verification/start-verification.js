const PermissionCommand = require('../../classes/permission-command');
const { sendEmbedToMember } = require('../../discord-services');
const { Message, MessageEmbed } = require('discord.js');
const Verification = require('../../classes/verification');
const BotGuildModel = require('../../classes/bot-guild');
const { StringPrompt } = require('advanced-discord.js-prompts');

/**
 * Sends an embed with reaction collector for users to re-verify
 * via DMs with the bot from inside the server.
 * @category Commands
 * @subcategory Verification
 * @extends PermissionCommand
 * @guildonly
 */
class StartVerification extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'start-verification',
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
        var embed = new MessageEmbed()
            .setTitle('If the bot does not respond when you click on the clover emoji in your DM, react to this message with any emoji to verify!');
        let embedMsg = await message.channel.send(embed);
        embedMsg.react('🍀');

        const verifyCollector = embedMsg.createReactionCollector((reaction, user) => !user.bot);
        verifyCollector.on('collect', async (reaction, user) => {
            let member = message.guild.members.cache.get(user.id);

            try {
                var email = await StringPrompt.single({prompt: `Thanks for joining ${message.guild.name}! What email did you get accepted with? Please send it now!`, channel: (await member.user.createDM()), userId: member.id, time: 45});
            } catch (error) {
                sendEmbedToMember(member, {
                    title: 'Verification Error',
                    description: 'Email was not provided, please try again by reacting to the emoji again.!'
                }, true);
                return;
            }

            try {
                await Verification.verify(member, email, member.guild, botGuild);
            } catch (error) {
                sendEmbedToMember(member, {
                    title: 'Verification Error',
                    description: 'Email provided is not valid! Please try again by reacting to the emoji again.'
                }, true);
            }
        });
    }
}
module.exports = StartVerification;