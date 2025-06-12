import BaseCommand from "@/classes/BaseCommand";
import { requireAdminRole } from "@/util/discord";

import { Command } from "@sapphire/framework";
import { MessageFlags, SlashCommandBuilder } from "discord.js";

class ClearChat extends BaseCommand {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "clear-chat",
      description: "Clear most recent 100 messages younger than 2 weeks.",
    });
  }

  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder.addBooleanOption((option) =>
      option
        .setName("keep_pinned")
        .setDescription("If true any pinned messages will not be removed"),
    );
  }

  protected override setCommandOptions() {
    return {
      idHints: [],
    };
  }

  @requireAdminRole
  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const channel = interaction.channel;
    if (!channel || channel.isDMBased()) {
      return interaction.reply({
        content: "This command can only be used in a text channel.",
        flags: MessageFlags.Ephemeral,
      });
    }

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
