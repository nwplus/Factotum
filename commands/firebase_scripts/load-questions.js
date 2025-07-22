const { Command } = require("@sapphire/framework");
require("dotenv").config();
const firebaseUtil = require("../../db/firebase/firebaseUtil");
const fetch = require("node-fetch");

/**
 * Loads discord contest questions from input JSON file
 * @category Commands
 * @subcategory Admin-Utility
 * @extends Command
 */
class LoadQuestions extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      description: "Adds Discord Contest questions to database",
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addAttachmentOption((option) =>
          option
            .setName("questions")
            .setDescription(
              "JSON file only! Make sure each question is an object.",
            )
            .setRequired(true),
        ),
    ),
      {
        idHints: "1171789829479079976",
      };
  }

  async chatInputRun(interaction) {
    // const adminSDK = JSON.parse(process.env.NWPLUSADMINSDK);
    // let app = FirebaseServices.initializeFirebaseAdmin('factotum', adminSDK, 'https://nwplus-bot.firebaseio.com');

    const guildId = interaction.guild.id;
    const file = interaction.options.getAttachment("questions");
    await interaction.deferReply();
    try {
      const response = await fetch(file.url);
      const res = await response.json();

      res.forEach((question) => {
        const docRef = firebaseUtil
          .getFactotumSubCol()
          .doc(guildId)
          .collection("Questions")
          .doc();
        docRef.set({ ...question, asked: false });
      });
      await interaction.editReply({
        content: res + " questions added!",
        ephemeral: true,
      });
    } catch (error) {
      await interaction.editReply({
        content: "Something went wrong! Error msg: " + error,
        ephemeral: true,
      });
    }
  }
}
module.exports = LoadQuestions;
