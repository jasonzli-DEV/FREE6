import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

/** XP needed to reach a given level */
export function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

/** Total XP needed from level 0 to a given level */
export function totalXPForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

export async function processXP(message) {
  const { guild, author, channel } = message;

  try {
    const settings = db
      .prepare('SELECT * FROM level_settings WHERE guild_id = ?')
      .get(guild.id);

    if (settings && !settings.enabled) return;

    // Check no-xp channels and roles
    if (settings) {
      let noXpChannels = [];
      let noXpRoles = [];
      try { noXpChannels = JSON.parse(settings.no_xp_channels); } catch {}
      try { noXpRoles = JSON.parse(settings.no_xp_roles); } catch {}

      if (noXpChannels.includes(channel.id)) return;
      const member = guild.members.cache.get(author.id);
      if (member && noXpRoles.some((r) => member.roles.cache.has(r))) return;
    }

    // Cooldown check
    const cooldown = settings?.xp_cooldown ?? 60;
    const existing = db
      .prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?')
      .get(guild.id, author.id);

    const now = Math.floor(Date.now() / 1000);
    if (existing && now - existing.last_message < cooldown) return;

    // Award random XP
    const xpMin = settings?.xp_min ?? 15;
    const xpMax = settings?.xp_max ?? 25;
    const gained = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;

    if (!existing) {
      db.prepare(
        'INSERT INTO levels (guild_id, user_id, xp, level, total_xp, last_message) VALUES (?, ?, ?, 0, ?, ?)'
      ).run(guild.id, author.id, gained, gained, now);
    } else {
      const newXP = existing.xp + gained;
      const newTotalXP = existing.total_xp + gained;
      const threshold = xpForLevel(existing.level);

      if (newXP >= threshold) {
        // Level up!
        const newLevel = existing.level + 1;
        const remainingXP = newXP - threshold;

        db.prepare(
          'UPDATE levels SET xp = ?, level = ?, total_xp = ?, last_message = ? WHERE guild_id = ? AND user_id = ?'
        ).run(remainingXP, newLevel, newTotalXP, now, guild.id, author.id);

        await handleLevelUp(message, newLevel, settings);
        await checkLevelRoles(message.member, guild, newLevel);
      } else {
        db.prepare(
          'UPDATE levels SET xp = ?, total_xp = ?, last_message = ? WHERE guild_id = ? AND user_id = ?'
        ).run(newXP, newTotalXP, now, guild.id, author.id);
      }
    }
  } catch (err) {
    logger.error('XP processing error:', err);
  }
}

async function handleLevelUp(message, level, settings) {
  const { guild, author } = message;

  let announceMessage = settings?.announce_message ||
    'GG {user}, you just advanced to **level {level}**!';

  announceMessage = announceMessage
    .replace('{user}', `<@${author.id}>`)
    .replace('{level}', level)
    .replace('{username}', author.username)
    .replace('{server}', guild.name);

  const embed = new EmbedBuilder()
    .setColor(0xfaa61a)
    .setDescription(announceMessage)
    .setThumbnail(author.displayAvatarURL());

  try {
    if (settings?.announce_dm) {
      const dm = await author.createDM();
      await dm.send({ embeds: [embed] });
    } else {
      const channelId = settings?.announce_channel || message.channel.id;
      const channel = guild.channels.cache.get(channelId) || message.channel;
      await channel.send({ embeds: [embed] });
    }
  } catch {}
}

async function checkLevelRoles(member, guild, level) {
  if (!member) return;
  const roles = db
    .prepare('SELECT * FROM level_roles WHERE guild_id = ? AND level <= ? ORDER BY level DESC')
    .all(guild.id, level);

  for (const row of roles) {
    try {
      const role = guild.roles.cache.get(row.role_id);
      if (role && !member.roles.cache.has(row.role_id)) {
        await member.roles.add(role);
      }
    } catch {}
  }
}
