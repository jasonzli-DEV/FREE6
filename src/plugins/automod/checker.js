import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';
import { PermissionFlagsBits } from 'discord.js';
import { auditLog } from '../auditLog/logger.js';

const spamMap = new Map(); // guildId:userId → [timestamps]

export async function checkAutomod(message) {
  const { guild, member, channel, content } = message;
  if (!guild) return;

  // Ignore admins
  if (member?.permissions.has(PermissionFlagsBits.Administrator)) return;

  const settings = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guild.id);
  if (!settings || !settings.enabled) return;

  // Ignore roles/channels
  let ignoreRoles = [], ignoreChannels = [];
  try { ignoreRoles = JSON.parse(settings.ignore_roles); } catch {}
  try { ignoreChannels = JSON.parse(settings.ignore_channels); } catch {}

  if (ignoreChannels.includes(channel.id)) return;
  if (ignoreRoles.some((r) => member?.roles.cache.has(r))) return;

  let violated = null;

  // 1. Anti-spam
  if (settings.anti_spam) {
    const key = `${guild.id}:${message.author.id}`;
    const now = Date.now();
    const times = spamMap.get(key) || [];
    times.push(now);
    // Keep only messages from the past 5 seconds
    const recent = times.filter((t) => now - t < 5000);
    spamMap.set(key, recent);
    if (recent.length >= 5) violated = 'Spam detected';
  }

  // 2. Anti-caps
  if (!violated && settings.anti_caps && content.length > 10) {
    const caps = content.replace(/[^A-Za-z]/g, '');
    if (caps.length > 0) {
      const capsPercent = (caps.replace(/[^A-Z]/g, '').length / caps.length) * 100;
      if (capsPercent >= (settings.caps_threshold || 70)) {
        violated = 'Excessive caps';
      }
    }
  }

  // 3. Anti-links
  if (!violated && settings.anti_links) {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    let allowedLinks = [];
    try { allowedLinks = JSON.parse(settings.allowed_links); } catch {}
    if (urlRegex.test(content)) {
      const isAllowed = allowedLinks.some((domain) => content.toLowerCase().includes(domain.toLowerCase()));
      if (!isAllowed) violated = 'Unauthorized link';
    }
  }

  // 4. Anti-Discord invites
  if (!violated && settings.anti_invites) {
    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
    let allowedInvites = [];
    try { allowedInvites = JSON.parse(settings.allowed_invites); } catch {}
    if (inviteRegex.test(content)) {
      const isAllowed = allowedInvites.some((code) => content.includes(code));
      if (!isAllowed) violated = 'Unauthorized Discord invite';
    }
  }

  // 5. Bad words
  if (!violated && settings.anti_bad_words) {
    let badWords = [];
    try { badWords = JSON.parse(settings.bad_words); } catch {}
    const lower = content.toLowerCase();
    if (badWords.some((w) => lower.includes(w.toLowerCase()))) {
      violated = 'Prohibited word';
    }
  }

  // 6. Emoji spam
  if (!violated && settings.anti_emoji_spam) {
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
    const emojiCount = (content.match(emojiRegex) || []).length;
    if (emojiCount > (settings.emoji_threshold || 10)) violated = 'Emoji spam';
  }

  // 7. Mention spam
  if (!violated && settings.anti_mention_spam) {
    const mentionCount = (message.mentions.users.size || 0) + (message.mentions.roles.size || 0);
    if (mentionCount > (settings.mention_threshold || 5)) violated = 'Mention spam';
  }

  if (!violated) return;

  // Take action
  try {
    await message.delete();
  } catch {}

  const action = settings.action || 'warn';
  await auditLog(guild, 'AUTOMOD', { user: message.author, reason: violated, channel });

  if (action === 'warn') {
    try {
      const warn = await message.channel.send(`⚠️ <@${message.author.id}> — **${violated}**`);
      setTimeout(() => warn.delete().catch(() => {}), 5000);
    } catch {}

    // Record infraction
    db.prepare(
      'INSERT INTO infractions (guild_id, user_id, moderator_id, type, reason) VALUES (?, ?, ?, ?, ?)'
    ).run(guild.id, message.author.id, message.client.user.id, 'warn', `[AutoMod] ${violated}`);

  } else if (action === 'mute') {
    try {
      const duration = settings.mute_duration || 300000;
      await member.timeout(duration, `[AutoMod] ${violated}`);
    } catch {}

  } else if (action === 'kick') {
    try {
      await member.kick(`[AutoMod] ${violated}`);
    } catch {}

  } else if (action === 'ban') {
    try {
      await member.ban({ reason: `[AutoMod] ${violated}`, deleteMessageSeconds: 86400 });
    } catch {}
  }
}
