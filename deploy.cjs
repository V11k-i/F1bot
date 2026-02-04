require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");


const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_TOKEN;

if (!clientId) throw new Error("Missing CLIENT_ID in .env");
if (!guildId) throw new Error("Missing GUILD_ID in .env");
if (!token) throw new Error("Missing DISCORD_TOKEN in .env");

const commands = [];

// read compiled commands from dist/commands
const foldersPath = path.join(__dirname, "dist", "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  if (!fs.statSync(commandsPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    // require() may return { default: ... } if the module was ESM-compiled
    const loaded = require(filePath);
    const command = loaded.default ?? loaded;

    // matches your Command type: must have .data (SlashCommandBuilder) and .execute (function)
    if (command?.data && typeof command.execute === "function") {
      commands.push(command.data.toJSON());
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
})();