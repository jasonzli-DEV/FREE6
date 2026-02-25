import { EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

export async function handleStarReaction(reaction, user) {
  const { message, emoji } = reaction;
  const guild = message.guild;
  if (!guild) return;

  const settings = db.prepare('SELECT * FROM starboard_settings WHERE guild_id = ?').get(guild.id);
  if (!settings || !settings.enabled || !settings.channel_id) return;

  const starEmoji = settings.emoji || '⭐';
  if (emoji.name !== starEmoji) return;
  if (settings.ignore_bots && message.author?.bot) return;
  if (message.channel.id === settings.channel_id) return;

  // Count stars
  const starReaction = message.reactions.cache.find((r) => r.emoji.name === starEmoji);
  const starCount = starReaction ? starReaction.count : 0;

  const threshold = settings.threshold || 3;

  const starboardChannel = guild.channels.cache.get(settings.channel_id);
  if (!starboardChannel) return;

  const existing = db.prepare(
    'SELECT * FROM starboard_messages WHERE guild_id = ? AND original_message_id = ?'
  ).get(guild.id, message.id);

  try {
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setAuthor({
        name: message.author?.tag || 'Unknown',
        iconURL: message.author?.displayAvatarURL(),
      })
      .setDescription(message.content || null)
      .addFields({ name: 'Source', value: `[Jump to message](${message.url})` })
      .setTimestamp(message.createdAt);

    // Attach image if any
    const img = message.attachments.find((a) => a.contentType?.startsWith('image/'));
    if (img) embed.setImage(img.url);

    const content = `${starEmoji} **${starCount}** | <#${message.channel.id}>`;

    if (!existing) {
      if (starCount < threshold) return;

      const sent = await starboardChannel.send({ content, embeds: [embed] });
      db.prepare(
        'INSERT INTO starboard_messages (guild_id, original_message_id, starboard_message_id, star_count) VALUES (?, ?, ?, ?)'
      ).run(guild.id, message.id, sent.id, starCount);

    } else {
      db.prepare(
        'UPDATE starboard_messages SET star_count = ? WHERE guild_id = ? AND original_message_id = ?'
      ).run(starCount, guild.id, message.id);

      if (existing.starboard_message_id) {
        try {
          const sbMsg = await starboardChannel.messages.fetch(existing.starboard_message_id);
          await sbMsg.edit({ content, embeds: [embed] });
        } catch {}
      }
    }
  } catch (err) {
    logger.error('Starboard error:', err);
  }
}

export async function updateStarboard() {} // placeholder
