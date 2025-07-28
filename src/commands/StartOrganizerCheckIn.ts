import BaseCommand from "@/classes/BaseCommand";
import { idHints } from "@/constants/id-hints";
import { OrganizerCheckInDoc } from "@/types/db/organizer-check-in";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildTextBasedChannel,
  SlashCommandBuilder,
} from "discord.js";

@ApplyOptions<Command.Options>({
  name: "start-organizer-check-in",
  description: "Starts organizer check-in/out panel in current channel.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class StartOrganizerCheckIn extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder;
  }

  protected override setCommandOptions() {
    return {
      idHints: [idHints.startOrganizerCheckIn],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guildId = interaction.guildId!;
    const channel = interaction.channel! as GuildTextBasedChannel;

    const embed = StartOrganizerCheckIn.generateAttendanceEmbed({});
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("organizer-check-in")
        .setLabel("Check In")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("organizer-check-out")
        .setLabel("Check Out")
        .setStyle(ButtonStyle.Primary),
    );

    const checkInPanel = await channel.send({
      content: "Make sure to check in/out when you enter and leave the venue!",
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: "Organizer check-in started!",
      ephemeral: true,
    });

    const guildDocRef = getGuildDocRef(guildId);
    const organizerCheckInDocRef = guildDocRef
      .collection("command-data")
      .doc("organizer-check-in");

    await organizerCheckInDocRef.set({
      organizerAttendance: {},
      savedMessage: {
        messageId: checkInPanel.id,
        channelId: checkInPanel.channel.id,
      },
    } satisfies OrganizerCheckInDoc);
  }

  public static generateAttendanceEmbed(organizerAttendance: {
    [username: string]: string;
  }) {
    const organizers = Object.values(organizerAttendance);
    organizers.sort();
    const formattedMessage =
      organizers.length > 0
        ? organizers.map((organizer) => `- ${organizer}`).join("\n")
        : "No organizers currently checked in";

    return new EmbedBuilder()
      .setColor(0x0defe1)
      .setTitle("Organizers Present")
      .setDescription(formattedMessage);
  }
}

export default StartOrganizerCheckIn;
