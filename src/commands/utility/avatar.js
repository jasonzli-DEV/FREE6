import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('Get a user\'s avatar')
  .addUserOption((o) => o.setName('user').setDescription('User'));

export async function execute(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const url = target.displayAvatarURL({ size: 1024, extension: 'png' });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${target.username}'s Avatar`)
    .setImage(url)
    .addFields({ name: 'Download', value: `[PNG](${url})` });

  await interaction.reply({ embeds: [embed] });
}
