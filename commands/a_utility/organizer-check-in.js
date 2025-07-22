const { Command } = require("@sapphire/framework");
const {
  Interaction,
  MessageEmbed,
  Guild,
  Message,
  MessageActionRow,
  MessageButton,
} = require("discord.js");
const firebaseUtil = require("../../db/firebase/firebaseUtil");

/**
 * The organizer-check-in command lets organizers check in/out for attendance. It uses the organizerAttendance
 * field in the InitBotInfo document to store the list of organizers present. organizerAttendance is a map of
 * organizer username to organizer display name.
 * @category Commands
 * @subcategory Admin-Utility
 * @extends Command
 */
class OrganizerCheckIn extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      description: "Let organizers check in/out for attendance.",
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
        idHints: "1344923545154617357",
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

    const row = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId("check-in")
          .setLabel("Check In")
          .setStyle("PRIMARY"),
      )
      .addComponents(
        new MessageButton()
          .setCustomId("check-out")
          .setLabel("Check Out")
          .setStyle("PRIMARY"),
      );

    const embed = generateAttendanceEmbed(this.initBotInfo);
    let checkInPanel = await interaction.channel.send({
      content: "Make sure to check in/out when you enter and leave the venue!",
      components: [row],
      embeds: [embed],
    });
    interaction.reply({
      content: "Organizer check-in started!",
      ephemeral: true,
    });

    await listenToReactions(guild, checkInPanel);

    const savedMessagesCol = firebaseUtil.getSavedMessagesSubCol(guild.id);
    await savedMessagesCol.doc("organizer-check-in").set({
      messageId: checkInPanel.id,
      channelId: checkInPanel.channel.id,
    });
  }

  /**
   * Checks Firebase for an existing stored panel listener -
   * restores the listeners for the panel if it exists, otherwise does nothing
   * @param {Guild} guild
   */
  async tryRestoreReactionListeners(guild) {
    const savedMessagesSubCol = firebaseUtil.getSavedMessagesSubCol(guild.id);
    const organizerCheckInDoc = await savedMessagesSubCol
      .doc("organizer-check-in")
      .get();
    if (organizerCheckInDoc.exists) {
      const { messageId, channelId } = organizerCheckInDoc.data();
      const channel = await this.container.client.channels.fetch(channelId);
      if (channel) {
        try {
          const initBotInfo = await firebaseUtil.getInitBotInfo(guild.id);

          /** @type {Message} */
          const message = await channel.messages.fetch(messageId);
          const updatedEmbed = generateAttendanceEmbed(initBotInfo);
          await message.edit({ embeds: [updatedEmbed] });
          await listenToReactions(guild, message);
        } catch (e) {
          // message doesn't exist anymore
          return e;
        }
      } else {
        return "Saved message channel does not exist";
      }
    } else {
      return "No existing saved message for organizer check-in command";
    }
  }
}

/**
 * Generates an embed with the current list of organizers present
 * @param {FirebaseFirestore.DocumentData | null | undefined} initBotInfo
 * @returns {MessageEmbed}
 */
function generateAttendanceEmbed(initBotInfo) {
  /** @type {string[]} */
  const organizerAttendance = Object.values(
    initBotInfo.organizerAttendance ?? {},
  );
  organizerAttendance.sort();
  const formattedMessage = organizerAttendance
    .map((organizer) => `- ${organizer}`)
    .join("\n");

  const embed = new MessageEmbed()
    .setColor("#0DEFE1")
    .setTitle("Organizers Present")
    .setDescription(formattedMessage);
  return embed;
}

/**
 * Adds button listeners to a message to check in/out for organizer attendance
 * @param {Guild} guild
 * @param {Message} message
 */
async function listenToReactions(guild, message) {
  const initBotInfo = await firebaseUtil.getInitBotInfo(guild.id);

  const filter = (i) =>
    !i.user.bot &&
    (guild.members.cache
      .get(i.user.id)
      .roles.cache.has(initBotInfo.roleIDs.staffRole) ||
      guild.members.cache
        .get(i.user.id)
        .roles.cache.has(initBotInfo.roleIDs.adminRole));

  // create collector
  const collector = message.createMessageComponentCollector({ filter });
  collector.on("collect", async (i) => {
    const newInitBotInfo = await firebaseUtil.getInitBotInfo(guild.id);
    if (!newInitBotInfo.organizerAttendance)
      newInitBotInfo.organizerAttendance = {};

    const user = guild.members.cache.get(i.user.id);
    if (i.customId == "check-in") {
      newInitBotInfo.organizerAttendance[user.user.username] = user.displayName;
      await i.reply({
        content: `Checked in ${user.displayName}`,
        ephemeral: true,
      });
    } else if (i.customId == "check-out") {
      delete newInitBotInfo.organizerAttendance[user.user.username];
      await i.reply({
        content: `Checked out ${user.displayName}`,
        ephemeral: true,
      });
    }
    await firebaseUtil.updateOrganizerAttendance(
      guild.id,
      newInitBotInfo.organizerAttendance,
    );
    const updatedEmbed = generateAttendanceEmbed(newInitBotInfo);
    await message.edit({ embeds: [updatedEmbed] });
  });
}

module.exports = OrganizerCheckIn;
