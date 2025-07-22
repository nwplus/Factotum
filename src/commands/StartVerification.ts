import BaseCommand from "@/classes/BaseCommand";
import {
  getGuildDocRef,
  GuildDoc,
  VerificationDoc,
} from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildTextBasedChannel,
  RoleSelectMenuBuilder,
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
          .setName("hacker_role")
          .setDescription("The hacker role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("sponsor_role")
          .setDescription("The sponsor role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("mentor_role")
          .setDescription("The mentor role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("organizer_role")
          .setDescription("The organizer role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("photographer_role")
          .setDescription("The photographer role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("volunteer_role")
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

    await interaction.reply({
      content:
        "If you have not already, make sure to enable DMs, emojis, and embeds/link previews in your personal Discord settings! If you have any issues, please find an organizer!",
      embeds: [embed],
      components: [row as ActionRowBuilder<ButtonBuilder>],
    });

    const { row: addRoleRow, embed: addRoleEmbed } =
      this.makeAddExtraRoleComponents();

    const guildDocRef = getGuildDocRef(guildId);

    const guildDocData = (await guildDocRef.get()).data() as GuildDoc;
    const adminConsoleChannel = (await interaction.guild?.channels.fetch(
      guildDocData.channelIds.adminConsole,
    )) as GuildTextBasedChannel;

    await adminConsoleChannel.send({
      components: [addRoleRow],
      embeds: [addRoleEmbed],
    });

    const hackerRole = interaction.options.getRole("hacker_role")!;
    const sponsorRole = interaction.options.getRole("sponsor_role")!;
    const mentorRole = interaction.options.getRole("mentor_role")!;
    const organizerRole = interaction.options.getRole("organizer_role")!;
    const photographerRole = interaction.options.getRole("photographer_role")!;
    const volunteerRole = interaction.options.getRole("volunteer_role")!;

    const verificationDocRef = guildDocRef
      .collection("command-data")
      .doc("verification");

    await verificationDocRef.set({
      extraRoles: {},
      roleIds: {
        hacker: hackerRole.id,
        sponsor: sponsorRole.id,
        mentor: mentorRole.id,
        organizer: organizerRole.id,
        photographer: photographerRole.id,
        volunteer: volunteerRole.id,
      },
    } satisfies VerificationDoc);
  }

  private makeAddExtraRoleComponents() {
    const embed = new EmbedBuilder()
      .setTitle("Add Extra Verification Role")
      .setDescription(
        "Select a role from the dropdown below to add it as a new verification role option.",
      );

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId("add-extra-role-select")
      .setPlaceholder("Select a role to add...")
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      roleSelect,
    );

    return { embed, row };
  }
}

export default StartVerification;
