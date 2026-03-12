import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  Collection,
  MessageFlags,
  SlashCommandBuilder,
  Partials,
  SlashCommandOptionsOnlyBuilder,
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
  
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

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  console.log(`[REACTION CONFIG] guild=${etc["guild-id"]} channel=${etc["channel-id"]} message=${etc["message-id"]}`);

  try {
    const guild = await readyClient.guilds.fetch(etc["guild-id"]);
    const channel = await guild.channels.fetch(etc["channel-id"]);
    const message = channel && "messages" in channel ? await channel.messages.fetch(etc["message-id"]) : null;

    console.log(`[REACTION CONFIG] guild ok: ${guild.id}`);
    console.log(`[REACTION CONFIG] channel ok: ${channel?.id ?? "missing"}`);
    console.log(`[REACTION CONFIG] message ok: ${message?.id ?? "missing"}`);
  } catch (error) {
    console.error("[REACTION CONFIG] Validation failed:", error);
  }
});

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
  ["🧟", "1481609879230742750"],
  ["🏁", "1475870203601621173"],
  ["🏎️", "1168277415311724636"],
  ["🏎", "1168277415311724636"]
]);

async function getReactionContext(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (user.partial) {
    await user.fetch();
  }

  if (user.bot) return null;

  if (reaction.partial) {
    await reaction.fetch();
  }

  if (reaction.message.partial) {
    await reaction.message.fetch();
  }

  const guildId = etc["guild-id"];
  const channelId = etc["channel-id"];
  const messageId = etc["message-id"];

  if (reaction.message.guildId !== guildId) {
    console.log(`[REACTION] Ignored: wrong guild ${reaction.message.guildId}`);
    return null;
  }

  if (reaction.message.channelId !== channelId) {
    console.log(`[REACTION] Ignored: wrong channel ${reaction.message.channelId}`);
    return null;
  }

  if (reaction.message.id !== messageId) {
    console.log(`[REACTION] Ignored: wrong message ${reaction.message.id}`);
    return null;
  }

  const emojiKey = reaction.emoji.id ?? reaction.emoji.name?.replace(/\uFE0F/g, "");
  if (emojiKey == null) {
    console.log("[REACTION] Ignored: emoji key is null");
    return null;
  }

  const roleId = reacts.get(emojiKey);
  if (roleId == null) {
    console.log(`[REACTION] Ignored: no role mapped for emoji ${emojiKey}`);
    return null;
  }

  const guild = reaction.message.guild;
  if (!guild) {
    console.log("[REACTION] Ignored: guild not found on message");
    return null;
  }

  const member = await guild.members.fetch(user.id);
  const botMember = await guild.members.fetchMe();

  console.log(`[REACTION] emoji=${emojiKey} role=${roleId} user=${user.id}`);
  console.log(`[REACTION] member roles highest=${member.roles.highest.position} bot highest=${botMember.roles.highest.position}`);

  return { member, botMember, roleId, emojiKey, guild };
}

client.on("messageReactionAdd", async (reaction, user) => {
  try {
    const context = await getReactionContext(reaction, user);
    if (!context) return;

    const role = await context.guild.roles.fetch(context.roleId);
    if (!role) {
      console.log(`[REACTION ADD] Role not found: ${context.roleId}`);
      return;
    }

    if (context.botMember.roles.highest.position <= role.position) {
      console.log(`[REACTION ADD] Bot role is not high enough to add ${role.name}`);
      return;
    }

    await context.member.roles.add(context.roleId);
    console.log(`[REACTION ADD] Added role ${context.roleId} for emoji ${context.emojiKey}`);
  } catch (error) {
    console.error("[REACTION ADD] Failed:", error);
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  try {
    const context = await getReactionContext(reaction, user);
    if (!context) return;

    const role = await context.guild.roles.fetch(context.roleId);
    if (!role) {
      console.log(`[REACTION REMOVE] Role not found: ${context.roleId}`);
      return;
    }

    if (context.botMember.roles.highest.position <= role.position) {
      console.log(`[REACTION REMOVE] Bot role is not high enough to remove ${role.name}`);
      return;
    }

    await context.member.roles.remove(context.roleId);
    console.log(`[REACTION REMOVE] Removed role ${context.roleId} for emoji ${context.emojiKey}`);
  } catch (error) {
    console.error("[REACTION REMOVE] Failed:", error);
  }
});

// Login starts the bot connection after all handlers are registered
client.login(token);
