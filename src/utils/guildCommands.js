/**
 * Guild-based command registration.
 *
 * Maps slash commands to their parent plugin so that only commands
 * for enabled plugins are registered in each guild.
 *
 * "Core" commands (help, dashboard) are always registered.
 */

import { REST, Routes } from 'discord.js';
import { db } from '../database/db.js';
import { logger } from './logger.js';

const rest = new REST().setToken(process.env.BOT_TOKEN);

// ── Command → Plugin mapping ────────────────────────────────────────────
// A command's "plugin" value must match a name in ALL_PLUGINS (api.js).
// Commands with plugin = null are always registered (core commands).
const COMMAND_PLUGIN_MAP = {
  // Core (always available)
  help:         null,
  dashboard:    null,

  // Moderator plugin
  ban:          'moderator',
  kick:         'moderator',
  mute:         'moderator',
  unmute:       'moderator',
  warn:         'moderator',
  infractions:  'moderator',
  clear:        'moderator',
  slowmode:     'moderator',
  unban:        'moderator',

  // Levels plugin
  rank:         'levels',
  leaderboard:  'levels',

  // Economy plugin
  balance:      'economy',
  daily:        'economy',
  gamble:       'economy',

  // Fun / individual plugins
  birthday:     'birthdays',
  giveaway:     'giveaways',
  poll:         'polls',
};

export { COMMAND_PLUGIN_MAP };

/**
 * Get the set of enabled plugin names for a guild.
 */
export function getEnabledPlugins(guildId) {
  const rows = db.prepare(
    'SELECT plugin_name FROM plugin_settings WHERE guild_id = ? AND enabled = 1'
  ).all(guildId);
  return new Set(rows.map((r) => r.plugin_name));
}

/**
 * Build the list of slash command JSON payloads that should be
 * registered for a guild based on its enabled plugins.
 */
export function buildGuildCommands(client, guildId) {
  const enabled = getEnabledPlugins(guildId);
  const commands = [];

  for (const [name, command] of client.commands) {
    const plugin = COMMAND_PLUGIN_MAP[name];
    // Core commands (plugin === null) are always included
    if (plugin === null || enabled.has(plugin)) {
      commands.push(command.data.toJSON());
    }
  }

  return commands;
}

/**
 * Sync slash commands for ONE guild based on its enabled plugins.
 * Called when a plugin is toggled or on bot startup.
 */
export async function syncGuildCommands(client, guildId) {
  const commands = buildGuildCommands(client, guildId);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
      { body: commands }
    );
    logger.info(`Synced ${commands.length} commands for guild ${guildId}`);
  } catch (err) {
    logger.error(`Failed to sync commands for guild ${guildId}:`, err);
  }
}

/**
 * Sync slash commands for ALL guilds the bot is in.
 * Called once on bot ready.  Also clears global commands so only
 * guild-scoped commands remain.
 */
export async function syncAllGuildCommands(client) {
  // 1) Clear global commands (they are no longer used)
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] }
    );
    logger.info('Cleared global slash commands');
  } catch (err) {
    logger.error('Failed to clear global commands:', err);
  }

  // 2) Register guild-scoped commands for each guild
  const guilds = client.guilds.cache;
  logger.info(`Syncing commands for ${guilds.size} guild(s)...`);

  const promises = guilds.map((guild) => syncGuildCommands(client, guild.id));
  await Promise.allSettled(promises);

  logger.info('Guild command sync complete');
}
