import RSSParser from 'rss-parser';
import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

const parser = new RSSParser();

/**
 * Check all Reddit subreddit subscriptions for new posts.
 * Uses Reddit's public RSS feeds — no API key or auth required.
 * Feed URL: https://www.reddit.com/r/{subreddit}/new/.rss
 */
export async function checkRedditAlerts(client) {
  const alerts = db.prepare('SELECT * FROM reddit_alerts').all();
  if (!alerts.length) return;

  for (const alert of alerts) {
    try {
      // Reddit provides public RSS feeds for every subreddit
      const sub = alert.subreddit.replace(/^r\//, '').replace(/^\/r\//, '');
      const feedUrl = `https://www.reddit.com/r/${sub}/new/.rss`;

      const parsed = await parser.parseURL(feedUrl);
      if (!parsed.items?.length) continue;

      const latest = parsed.items[0];
      const latestId = latest.id || latest.guid || latest.link;

      // Skip if already posted
      if (latestId === alert.last_post_id) continue;

      // First run — store post ID but don't spam
      if (!alert.last_post_id) {
        db.prepare('UPDATE reddit_alerts SET last_post_id = ?, last_checked = ? WHERE id = ?')
          .run(latestId, Math.floor(Date.now() / 1000), alert.id);
        continue;
      }

      // Check plugin enabled
      const pluginEnabled = db.prepare('SELECT enabled FROM plugin_settings WHERE guild_id = ? AND plugin_name = ?')
        .get(alert.guild_id, 'reddit');
      if (!pluginEnabled?.enabled) continue;

      const guild = client.guilds.cache.get(alert.guild_id);
      if (!guild) continue;
      const channel = guild.channels.cache.get(alert.channel_id);
      if (!channel) continue;

      const title = latest.title || 'New Post';
      const link = latest.link || `https://www.reddit.com/r/${sub}`;
      const author = latest.creator || latest.author || 'someone';

      const message = (alert.message || '🔴 New post in **r/{subreddit}** by u/{author}\n**{title}**\n{url}')
        .replace(/{subreddit}/g, sub)
        .replace(/{title}/g, title)
        .replace(/{url}/g, link)
        .replace(/{author}/g, author);

      await channel.send(message);

      db.prepare('UPDATE reddit_alerts SET last_post_id = ?, last_checked = ? WHERE id = ?')
        .run(latestId, Math.floor(Date.now() / 1000), alert.id);

    } catch (err) {
      logger.warn(`Reddit alert check failed for r/${alert.subreddit}: ${err.message}`);
    }
  }
}
