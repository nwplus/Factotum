import { getGuildDocRef, OtherAttendeesDoc } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
class AddMembersRoleSelectHandler extends InteractionHandler {
  public async run(interaction: StringSelectMenuInteraction) {
    const selectedRole = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`emails-modal-${selectedRole}`)
      .setTitle(`Enter all emails to be added as ${selectedRole}`)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("emails")
            .setLabel("Newline-separated Emails")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Enter emails separated by new lines or commas")
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

    await submitted.deferReply({ flags: [MessageFlags.Ephemeral] });

    await this.handleEmailSubmission(submitted, selectedRole);
  }

  private async handleEmailSubmission(
    interaction: ModalSubmitInteraction,
    participantsType: string,
  ) {
    const emailsRaw = interaction.fields.getTextInputValue("emails");
    const emails = emailsRaw
      .split(/[\r?\n|\r|\n|,]+/g)
      .map((email: string) => email.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      return interaction.followUp({
        content: "No valid emails were provided!",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const guildDocRef = getGuildDocRef(interaction.guildId!);
    const verificationDocRef = guildDocRef
      .collection("command-data")
      .doc("verification");

    const otherAttendeesCollectionRef =
      verificationDocRef.collection("other-attendees");

    try {
      // Perform batch operations
      const db = otherAttendeesCollectionRef.firestore;
      const batch = db.batch();
      let addCount = 0;
      let updateCount = 0;

      for (const email of emails) {
        const existingDocs = await otherAttendeesCollectionRef
          .where("email", "==", email)
          .limit(1)
          .get();

        if (!existingDocs.empty) {
          // Update existing record - append role to existing roles
          const docRef = existingDocs.docs[0]!.ref;
          const existingData =
            existingDocs.docs[0]!.data() as OtherAttendeesDoc;
          const currentRoles = existingData.roles || [];

          // Add the new role if it's not already present
          const updatedRoles = currentRoles.includes(participantsType)
            ? currentRoles
            : [...currentRoles, participantsType];

          batch.update(docRef, {
            email,
            roles: updatedRoles,
          });
          updateCount++;
        } else {
          // Create new record
          const newDocRef = otherAttendeesCollectionRef.doc();
          const userData: OtherAttendeesDoc = {
            email,
            roles: [participantsType],
          };
          batch.set(newDocRef, userData);
          addCount++;
        }
      }

      // Execute batch operation
      await batch.commit();

      const successCount = addCount + updateCount;
      let responseMessage = `Successfully processed ${successCount} emails as ${participantsType}`;

      if (addCount > 0 && updateCount > 0) {
        responseMessage += `\n• Added: ${addCount} new emails\n• Updated: ${updateCount} existing emails`;
      } else if (addCount > 0) {
        responseMessage += `\n• Added: ${addCount} new emails`;
      } else if (updateCount > 0) {
        responseMessage += `\n• Updated: ${updateCount} existing emails`;
      }

      await interaction.followUp({
        content: responseMessage,
        flags: [MessageFlags.Ephemeral],
      });
    } catch (error) {
      console.error("Error processing emails in batch:", error);
      await interaction.followUp({
        content: `An error occurred while processing the emails. Please try again.`,
        flags: [MessageFlags.Ephemeral],
      });
    }
  }

  public override parse(interaction: StringSelectMenuInteraction) {
    if (interaction.customId !== "add-members-select") return this.none();
    return this.some();
  }
}

export default AddMembersRoleSelectHandler;
