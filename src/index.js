import 'dotenv/config';
import { bot } from './bot.js';
import { logger } from './utils/logger.js';

const token = process.env.BOT_TOKEN;
if (!token) {
  logger.error('BOT_TOKEN is not set in .env');
  process.exit(1);
}

// Start the web dashboard in parallel
import('./dashboard/server.js').catch((err) =>
  logger.error('Dashboard failed to start:', err)
);

bot.login(token);
