import BaseCommand from "@/classes/BaseCommand";
import { idHints } from "@/constants/id-hints";
import { GuildDoc } from "@/types/db/guild";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import {
  MessageFlags,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";

/**
 * The InitBot command initializes the bot on the guild. It will prompt the user for information needed
 * to set up the bot. It is only usable by server administrators. It can only be run once.
 */
@ApplyOptions<Command.Options>({
  name: "init-bot",
  description: "Initializes the bot on the guild.",
  requiredUserPermissions: [PermissionsBitField.Flags.Administrator],
})
class InitBot extends BaseCommand {
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
          .setName("staff-role")
          .setDescription("The staff role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("verified-role")
          .setDescription("The verified role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("unverified-role")
          .setDescription("The unverified role.")
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
      )
      .addStringOption((option) =>
        option
          .setName("hackathon-name")
          .setDescription(
            "The hackathon name. Either 'HackCamp20xx', 'nwHacks20xx', or 'cmd-f20xx'.",
          )
          .setRequired(true),
      );
  }

  protected override setCommandOptions() {
    return {
      idHints: [idHints.initBot],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guild = interaction.guild!;
    if (!guild) {
      return interaction.reply({
        content: "This command can only be run in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildDocRef = getGuildDocRef(guild.id);

    const guildDoc = await guildDocRef.get();
    if (guildDoc.exists && guildDoc.get("setupComplete")) {
      this.container.logger.info(
        `Bot already initialized on guild ${guild.id}`,
      );
      return interaction.reply({
        content: "The bot is already initialized on this server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const adminRole = interaction.options.getRole("admin-role")!;
    const staffRole = interaction.options.getRole("staff-role")!;
    const verifiedRole = interaction.options.getRole("verified-role")!;
    const unverifiedRole = interaction.options.getRole("unverified-role")!;
    const adminConsole = interaction.options.getChannel("admin-console")!;
    const adminLog = interaction.options.getChannel("admin-log")!;

    const hackathonName = interaction.options.getString("hackathon-name");
    if (!hackathonName?.match(/(HackCamp|nwHacks|cmd-f)20\d{2}/)) {
      return interaction.reply({
        content:
          "Invalid hackathon name. Please use the format 'HackCamp20xx', 'nwHacks20xx', or 'cmd-f20xx'.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const adminConsoleChannel = await guild.channels.fetch(adminConsole!.id);
    if (!adminConsoleChannel?.isTextBased()) {
      return interaction.reply({
        content: "Admin console channel must be an existing text channel.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const adminLogChannel = await guild.channels.fetch(adminLog!.id);
    if (!adminLogChannel?.isTextBased()) {
      return interaction.reply({
        content: "Admin log channel must be an existing text channel.",
        flags: MessageFlags.Ephemeral,
      });
    }

    this.container.logger.info(`Initializing bot on guild ${guild.id}`);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await guildDocRef.set({
      setupComplete: true,
      hackathonName,
      roleIds: {
        admin: adminRole.id,
        staff: staffRole.id,
        verified: verifiedRole.id,
        unverified: unverifiedRole.id,
      },
      channelIds: {
        adminConsole: adminConsole?.id,
        adminLog: adminLog?.id,
      },
    } satisfies GuildDoc);

    return interaction.followUp({
      content: "The bot has been successfully initialized on this server.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default InitBot;
