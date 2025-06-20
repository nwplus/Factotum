import BaseCommand from "@/classes/BaseCommand";
import { getGuildDocRef, VerificationDoc } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

@ApplyOptions<Command.Options>({
  name: "start-verification",
  description: "Starts verification prompt in current channel.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class StartVerification extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder
      .addRoleOption((option) =>
        option
          .setName("hacker-role")
          .setDescription("The hacker role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("sponsor-role")
          .setDescription("The sponsor role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("mentor-role")
          .setDescription("The mentor role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("organizer-role")
          .setDescription("The organizer role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("photographer-role")
          .setDescription("The photographer role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("volunteer-role")
          .setDescription("The volunteer role.")
          .setRequired(true),
      );
  }

  protected override setCommandOptions() {
    return {
      idHints: ["1385475309876412540"],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guildId = interaction.guildId!;

    const embed = new EmbedBuilder().setTitle(
      `Please click the button below to check-in to the ${interaction.guild?.name} server! Make sure you know which email you used to apply to ${interaction.guild?.name}!`,
    );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify")
        .setLabel("Check In")
        .setStyle(ButtonStyle.Primary),
    );

    const msg = await interaction.reply({
      content:
        "If you have not already, make sure to enable DMs, emojis, and embeds/link previews in your personal Discord settings! If you have any issues, please find an organizer!",
      embeds: [embed],
      components: [row as ActionRowBuilder<ButtonBuilder>],
    });

    const hackerRole = interaction.options.getRole("hacker-role")!;
    const sponsorRole = interaction.options.getRole("sponsor-role")!;
    const mentorRole = interaction.options.getRole("mentor-role")!;
    const organizerRole = interaction.options.getRole("organizer-role")!;
    const photographerRole = interaction.options.getRole("photographer-role")!;
    const volunteerRole = interaction.options.getRole("volunteer-role")!;

    const guildDocRef = getGuildDocRef(guildId);

    const verificationDocRef = guildDocRef
      .collection("command-data")
      .doc("verification");

    await verificationDocRef.set({
      roleIds: {
        hacker: hackerRole.id,
        sponsor: sponsorRole.id,
        mentor: mentorRole.id,
        organizer: organizerRole.id,
        photographer: photographerRole.id,
        volunteer: volunteerRole.id,
      },
      savedMessage: {
        messageId: msg.id,
        channelId: interaction.channelId,
      },
    } satisfies VerificationDoc);
  }
}

export default StartVerification;
