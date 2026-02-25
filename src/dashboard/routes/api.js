import { Router } from 'express';
import { db } from '../../database/db.js';
import { bot } from '../../bot.js';

export const apiRouter = Router();

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Verify user has Manage Server permission for the guild
function ensureGuildAccess(req, res, next) {
  const { guildId } = req.params;
  const userGuild = (req.user.guilds || []).find((g) => g.id === guildId);
  if (!userGuild || (BigInt(userGuild.permissions || 0) & BigInt(0x20)) !== BigInt(0x20)) {
    return res.status(403).json({ error: 'No permission' });
  }
  next();
}

// ── Guild Info ─────────────────────────────────────────────────────────────
apiRouter.get('/guilds', ensureAuth, (req, res) => {
  const guilds = (req.user.guilds || [])
    .filter((g) => (BigInt(g.permissions || 0) & BigInt(0x20)) === BigInt(0x20))
    .map((g) => ({ ...g, botPresent: bot.guilds.cache.has(g.id) }));
  res.json(guilds);
});

apiRouter.get('/guild/:guildId/channels', ensureAuth, ensureGuildAccess, (req, res) => {
  const guild = bot.guilds.cache.get(req.params.guildId);
  if (!guild) return res.json([]);
  const channels = guild.channels.cache
    .filter((c) => c.type === 0) // text channels
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(channels);
});

apiRouter.get('/guild/:guildId/roles', ensureAuth, ensureGuildAccess, (req, res) => {
  const guild = bot.guilds.cache.get(req.params.guildId);
  if (!guild) return res.json([]);
  const roles = guild.roles.cache
    .filter((r) => r.id !== guild.id && !r.managed)
    .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(roles);
});

// ══════════════════════════════════════════════════════════════════════════
// PLUGIN SETTINGS (enable/disable per guild)
// ══════════════════════════════════════════════════════════════════════════

const ALL_PLUGINS = [
  // Essentials
  { name: 'welcome', label: 'Welcome & Goodbye', category: 'essentials', icon: '👋', description: 'Greet new members and say goodbye when they leave.' },
  { name: 'reaction-roles', label: 'Reaction Roles', category: 'essentials', icon: '🎭', description: 'Let members self-assign roles by reacting to messages.' },
  { name: 'moderator', label: 'Moderator', category: 'essentials', icon: '🛡️', description: 'Auto-moderation filters for spam, links, caps, and bad words.' },
  { name: 'levels', label: 'Levels', category: 'essentials', icon: '⭐', description: 'XP-based leveling with rank cards, role rewards, and leaderboards.' },
  { name: 'starboard', label: 'Starboards', category: 'essentials', icon: '🌟', description: 'Pin the best messages to a starboard channel.' },
  // Server Management
  { name: 'automations', label: 'Automations', category: 'server-management', icon: '⚡', description: 'Set up automated actions triggered by events.' },
  { name: 'custom-commands', label: 'Custom Commands', category: 'server-management', icon: '🔧', description: 'Create custom slash commands with text or embed responses.' },
  { name: 'invite-tracker', label: 'Invite Tracker', category: 'server-management', icon: '📨', description: 'Track who invited whom and monitor invite stats.' },
  { name: 'ticketing', label: 'Ticketing', category: 'server-management', icon: '🎫', description: 'Support ticket system with panels, logs, and transcripts.' },
  // Utilities
  { name: 'polls', label: 'Polls', category: 'utilities', icon: '📊', description: 'Create multi-option polls with reaction-based voting.' },
  { name: 'embed-messages', label: 'Embed Messages', category: 'utilities', icon: '📝', description: 'Build and send rich embed messages to any channel.' },
  { name: 'reminders', label: 'Reminders', category: 'utilities', icon: '⏰', description: 'Set personal or channel reminders.' },
  { name: 'temp-channels', label: 'Temporary Channels', category: 'utilities', icon: '🔊', description: 'Auto-create temporary voice channels on join.' },
  // Social Alerts
  { name: 'youtube', label: 'YouTube', category: 'social-alerts', icon: '📺', description: 'Get notified when a YouTube channel uploads a new video.' },
  { name: 'rss-feeds', label: 'RSS Feeds', category: 'social-alerts', icon: '📡', description: 'Follow any RSS feed and post new items to a channel.' },
  { name: 'reddit', label: 'Reddit', category: 'social-alerts', icon: '🔗', description: 'Get notified of new posts in subreddits.' },
  // Games & Fun
  { name: 'giveaways', label: 'Giveaways', category: 'games-fun', icon: '🎉', description: 'Host timed giveaways with reaction entries and re-rolls.' },
  { name: 'birthdays', label: 'Birthdays', category: 'games-fun', icon: '🎂', description: 'Track member birthdays and auto-announce them.' },
  { name: 'economy', label: 'Economy', category: 'games-fun', icon: '💰', description: 'Virtual currency with daily rewards, gambling, and a shop.' },
];

apiRouter.get('/guild/:guildId/plugins', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const rows = db.prepare('SELECT plugin_name, enabled FROM plugin_settings WHERE guild_id = ?').all(guildId);
  const enabledMap = {};
  rows.forEach((r) => { enabledMap[r.plugin_name] = r.enabled; });

  const plugins = ALL_PLUGINS.map((p) => ({
    ...p,
    enabled: enabledMap[p.name] ?? 0,
  }));
  res.json(plugins);
});

apiRouter.post('/guild/:guildId/plugins/:pluginName/toggle', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId, pluginName } = req.params;
  const { enabled } = req.body;
  db.prepare(`
    INSERT INTO plugin_settings (guild_id, plugin_name, enabled) VALUES (?, ?, ?)
    ON CONFLICT(guild_id, plugin_name) DO UPDATE SET enabled = ?
  `).run(guildId, pluginName, enabled ? 1 : 0, enabled ? 1 : 0);
  res.json({ success: true, enabled: enabled ? 1 : 0 });
});

// ══════════════════════════════════════════════════════════════════════════
// LEVELING
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/levels', ensureAuth, ensureGuildAccess, (req, res) => {
  const settings = db.prepare('SELECT * FROM level_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  const roles = db.prepare('SELECT * FROM level_roles WHERE guild_id = ? ORDER BY level ASC').all(req.params.guildId);
  res.json({ ...settings, roles });
});

apiRouter.post('/guild/:guildId/levels', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { enabled, announce_channel, announce_message, xp_min, xp_max, xp_cooldown, no_xp_channels, no_xp_roles } = req.body;

  db.prepare(`
    INSERT INTO level_settings (guild_id, enabled, announce_channel, announce_message, xp_min, xp_max, xp_cooldown, no_xp_channels, no_xp_roles)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET enabled=?, announce_channel=?, announce_message=?, xp_min=?, xp_max=?, xp_cooldown=?, no_xp_channels=?, no_xp_roles=?
  `).run(guildId, enabled ? 1 : 0, announce_channel || null, announce_message || null,
    xp_min || 15, xp_max || 25, xp_cooldown || 60,
    JSON.stringify(no_xp_channels || []), JSON.stringify(no_xp_roles || []),
    enabled ? 1 : 0, announce_channel || null, announce_message || null,
    xp_min || 15, xp_max || 25, xp_cooldown || 60,
    JSON.stringify(no_xp_channels || []), JSON.stringify(no_xp_roles || []));

  res.json({ success: true });
});

apiRouter.post('/guild/:guildId/levels/roles', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { level, role_id } = req.body;
  db.prepare('INSERT OR REPLACE INTO level_roles (guild_id, level, role_id) VALUES (?, ?, ?)').run(guildId, level, role_id);
  res.json({ success: true });
});

apiRouter.delete('/guild/:guildId/levels/roles/:level', ensureAuth, ensureGuildAccess, (req, res) => {
  db.prepare('DELETE FROM level_roles WHERE guild_id = ? AND level = ?').run(req.params.guildId, req.params.level);
  res.json({ success: true });
});

apiRouter.get('/guild/:guildId/leaderboard', (req, res) => {
  const rows = db.prepare('SELECT * FROM levels WHERE guild_id = ? ORDER BY total_xp DESC LIMIT 100').all(req.params.guildId);
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════════
// WELCOME & GOODBYE
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/welcome', ensureAuth, ensureGuildAccess, (req, res) => {
  const welcome = db.prepare('SELECT * FROM welcome_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  const goodbye = db.prepare('SELECT * FROM goodbye_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  res.json({ welcome, goodbye });
});

apiRouter.post('/guild/:guildId/welcome', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { welcome, goodbye } = req.body;

  if (welcome) {
    db.prepare(`
      INSERT INTO welcome_settings (guild_id, enabled, channel_id, message, card_enabled, card_background, card_color, auto_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET enabled=?, channel_id=?, message=?, card_enabled=?, card_background=?, card_color=?, auto_role=?
    `).run(guildId,
      welcome.enabled ? 1 : 0, welcome.channel_id || null, welcome.message || null,
      welcome.card_enabled ? 1 : 0, welcome.card_background || null, welcome.card_color || '#ffffff',
      JSON.stringify(welcome.auto_role || []),
      welcome.enabled ? 1 : 0, welcome.channel_id || null, welcome.message || null,
      welcome.card_enabled ? 1 : 0, welcome.card_background || null, welcome.card_color || '#ffffff',
      JSON.stringify(welcome.auto_role || []));
  }

  if (goodbye) {
    db.prepare(`
      INSERT INTO goodbye_settings (guild_id, enabled, channel_id, message)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET enabled=?, channel_id=?, message=?
    `).run(guildId, goodbye.enabled ? 1 : 0, goodbye.channel_id || null, goodbye.message || null,
      goodbye.enabled ? 1 : 0, goodbye.channel_id || null, goodbye.message || null);
  }

  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// MODERATOR / AUTOMOD
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/automod', ensureAuth, ensureGuildAccess, (req, res) => {
  const settings = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  res.json(settings);
});

apiRouter.post('/guild/:guildId/automod', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const b = req.body;

  db.prepare(`
    INSERT INTO automod_settings (guild_id, enabled, anti_spam, anti_caps, caps_threshold, anti_links, allowed_links,
      anti_invites, allowed_invites, anti_bad_words, bad_words, anti_emoji_spam, emoji_threshold,
      anti_mention_spam, mention_threshold, ignore_roles, ignore_channels, action, mute_duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET enabled=?, anti_spam=?, anti_caps=?, caps_threshold=?, anti_links=?, allowed_links=?,
      anti_invites=?, allowed_invites=?, anti_bad_words=?, bad_words=?, anti_emoji_spam=?, emoji_threshold=?,
      anti_mention_spam=?, mention_threshold=?, ignore_roles=?, ignore_channels=?, action=?, mute_duration=?
  `).run(guildId,
    b.enabled ? 1 : 0, b.anti_spam ? 1 : 0, b.anti_caps ? 1 : 0, b.caps_threshold || 70,
    b.anti_links ? 1 : 0, JSON.stringify(b.allowed_links || []),
    b.anti_invites ? 1 : 0, JSON.stringify(b.allowed_invites || []),
    b.anti_bad_words ? 1 : 0, JSON.stringify(b.bad_words || []),
    b.anti_emoji_spam ? 1 : 0, b.emoji_threshold || 10,
    b.anti_mention_spam ? 1 : 0, b.mention_threshold || 5,
    JSON.stringify(b.ignore_roles || []), JSON.stringify(b.ignore_channels || []),
    b.action || 'warn', b.mute_duration || 300000,
    b.enabled ? 1 : 0, b.anti_spam ? 1 : 0, b.anti_caps ? 1 : 0, b.caps_threshold || 70,
    b.anti_links ? 1 : 0, JSON.stringify(b.allowed_links || []),
    b.anti_invites ? 1 : 0, JSON.stringify(b.allowed_invites || []),
    b.anti_bad_words ? 1 : 0, JSON.stringify(b.bad_words || []),
    b.anti_emoji_spam ? 1 : 0, b.emoji_threshold || 10,
    b.anti_mention_spam ? 1 : 0, b.mention_threshold || 5,
    JSON.stringify(b.ignore_roles || []), JSON.stringify(b.ignore_channels || []),
    b.action || 'warn', b.mute_duration || 300000);

  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// STARBOARD
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/starboard', ensureAuth, ensureGuildAccess, (req, res) => {
  const settings = db.prepare('SELECT * FROM starboard_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  res.json(settings);
});

apiRouter.post('/guild/:guildId/starboard', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { enabled, channel_id, threshold, emoji } = req.body;
  db.prepare(`
    INSERT INTO starboard_settings (guild_id, enabled, channel_id, threshold, emoji)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET enabled=?, channel_id=?, threshold=?, emoji=?
  `).run(guildId, enabled ? 1 : 0, channel_id || null, threshold || 3, emoji || '⭐',
    enabled ? 1 : 0, channel_id || null, threshold || 3, emoji || '⭐');
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// CUSTOM COMMANDS
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/commands', ensureAuth, ensureGuildAccess, (req, res) => {
  const cmds = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?').all(req.params.guildId);
  res.json(cmds);
});

apiRouter.post('/guild/:guildId/commands', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { name, description, response, actions } = req.body;
  try {
    db.prepare('INSERT OR REPLACE INTO custom_commands (guild_id, name, description, response, actions) VALUES (?, ?, ?, ?, ?)')
      .run(guildId, name, description || 'A custom command', response, JSON.stringify(actions || []));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/guild/:guildId/commands/:id', ensureAuth, ensureGuildAccess, (req, res) => {
  db.prepare('DELETE FROM custom_commands WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// TICKETING
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/ticketing', ensureAuth, ensureGuildAccess, (req, res) => {
  const settings = db.prepare('SELECT * FROM ticket_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  const tickets = db.prepare('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.guildId);
  res.json({ settings, tickets });
});

apiRouter.post('/guild/:guildId/ticketing', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { enabled, category_id, support_role, log_channel } = req.body;
  db.prepare(`
    INSERT INTO ticket_settings (guild_id, enabled, category_id, support_role, log_channel)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET enabled=?, category_id=?, support_role=?, log_channel=?
  `).run(guildId, enabled ? 1 : 0, category_id || null, support_role || null, log_channel || null,
    enabled ? 1 : 0, category_id || null, support_role || null, log_channel || null);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// INVITE TRACKER
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/invite-tracker', ensureAuth, ensureGuildAccess, (req, res) => {
  const invites = db.prepare('SELECT * FROM invite_counts WHERE guild_id = ? ORDER BY real DESC LIMIT 50').all(req.params.guildId);
  res.json(invites);
});

// ══════════════════════════════════════════════════════════════════════════
// AUTOMATIONS
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/automations', ensureAuth, ensureGuildAccess, (req, res) => {
  const automations = db.prepare('SELECT * FROM automations WHERE guild_id = ?').all(req.params.guildId);
  res.json(automations);
});

apiRouter.post('/guild/:guildId/automations', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { name, trigger_type, trigger_value, conditions, actions } = req.body;
  try {
    db.prepare('INSERT INTO automations (guild_id, name, trigger_type, trigger_value, conditions, actions) VALUES (?, ?, ?, ?, ?, ?)')
      .run(guildId, name, trigger_type, JSON.stringify(trigger_value || null), JSON.stringify(conditions || []), JSON.stringify(actions));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/guild/:guildId/automations/:id', ensureAuth, ensureGuildAccess, (req, res) => {
  db.prepare('DELETE FROM automations WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// TEMPORARY CHANNELS
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/temp-channels', ensureAuth, ensureGuildAccess, (req, res) => {
  const settings = db.prepare('SELECT * FROM temp_channel_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  res.json(settings);
});

apiRouter.post('/guild/:guildId/temp-channels', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { enabled, trigger_channel_id, category_id } = req.body;
  db.prepare(`
    INSERT INTO temp_channel_settings (guild_id, enabled, trigger_channel_id, category_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET enabled=?, trigger_channel_id=?, category_id=?
  `).run(guildId, enabled ? 1 : 0, trigger_channel_id || null, category_id || null,
    enabled ? 1 : 0, trigger_channel_id || null, category_id || null);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// BIRTHDAYS
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/birthdays', ensureAuth, ensureGuildAccess, (req, res) => {
  const settings = db.prepare('SELECT * FROM birthday_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  const list = db.prepare('SELECT * FROM birthdays WHERE guild_id = ? ORDER BY birthday ASC').all(req.params.guildId);
  res.json({ settings, list });
});

apiRouter.post('/guild/:guildId/birthdays', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { enabled, channel_id, role_id, message } = req.body;
  db.prepare(`
    INSERT INTO birthday_settings (guild_id, enabled, channel_id, role_id, message)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET enabled=?, channel_id=?, role_id=?, message=?
  `).run(guildId, enabled ? 1 : 0, channel_id || null, role_id || null, message || null,
    enabled ? 1 : 0, channel_id || null, role_id || null, message || null);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// REACTION ROLES
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/reaction-roles', ensureAuth, ensureGuildAccess, (req, res) => {
  const roles = db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?').all(req.params.guildId);
  res.json(roles);
});

apiRouter.post('/guild/:guildId/reaction-roles', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { channel_id, message_id, emoji, role_id, mode } = req.body;
  try {
    db.prepare('INSERT INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id, mode) VALUES (?, ?, ?, ?, ?, ?)')
      .run(guildId, channel_id, message_id, emoji, role_id, mode || 'normal');
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/guild/:guildId/reaction-roles/:id', ensureAuth, ensureGuildAccess, (req, res) => {
  db.prepare('DELETE FROM reaction_roles WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// YOUTUBE ALERTS
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/youtube', ensureAuth, ensureGuildAccess, (req, res) => {
  const alerts = db.prepare('SELECT * FROM youtube_alerts WHERE guild_id = ?').all(req.params.guildId);
  res.json(alerts);
});

apiRouter.post('/guild/:guildId/youtube', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { channel_id, youtube_channel_id, youtube_channel_name, message } = req.body;
  try {
    db.prepare('INSERT INTO youtube_alerts (guild_id, channel_id, youtube_channel_id, youtube_channel_name, message) VALUES (?, ?, ?, ?, ?)')
      .run(guildId, channel_id, youtube_channel_id, youtube_channel_name || '', message || '{channel} uploaded a new video!\n{url}');
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/guild/:guildId/youtube/:id', ensureAuth, ensureGuildAccess, (req, res) => {
  db.prepare('DELETE FROM youtube_alerts WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// RSS FEEDS
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/rss-feeds', ensureAuth, ensureGuildAccess, (req, res) => {
  const feeds = db.prepare('SELECT * FROM rss_feeds WHERE guild_id = ?').all(req.params.guildId);
  res.json(feeds);
});

apiRouter.post('/guild/:guildId/rss-feeds', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { channel_id, feed_url, feed_name, message } = req.body;
  try {
    db.prepare('INSERT INTO rss_feeds (guild_id, channel_id, feed_url, feed_name, message) VALUES (?, ?, ?, ?, ?)')
      .run(guildId, channel_id, feed_url, feed_name || '', message || 'New post from {feed}: **{title}**\n{url}');
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/guild/:guildId/rss-feeds/:id', ensureAuth, ensureGuildAccess, (req, res) => {
  db.prepare('DELETE FROM rss_feeds WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// REDDIT ALERTS
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/reddit', ensureAuth, ensureGuildAccess, (req, res) => {
  const alerts = db.prepare('SELECT * FROM reddit_alerts WHERE guild_id = ?').all(req.params.guildId);
  res.json(alerts);
});

apiRouter.post('/guild/:guildId/reddit', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { channel_id, subreddit, message } = req.body;
  try {
    db.prepare('INSERT INTO reddit_alerts (guild_id, channel_id, subreddit, message) VALUES (?, ?, ?, ?)')
      .run(guildId, channel_id, subreddit.replace(/^r\//, ''), message || 'New post in r/{subreddit}: **{title}**\n{url}');
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/guild/:guildId/reddit/:id', ensureAuth, ensureGuildAccess, (req, res) => {
  db.prepare('DELETE FROM reddit_alerts WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// EMBED MESSAGES
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/embeds', ensureAuth, ensureGuildAccess, (req, res) => {
  const embeds = db.prepare('SELECT * FROM embed_messages WHERE guild_id = ? ORDER BY created_at DESC').all(req.params.guildId);
  res.json(embeds);
});

apiRouter.post('/guild/:guildId/embeds', ensureAuth, ensureGuildAccess, async (req, res) => {
  const { guildId } = req.params;
  const { name, channel_id, embed_data } = req.body;
  try {
    const guild = bot.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channel_id);
    let message_id = null;

    if (channel) {
      const sent = await channel.send({ embeds: [embed_data] });
      message_id = sent.id;
    }

    db.prepare('INSERT INTO embed_messages (guild_id, name, channel_id, message_id, embed_data) VALUES (?, ?, ?, ?, ?)')
      .run(guildId, name || 'Untitled', channel_id, message_id, JSON.stringify(embed_data));
    res.json({ success: true, message_id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/guild/:guildId/embeds/:id', ensureAuth, ensureGuildAccess, (req, res) => {
  db.prepare('DELETE FROM embed_messages WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/stats', ensureAuth, ensureGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM levels WHERE guild_id = ?').get(guildId);
  const infractionCount = db.prepare('SELECT COUNT(*) as count FROM infractions WHERE guild_id = ?').get(guildId);
  const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?').get(guildId);
  const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = 'open'").get(guildId);
  const guild = bot.guilds.cache.get(guildId);

  res.json({
    memberCount: guild?.memberCount ?? 0,
    membersWithXP: memberCount.count,
    totalInfractions: infractionCount.count,
    totalTickets: ticketCount.count,
    openTickets: openTickets.count,
  });
});

// ══════════════════════════════════════════════════════════════════════════
// INFRACTIONS
// ══════════════════════════════════════════════════════════════════════════

apiRouter.get('/guild/:guildId/infractions', ensureAuth, ensureGuildAccess, (req, res) => {
  const infractions = db.prepare('SELECT * FROM infractions WHERE guild_id = ? ORDER BY created_at DESC LIMIT 100').all(req.params.guildId);
  res.json(infractions);
});
