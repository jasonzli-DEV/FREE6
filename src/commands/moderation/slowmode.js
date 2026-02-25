import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('slowmode')
  .setDescription('Set slowmode for a channel')
  .addIntegerOption((o) => o.setName('seconds').setDescription('Slowmode in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
  .addChannelOption((o) => o.setName('channel').setDescription('Channel (defaults to current)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
  const seconds = interaction.options.getInteger('seconds');
  const target = interaction.options.getChannel('channel') || interaction.channel;

  try {
    await target.setRateLimitPerUser(seconds);
    const msg = seconds === 0
      ? `Disabled slowmode in <#${target.id}>`
      : `Set slowmode to **${seconds}s** in <#${target.id}>`;
    await interaction.reply({ embeds: [successEmbed('Slowmode', msg)], ephemeral: true });
  } catch (err) {
    await interaction.reply({ embeds: [errorEmbed('Failed', err.message)], ephemeral: true });
  }
}
