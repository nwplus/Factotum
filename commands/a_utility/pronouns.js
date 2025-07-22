const { Command } = require("@sapphire/framework");
const {
  Interaction,
  MessageEmbed,
  PermissionFlagsBits,
  Guild,
  Message,
  MessageManager,
} = require("discord.js");
const firebaseUtil = require("../../db/firebase/firebaseUtil");

const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

/**
 * The pronouns command sends a role reaction console for users to select a pronoun role out of 4 options:
 * * she/her
 * * he/him
 * * they/them
 * * other pronouns
 * @category Commands
 * @subcategory Admin-Utility
 * @extends Command
 */
class Pronouns extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      description: "Start pronoun selector.",
    });
  }

  /**
   *
   * @param {Command.Registry} registry
   */
  registerApplicationCommands(registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName(this.name).setDescription(this.description),
      {
        idHints: "1051737347441569813",
      },
    );
  }

  /**
   *
   * @param {Interaction} interaction
   */
  async chatInputRun(interaction) {
    const guild = interaction.guild;
    this.initBotInfo = await firebaseUtil.getInitBotInfo(guild.id);
    const userId = interaction.user.id;
    if (
      !guild.members.cache
        .get(userId)
        .roles.cache.has(this.initBotInfo.roleIDs.staffRole) &&
      !guild.members.cache
        .get(userId)
        .roles.cache.has(this.initBotInfo.roleIDs.adminRole)
    ) {
      interaction.reply({
        content: "You do not have permissions to run this command!",
        ephemeral: true,
      });
      return;
    }

    const { sheRole, heRole, theyRole, otherRole } =
      await getPronounRoles(guild);

    // check to make sure all 4 roles are available
    if (!sheRole || !heRole || !theyRole || !otherRole) {
      interaction.reply(
        "Could not find all four roles! Make sure the role names are exactly like stated on the documentation.",
      );
      return;
    }

    let embed = new MessageEmbed()
      .setColor("#0DEFE1")
      .setTitle("Set your pronouns by reacting to one or more of the emojis!")
      .setDescription(
        `${emojis[0]} she/her\n` +
          `${emojis[1]} he/him\n` +
          `${emojis[2]} they/them\n` +
          `${emojis[3]} other pronouns\n`,
      );

    let messageEmbed = await interaction.channel.send({ embeds: [embed] });
    emojis.forEach((emoji) => messageEmbed.react(emoji));
    interaction.reply({
      content: "Pronouns selector started!",
      ephemeral: true,
    });

    listenToReactions(guild, messageEmbed);

    const savedMessagesCol = firebaseUtil.getSavedMessagesSubCol(guild.id);
    await savedMessagesCol.doc("pronouns").set({
      messageId: messageEmbed.id,
      channelId: messageEmbed.channel.id,
    });
  }

  /**
   * Checks Firebase for an existing stored reaction listener -
   * restores the listeners for the reaction if it exists, otherwise does nothing
   * @param {Guild} guild
   */
  async tryRestoreReactionListeners(guild) {
    const savedMessagesSubCol = firebaseUtil.getSavedMessagesSubCol(guild.id);
    const pronounDoc = await savedMessagesSubCol.doc("pronouns").get();
    if (pronounDoc.exists) {
      const { messageId, channelId } = pronounDoc.data();
      const channel = await this.container.client.channels.fetch(channelId);
      if (channel) {
        try {
          /** @type {Message} */
          const message = await channel.messages.fetch(messageId);
          listenToReactions(guild, message);
        } catch (e) {
          // message doesn't exist anymore
          return e;
        }
      } else {
        return "Saved message channel does not exist";
      }
    } else {
      return "No existing saved message for pronouns command";
    }
  }
}

/**
 *
 * @param {Guild} guild
 */
async function getPronounRoles(guild) {
  const sheRole =
    guild.roles.cache.find((role) => role.name === "she/her") ||
    (await createRole(guild, "she/her", "#99AAB5"));
  const heRole =
    guild.roles.cache.find((role) => role.name === "he/him") ||
    (await createRole(guild, "he/him", "#99AAB5"));
  const theyRole =
    guild.roles.cache.find((role) => role.name === "they/them") ||
    (await createRole(guild, "they/them", "#99AAB5"));
  const otherRole =
    guild.roles.cache.find((role) => role.name === "other pronouns") ||
    (await createRole(guild, "other pronouns", "#99AAB5"));
  return { sheRole, heRole, theyRole, otherRole };
}

/**
 * Creates a role in the guild with the specified name and color.
 * @param {Guild} guild
 * @param {string} name
 * @param {string} color
 */
async function createRole(guild, name, color) {
  try {
    const role = await guild.roles.create({
      name: name,
      color: color,
      reason: `Creating ${name} role for pronoun selector`,
    });
    return role;
  } catch (error) {
    console.error(`Failed to create role ${name}:`, error);
    throw new Error(`Could not create role ${name}`);
  }
}

/**
 * Adds reaction listeners to a message to add/remove pronoun rules from users upon reacting
 * @param {Guild} guild
 * @param {Message} message
 */
async function listenToReactions(guild, message) {
  const { sheRole, heRole, theyRole, otherRole } = await getPronounRoles(guild);

  let filter = (reaction, user) => {
    return user.bot != true && emojis.includes(reaction.emoji.name);
  };

  // create collector
  const reactionCollector = message.createReactionCollector({
    filter,
    dispose: true,
  });

  // on emoji reaction
  reactionCollector.on("collect", async (reaction, user) => {
    if (reaction.emoji.name === emojis[0]) {
      const member = guild.members.cache.get(user.id);
      await member.roles.add(sheRole);
    }
    if (reaction.emoji.name === emojis[1]) {
      const member = guild.members.cache.get(user.id);
      await member.roles.add(heRole);
    }
    if (reaction.emoji.name === emojis[2]) {
      const member = guild.members.cache.get(user.id);
      await member.roles.add(theyRole);
    }
    if (reaction.emoji.name === emojis[3]) {
      const member = guild.members.cache.get(user.id);
      await member.roles.add(otherRole);
    }
  });

  reactionCollector.on("remove", async (reaction, user) => {
    if (reaction.emoji.name === emojis[0]) {
      const member = guild.members.cache.get(user.id);
      await member.roles.remove(sheRole);
    }
    if (reaction.emoji.name === emojis[1]) {
      const member = guild.members.cache.get(user.id);
      await member.roles.remove(heRole);
    }
    if (reaction.emoji.name === emojis[2]) {
      const member = guild.members.cache.get(user.id);
      await member.roles.remove(theyRole);
    }
    if (reaction.emoji.name === emojis[3]) {
      const member = guild.members.cache.get(user.id);
      await member.roles.remove(otherRole);
    }
  });
}

module.exports = Pronouns;
