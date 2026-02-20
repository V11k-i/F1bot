import { SlashCommandBuilder, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } from "discord.js";   
import {
  ChannelType,
  type StageChannel,
  type VoiceChannel,
} from "discord.js";

import type {Command} from "../../index.ts";

const createEvent: Command = {
		data: new SlashCommandBuilder().setName("create_race").setDescription("create a new event for the server")
		//options that will be entered via command
		.addStringOption((option) => option.setName('date').setDescription('date(DD-MM-YYYY) of the event').setRequired(true))
		.addStringOption((option) => option.setName('time').setDescription('time of the event(hh:mm)').setRequired(true))
		.addNumberOption((option) => option.setName('duration').setDescription('duration of the race').setRequired(true))
		.addStringOption((option) => option.setName('class').setDescription('car class').setRequired(true))
		.addStringOption((option) => option.setName('track').setDescription('track').setRequired(true))
		.addStringOption((option) => option.setName('game').setDescription('game')),
		
		execute: async (interaction) => {
		const guildId = process.env.GUILD_ID;
		if(!guildId)return
		const guild = interaction.client.guilds.cache.get(guildId);
		if(!guild) return console.log('guild not found');
		const channelId = process.env.VOICE;
		if (!channelId) throw new Error("VOICE is missing from .env");
				const channel = await guild.channels.fetch(channelId);
		if (!channel) throw new Error(`No channel found for id ${channelId}`);

		let voiceChannel: VoiceChannel | StageChannel;
		if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
  voiceChannel = channel as VoiceChannel | StageChannel;
} else {
  throw new Error(`Channel ${channelId} must be a guild voice or stage channel (got: ${channel.type})`);
}
		//other vars
		const dur = interaction.options.getNumber('duration',true);
		let game = interaction.options.getString('game');
		if(!game) game = 'LMU';

		// converting the date to fit proper syntax
		const[d,m,y] = interaction.options.getString('date',true)?.split('-').map(Number); 
		const [h,mm] = interaction.options.getString('time', true)?.split(':').map(Number);
		const date = new Date(y,m-1,d,h,mm);
		const eventOptions = {
			name: `${dur}H Race at ${interaction.options.getString('track',true)}`,
			scheduledStartTime: date,
			scheduledEndTime: new Date(y,m-1,d,h+dur,m),
			description: `Car Class: ${interaction.options.getString('class')}\nGame: ${game}`,
			entityType: GuildScheduledEventEntityType.Voice,
			channel:voiceChannel.id,
			privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
		};




		// must be a voice-based guild channel (Voice or Stage)
		
		try{
			await guild.scheduledEvents.create(eventOptions);
			await interaction.reply('Event Created Successfullyt!');
		}
		catch(error){
			await interaction.reply('Error while creating an event');
			console.log(error)
		}
		
	},
};

export default createEvent;