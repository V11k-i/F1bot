import { SlashCommandBuilder } from "discord.js";   
import type {Command} from "../../index.js";


const ping: Command = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),
  execute: async (interaction) => {
    await interaction.reply("Pong!");
  },
};

export default ping;

