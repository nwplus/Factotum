import StartTickets from "@/commands/StartTickets";
import { getSavedMessage } from "@/util/discord";
import {
  getGuildDocRef,
  GuildDoc,
  MENTOR_SPECIALTIES_MAP,
  TicketDoc,
} from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  ActionRowBuilder,
  type ButtonInteraction,
  GuildTextBasedChannel,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
class AddSpecialtyHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    const guild = interaction.guild!;
    const channel = interaction.channel! as GuildTextBasedChannel;

    const guildDocRef = getGuildDocRef(interaction.guildId!);
    const guildDocData = (await guildDocRef.get()).data() as GuildDoc;

    const modal = new ModalBuilder()
      .setCustomId("add-specialty-role-modal")
      .setTitle("Add Mentor Specialty Role")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("specialty-name")
            .setLabel("Specialty Name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Specialty Name")
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
    await submitted.reply({
      content:
        "New role received. Please react to the message with the emoji for the role!",
      flags: [MessageFlags.Ephemeral],
    });

    const specialtyName = submitted.fields
      .getTextInputValue("specialty-name")
      .replace(/\s+/g, "-");

    const mentorRole = guild.roles.cache.find(
      (role) => role.id === guildDocData.roleIds.mentor,
    )!;
    const existingSpecialtyRole = guild.roles.cache.find(
      (role) => role.name.toLowerCase() === `M-${specialtyName}`.toLowerCase(),
    );
    if (!existingSpecialtyRole) {
      await guild.roles.create({
        name: `M-${specialtyName}`,
        color: mentorRole.hexColor,
      });
    }

    const ticketDocRef = guildDocRef.collection("command-data").doc("tickets");
    const ticketDocData = (await ticketDocRef.get()).data() as TicketDoc;
    const askForEmoji = await channel.send({
      content: `React to this message with the emoji for the role!`,
    });
    const emojiCollector = askForEmoji.createReactionCollector({
      filter: (reaction, user) => user.id === interaction.user.id,
    });
    emojiCollector.on("collect", async (collected) => {
      await askForEmoji.delete();
      if (
        MENTOR_SPECIALTIES_MAP.has(collected.emoji.name!) ||
        ticketDocData.extraSpecialties[collected.emoji.name!]
      ) {
        const rejectMsg = await channel.send(
          `<@${interaction.user.id}> Emoji is already used in another role. Please react again.`,
        );
        setTimeout(() => rejectMsg.delete(), 5000);
      } else {
        emojiCollector.stop();

        await ticketDocRef.update({
          extraSpecialties: {
            ...ticketDocData.extraSpecialties,  
            [collected.emoji.name!]: specialtyName,
          },
        });
        const successMsg = await channel.send(
          `<@${interaction.user.id}> M-${specialtyName} role with emoji ${collected.emoji.name} added!`,
        );
        setTimeout(() => successMsg.delete(), 5000);

        const mentorSpecialtySelectionMessage = await getSavedMessage(
          guild,
          ticketDocData.savedMessages.mentorSpecialtySelection.messageId,
          ticketDocData.savedMessages.mentorSpecialtySelection.channelId,
        );

        const requestTicketMessage = await getSavedMessage(
          guild,
          ticketDocData.savedMessages.requestTicket.messageId,
          ticketDocData.savedMessages.requestTicket.channelId,
        );

        if (!mentorSpecialtySelectionMessage || !requestTicketMessage) {
          this.container.logger.error(
            "Mentor specialty selection message or request ticket message not found",
          );
        }

        await mentorSpecialtySelectionMessage!.edit({
          embeds: [
            StartTickets.makeMentorSpecialtySelectionEmbed({
              ...ticketDocData.extraSpecialties,
              [collected.emoji.name!]: specialtyName,
            }),
          ],
        });
        await mentorSpecialtySelectionMessage?.react(collected.emoji);
        await requestTicketMessage!.edit({
          components: [
            StartTickets.makeRequestTicketComponents({
              ...ticketDocData.extraSpecialties,
              [collected.emoji.name!]: specialtyName,
            }).actionRow,
          ],
        });
      }
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== "add-specialty-role") return this.none();
    return this.some();
  }
}

export default AddSpecialtyHandler;
