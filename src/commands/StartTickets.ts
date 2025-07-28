import BaseCommand from "@/classes/BaseCommand";
import { idHints } from "@/constants/id-hints";
import { GuildDoc } from "@/types/db/guild";
import { MENTOR_SPECIALTIES_MAP, TicketDoc } from "@/types/db/ticket";
import { VerificationDoc } from "@/types/db/verification";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  GuildTextBasedChannel,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

@ApplyOptions<Command.Options>({
  name: "start-tickets",
  description: "Starts ticket prompt for hackers in current channel.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class StartTickets extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder
      .addIntegerOption((option) =>
        option
          .setName("unanswered_ticket_time")
          .setDescription(
            "How long (minutes) a ticket should go unaccepted before the bot sends a reminder to all mentors",
          )
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("request_ticket_role")
          .setDescription("Tag the role that is allowed to request tickets")
          .setRequired(true),
      )
      .addChannelOption((option) =>
        option
          .setName("mentor_specialty_channel")
          .setDescription(
            "The channel where mentors can select their specialties",
          )
          .setRequired(true),
      )
      .addChannelOption((option) =>
        option
          .setName("incoming_tickets_channel")
          .setDescription("The channel where mentor tickets will be sent")
          .setRequired(true),
      );
  }

  protected override setCommandOptions() {
    return {
      idHints: [idHints.startTickets],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guild = interaction.guild!;

    const unansweredTicketTime = interaction.options.getInteger(
      "unanswered_ticket_time",
    )!;
    const requestTicketRole = interaction.options.getRole(
      "request_ticket_role",
    )!;
    const mentorSpecialtySelectionChannelName = interaction.options.getChannel(
      "mentor_specialty_channel",
    )!;
    const incomingTicketsChannelName = interaction.options.getChannel(
      "incoming_tickets_channel",
    )!;

    const mentorSpecialtySelectionChannel = await guild.channels.fetch(
      mentorSpecialtySelectionChannelName.id,
    );
    const incomingTicketsChannel = await guild.channels.fetch(
      incomingTicketsChannelName.id,
    );

    if (
      !mentorSpecialtySelectionChannel?.isTextBased() ||
      !incomingTicketsChannel?.isTextBased()
    ) {
      return interaction.reply({
        content:
          "Please tag valid text channels for mentor role selection and incoming tickets channels.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    await interaction.deferReply();

    const guildDocRef = getGuildDocRef(guild.id);
    const guildData = (await guildDocRef.get()).data() as GuildDoc;
    const verificationData = (
      await guildDocRef.collection("command-data").doc("verification").get()
    ).data() as VerificationDoc;

    // Create all base mentor roles if not already created
    await this.createMentorSpecialtyRoles(
      guild,
      verificationData.roleIds.mentor,
    );

    // Mentor specialty selection message
    const mentorSpecialtySelectionMessage =
      await mentorSpecialtySelectionChannel.send({
        embeds: [StartTickets.makeMentorSpecialtySelectionEmbed()],
      });
    for (const emoji of MENTOR_SPECIALTIES_MAP.keys()) {
      await mentorSpecialtySelectionMessage.react(emoji);
    }

    // Admin console message for adding new specialty roles
    const { embed: adminConsoleEmbed, actionRow: adminConsoleActionRow } =
      this.makeAdminConsoleComponents();
    const adminConsole = await guild.channels.fetch(
      guildData.channelIds.adminConsole,
    )!;
    await (adminConsole as GuildTextBasedChannel).send({
      embeds: [adminConsoleEmbed],
      components: [adminConsoleActionRow],
    });

    // Request ticket message
    const { embed, actionRow } = StartTickets.makeRequestTicketComponents();
    const requestTicketMessage = await interaction.followUp({
      embeds: [embed],
      components: [actionRow],
    });

    const ticketDocRef = guildDocRef.collection("command-data").doc("tickets");
    await ticketDocRef.set({
      currentTicketCount: 0,
      unansweredTicketTime: unansweredTicketTime,
      extraSpecialties: {},
      roleIds: {
        requestTicketRole: requestTicketRole.id,
      },
      channelIds: {
        incomingTicketsChannel: incomingTicketsChannel.id,
      },
      savedMessages: {
        mentorSpecialtySelection: {
          messageId: mentorSpecialtySelectionMessage.id,
          channelId: mentorSpecialtySelectionMessage.channel.id,
        },
        requestTicket: {
          messageId: requestTicketMessage.id,
          channelId: requestTicketMessage.channel.id,
        },
      },
    } satisfies TicketDoc);
  }

  private async createMentorSpecialtyRoles(guild: Guild, mentorRoleId: string) {
    const mentorRole = guild.roles.cache.find(
      (role) => role.id === mentorRoleId,
    )!;

    for (const specialtyStr of MENTOR_SPECIALTIES_MAP.values()) {
      const findRole = guild.roles.cache.find(
        (role) => role.name.toLowerCase() === `M-${specialtyStr}`.toLowerCase(),
      );
      if (!findRole) {
        await guild.roles.create({
          name: `M-${specialtyStr}`,
          color: mentorRole.hexColor,
        });
      }
    }
  }

  public static makeMentorSpecialtySelectionEmbed(extraSpecialties?: {
    [emoji: string]: string;
  }) {
    const specialties = [
      ...Array.from(MENTOR_SPECIALTIES_MAP.entries()),
      ...Object.entries(extraSpecialties ?? {}),
    ].map(([key, value]) => ({
      name: key + " --> " + value,
      value: "\u200b",
    }));

    return new EmbedBuilder()
      .setTitle("Choose what you would like to help hackers with!")
      .setDescription(
        "Note: You will be notified every time a hacker creates a ticket in one of your selected categories!",
      )
      .addFields(specialties);
  }

  public static makeRequestTicketComponents(extraSpecialties?: {
    [emoji: string]: string;
  }) {
    const embed = new EmbedBuilder()
      .setTitle("Need 1:1 mentor help?")
      .setDescription(
        "Select a technology you need help with and follow the instructions!",
      );

    const options = [
      ...Array.from(MENTOR_SPECIALTIES_MAP.values()),
      ...Object.values(extraSpecialties ?? {}),
    ].map((value) => ({
      label: value,
      value,
    }));
    options.push({ label: "None of the above", value: "None of the above" });

    const actionRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("request-ticket")
          .setPlaceholder("Select a technology you need help with")
          .addOptions(options)
          .setMinValues(1)
          .setMaxValues(options.length),
      );

    return { embed, actionRow };
  }

  private makeAdminConsoleComponents() {
    const embed = new EmbedBuilder()
      .setTitle("Tickets Console")
      .setDescription("Configure ticketing settings here!");

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("add-specialty-role")
        .setLabel("Add Mentor Specialty Role")
        .setStyle(ButtonStyle.Primary),
    );

    return { embed, actionRow };
  }
}

export default StartTickets;
