const { Command } = require('@sapphire/framework');
const { Interaction, MessageEmbed, PermissionFlagsBits } = require('discord.js');
const BotGuild = require('../../db/mongo/BotGuild');

/**
 * The pronouns command sends a role reaction console for users to select a pronoun role out of 4 options:
 * * she/her
 * * he/him
 * * they/them
 * * she/they
 * * he/they
 * * other pronouns
 * The roles must be already created on the server for this to work.
 * @category Commands
 * @subcategory Admin-Utility
 * @extends Command
 */
class Pronouns extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Start pronoun selector.'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
        ),
        {
            idHints: '1051737347441569813'
        };
    }

    /**
     * 
     * @param {Interaction} interaction
     */
    async chatInputRun(interaction) {
        const guild = interaction.guild;
        this.botGuild = await BotGuild.findById(guild.id);
        const userId = interaction.user.id;
        if (!guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.staffRole) && !guild.members.cache.get(userId).roles.cache.has(this.botGuild.roleIDs.adminRole)) {
            interaction.reply({ content: 'You do not have permissions to run this command!', ephemeral: true });
            return;
        }
        const sheRole = interaction.guild.roles.cache.find(role => role.name === 'she/her');
        const heRole = interaction.guild.roles.cache.find(role => role.name === 'he/him');
        const theyRole = interaction.guild.roles.cache.find(role => role.name === 'they/them');
        const sheTheyRole = interaction.guild.roles.cache.find(role => role.name === 'she/they');
        const heTheyRole = interaction.guild.roles.cache.find(role => role.name === 'he/they');
        const otherRole = interaction.guild.roles.cache.find(role => role.name === 'other pronouns');

        // check to make sure all 4 roles are available
        if (!sheRole || !heRole || !theyRole || !sheTheyRole || !heTheyRole || !otherRole) {
            interaction.reply('Could not find all four roles! Make sure the role names are exactly like stated on the documentation.');
            return;
        }

        var emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

        let embed = new MessageEmbed()
            .setColor('#0DEFE1')
            .setTitle('Set your pronouns by reacting to one of the emojis!')
            .setDescription(
                `${emojis[0]} she/her\n`
                + `${emojis[1]} he/him\n`
                + `${emojis[2]} they/them\n`
                + `${emojis[3]} she/they\n`
                + `${emojis[4]} he/they\n`
                + `${emojis[5]} other pronouns\n`);

        let messageEmbed = await interaction.channel.send({embeds: [embed]});
        emojis.forEach(emoji => messageEmbed.react(emoji));
        interaction.reply({content: 'Pronouns selector started!', ephemeral: true});

        let filter = (reaction, user) => {
            return user.bot != true && emojis.includes(reaction.emoji.name);
        };

        // create collector
        const reactionCollector = messageEmbed.createReactionCollector({filter, dispose: true});

        // on emoji reaction
        reactionCollector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name === emojis[0]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.add(sheRole);
            } if (reaction.emoji.name === emojis[1]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.add(heRole);
            } if (reaction.emoji.name === emojis[2]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.add(theyRole);
            } if (reaction.emoji.name === emojis[3]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.add(sheTheyRole);
            } if (reaction.emoji.name === emojis[4]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.add(heTheyRole);
            } if (reaction.emoji.name === emojis[5]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.add(otherRole);
            }
        });

        reactionCollector.on('remove', async (reaction, user) => {
            if (reaction.emoji.name === emojis[0]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.remove(sheRole);
            } if (reaction.emoji.name === emojis[1]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.remove(heRole);
            } if (reaction.emoji.name === emojis[2]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.remove(theyRole);
            } if (reaction.emoji.name === emojis[3]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.remove(sheTheyRole);
            } if (reaction.emoji.name === emojis[4]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.remove(heTheyRole);
            } if (reaction.emoji.name === emojis[5]) {
                const member = interaction.guild.members.cache.get(user.id);
                await member.roles.remove(otherRole);
            }
        });

    }
}
module.exports = Pronouns;
