import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { auditLog } from '../../plugins/auditLog/logger.js';
import { parseTime } from '../../utils/parseTime.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a member from the server')
  .addUserOption((o) => o.setName('user').setDescription('Member to ban').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason for ban'))
  .addStringOption((o) => o.setName('duration').setDescription('Temp ban duration (e.g. 7d, 24h)'))
  .addIntegerOption((o) => o.setName('delete_messages').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
  const target = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const durationStr = interaction.options.getString('duration');
  const deleteMessages = interaction.options.getInteger('delete_messages') ?? 0;
  const { guild, user: mod } = interaction;

  const member = guild.members.cache.get(target.id);
  if (member) {
    if (!member.bannable) {
      return interaction.reply({ embeds: [errorEmbed('Cannot Ban', 'This member cannot be banned (higher role or bot owner).')], ephemeral: true });
    }
  }

  await interaction.deferReply();

  try {
    await guild.members.ban(target.id, { reason: `${mod.tag}: ${reason}`, deleteMessageSeconds: deleteMessages * 86400 });

    db.prepare('INSERT INTO infractions (guild_id, user_id, moderator_id, type, reason) VALUES (?, ?, ?, ?, ?)').run(guild.id, target.id, mod.id, 'ban', reason);

    // Temp ban
    if (durationStr) {
      const duration = parseTime(durationStr);
      if (duration) {
        const expiresAt = Math.floor((Date.now() + duration) / 1000);
        db.prepare('INSERT INTO temp_punishments (guild_id, user_id, type, expires_at) VALUES (?, ?, ?, ?)').run(guild.id, target.id, 'ban', expiresAt);
      }
    }

    await auditLog(guild, 'MODERATION', { action: 'Ban', user: target, mod, reason });

    await interaction.editReply({ embeds: [successEmbed('Banned', `**${target.tag}** has been banned.\n**Reason:** ${reason}${durationStr ? `\n**Duration:** ${durationStr}` : ''}`)] });
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed('Ban Failed', err.message)] });
  }
}
