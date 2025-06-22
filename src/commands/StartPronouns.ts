import BaseCommand from "@/classes/BaseCommand";
import {
  getGuildDocRef,
  PRONOUN_REACTION_EMOJIS,
  PronounsDoc,
} from "@/util/nwplus-firestore";

import { EmbedBuilder } from "@discordjs/builders";
import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  GuildTextBasedChannel,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

@ApplyOptions<Command.Options>({
  name: "start-pronouns",
  description: "Start pronoun selector.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class StartPronouns extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder
      .addRoleOption((option) =>
        option
          .setName("he-him-role")
          .setDescription("The he/him role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("she-her-role")
          .setDescription("The she/her role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("they-them-role")
          .setDescription("The they/them role.")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("other-role")
          .setDescription("The other role.")
          .setRequired(true),
      );
  }

  protected override setCommandOptions() {
    return {
      guildIds: ["1386121970944442559"],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const channel = interaction.channel! as GuildTextBasedChannel;
    const heHimRole = interaction.options.getRole("he-him-role")!;
    const sheHerRole = interaction.options.getRole("she-her-role")!;
    const theyThemRole = interaction.options.getRole("they-them-role")!;
    const otherRole = interaction.options.getRole("other-role")!;

    const message = await channel.send({ embeds: [this.makePronounsEmbed()] });
    PRONOUN_REACTION_EMOJIS.forEach((emoji) => message.react(emoji));

    await interaction.reply({
      content: "Pronouns selector started!",
      flags: MessageFlags.Ephemeral,
    });

    const guildDocRef = getGuildDocRef(interaction.guildId!);
    const pronounsDocRef = guildDocRef
      .collection("command-data")
      .doc("pronouns");
    await pronounsDocRef.set({
      roleIds: {
        heHimRole: heHimRole.id,
        sheHerRole: sheHerRole.id,
        theyThemRole: theyThemRole.id,
        otherRole: otherRole.id,
      },
      savedMessage: {
        messageId: message.id,
        channelId: channel.id,
      },
    } satisfies PronounsDoc);
  }

  private makePronounsEmbed() {
    return new EmbedBuilder()
      .setTitle("Set your pronouns by reacting to one or more of the emojis!")
      .setDescription(
        `${PRONOUN_REACTION_EMOJIS[0]} he/him\n` +
          `${PRONOUN_REACTION_EMOJIS[1]} she/her\n` +
          `${PRONOUN_REACTION_EMOJIS[2]} they/them\n` +
          `${PRONOUN_REACTION_EMOJIS[3]} other pronouns\n`,
      );
  }
}

export default StartPronouns;
