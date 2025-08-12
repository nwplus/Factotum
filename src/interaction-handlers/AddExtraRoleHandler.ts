import { VerificationDoc } from "@/types/db/verification";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  type RoleSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
class AddExtraRoleHandler extends InteractionHandler {
  public async run(interaction: RoleSelectMenuInteraction) {
    const selectedRole = interaction.roles.first();
    if (!selectedRole) {
      return interaction.reply({
        content: "No role was selected. Please try again.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("add-extra-role-modal")
      .setTitle("Add Extra Role")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("role-name")
            .setLabel("Role Name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Enter the role name (e.g., 'judge', 'mlh')")
            .setRequired(true)
            .setMaxLength(50),
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

    await submitted.deferReply({ flags: [MessageFlags.Ephemeral] });

    const roleName = submitted.fields
      .getTextInputValue("role-name")
      .trim()
      .toLowerCase();

    if (!roleName) {
      return submitted.followUp({
        content: "Role name cannot be empty. Please try again.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    try {
      const guildDocRef = getGuildDocRef(interaction.guildId!);
      const verificationDocRef = guildDocRef
        .collection("command-data")
        .doc("verification");

      const verificationDoc = await verificationDocRef.get();
      const verificationData = verificationDoc.data() as VerificationDoc;

      // Check if role name already exists in main roles or extra roles
      if (
        verificationData.roleIds[
          roleName as keyof typeof verificationData.roleIds
        ] ||
        verificationData.extraRoles[roleName]
      ) {
        return submitted.followUp({
          content: `Role name "${roleName}" is already in use. Please choose a different name.`,
          flags: [MessageFlags.Ephemeral],
        });
      }

      await verificationDocRef.update({
        [`extraRoles.${roleName}`]: selectedRole.id,
      });

      await submitted.followUp({
        content: `Successfully added extra role mapping: "${roleName}" → ${selectedRole.name} (${selectedRole.id})`,
        flags: [MessageFlags.Ephemeral],
      });
    } catch (error) {
      console.error("Error adding extra role:", error);
      await submitted.followUp({
        content:
          "An error occurred while adding the extra role. Please try again or contact an administrator.",
        flags: [MessageFlags.Ephemeral],
      });
    }
  }

  public override parse(interaction: RoleSelectMenuInteraction) {
    if (interaction.customId !== "add-extra-role-select") return this.none();
    return this.some();
  }
}

export default AddExtraRoleHandler;
