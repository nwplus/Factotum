import BaseCommand from "@/classes/BaseCommand";
import { idHints } from "@/constants/id-hints";

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
  name: "start-report",
  description: "Starts report prompt in current channel.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class StartReport extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder;
  }

  protected override setCommandOptions() {
    return {
      idHints: [idHints.startReport],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const embed = new EmbedBuilder()
      .setTitle(
        "Anonymously report users who are not following server or MLH rules. Help makes our community safer!",
      )
      .setDescription(
        "Please use the format below, be as precise and accurate as possible. \n " +
          "Everything you say will be 100% anonymous. We have no way of reaching back to you so again, be as detailed as possible!",
      )
      .addFields({
        name: "Format:",
        value:
          "User(s) discord username(s) (including discord id number(s)):\n" +
          "Reason for report (one line):\n" +
          "Detailed Explanation:\n" +
          "Name of channel where the incident occurred (if possible):",
      });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("report")
        .setLabel("Report an issue")
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row as ActionRowBuilder<ButtonBuilder>],
    });
  }
}

export default StartReport;
