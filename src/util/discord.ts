import { Command } from "@sapphire/framework";
import { MessageFlags, PermissionsBitField } from "discord.js";

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
