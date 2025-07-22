// Required imports
const { Command } = require("@sapphire/framework");
const {
  MessageEmbed,
  Modal,
  MessageActionRow,
  MessageButton,
  TextInputComponent,
} = require("discord.js");
const firebaseUtil = require("../../db/firebase/firebaseUtil");
const { discordLog } = require("../../discord-services");

/**
 * Verification Command
 * Starts a verification process in the landing channel.
 */
class StartVerification extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      description: "Start verification prompt in landing channel.",
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  async chatInputRun(interaction) {
    this.initBotInfo = await firebaseUtil.getInitBotInfo(interaction.guild.id);
    const { guild, user } = interaction;

    if (
      !guild.members.cache
        .get(user.id)
        .roles.cache.has(this.initBotInfo.roleIDs.staffRole)
    ) {
      return interaction.reply({
        content: "You do not have permissions to run this command!",
        ephemeral: true,
      });
    }

    const embed = new MessageEmbed().setTitle(
      `Please click the button below to check-in to the ${interaction.guild.name} server! Make sure you know which email you used to apply to ${interaction.guild.name}!`,
    );
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("verify")
        .setLabel("Check-in")
        .setStyle("PRIMARY"),
    );

    interaction.reply({ content: "Verification started!", ephemeral: true });
    const msg = await interaction.channel.send({
      content:
        "If you have not already, make sure to enable DMs, emojis, and embeds/link previews in your personal Discord settings! If you have any issues, please find an organizer!",
      embeds: [embed],
      components: [row],
    });

    this.listenToVerification(guild, msg);

    await firebaseUtil
      .getSavedMessagesSubCol(interaction.guild.id)
      .doc("startverification")
      .set({
        messageId: msg.id,
        channelId: msg.channel.id,
      });
  }

  async tryRestoreReactionListeners(guild) {
    const savedMessagesCol = firebaseUtil.getSavedMessagesSubCol(guild.id);
    const verificationDoc = await savedMessagesCol
      .doc("startverification")
      .get();

    if (verificationDoc.exists) {
      const { messageId, channelId } = verificationDoc.data();
      const channel = await this.container.client.channels.fetch(channelId);

      if (channel) {
        try {
          const message = await channel.messages.fetch(messageId);
          this.listenToVerification(guild, message);
        } catch (e) {
          console.error("Failed to fetch verification message:", e);
        }
      }
    }
  }

  listenToVerification(guild, msg) {
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.customId === "verify" && !i.user.bot,
    });

    collector.on("collect", async (i) => {
      const member = guild.members.cache.get(i.user.id);
      this.initBotInfo = await firebaseUtil.getInitBotInfo(guild.id);

      // Check if the user has the guest role
      if (!member.roles.cache.has(this.initBotInfo.verification.guestRoleID)) {
        await i.reply({
          content:
            "You are not eligible to be checked in! If you don't have correct access to the server, please contact an organizer.",
          ephemeral: true,
        });
        return;
      }

      const modal = new Modal()
        .setCustomId("verifyModal")
        .setTitle("Check-in to gain access to the server!")
        .addComponents(
          new MessageActionRow().addComponents(
            new TextInputComponent()
              .setCustomId("email")
              .setLabel("Enter the email that you applied with!")
              .setMinLength(3)
              .setMaxLength(320)
              .setStyle("SHORT")
              .setPlaceholder("Email Address")
              .setRequired(true),
          ),
        );

      await i.showModal(modal);

      const submitted = await i
        .awaitModalSubmit({
          time: 300000,
          filter: (j) => j.user.id === i.user.id,
        })
        .catch(console.error);

      if (submitted) {
        const email = submitted.fields.getTextInputValue("email");
        let types;

        try {
          types = await firebaseUtil.verify(
            email,
            submitted.user.id,
            submitted.guild.id,
          );
        } catch {
          submitted.reply({
            content:
              "Your email could not be found! Please try again or ask an admin for help.",
            ephemeral: true,
          });
          discordLog(
            guild,
            `VERIFY FAILURE : <@${submitted.user.id}> Verified email: ${email} but was a failure, I could not find that email!`,
          );
          return;
        }

        if (types.length === 0) {
          submitted.reply({
            content: "You have already verified!",
            ephemeral: true,
          });
          discordLog(
            guild,
            `VERIFY WARNING : <@${submitted.user.id}> Verified email: ${email} but they are already verified for all types!`,
          );
          return;
        }

        let correctTypes = [];
        types.forEach((type) => {
          const roleObj = this.initBotInfo.verification.roles.find(
            (role) => role.name === type,
          );
          const member = guild.members.cache.get(submitted.user.id);
          let roleId;

          if (type === "staff") {
            roleId = this.initBotInfo.roleIDs.staffRole;
          } else if (type === "mentor") {
            roleId = this.initBotInfo.roleIDs.mentorRole;
          } else {
            roleId = roleObj ? roleObj.roleId : null;
          }

          if (member && roleId) {
            member.roles.add(roleId);

            if (correctTypes.length === 0) {
              member.roles.remove(this.initBotInfo.verification.guestRoleID);
              member.roles.add(this.initBotInfo.roleIDs.memberRole);
            }
            correctTypes.push(type);
          } else {
            console.warn(`Could not add role: ${roleId} for type: ${type}`);
          }
        });

        if (correctTypes.length > 0) {
          submitted.reply({
            content: `You have successfully verified as a ${correctTypes.join(", ")}!`,
            ephemeral: true,
          });
        }
      }
    });
  }
}

module.exports = StartVerification;
