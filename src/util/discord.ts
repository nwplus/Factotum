import { Command } from "@sapphire/framework";
import { MessageFlags, PermissionsBitField } from "discord.js";

import { getGuildDocRef, GuildDoc } from "./nwplus-firestore";

/**
 * A decorator for `Command.chatInputRun` that requires the user
 * to have the Administrator permission to run the command.
 */
export function requireAdminPermission<T extends Command>(
  target: (
    this: T,
    interaction: Command.ChatInputCommandInteraction,
  ) => Promise<any>,
) {
  return async function (
    this: T,
    interaction: Command.ChatInputCommandInteraction,
  ) {
    if (
      !interaction.memberPermissions?.has(
        PermissionsBitField.Flags.Administrator,
      )
    ) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }
    return await target.call(this, interaction);
  };
}

/**
 * A decorator for `Command.chatInputRun` that requires the user
 * to have the admin role to run the command.
 */
export function requireAdminRole<T extends Command>(
  target: (
    this: T,
    interaction: Command.ChatInputCommandInteraction,
  ) => Promise<any>,
) {
  return async function (
    this: T,
    interaction: Command.ChatInputCommandInteraction,
  ) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const guildDocRef = getGuildDocRef(interaction.guildId);
    const data = (await guildDocRef.get()).data() as GuildDoc;
    if (!data.setupComplete) {
      return interaction.reply({
        content:
          "This server is not setup yet. Run /init-bot to setup the server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const adminRole = data.roleIds.admin;
    const memberRoles = interaction.member?.roles;
    if (
      (memberRoles instanceof Array && !memberRoles.includes(adminRole)) ||
      (!(memberRoles instanceof Array) && !memberRoles?.cache.has(adminRole))
    ) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }
    return await target.call(this, interaction);
  };
}
