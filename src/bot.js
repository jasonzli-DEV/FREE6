import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} from 'discord.js';
import { logger } from './utils/logger.js';
import { loadCommands } from './utils/loadCommands.js';
import { loadEvents } from './utils/loadEvents.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
  ],
});

client.commands = new Collection();
client.cooldowns = new Collection();

await loadCommands(client);
await loadEvents(client);

export { client as bot };
