import { logToAdminLog } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  ActionRowBuilder,
  type ButtonInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
class ReportHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    const modal = new ModalBuilder()
      .setCustomId("reportModal")
      .setTitle("Report")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("users")
            .setLabel("User(s) to report")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("user1, user2")
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Reason for report")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Reason for report")
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("explanation")
            .setLabel("Detailed explanation")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Detailed explanation")
            .setMaxLength(300)
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("channel")
            .setLabel("Channel (if possible)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("#channel-name")
            .setRequired(false),
        ),
      );

    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({
      time: 300000,
      filter: (j) => j.user.id === interaction.user.id,
    });

    if (!submitted) {
      return interaction.reply({
        content: "You did not submit the modal in time.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const message = `Report from ${interaction.user.username} in ${submitted.fields.getTextInputValue("channel") ?? "unknown"} channel:
User(s): ${submitted.fields.getTextInputValue("users")}
Reason: ${submitted.fields.getTextInputValue("reason")}
Detailed explanation: ${submitted.fields.getTextInputValue("explanation")}
    `;

    await logToAdminLog(interaction.guild!, message);
    await submitted.reply({
      content:
        "Thank you for taking the time to report users who are not following server or MLH rules. You help makes our community safer!",
      flags: [MessageFlags.Ephemeral],
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== "report") return this.none();
    return this.some();
  }
}

export default ReportHandler;
