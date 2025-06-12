import {
  ApplicationCommandRegistryRegisterOptions,
  Command,
} from "@sapphire/framework";
import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

/**
 * A base class for all commands.
 * Registers the command with the name and description provided in the constructor.
 */
class BaseCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        this.buildCommand(
          builder.setName(this.name).setDescription(this.description),
        ),
      this.setCommandOptions(),
    );
  }

  /**
   * Subclasses can override this method to add extra options to the command builder.
   * @param builder - The command builder.
   * @returns The command builder with the options set.
   */
  protected buildCommand(
    builder: SlashCommandBuilder,
  ):
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandSubcommandBuilder {
    return builder;
  }

  /**
   * Subclasses can override this method to set the command options.
   * @returns The command options. If no extra options are needed, return undefined.
   */
  protected setCommandOptions():
    | ApplicationCommandRegistryRegisterOptions
    | undefined {
    return undefined;
  }
}

export default BaseCommand;
