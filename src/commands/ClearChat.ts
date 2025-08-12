import BaseCommand from "@/classes/BaseCommand";
import { idHints } from "@/constants/id-hints";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  GuildTextBasedChannel,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

@ApplyOptions<Command.Options>({
  name: "clear-chat",
  description: "Clear most recent 100 messages younger than 2 weeks.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class ClearChat extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder.addBooleanOption((option) =>
      option
        .setName("keep_pinned")
        .setDescription("If true any pinned messages will not be removed"),
    );
  }

  protected override setCommandOptions() {
    return {
      idHints: [idHints.clearChat],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const channel = interaction.channel! as GuildTextBasedChannel;

    const keepPinned = interaction.options.getBoolean("keep_pinned", false);
    if (keepPinned) {
      const messagesToDelete = channel.messages.cache.filter(
        (msg) => !msg.pinned,
      );
      await channel.bulkDelete(messagesToDelete, true);
    } else {
      await channel.bulkDelete(100, true);
    }
    return interaction.reply({
      content: "Messages successfully deleted",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default ClearChat;
