import { SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import "dotenv/config";

import { initializeFirebase } from "./util/firestore";

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
});

client.login(env.DISCORD_BOT_TOKEN);

initializeFirebase(env.FIREBASE_SERVICE_ACCOUNT);
