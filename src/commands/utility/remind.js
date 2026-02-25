import { SlashCommandBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { parseTime, futureTimestamp } from '../../utils/parseTime.js';

export const data = new SlashCommandBuilder()
  .setName('remind')
  .setDescription('Set a reminder')
  .addStringOption((o) => o.setName('time').setDescription('When to remind you (e.g. 10m, 2h, 1d)').setRequired(true))
  .addStringOption((o) => o.setName('message').setDescription('What to remind you about').setRequired(true));

export async function execute(interaction) {
  const timeStr = interaction.options.getString('time');
  const message = interaction.options.getString('message');
  const { user, guild, channel } = interaction;

  const duration = parseTime(timeStr);
  if (!duration) return interaction.reply({ embeds: [errorEmbed('Invalid Time', 'Use formats like `10m`, `2h`, `1d`.')], ephemeral: true });
  if (duration > 30 * 24 * 60 * 60 * 1000) return interaction.reply({ embeds: [errorEmbed('Too Long', 'Max reminder time is 30 days.')], ephemeral: true });

  const remindAt = Math.floor((Date.now() + duration) / 1000);
  db.prepare('INSERT INTO reminders (user_id, guild_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?, ?)').run(user.id, guild.id, channel.id, message, remindAt);

  await interaction.reply({ embeds: [successEmbed('Reminder Set', `I'll remind you in **${timeStr}** about: ${message}\n📅 <t:${remindAt}:F>`)], ephemeral: true });
}
