import { ActivityType } from 'discord.js';
import { logger } from '../utils/logger.js';
import { db } from '../database/db.js';
import { startSchedulers } from '../plugins/schedulers.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
  logger.info(`✅ Logged in as ${client.user.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} guilds`);

  client.user.setPresence({
    activities: [
      {
        name: `/help | ${client.guilds.cache.size} servers`,
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });

  // Cache all guild invites for invite tracker
  for (const guild of client.guilds.cache.values()) {
    try {
      const invites = await guild.invites.fetch();
      client.inviteCache = client.inviteCache || new Map();
      client.inviteCache.set(guild.id, new Map(invites.map((inv) => [inv.code, inv.uses])));
    } catch {
      // Missing permissions — skip
    }
  }

  // Start background schedulers (giveaways, reminders, birthdays, temp punishments, etc.)
  startSchedulers(client);

  logger.info('FREE6 is ready!');
}
