import { Router } from 'express';
import { db } from '../../database/db.js';
import bot from '../../bot.js';

export const apiRouter = Router();

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── Guild Info ─────────────────────────────────────────────────────────────
apiRouter.get('/guilds', ensureAuth, (req, res) => {
  const guilds = (req.user.guilds || [])
    .filter((g) => (BigInt(g.permissions || 0) & BigInt(0x20)) === BigInt(0x20))
    .map((g) => ({ ...g, botPresent: bot.guilds.cache.has(g.id) }));
  res.json(guilds);
});

// ── Leveling Settings ──────────────────────────────────────────────────────
apiRouter.get('/guild/:guildId/levels', ensureAuth, (req, res) => {
  const settings = db.prepare('SELECT * FROM level_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  res.json(settings);
});

apiRouter.post('/guild/:guildId/levels', ensureAuth, (req, res) => {
  const { guildId } = req.params;
  const { enabled, announce_channel, announce_message, xp_min, xp_max, xp_cooldown } = req.body;

  db.prepare(`
    INSERT INTO level_settings (guild_id, enabled, announce_channel, announce_message, xp_min, xp_max, xp_cooldown)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET enabled=?, announce_channel=?, announce_message=?, xp_min=?, xp_max=?, xp_cooldown=?
  `).run(guildId, enabled, announce_channel, announce_message, xp_min || 15, xp_max || 25, xp_cooldown || 60,
         enabled, announce_channel, announce_message, xp_min || 15, xp_max || 25, xp_cooldown || 60);

  res.json({ success: true });
});

// ── Leaderboard ────────────────────────────────────────────────────────────
apiRouter.get('/guild/:guildId/leaderboard', (req, res) => {
  const rows = db.prepare('SELECT * FROM levels WHERE guild_id = ? ORDER BY total_xp DESC LIMIT 100').all(req.params.guildId);
  res.json(rows);
});

// ── Welcome Settings ───────────────────────────────────────────────────────
apiRouter.get('/guild/:guildId/welcome', ensureAuth, (req, res) => {
  const settings = db.prepare('SELECT * FROM welcome_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  res.json(settings);
});

apiRouter.post('/guild/:guildId/welcome', ensureAuth, (req, res) => {
  const { guildId } = req.params;
  const { enabled, channel_id, message } = req.body;

  db.prepare(`
    INSERT INTO welcome_settings (guild_id, enabled, channel_id, message)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET enabled=?, channel_id=?, message=?
  `).run(guildId, enabled ? 1 : 0, channel_id, message, enabled ? 1 : 0, channel_id, message);

  res.json({ success: true });
});

// ── AutoMod Settings ───────────────────────────────────────────────────────
apiRouter.get('/guild/:guildId/automod', ensureAuth, (req, res) => {
  const settings = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(req.params.guildId) || {};
  res.json(settings);
});

// ── Custom Commands ────────────────────────────────────────────────────────
apiRouter.get('/guild/:guildId/commands', ensureAuth, (req, res) => {
  const cmds = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?').all(req.params.guildId);
  res.json(cmds);
});

apiRouter.post('/guild/:guildId/commands', ensureAuth, (req, res) => {
  const { guildId } = req.params;
  const { name, description, response, actions } = req.body;
  try {
    db.prepare('INSERT OR REPLACE INTO custom_commands (guild_id, name, description, response, actions) VALUES (?, ?, ?, ?, ?)').run(guildId, name, description || 'A custom command', response, JSON.stringify(actions || []));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/guild/:guildId/commands/:id', ensureAuth, (req, res) => {
  db.prepare('DELETE FROM custom_commands WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

// ── Infractions ────────────────────────────────────────────────────────────
apiRouter.get('/guild/:guildId/infractions', ensureAuth, (req, res) => {
  const infractions = db.prepare('SELECT * FROM infractions WHERE guild_id = ? ORDER BY created_at DESC LIMIT 100').all(req.params.guildId);
  res.json(infractions);
});

// ── Stats ──────────────────────────────────────────────────────────────────
apiRouter.get('/guild/:guildId/stats', ensureAuth, (req, res) => {
  const { guildId } = req.params;
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM levels WHERE guild_id = ?').get(guildId);
  const infractionCount = db.prepare('SELECT COUNT(*) as count FROM infractions WHERE guild_id = ?').get(guildId);
  const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?').get(guildId);
  const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = 'open'").get(guildId);

  res.json({
    membersWithXP: memberCount.count,
    totalInfractions: infractionCount.count,
    totalTickets: ticketCount.count,
    openTickets: openTickets.count,
  });
});
