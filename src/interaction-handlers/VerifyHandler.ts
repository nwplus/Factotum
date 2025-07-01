import { checkMemberRoles } from "@/util/discord";
import { getGuildDocRef, GuildDoc } from "@/util/nwplus-firestore";

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
class VerifyHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    const member = interaction.member!;

    const guildDocRef = getGuildDocRef(interaction.guildId!);
    const guildDocData = (await guildDocRef.get()).data() as GuildDoc;
    if (!checkMemberRoles(member, [guildDocData.roleIds.unverified])) {
      return interaction.reply({
        content:
          "You are not eligible to be checked in! If you don't have correct access to the server, please contact an organizer.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("verifyModal")
      .setTitle("Verify")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("email")
            .setLabel("Email")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Email")
            .setRequired(true),
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

    // TODO: Verify the email
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== "verify") return this.none();
    return this.some();
  }
}

export default VerifyHandler;
