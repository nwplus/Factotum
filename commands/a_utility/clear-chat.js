const { Command } = require("@sapphire/framework");
const { discordLog } = require("../../discord-services");

class ClearChat extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      description: "Clear most recent 100 messages younger than 2 weeks.",
    });
  }

  /**
   *
   * @param {Command.Registry} registry
   */
  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addBooleanOption((option) =>
          option //
            .setName("keep_pinned")
            .setDescription("If true any pinned messages will not be removed"),
        ),
    );
  }

  /**
   * @param {Command.ChatInputInteraction} interaction
   */
  async chatInputRun(interaction) {
    const keepPinned = interaction.options.getBoolean("keep_pinned", false);

    if (keepPinned) {
      // other option is to get all channel messages, filter of the pined channels and pass those to bulkDelete, might be to costly?
      var messagesToDelete = interaction.channel.messages.cache.filter(
        (msg) => !msg.pinned,
      );
      await interaction.channel
        .bulkDelete(messagesToDelete, true)
        .catch(console.error);
    } else {
      // delete messages and log to console
      await interaction.channel.bulkDelete(100, true).catch(console.error);
    }
    discordLog(interaction.guild, "CHANNEL CLEAR " + interaction.channel.name);
    return interaction.reply({ content: "Messages successfully deleted" });
  }
}
module.exports = ClearChat;
