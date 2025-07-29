import { TicketDoc } from "@/types/db/ticket";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  GuildTextBasedChannel,
  Message,
  MessageFlags,
  ModalBuilder,
  type StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
class RequestTicketHandler extends InteractionHandler {
  public async run(interaction: StringSelectMenuInteraction) {
    const ticketTypes = interaction.values;

    if (ticketTypes.length === 0) {
      return interaction.reply({
        content: "You must select at least one ticket type.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    await interaction.showModal(this.makeRequestTicketModal());
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

    const ticketDocRef = getGuildDocRef(interaction.guild!.id)
      .collection("command-data")
      .doc("tickets");

    const description =
      submitted.fields.getTextInputValue("ticket-description");
    const location = submitted.fields.getTextInputValue("location");
    const ticketRoleStrings = ticketTypes.map((type) => {
      const role = interaction.guild!.roles.cache.find(
        (role) => role.name.toLowerCase() === `M-${type}`.toLowerCase(),
      );
      if (!role) return "";
      return `<@&${role.id}>`;
    });

    // Send ticket to incoming tickets channel
    const ticketData = (await ticketDocRef.get()).data() as TicketDoc;
    const ticketNumber = ticketData.currentTicketCount + 1;
    const { newTicketEmbed, acceptTicketRow } = this.makeNewTicketComponents(
      ticketNumber,
      description,
      location,
    );
    const incomingTicketsChannel = await interaction.guild!.channels.fetch(
      ticketData.channelIds.incomingTicketsChannel,
    );
    const ticketMsg = await (
      incomingTicketsChannel as GuildTextBasedChannel
    ).send({
      content: `${ticketRoleStrings.join(", ")}: ticket requested by <@${submitted.user.id}>`,
      embeds: [newTicketEmbed],
      components: [acceptTicketRow],
    });

    await ticketDocRef.update({
      currentTicketCount: ticketNumber,
    });
    const ticketReminder = setTimeout(() => {
      ticketMsg.reply(
        `${ticketRoleStrings.join(", ")}: ticket ${ticketNumber} still needs help!`,
      );
    }, ticketData.unansweredTicketTime * 60000);

    // Send ticket confirmation to user
    const { confirmationEmbed, deleteTicketRow } =
      this.makeTicketConfirmationComponents(
        ticketNumber,
        description,
        location,
      );
    const ticketReceipt = await submitted.user.send({
      embeds: [confirmationEmbed],
      content: "You will be notified when a mentor accepts your ticket!",
      components: [deleteTicketRow],
    });

    // Listen for delete ticket button
    this.listenToButton(ticketReceipt, async (deleteInteraction) => {
      clearTimeout(ticketReminder);

      await ticketMsg.edit({
        embeds: [
          new EmbedBuilder(ticketMsg.embeds[0].data)
            .setColor("#FFCCCB")
            .addFields([{ name: "Ticket closed", value: "Deleted by hacker" }]),
        ],
        components: [],
      });
      await deleteInteraction.reply("Ticket deleted!");
      await ticketReceipt.edit({ components: [] });
    });

    // Listen for accept ticket button
    this.listenToButton(ticketMsg, async (acceptInteraction) => {
      clearTimeout(ticketReminder);

      await ticketMsg.edit({
        embeds: [
          new EmbedBuilder(ticketMsg.embeds[0].data)
            .setColor("#0096FF")
            .addFields([
              {
                name: "Helped by:",
                value: "<@" + acceptInteraction.user.id + ">",
              },
            ]),
        ],
        components: [],
      });
      await submitted.user.send(
        "Your ticket number " +
          ticketNumber +
          " has been accepted by a mentor! They will be making their way to you shortly.",
      );
      await ticketReceipt.edit({ components: [] });

      await acceptInteraction.reply({
        content:
          "Thanks for accepting their ticket! Please head to their stated location. If you need to contact them, you can click on their username above to DM them!",
        flags: [MessageFlags.Ephemeral],
      });
    });

    await submitted.followUp({
      content: "Your ticket has been submitted!",
      flags: [MessageFlags.Ephemeral],
    });
  }

  public override parse(interaction: StringSelectMenuInteraction) {
    if (interaction.customId !== "request-ticket") return this.none();
    return this.some();
  }

  private makeRequestTicketModal() {
    return new ModalBuilder()
      .setCustomId("request-ticket-modal")
      .setTitle("Request Ticket")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("ticket-description")
            .setLabel("Brief description of your problem")
            .setMaxLength(300)
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Describe your problem here")
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("location")
            .setLabel("Where would you like to meet your mentor?")
            .setPlaceholder("Help your mentor find you!")
            .setMaxLength(300)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true),
        ),
      );
  }

  private makeNewTicketComponents(
    ticketNumber: number,
    description: string,
    location: string,
  ) {
    const newTicketEmbed = new EmbedBuilder()
      .setTitle(`Ticket #${ticketNumber}`)
      .setColor("#d3d3d3")
      .addFields([
        { name: "Problem description", value: description },
        { name: "Where to meet", value: location },
      ]);

    const acceptTicketRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("accept-ticket")
        .setLabel("Accept ticket")
        .setStyle(ButtonStyle.Success),
    );

    return { newTicketEmbed, acceptTicketRow };
  }

  private makeTicketConfirmationComponents(
    ticketNumber: number,
    description: string,
    location: string,
  ) {
    const confirmationEmbed = new EmbedBuilder()
      .setTitle("Your ticket is number " + ticketNumber)
      .addFields([
        {
          name: "Problem description",
          value: description,
        },
        {
          name: "Where to meet",
          value: location,
        },
      ]);
    const deleteTicketRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("delete-ticket")
        .setLabel("Delete ticket")
        .setStyle(ButtonStyle.Danger),
    );

    return { confirmationEmbed, deleteTicketRow };
  }

  private listenToButton(
    message: Message,
    callback: (interaction: ButtonInteraction) => Promise<void>,
  ) {
    const collector =
      message.createMessageComponentCollector<ComponentType.Button>({
        filter: (i) => !i.user.bot && i.isButton(),
      });
    collector.on("collect", callback);
  }
}

export default RequestTicketHandler;
