import { TriviaQuestionDoc } from "@/types/db/trivia";
import { getGuildDocRef } from "@/util/nwplus-firestore";

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
class AddQuestionHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    const modal = new ModalBuilder()
      .setCustomId("add-question-modal")
      .setTitle("Add New Trivia Question")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("question")
            .setLabel("Question Text")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Enter your trivia question here...")
            .setMaxLength(1000)
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("answers")
            .setLabel("Answers (optional)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(
              "answer1, answer2, answer3 (leave empty for manual review)",
            )
            .setMaxLength(500)
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("needAllAnswers")
            .setLabel("Need All Answers? (optional)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(
              "yes/true if all answers required, otherwise leave empty",
            )
            .setMaxLength(10)
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

    // Extract form data
    const questionText = submitted.fields.getTextInputValue("question").trim();
    const answersText = submitted.fields.getTextInputValue("answers").trim();
    const needAllAnswersText = submitted.fields
      .getTextInputValue("needAllAnswers")
      .trim()
      .toLowerCase();

    // Validate question text
    if (!questionText) {
      return submitted.reply({
        content: "Question text cannot be empty!",
        flags: [MessageFlags.Ephemeral],
      });
    }

    // Process answers
    let answers: string[] | undefined;
    let needAllAnswers: boolean | undefined;

    if (answersText) {
      answers = answersText
        .split(",")
        .map((answer) => answer.trim())
        .filter((answer) => answer.length > 0);

      if (answers.length === 0) {
        answers = undefined;
      }
    }

    // Process needAllAnswers flag
    if (answers && needAllAnswersText) {
      needAllAnswers =
        needAllAnswersText === "yes" || needAllAnswersText === "true";
    }

    // Create question document
    const questionDoc: TriviaQuestionDoc = {
      question: questionText,
      ...(answers && { answers }),
      ...(needAllAnswers !== undefined && { needAllAnswers }),
    };

    try {
      // Save to Firestore
      const guildDocRef = getGuildDocRef(interaction.guildId!);
      const triviaDocRef = guildDocRef.collection("command-data").doc("trivia");
      await triviaDocRef.collection("questions").add(questionDoc);

      const questionType = answers ? "MCQ" : "Manual Review";
      const answerInfo = answers
        ? `\nAnswers: ${answers.join(", ")}${needAllAnswers ? " (all required)" : ""}`
        : "";

      await submitted.reply({
        content: `Question added successfully!\n\n**Question:** ${questionText}${answerInfo}\n**Type:** ${questionType}`,
        flags: [MessageFlags.Ephemeral],
      });
    } catch (error) {
      console.error("Error saving question:", error);
      await submitted.reply({
        content: "Failed to save question. Please try again later.",
        flags: [MessageFlags.Ephemeral],
      });
    }
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== "add-question") return this.none();
    return this.some();
  }
}

export default AddQuestionHandler;
