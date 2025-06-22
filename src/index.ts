import { LogLevel, SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import "dotenv/config";

import { initializeFirebase } from "./util/firestore";
import { getFactotumBaseDocRef, PronounsDoc } from "./util/nwplus-firestore";

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
    ],
    shards: "auto",
    logger: {
      level:
        process.env.NODE_ENV === "development" ? LogLevel.Debug : LogLevel.Info,
    },
  });

  await client.login(env.DISCORD_BOT_TOKEN);
  initializeFirebase(env.FIREBASE_SERVICE_ACCOUNT);

  console.log("Fetching saved messages into cache...");

  const querySnapshot = await getFactotumBaseDocRef()
    .collection("guilds")
    .get();

  const loadMessagePromises = querySnapshot.docs.map(async (doc) => {
    const guild = await client.guilds.fetch(doc.id);
    console.log(`Processing guild: ${doc.id} - ${guild.name}`);

    const commandDataDocRef = doc.ref.collection("command-data");

    // Load /pronouns message
    const pronounsDataDoc = await commandDataDocRef.doc("pronouns").get();
    if (pronounsDataDoc.exists) {
      const { savedMessage } = pronounsDataDoc.data() as PronounsDoc;
      const pronounsMessageChannel = await guild.channels.fetch(
        savedMessage.channelId,
      );
      if (pronounsMessageChannel?.isTextBased()) {
        const message = await pronounsMessageChannel.messages.fetch(
          savedMessage.messageId,
        );
        message.fetch();
        console.log("Loaded /pronouns message into listener cache");
      }
    }
  });

  await Promise.all(loadMessagePromises);

  console.log("Finished processing all guild documents");
};

initializeBot();
