import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('Get a link to the dashboard');

export async function execute(interaction) {
  const url = process.env.DASHBOARD_URL || `http://localhost:${process.env.DASHBOARD_PORT || 3000}`;
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📊 FREE6 Dashboard')
    .setDescription(`[Click here to open the dashboard](${url}/dashboard/${interaction.guildId})`)
    .setFooter({ text: 'Configure your server from the web dashboard' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
