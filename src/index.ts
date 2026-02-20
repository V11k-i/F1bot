import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  Collection,
  MessageFlags,
  SlashCommandBuilder,
  MessageReaction,
  User,
  Partials,
  SlashCommandOptionsOnlyBuilder
} from "discord.js";
import etc from "../etc.json" with { type: "json" };
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url"; // ✅ needed to recreate __dirname in ESM



// --------------------
// Types
// --------------------
export type Command = {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

// Augment discord.js Client type so we can attach our commands Collection
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

// --------------------
// ESM replacements for __filename / __dirname
// In ESM, Node does NOT provide __dirname and __filename.
// This recreates them using import.meta.url.
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// Client setup
// --------------------
const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("Missing DISCORD_TOKEN in .env");

const client = new Client({
  intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages
  ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction], // strongly recommended

});

// Create the command registry on the client
client.commands = new Collection();

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Login starts the bot connection
client.login(token);

// --------------------
// Command loader
// --------------------

// IMPORTANT PATH NOTE:
// You're running src/index.ts, but your commands are compiled into dist/commands.
// Since __dirname is /src, dist is one directory UP: ../dist/commands
//
// If you run the compiled bot from dist/index.js instead,
// then you'd usually use path.join(__dirname, "commands").
// --------------------
const commandsRoot = path.join(__dirname, "..", "dist", "commands");

// Sanity check so the error isn't some vague "ENOENT" later
if (!fs.existsSync(commandsRoot)) {
  throw new Error(
    `Commands folder not found: ${commandsRoot}\n` +
      `Did you run tsc to build /dist first?`
  );
}

// Read folder names inside dist/commands (e.g. utility, fun, admin, etc.)
const commandFolders = fs.readdirSync(commandsRoot);

for (const folder of commandFolders) {
  const commandsPath = path.join(commandsRoot, folder);

  // Skip anything that isn't a folder (some people put random junk in directories)
  if (!fs.statSync(commandsPath).isDirectory()) continue;

  // Grab only compiled JS command files
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filepath = path.join(commandsPath, file);

    // Dynamic import returns a MODULE NAMESPACE OBJECT.
    // If your command file does: export default ping;
    // then the actual command is mod.default.
   // Dynamic import returns a module namespace object.
// The command might be exported as default OR as the module itself.
const mod = await import(filepath);
const candidate: unknown = (mod as any).default ?? mod;

// Real runtime validation (so you don't register garbage)
if (
  typeof candidate === "object" &&
  candidate !== null &&
  "data" in candidate &&
  "execute" in candidate &&
  typeof (candidate as any).execute === "function" &&
  typeof (candidate as any).data?.name === "string"
) {
  const command = candidate as Command;

  client.commands.set(command.data.name, command);
  console.log(`[CMD] Loaded: ${command.data.name} (${filepath})`);
} else {
  console.warn(
    `[WARN] ${filepath} does not export a valid Command.\n` +
      `Expected: export default { data: SlashCommandBuilder, execute: async () => {} }`
  );
}
  }
}

// --------------------
// Interaction handler
// --------------------
client.on(Events.InteractionCreate, async (interaction) => {
  // Only handle slash commands here
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching "${interaction.commandName}" was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    // If we've already replied or deferred, we must follow up.
    // Otherwise we can reply normally.
    const msg = "There was an error while executing this command!";

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: msg,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: msg,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});


// reaction handler

const reacts = new Map<string, string>([
    ["🚗","1471447133533114451"]
  ]);
client.on("messageReactionAdd", async (reaction, user)  => {

  if(user.bot) return;
  const chnl = etc["channel-id"];
  const msg = etc["message-id"];
  if((reaction.message.id !== msg) || (reaction.message.channelId !== chnl)) return;
  
  const emojiKey = reaction.emoji.id ?? reaction.emoji.name;
  if(emojiKey == null ) return;
  const roleid = reacts.get(emojiKey);
  if(roleid == null ) return;

  const guild = reaction.message.guild;
  if (!guild) return;
  const member = await guild.members.fetch(user.id);
  await member.roles.add(roleid);
  console.log('ts works');

})

client.on("messageReactionRemove", async (reaction, user)  => {

  if(user.bot) return;
  const chnl = etc["channel-id"];
  const msg = etc["message-id"];
  if((reaction.message.id !== msg) || (reaction.message.channelId !== chnl)) return;
  
  const emojiKey = reaction.emoji.id ?? reaction.emoji.name;
  if(emojiKey == null ) return;
  const roleid = reacts.get(emojiKey);
  if(roleid == null ) return;

  const guild = reaction.message.guild;
  if (!guild) return;
  const member = await guild.members.fetch(user.id);
  await member.roles.remove(roleid);
  console.log('ts works');

})
