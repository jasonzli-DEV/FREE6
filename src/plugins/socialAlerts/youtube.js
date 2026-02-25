import axios from 'axios';
import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

/**
 * Check all YouTube alert subscriptions for new videos.
 * Uses the YouTube Data API v3 (requires YOUTUBE_API_KEY).
 * Falls back to the public RSS feed if no API key is set.
 */
export async function checkYouTubeAlerts(client) {
  const alerts = db.prepare('SELECT * FROM youtube_alerts').all();
  if (!alerts.length) return;

  const apiKey = process.env.YOUTUBE_API_KEY;

  for (const alert of alerts) {
    try {
      let latestVideo = null;

      if (apiKey) {
        // Use YouTube Data API v3
        const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            channelId: alert.youtube_channel_id,
            maxResults: 1,
            order: 'date',
            type: 'video',
            key: apiKey,
          },
          timeout: 10000,
        });

        const items = res.data?.items;
        if (items?.length) {
          latestVideo = {
            id: items[0].id.videoId,
            title: items[0].snippet.title,
            url: `https://www.youtube.com/watch?v=${items[0].id.videoId}`,
            channel: items[0].snippet.channelTitle,
          };
        }
      } else {
        // Fallback: YouTube RSS feed (no API key needed)
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${alert.youtube_channel_id}`;
        const res = await axios.get(rssUrl, { timeout: 10000 });
        const xml = res.data;

        // Simple XML parsing for the first entry
        const entryMatch = xml.match(/<entry>[\s\S]*?<\/entry>/);
        if (entryMatch) {
          const entry = entryMatch[0];
          const videoId = entry.match(/<yt:videoId>([^<]+)/)?.[1];
          const title = entry.match(/<title>([^<]+)/)?.[1];
          const channelName = xml.match(/<author>\s*<name>([^<]+)/)?.[1];

          if (videoId) {
            latestVideo = {
              id: videoId,
              title: title || 'New Video',
              url: `https://www.youtube.com/watch?v=${videoId}`,
              channel: channelName || alert.youtube_channel_name || alert.youtube_channel_id,
            };
          }
        }
      }

      if (!latestVideo) continue;

      // Skip if this is the same video we already posted
      if (latestVideo.id === alert.last_video_id) continue;

      // First run — store the video ID but don't post (avoid spamming old videos)
      if (!alert.last_video_id) {
        db.prepare('UPDATE youtube_alerts SET last_video_id = ?, last_checked = ? WHERE id = ?')
          .run(latestVideo.id, Math.floor(Date.now() / 1000), alert.id);
        continue;
      }

      // New video found — post alert
      const guild = client.guilds.cache.get(alert.guild_id);
      if (!guild) continue;
      const channel = guild.channels.cache.get(alert.channel_id);
      if (!channel) continue;

      // Check if plugin is enabled for this guild
      const pluginEnabled = db.prepare('SELECT enabled FROM plugin_settings WHERE guild_id = ? AND plugin_name = ?')
        .get(alert.guild_id, 'youtube');
      if (!pluginEnabled?.enabled) continue;

      const message = (alert.message || '{channel} uploaded a new video!\n{url}')
        .replace(/{channel}/g, latestVideo.channel)
        .replace(/{url}/g, latestVideo.url)
        .replace(/{title}/g, latestVideo.title);

      await channel.send(message);

      db.prepare('UPDATE youtube_alerts SET last_video_id = ?, last_checked = ? WHERE id = ?')
        .run(latestVideo.id, Math.floor(Date.now() / 1000), alert.id);

    } catch (err) {
      logger.warn(`YouTube alert check failed for ${alert.youtube_channel_id}: ${err.message}`);
    }
  }
}
