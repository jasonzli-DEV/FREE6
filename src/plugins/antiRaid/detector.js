import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

const joinTracker = new Map(); // guildId → [timestamps]

export async function checkAntiRaid(member) {
  const { guild } = member;

  const settings = db.prepare('SELECT * FROM anti_raid_settings WHERE guild_id = ?').get(guild.id);
  if (!settings || !settings.enabled) return;

  if (settings.lockdown_active) {
    try {
      if (settings.action === 'kick') await member.kick('[Anti-Raid] Server in lockdown');
      else if (settings.action === 'ban') await member.ban({ reason: '[Anti-Raid] Server in lockdown' });
    } catch {}
    return;
  }

  const now = Date.now();
  const interval = (settings.join_interval || 10) * 1000;
  const threshold = settings.join_threshold || 10;

  const times = joinTracker.get(guild.id) || [];
  times.push(now);
  const recent = times.filter((t) => now - t < interval);
  joinTracker.set(guild.id, recent);

  if (recent.length >= threshold) {
    logger.warn(`[Anti-Raid] Raid detected in ${guild.name} (${guild.id})! ${recent.length} joins in ${settings.join_interval}s`);

    // Activate lockdown
    db.prepare('UPDATE anti_raid_settings SET lockdown_active = 1 WHERE guild_id = ?').run(guild.id);

    // Notify the configured alert channel from guild settings
    const settings2 = db.prepare('SELECT alert_channel FROM anti_raid_settings WHERE guild_id = ?').get(guild.id);
    if (settings2?.alert_channel) {
      try {
        const ch = guild.channels.cache.get(settings2.alert_channel);
        if (ch) await ch.send(`🚨 **Anti-Raid activated!** ${recent.length} members joined in ${settings.join_interval}s. Server is in lockdown. Use \`/antiraid unlock\` to disable.`);
      } catch {}
    }
  }
}
