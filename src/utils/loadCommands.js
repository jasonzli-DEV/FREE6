import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  const commandsPath = join(__dirname, '..', 'commands');
  const categories = readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = join(commandsPath, category);
    if (!statSync(categoryPath).isDirectory()) continue;

    const files = readdirSync(categoryPath).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const filePath = join(categoryPath, file);
      const command = await import(pathToFileURL(filePath).href);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        logger.debug(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Command at ${filePath} is missing data or execute export`);
      }
    }
  }

  logger.info(`Loaded ${client.commands.size} commands`);
}
