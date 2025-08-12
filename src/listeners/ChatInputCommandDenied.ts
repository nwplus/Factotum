import { ApplyOptions } from "@sapphire/decorators";
import {
  ChatInputCommandDeniedPayload,
  Events,
  Listener,
  UserError,
} from "@sapphire/framework";
import { MessageFlags } from "discord.js";

/**
 * Used to send a reply to the user when a command is denied, ex. by a precondition.
 */
@ApplyOptions<Listener.Options>({
  event: Events.ChatInputCommandDenied,
})
class ChatInputCommandDenied extends Listener<
  typeof Events.ChatInputCommandDenied
> {
  public override run(
    error: UserError,
    { interaction }: ChatInputCommandDeniedPayload,
  ) {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({
        content: error.message,
      });
    }

    return interaction.reply({
      content: error.message,
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default ChatInputCommandDenied;
