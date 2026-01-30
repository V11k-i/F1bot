import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
const token = process.env.DISCORD_TOKEN;
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

if (!token) throw new Error("Missing DISCORD_TOKEN in .env");
client.login(token);