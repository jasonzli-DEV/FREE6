import RSSParser from 'rss-parser';
import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

const parser = new RSSParser();

/**
 * Check all RSS feed subscriptions for new items.
 * No API key required — uses the public RSS/Atom feeds directly.
 */
export async function checkRSSFeeds(client) {
  const feeds = db.prepare('SELECT * FROM rss_feeds').all();
  if (!feeds.length) return;

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.feed_url);
      if (!parsed.items?.length) continue;

      const latest = parsed.items[0];
      const latestId = latest.guid || latest.link || latest.title;

      // Skip if already posted
      if (latestId === feed.last_item_id) continue;

      // First run — store item ID but don't post
      if (!feed.last_item_id) {
        db.prepare('UPDATE rss_feeds SET last_item_id = ?, last_checked = ? WHERE id = ?')
          .run(latestId, Math.floor(Date.now() / 1000), feed.id);
        continue;
      }

      // Check plugin enabled
      const pluginEnabled = db.prepare('SELECT enabled FROM plugin_settings WHERE guild_id = ? AND plugin_name = ?')
        .get(feed.guild_id, 'rss-feeds');
      if (!pluginEnabled?.enabled) continue;

      const guild = client.guilds.cache.get(feed.guild_id);
      if (!guild) continue;
      const channel = guild.channels.cache.get(feed.channel_id);
      if (!channel) continue;

      const title = latest.title || 'New Post';
      const link = latest.link || '';
      const feedName = feed.feed_name || parsed.title || feed.feed_url;

      const message = (feed.message || '📰 **{feed}** has a new post!\n**{title}**\n{url}')
        .replace(/{feed}/g, feedName)
        .replace(/{title}/g, title)
        .replace(/{url}/g, link);

      await channel.send(message);

      db.prepare('UPDATE rss_feeds SET last_item_id = ?, last_checked = ? WHERE id = ?')
        .run(latestId, Math.floor(Date.now() / 1000), feed.id);

    } catch (err) {
      logger.warn(`RSS feed check failed for ${feed.feed_url}: ${err.message}`);
    }
  }
}
