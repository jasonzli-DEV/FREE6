import { logger } from '../utils/logger.js';
import { syncGuildCommands } from '../utils/guildCommands.js';

export const name = 'guildCreate';

export async function execute(guild) {
  logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

  // Register slash commands for the new guild based on its (default empty) plugin state.
  // Only core commands (help, dashboard) will be registered initially.
  await syncGuildCommands(guild.client, guild.id);
}
