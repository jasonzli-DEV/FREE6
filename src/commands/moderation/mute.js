import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { auditLog } from '../../plugins/auditLog/logger.js';
import { parseTime } from '../../utils/parseTime.js';

export const data = new SlashCommandBuilder()
  .setName('mute')
  .setDescription('Timeout (mute) a member')
  .addUserOption((o) => o.setName('user').setDescription('Member to mute').setRequired(true))
  .addStringOption((o) => o.setName('duration').setDescription('Duration (e.g. 10m, 1h, 1d)').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  const target = interaction.options.getUser('user');
  const durationStr = interaction.options.getString('duration');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const { guild, user: mod } = interaction;

  const duration = parseTime(durationStr);
  if (!duration) return interaction.reply({ embeds: [errorEmbed('Invalid Duration', 'Use formats like `10m`, `1h`, `1d`.')], ephemeral: true });
  if (duration > 28 * 24 * 60 * 60 * 1000) return interaction.reply({ embeds: [errorEmbed('Too Long', 'Max timeout is 28 days.')], ephemeral: true });

  const member = guild.members.cache.get(target.id);
  if (!member) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Member not found.')], ephemeral: true });
  if (!member.moderatable) return interaction.reply({ embeds: [errorEmbed('Cannot Mute', 'This member cannot be timed out.')], ephemeral: true });

  await interaction.deferReply();
  try {
    await member.timeout(duration, `${mod.tag}: ${reason}`);
    db.prepare('INSERT INTO infractions (guild_id, user_id, moderator_id, type, reason, duration) VALUES (?, ?, ?, ?, ?, ?)').run(guild.id, target.id, mod.id, 'mute', reason, duration);
    await auditLog(guild, 'MODERATION', { action: 'Mute', user: target, mod, reason });
    await interaction.editReply({ embeds: [successEmbed('Muted', `**${target.tag}** has been muted for **${durationStr}**.\n**Reason:** ${reason}`)] });
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed('Mute Failed', err.message)] });
  }
}
