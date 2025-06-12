import BaseCommand from "@/classes/BaseCommand";
import { requireAdminPermission } from "@/util/discord";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { Command } from "@sapphire/framework";
import { MessageFlags, SlashCommandBuilder } from "discord.js";

/**
 * The InitBot command initializes the bot on the guild. It will prompt the user for information needed
 * to set up the bot. It is only usable by server administrators. It can only be run once.
 */
class InitBot extends BaseCommand {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "init-bot",
      description: "Initializes the bot on the guild.",
    });
  }

  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder
      .addRoleOption((option) =>
        option
          .setName("admin-role")
          .setDescription("The admin role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("member-role")
          .setDescription("The member role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("mentor-role")
          .setDescription("The mentor role.")
          .setRequired(true),
      )
      .addChannelOption((option) =>
        option
          .setName("admin-console")
          .setDescription("The admin console channel.")
          .setRequired(true),
      )
      .addChannelOption((option) =>
        option
          .setName("admin-log")
          .setDescription("The admin log channel.")
          .setRequired(true),
      );
  }

  protected override setCommandOptions() {
    return {
      idHints: ["1381884387972612129"],
    };
  }

  @requireAdminPermission
  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({
        content: "This command can only be run in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildDocRef = getGuildDocRef(guildId);

    const guildDoc = await guildDocRef.get();
    if (guildDoc.exists && guildDoc.get("setupComplete")) {
      this.container.logger.info(`Bot already initialized on guild ${guildId}`);
      return interaction.reply({
        content: "The bot is already initialized on this server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    this.container.logger.info(`Initializing bot on guild ${guildId}`);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const adminRole = interaction.options.getRole("admin-role");
    const memberRole = interaction.options.getRole("member-role");
    const mentorRole = interaction.options.getRole("mentor-role");
    const adminConsole = interaction.options.getChannel("admin-console");
    const adminLog = interaction.options.getChannel("admin-log");

    await guildDocRef.set({
      setupComplete: true,
      roleIds: {
        admin: adminRole?.id,
        member: memberRole?.id,
        mentor: mentorRole?.id,
      },
      channelIds: {
        adminConsole: adminConsole?.id,
        adminLog: adminLog?.id,
      },
    });

    return interaction.followUp({
      content: "The bot has been successfully initialized on this server.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default InitBot;
