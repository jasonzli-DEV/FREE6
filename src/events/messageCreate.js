import { logger } from '../utils/logger.js';
import { processXP } from '../plugins/leveling/xp.js';
import { checkAutomod } from '../plugins/automod/checker.js';
import { checkAntiRaid } from '../plugins/antiRaid/detector.js';
import { updateStarboard } from '../plugins/starboard/handler.js';

export const name = 'messageCreate';

export async function execute(message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  // Auto-moderation check
  await checkAutomod(message);

  // XP / Leveling
  await processXP(message);
}
