// Discord.js commando requirements
const PermissionCommand = require('../../classes/permission-command');
const discordServices = require('../../discord-services');
const Discord = require('discord.js');

// Command export
module.exports = class RoleSelector extends PermissionCommand {
    constructor(client) {
        super(client, {
            name: 'pronouns',
            group: 'a_utility',
            memberName: 'pronoun role',
            description: 'Set up pronouns reaction role message.',
            guildOnly: true,
        },
        {
            roleID: PermissionCommand.FLAGS.STAFF_ROLE,
            roleMessage: 'Hey there, the command !pronouns is only available to staff!',
        });
    }

    /**
     * 
     * @param {Discord.Message} message - the command message
     */
    async runCommand(botGuild, message) {
        const sheRole = message.guild.roles.cache.find(role => role.name === 'she/her');
        const heRole = message.guild.roles.cache.find(role => role.name === 'he/him');
        const theyRole = message.guild.roles.cache.find(role => role.name === 'they/them');
        const otherRole = message.guild.roles.cache.find(role => role.name === 'other pronouns');

        var emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

        let embed = new Discord.MessageEmbed()
            .setColor('#0DEFE1')
            .setTitle('Set your pronouns by reacting to one of the emojis!')
            .setDescription(
                `${emojis[0]} she/her\n`
                + `${emojis[1]} he/him\n`
                + `${emojis[2]} they/them\n`
                + `${emojis[3]} other pronouns\n`);

        let messageEmbed = await message.channel.send(embed);
        emojis.forEach(emoji => messageEmbed.react(emoji));

        // create collector
        const reactionCollector = await messageEmbed.createReactionCollector((reaction, user) => user.bot != true && emojis.includes(reaction.emoji.name), {dispose: true});

        // on emoji reaction
        reactionCollector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name === emojis[0]) {
                await discordServices.addRoleToMember(message.guild.member(user), sheRole);
            } if (reaction.emoji.name === emojis[1]) {
                await discordServices.addRoleToMember(message.guild.member(user), heRole);
            } if (reaction.emoji.name === emojis[2]) {
                await discordServices.addRoleToMember(message.guild.member(user), theyRole);
            } if (reaction.emoji.name === emojis[3]) {
                await discordServices.addRoleToMember(message.guild.member(user), otherRole);
            }
        });

        reactionCollector.on('remove', async (reaction, user) => {
            if (reaction.emoji.name === emojis[0]) {
                await discordServices.removeRolToMember(message.guild.member(user), sheRole);
            } if (reaction.emoji.name === emojis[1]) {
                await discordServices.removeRolToMember(message.guild.member(user), heRole);
            } if (reaction.emoji.name === emojis[2]) {
                await discordServices.removeRolToMember(message.guild.member(user), theyRole);
            } if (reaction.emoji.name === emojis[3]) {
                await discordServices.removeRolToMember(message.guild.member(user), otherRole);
            }
        });

    }

};