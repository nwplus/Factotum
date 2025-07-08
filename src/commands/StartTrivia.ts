import BaseCommand from "@/classes/BaseCommand";
import { checkMemberRoles } from "@/util/discord";
import {
  getGuildDocRef,
  GuildDoc,
  logToAdminLog,
  TriviaDoc,
  TriviaLeaderboardDoc,
  TriviaQuestionDoc,
} from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  APIRole,
  GuildMember,
  GuildTextBasedChannel,
  Message,
  MessageFlags,
  Role,
  StringSelectMenuInteraction,
  UserSelectMenuBuilder,
} from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import {
  DocumentReference,
  FieldPath,
  FieldValue,
} from "firebase-admin/firestore";

@ApplyOptions<Command.Options>({
  name: "start-trivia",
  description: "Starts trivia contest in current channel.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class StartTrivia extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder
      .addIntegerOption((option) =>
        option
          .setName("interval")
          .setDescription("Time (minutes) between questions")
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName("notify")
          .setDescription("Role to notify when a question drops")
          .setRequired(true),
      )
      .addBooleanOption((option) =>
        option
          .setName("start_question_now")
          .setDescription(
            "True to start first question now, false to start it after one interval",
          )
          .setRequired(false),
      );
  }

  protected override setCommandOptions() {
    return {
      idHints: ["1386423290645712967"],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guild = interaction.guild!;
    const channel = interaction.channel as GuildTextBasedChannel;

    const interval = interaction.options.getInteger("interval")!;
    const notify = interaction.options.getRole("notify")!;
    const startQuestionNow =
      interaction.options.getBoolean("start_question_now")!;

    const guildDocRef = getGuildDocRef(guild.id);

    const { embed, row } = StartTrivia.makeAdminConsoleComponents(
      interval,
      false,
    );

    const guildData = (await guildDocRef.get()).data() as GuildDoc;
    const adminConsole = (await guild.channels.fetch(
      guildData.channelIds.adminConsole,
    )) as GuildTextBasedChannel;
    const triviaControlPanelMessage = await adminConsole.send({
      embeds: [embed],
      components: [row],
    });

    const startEmbed = StartTrivia.makeStartEmbed();
    const leaderboard = new EmbedBuilder().setTitle("Leaderboard");
    const triviaInfoMessage = await channel.send({
      content: "<@&" + notify.id + ">",
      embeds: [startEmbed, leaderboard],
    });
    triviaInfoMessage.pin();
    triviaInfoMessage.react("🍀");

    await interaction.reply({
      content: "Trivia contest has been started!",
      flags: MessageFlags.Ephemeral,
    });

    logToAdminLog(guild, `Trivia contest started by <@${interaction.user.id}>`);

    const triviaDocRef = guildDocRef.collection("command-data").doc("trivia");
    await triviaDocRef.set(
      {
        interval,
        paused: false,
        askedQuestions: [],
        roleIds: {
          notify: notify.id,
        },
        savedMessages: {
          triviaInfoMessage: {
            messageId: triviaInfoMessage.id,
            channelId: triviaInfoMessage.channelId,
          },
          triviaControlPanelMessage: {
            messageId: triviaControlPanelMessage.id,
            channelId: triviaControlPanelMessage.channelId,
          },
        },
      } satisfies Partial<TriviaDoc>,
      { merge: true },
    );

    // Clear any existing leaderboard entries
    const leaderboardDocs = await triviaDocRef
      .collection("leaderboard")
      .listDocuments();
    await Promise.all(leaderboardDocs.map((doc) => doc.delete()));

    if (startQuestionNow) {
      await this.sendNextQuestion(
        triviaDocRef,
        guildData,
        channel,
        notify,
        adminConsole,
        triviaInfoMessage,
        startEmbed,
      );
    }

    const sendQuestionIntervalId = setInterval(async () => {
      const triviaDoc = await triviaDocRef.get();
      const paused = triviaDoc.data()?.paused;
      if (!paused) {
        const questionsRemaining = await this.sendNextQuestion(
          triviaDocRef,
          guildData,
          channel,
          notify,
          adminConsole,
          triviaInfoMessage,
          startEmbed,
        );
        if (!questionsRemaining) {
          clearInterval(sendQuestionIntervalId);
          await logToAdminLog(
            guild,
            `<@&${guildData.roleIds.staff}> Trivia has ended!`,
          );
        }
      }
    }, interval * 60000);
  }

  public static makeStartEmbed() {
    return new EmbedBuilder()
      .setTitle(
        "Trivia contest starting soon! Answer questions for a chance to win prizes!",
      )
      .setDescription(
        "Note: Short-answer questions are non-case sensitive but any extra or missing symbols will be considered incorrect.",
      )
      .addFields([
        {
          name: "Click the 🍀 emoji below to be notified when a new question drops!",
          value: "You can un-react to stop.",
        },
      ]);
  }

  public static makeAdminConsoleComponents(interval: number, paused: boolean) {
    const embed = new EmbedBuilder()
      .setTitle("Trivia Contest")
      .setDescription("Trivia contest has been started!")
      .addFields({ name: "Interval", value: `${interval} minutes` })
      .addFields({ name: "Status", value: paused ? "Paused" : "Active" });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("play-trivia")
          .setLabel("Play")
          .setStyle(ButtonStyle.Primary),
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("pause-trivia")
          .setLabel("Pause")
          .setStyle(ButtonStyle.Primary),
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("refresh-trivia")
          .setLabel("Refresh leaderboard")
          .setStyle(ButtonStyle.Secondary),
      );

    return { embed, row };
  }

  /** Returns true if there are still questions left and false if all questions have been asked */
  private async sendNextQuestion(
    triviaDocRef: DocumentReference,
    guildDocData: GuildDoc,
    channel: GuildTextBasedChannel,
    notify: Role | APIRole,
    adminConsoleChannel: GuildTextBasedChannel,
    triviaInfoMessage: Message,
    startEmbed: EmbedBuilder,
  ) {
    const triviaDoc = (await triviaDocRef.get()).data() as TriviaDoc;
    const { interval, askedQuestions } = triviaDoc;

    const nextQuestion = await triviaDocRef
      .collection("questions")
      .where(
        FieldPath.documentId(),
        "not-in",
        askedQuestions.length ? askedQuestions : ["non-exist"], // not-in array cannot be empty
      )
      .limit(1)
      .get();

    if (nextQuestion.empty) return false;

    const question = nextQuestion.docs[0].data() as TriviaQuestionDoc;
    const questionId = nextQuestion.docs[0].id;

    const qEmbed = new EmbedBuilder()
      .setTitle(
        `New trivia question! Answer within ${interval * 0.75 * 60} seconds:`,
      )
      .setDescription(question.question);

    const qMessage = await channel.send({
      content: "<@&" + notify.id + ">",
      embeds: [qEmbed],
    });

    let winner: GuildMember | undefined;
    if (question.answers) {
      winner = await this.selectMcqWinner(
        question,
        channel,
        qMessage,
        interval,
      );
    } else {
      const selectRow =
        new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
          new UserSelectMenuBuilder().setCustomId("winner").setMaxValues(1),
        );
      const questionMsg = await adminConsoleChannel.send({
        content: `<@&${guildDocData.roleIds.staff}> need manual review!`,
        embeds: [qEmbed],
        components: [selectRow],
      });

      winner = await this.selectShortAnswerWinner(
        guildDocData.roleIds.admin,
        guildDocData.roleIds.staff,
        channel,
        questionMsg,
      );
    }

    if (winner) {
      await this.updateLeaderboard(triviaDocRef, winner.id, questionId);
      const leaderboardEmbed =
        await StartTrivia.getLeaderboardEmbed(triviaDocRef);
      await triviaInfoMessage.edit({ embeds: [startEmbed, leaderboardEmbed] });
    }

    await triviaDocRef.update({
      askedQuestions: FieldValue.arrayUnion(questionId),
    });

    return true;
  }

  private async selectMcqWinner(
    question: TriviaQuestionDoc,
    channel: GuildTextBasedChannel,
    message: Message,
    interval: number,
  ) {
    const filter = (m: Message) => !m.author.bot;
    const collector = channel.createMessageCollector({
      filter,
      time: interval * 60000 * 0.75,
    });

    const stringAnswerValid = (
      m: Message,
      answers: string[],
      needAllAnswers: boolean,
    ) => {
      const pred = (answer: string) =>
        m.content.toLowerCase().includes(answer.toLowerCase());
      return needAllAnswers ? answers.every(pred) : answers.some(pred);
    };

    const numberAnswerValid = (m: Message, answers: string[]) => {
      return answers.some((correctAnswer) => m.content === correctAnswer);
    };

    const answers = question.answers!;
    return new Promise<GuildMember | undefined>((resolve) => {
      collector.on("collect", async (m) => {
        if (
          (question.needAllAnswers && stringAnswerValid(m, answers, true)) ||
          (!question.needAllAnswers &&
            ((!isNaN(Number(answers[0])) && numberAnswerValid(m, answers)) ||
              stringAnswerValid(m, answers, false)))
        ) {
          await channel.send(
            `Congrats <@${m.author.id}> for getting the correct answer! The correct answer is ${question.needAllAnswers ? "all of" : "any of"}: "${answers.join(", ")}".`,
          );
          collector.stop();
          resolve(m.member ?? undefined);
        }
      });

      collector.on("end", async () => {
        await channel.send(
          "Answers are no longer being accepted. Stay tuned for the next question!",
        );
        resolve(undefined);
      });
    });
  }

  private async selectShortAnswerWinner(
    adminRoleId: string,
    staffRoleId: string,
    channel: GuildTextBasedChannel,
    message: Message,
  ) {
    const collector = message.createMessageComponentCollector({
      filter: (i) =>
        !i.user.bot &&
        i.customId === "winner" &&
        checkMemberRoles(i.member!, [adminRoleId, staffRoleId]),
    });

    return new Promise<GuildMember | undefined>((resolve) => {
      collector.on("collect", async (i: StringSelectMenuInteraction) => {
        const users = i.values;
        await i.deferReply({ flags: [MessageFlags.Ephemeral] });

        const member = i.guild!.members.cache.get(users[0])!;
        await message.delete();
        await i.followUp({
          content: `<@${member.id}> has been recorded!`,
          flags: [MessageFlags.Ephemeral],
        });
        await channel.send(
          "Congrats <@" +
            member.id +
            "> for the best answer to the last question!",
        );
        collector.stop();
        resolve(member);
      });
    });
  }

  public static async getLeaderboardEmbed(triviaDocRef: DocumentReference) {
    const leaderboard = await triviaDocRef.collection("leaderboard").get();
    const leaderboardData = leaderboard.docs.map((doc) => {
      const leaderboardDoc = doc.data() as TriviaLeaderboardDoc;
      return {
        id: doc.id,
        points: leaderboardDoc.score,
      };
    });

    leaderboardData.sort((a, b) => b.points - a.points);

    const leaderboardEmbed = new EmbedBuilder().setTitle("Leaderboard");
    leaderboardEmbed.setDescription(
      leaderboardData
        .map(
          (l) =>
            `<@${l.id}>: ${l.points} ${l.points === 1 ? "point" : "points"}`,
        )
        .join("\n"),
    );

    return leaderboardEmbed;
  }

  private async updateLeaderboard(
    triviaDocRef: DocumentReference,
    winnerId: string,
    questionId: string,
    points: number = 1,
  ) {
    const leaderboardDocRef = triviaDocRef
      .collection("leaderboard")
      .doc(winnerId);

    if ((await leaderboardDocRef.get()).exists) {
      await leaderboardDocRef.update({
        answeredQuestions: FieldValue.arrayUnion(questionId),
        score: FieldValue.increment(points),
      });
    } else {
      await leaderboardDocRef.set({
        answeredQuestions: [questionId],
        score: points,
      } satisfies TriviaLeaderboardDoc);
    }
  }
}

export default StartTrivia;
