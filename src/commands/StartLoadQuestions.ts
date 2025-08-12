import BaseCommand from "@/classes/BaseCommand";
import { idHints } from "@/constants/id-hints";
import { TriviaQuestionDoc } from "@/types/db/trivia";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

@ApplyOptions<Command.Options>({
  name: "start-load-questions",
  description: "Starts question management prompt in current channel.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class StartLoadQuestions extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder;
  }

  protected override setCommandOptions() {
    return {
      idHints: [idHints.startLoadQuestions],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guild = interaction.guild!;
    const guildDocRef = getGuildDocRef(guild.id);
    const triviaDocRef = guildDocRef.collection("command-data").doc("trivia");

    // Fetch existing questions
    const questionsSnapshot = await triviaDocRef.collection("questions").get();
    const questions = questionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as TriviaQuestionDoc),
    }));

    // Create embed showing existing questions
    const embed = new EmbedBuilder().setTitle("Manage Trivia Questions");

    if (questions.length === 0) {
      embed.setDescription(
        "No questions found. Click the button below to add your first question!",
      );
    } else {
      const questionList = questions
        .map((q, index) => {
          const truncatedQuestion =
            q.question.length > 100
              ? q.question.substring(0, 97) + "..."
              : q.question;
          const questionType = q.answers ? "MCQ" : "Manual Review";
          return `**${index + 1}.** ${truncatedQuestion} *(${questionType})*`;
        })
        .join("\n\n");

      embed.setDescription(questionList);
      embed.setFooter({ text: `Total: ${questions.length} questions` });
    }

    // Create button to add new question
    const addButton = new ButtonBuilder()
      .setCustomId("add-question")
      .setLabel("Add New Question")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(addButton);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default StartLoadQuestions;
