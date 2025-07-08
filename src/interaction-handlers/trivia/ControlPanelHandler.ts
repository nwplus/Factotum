import StartTrivia from "@/commands/StartTrivia";
import { getSavedMessage } from "@/util/discord";
import { getGuildDocRef, TriviaDoc } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { type ButtonInteraction, MessageFlags } from "discord.js";
import { DocumentReference } from "firebase-admin/firestore";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
class ControlPanelHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    const guild = interaction.guild!;
    const guildDocRef = getGuildDocRef(guild.id);
    const triviaDocRef = guildDocRef.collection("command-data").doc("trivia");

    switch (interaction.customId) {
      case "play-trivia":
        await this.toggleTrivia(interaction, triviaDocRef, false);
        break;
      case "pause-trivia":
        await this.toggleTrivia(interaction, triviaDocRef, true);
        break;
      case "refresh-trivia":
        await this.refreshTrivia(interaction, triviaDocRef);
        break;
    }
  }

  public override parse(interaction: ButtonInteraction) {
    const triviaCustomIds = ["play-trivia", "pause-trivia", "refresh-trivia"];
    if (!triviaCustomIds.includes(interaction.customId)) return this.none();
    return this.some();
  }

  private async toggleTrivia(
    interaction: ButtonInteraction,
    triviaDocRef: DocumentReference,
    paused: boolean,
  ) {
    await triviaDocRef.update({ paused });

    const triviaDoc = await triviaDocRef.get();
    const triviaDocData = triviaDoc.data() as TriviaDoc;

    const { channelId, messageId } =
      triviaDocData.savedMessages.triviaControlPanelMessage;
    const triviaControlPanelMessage = await getSavedMessage(
      interaction.guild!,
      messageId,
      channelId,
    );
    if (!triviaControlPanelMessage) return;

    const { embed } = StartTrivia.makeAdminConsoleComponents(
      triviaDocData.interval,
      paused,
    );
    await triviaControlPanelMessage.edit({
      embeds: [embed],
    });

    await interaction.reply({
      content: `Trivia has been ${paused ? "paused" : "un-paused"}!`,
      flags: MessageFlags.Ephemeral,
    });
  }

  private async refreshTrivia(
    interaction: ButtonInteraction,
    triviaDocRef: DocumentReference,
  ) {
    const triviaDoc = await triviaDocRef.get();
    const triviaDocData = triviaDoc.data() as TriviaDoc;

    const triviaInfoMessage = await getSavedMessage(
      interaction.guild!,
      triviaDocData.savedMessages.triviaInfoMessage.messageId,
      triviaDocData.savedMessages.triviaInfoMessage.channelId,
    );
    if (!triviaInfoMessage) return;
    const leaderboardEmbed =
      await StartTrivia.getLeaderboardEmbed(triviaDocRef);
    await triviaInfoMessage.edit({
      embeds: [StartTrivia.makeStartEmbed(), leaderboardEmbed],
    });

    await interaction.reply({
      content: "Leaderboard refreshed!",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default ControlPanelHandler;
