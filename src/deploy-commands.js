import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isGuild = process.argv.includes('--guild');

const commands = [];
const commandsPath = join(__dirname, 'commands');

for (const category of readdirSync(commandsPath)) {
  const categoryPath = join(commandsPath, category);
  if (!statSync(categoryPath).isDirectory()) continue;

  for (const file of readdirSync(categoryPath).filter((f) => f.endsWith('.js'))) {
    const mod = await import(pathToFileURL(join(categoryPath, file)).href);
    if (mod.data) {
      commands.push(mod.data.toJSON());
      console.log(`  + ${mod.data.name}`);
    }
  }
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

try {
  console.log(`\nDeploying ${commands.length} slash commands (${isGuild ? 'guild' : 'global'})...`);

  if (isGuild && process.env.DEV_GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID),
      { body: commands }
    );
    console.log(`✅ Deployed ${commands.length} commands to guild ${process.env.DEV_GUILD_ID}`);
  } else {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log(`✅ Deployed ${commands.length} commands globally`);
  }
} catch (err) {
  console.error('Failed to deploy commands:', err);
}
