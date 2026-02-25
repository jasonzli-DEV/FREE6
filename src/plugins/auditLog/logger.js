import { EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

const EVENT_COLORS = {
  MESSAGE_DELETE: 0xed4245,
  MESSAGE_EDIT: 0x5865f2,
  MEMBER_BAN: 0xed4245,
  MEMBER_UNBAN: 0x57f287,
  MEMBER_JOIN: 0x57f287,
  MEMBER_LEAVE: 0xfee75c,
  MODERATION: 0xfaa61a,
  AUTOMOD: 0xfaa61a,
};

export async function auditLog(guild, event, data = {}) {
  if (!guild) return;

  const settings = db.prepare('SELECT log_channel FROM guild_settings WHERE guild_id = ?').get(guild.id);
  if (!settings?.log_channel) return;

  const logChannel = guild.channels.cache.get(settings.log_channel);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(EVENT_COLORS[event] || 0x99aab5)
    .setTimestamp();

  switch (event) {
    case 'MESSAGE_DELETE':
      embed
        .setTitle('🗑️ Message Deleted')
        .addFields(
          { name: 'Author', value: data.user ? `<@${data.user.id}> (${data.user.tag})` : 'Unknown', inline: true },
          { name: 'Channel', value: data.channel ? `<#${data.channel.id}>` : 'Unknown', inline: true },
          { name: 'Content', value: data.content ? data.content.substring(0, 1000) : '*No content*' }
        );
      break;

    case 'MESSAGE_EDIT':
      embed
        .setTitle('✏️ Message Edited')
        .addFields(
          { name: 'Author', value: data.user ? `<@${data.user.id}>` : 'Unknown', inline: true },
          { name: 'Channel', value: data.channel ? `<#${data.channel.id}>` : 'Unknown', inline: true },
          { name: 'Before', value: (data.before || '*empty*').substring(0, 512) },
          { name: 'After', value: (data.after || '*empty*').substring(0, 512) },
          { name: 'Jump', value: data.url ? `[Click here](${data.url})` : 'N/A', inline: true }
        );
      break;

    case 'MEMBER_BAN':
      embed
        .setTitle('🔨 Member Banned')
        .addFields(
          { name: 'User', value: data.user ? `<@${data.user.id}> (${data.user.tag})` : 'Unknown' },
          { name: 'Reason', value: data.reason || 'No reason provided' }
        );
      break;

    case 'MODERATION':
      embed
        .setTitle(`🛡️ Moderation Action`)
        .addFields(
          { name: 'Action', value: data.action || 'Unknown', inline: true },
          { name: 'User', value: data.user ? `<@${data.user.id}>` : 'Unknown', inline: true },
          { name: 'Moderator', value: data.mod ? `<@${data.mod.id}>` : 'System', inline: true },
          { name: 'Reason', value: data.reason || 'No reason provided' }
        );
      break;

    case 'AUTOMOD':
      embed
        .setTitle('🤖 AutoMod Action')
        .addFields(
          { name: 'User', value: data.user ? `<@${data.user.id}>` : 'Unknown', inline: true },
          { name: 'Channel', value: data.channel ? `<#${data.channel.id}>` : 'Unknown', inline: true },
          { name: 'Reason', value: data.reason || 'Unknown' }
        );
      break;

    default:
      embed.setDescription(JSON.stringify(data).substring(0, 2000));
  }

  try {
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    logger.error('Audit log send error:', err.message);
  }
}
