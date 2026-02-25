import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('starboard')
  .setDescription('Configure the starboard')
  .addSubcommand((s) =>
    s.setName('setup')
      .setDescription('Set up starboard')
      .addChannelOption((o) => o.setName('channel').setDescription('Starboard channel').setRequired(true))
      .addIntegerOption((o) => o.setName('threshold').setDescription('Stars needed (default: 3)').setMinValue(1))
      .addStringOption((o) => o.setName('emoji').setDescription('Star emoji (default: ⭐)'))
  )
  .addSubcommand((s) => s.setName('enable').setDescription('Enable starboard'))
  .addSubcommand((s) => s.setName('disable').setDescription('Disable starboard'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const { guild } = interaction;

  if (sub === 'setup') {
    const channel = interaction.options.getChannel('channel');
    const threshold = interaction.options.getInteger('threshold') || 3;
    const emoji = interaction.options.getString('emoji') || '⭐';

    db.prepare(`
      INSERT INTO starboard_settings (guild_id, enabled, channel_id, threshold, emoji)
      VALUES (?, 1, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET enabled = 1, channel_id = ?, threshold = ?, emoji = ?
    `).run(guild.id, channel.id, threshold, emoji, channel.id, threshold, emoji);

    return interaction.reply({ embeds: [successEmbed('Starboard Setup', `Starboard configured!\n• Channel: <#${channel.id}>\n• Threshold: ${threshold} ${emoji}`)], ephemeral: true });
  }

  if (sub === 'enable') {
    db.prepare('UPDATE starboard_settings SET enabled = 1 WHERE guild_id = ?').run(guild.id);
    return interaction.reply({ embeds: [successEmbed('Enabled', 'Starboard enabled!')], ephemeral: true });
  }

  if (sub === 'disable') {
    db.prepare('UPDATE starboard_settings SET enabled = 0 WHERE guild_id = ?').run(guild.id);
    return interaction.reply({ embeds: [successEmbed('Disabled', 'Starboard disabled.')], ephemeral: true });
  }
}
