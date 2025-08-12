import { LogLevel, SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import "dotenv/config";

import { GuildDoc } from "./types/db/guild";
import { PronounsDoc } from "./types/db/pronouns";
import { TicketDoc } from "./types/db/ticket";
import { getSavedMessage } from "./util/discord";
import { initializeFirebase } from "./util/firestore";
import { getFactotumBaseDocRef, getGuildDocRef } from "./util/nwplus-firestore";

const ENV_KEYS = ["DISCORD_BOT_TOKEN", "FIREBASE_SERVICE_ACCOUNT"] as const;
const env = Object.fromEntries(
  ENV_KEYS.map((key) => {
    // Dev environment variables are prefixed with DEV_
    const envKey = process.env.NODE_ENV === "development" ? `DEV_${key}` : key;
    if (!process.env[envKey])
      throw new Error(`Missing environment variable: ${envKey}`);
    return [key, process.env[envKey]];
  }),
) as Record<(typeof ENV_KEYS)[number], string>;

const initializeBot = async () => {
  const client = new SapphireClient({
    intents: [
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildExpressions,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.MessageContent,
    ],
    shards: "auto",
    logger: {
      level:
        process.env.NODE_ENV === "development" ? LogLevel.Debug : LogLevel.Info,
    },
  });

  await client.login(env.DISCORD_BOT_TOKEN);
  initializeFirebase(env.FIREBASE_SERVICE_ACCOUNT);

  console.log("Fetching saved messages into cache to listen for emojis...");

  const querySnapshot = await getFactotumBaseDocRef()
    .collection("guilds")
    .get();

  const loadMessagePromises = querySnapshot.docs.map(async (doc) => {
    const guild = await client.guilds.fetch(doc.id);
    console.log(`Processing guild: ${doc.id} - ${guild.name}`);

    const commandDataDocRef = doc.ref.collection("command-data");

    // Load pronouns message
    const pronounsDataDoc = await commandDataDocRef.doc("pronouns").get();
    if (pronounsDataDoc.exists) {
      const { savedMessage } = pronounsDataDoc.data() as PronounsDoc;
      const pronounsMessage = await getSavedMessage(
        guild,
        savedMessage.messageId,
        savedMessage.channelId,
      );
      if (pronounsMessage) {
        pronounsMessage.fetch();
        console.log(`Loaded pronouns message into listener cache for ${guild.name}`);
      }
    }

    // Load request ticket message
    const ticketsDataDoc = await commandDataDocRef.doc("tickets").get();
    if (ticketsDataDoc.exists) {
      const { savedMessages } = ticketsDataDoc.data() as TicketDoc;
      const mentorSpecialtySelectionMessage = await getSavedMessage(
        guild,
        savedMessages.mentorSpecialtySelection.messageId,
        savedMessages.mentorSpecialtySelection.channelId,
      );
      if (mentorSpecialtySelectionMessage) {
        await mentorSpecialtySelectionMessage.fetch();
        console.log(
          `Loaded mentor specialty selection message into listener cache for ${guild.name}`,
        );
      }
    }
  });

  // Keep going if there are any errors with loading any messages
  await Promise.allSettled(loadMessagePromises);

  console.log("Finished processing all guild documents");

  client.on("guildMemberAdd", async (member) => {
    const guildDocRef = await getGuildDocRef(member.guild.id).get();
    const guildDocData = guildDocRef.data() as GuildDoc;
    await member.roles.add(guildDocData.roleIds.unverified);
  });
};

initializeBot();
