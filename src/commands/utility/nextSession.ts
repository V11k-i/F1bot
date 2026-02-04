import { SlashCommandBuilder } from "discord.js";   
import type {Command} from "../../index.js";
import { nextSession as getS } from "../../api/f1.js";



const nextSession: Command = {
  data: new SlashCommandBuilder().setName("next_session").setDescription("Outputs next Formula One event scheduled"),
  execute: async (interaction) => {
    const s = await getS();
    await interaction.reply(s);
  },
};

export default nextSession;