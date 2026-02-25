import cron from 'node-cron';
import { db } from '../database/db.js';
import { logger } from '../utils/logger.js';
import { endGiveaway } from './giveaways/handler.js';
import { checkYouTubeAlerts } from './socialAlerts/youtube.js';
import { checkRSSFeeds } from './socialAlerts/rss.js';
import { checkRedditAlerts } from './socialAlerts/reddit.js';

export function startSchedulers(client) {
  // ── Giveaways (every minute) ──────────────────────────────────────────
  cron.schedule('* * * * *', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = db.prepare('SELECT id FROM giveaways WHERE ended = 0 AND ends_at <= ?').all(now);
    for (const g of expired) {
      await endGiveaway(client, g.id);
    }
  });

  // ── Temp punishments (every minute) ──────────────────────────────────
  cron.schedule('* * * * *', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = db.prepare(
      'SELECT * FROM temp_punishments WHERE active = 1 AND expires_at <= ?'
    ).all(now);

    for (const p of expired) {
      try {
        const guild = client.guilds.cache.get(p.guild_id);
        if (!guild) continue;

        if (p.type === 'ban') {
          await guild.members.unban(p.user_id, 'Temp ban expired');
        } else if (p.type === 'mute') {
          const member = await guild.members.fetch(p.user_id).catch(() => null);
          if (member) await member.timeout(null, 'Temp mute expired');
        }

        db.prepare('UPDATE temp_punishments SET active = 0 WHERE id = ?').run(p.id);
      } catch (err) {
        logger.warn(`Failed to lift punishment ${p.id}: ${err.message}`);
      }
    }
  });

  // ── Reminders (every minute) ──────────────────────────────────────────
  cron.schedule('* * * * *', async () => {
    const now = Math.floor(Date.now() / 1000);
    const due = db.prepare('SELECT * FROM reminders WHERE sent = 0 AND remind_at <= ?').all(now);

    for (const r of due) {
      try {
        const user = await client.users.fetch(r.user_id).catch(() => null);
        if (user) {
          const dm = await user.createDM();
          await dm.send(`⏰ **Reminder:** ${r.message}`);
        }
        db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(r.id);
      } catch {}
    }
  });

  // ── Birthdays (daily at midnight UTC) ────────────────────────────────
  cron.schedule('0 0 * * *', async () => {
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const birthdays = db.prepare(
      "SELECT b.*, s.channel_id, s.role_id, s.message FROM birthdays b JOIN birthday_settings s ON b.guild_id = s.guild_id WHERE s.enabled = 1 AND b.birthday LIKE ?"
    ).all(`%-${mmdd}`);

    for (const b of birthdays) {
      try {
        const guild = client.guilds.cache.get(b.guild_id);
        if (!guild) continue;

        const member = await guild.members.fetch(b.user_id).catch(() => null);
        if (!member) continue;

        // Birthday message
        if (b.channel_id) {
          const ch = guild.channels.cache.get(b.channel_id);
          if (ch) {
            const msg = (b.message || '🎂 Happy Birthday {user}! 🎉')
              .replace('{user}', `<@${b.user_id}>`)
              .replace('{username}', member.user.username);
            await ch.send(msg);
          }
        }

        // Birthday role
        if (b.role_id) {
          const role = guild.roles.cache.get(b.role_id);
          if (role) {
            await member.roles.add(role);
            // Remove tomorrow
            setTimeout(async () => {
              try { await member.roles.remove(role); } catch {}
            }, 24 * 60 * 60 * 1000);
          }
        }
      } catch {}
    }
  });

  // ── Timed messages ────────────────────────────────────────────────────
  const timedMessages = db.prepare('SELECT * FROM timed_messages WHERE enabled = 1').all();
  for (const tm of timedMessages) {
    try {
      cron.schedule(tm.cron, async () => {
        try {
          const g = client.guilds.cache.find((guild) =>
            guild.channels.cache.has(tm.channel_id)
          );
          if (!g) return;
          const ch = g.channels.cache.get(tm.channel_id);
          if (!ch) return;

          const payload = {};
          if (tm.message) payload.content = tm.message;
          if (tm.embed) {
            try { payload.embeds = [JSON.parse(tm.embed)]; } catch {}
          }

          await ch.send(payload);
          db.prepare('UPDATE timed_messages SET last_sent = ? WHERE id = ?').run(
            Math.floor(Date.now() / 1000), tm.id
          );
        } catch {}
      });
    } catch (err) {
      logger.warn(`Invalid cron for timed message ${tm.id}: ${err.message}`);
    }
  }

  // ── YouTube alerts (every 5 minutes) ───────────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkYouTubeAlerts(client);
    } catch (err) {
      logger.warn(`YouTube alert scheduler error: ${err.message}`);
    }
  });

  // ── RSS feed alerts (every 5 minutes) ──────────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkRSSFeeds(client);
    } catch (err) {
      logger.warn(`RSS feed scheduler error: ${err.message}`);
    }
  });

  // ── Reddit alerts (every 5 minutes) ───────────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkRedditAlerts(client);
    } catch (err) {
      logger.warn(`Reddit alert scheduler error: ${err.message}`);
    }
  });

  logger.info('Schedulers started');
}
