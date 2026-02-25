import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getEnabledPlugins, COMMAND_PLUGIN_MAP } from '../../utils/guildCommands.js';

// Category → plugin mapping (null = always shown)
const CATEGORIES = {
  moderation: { emoji: '🛡️', plugin: 'moderator', description: 'Server moderation tools', commands: ['ban', 'kick', 'mute', 'unmute', 'warn', 'infractions', 'clear', 'slowmode', 'unban'] },
  leveling:   { emoji: '📈', plugin: 'levels',    description: 'XP and leveling system',   commands: ['rank', 'leaderboard'] },
  economy:    { emoji: '💰', plugin: 'economy',   description: 'Economy and games',         commands: ['daily', 'balance', 'gamble'] },
  fun:        { emoji: '🎉', plugin: null,         description: 'Fun and engagement',        commands: ['poll', 'giveaway', 'birthday'] },
  utility:    { emoji: '🔧', plugin: null,         description: 'Useful tools',              commands: ['help', 'dashboard'] },
};

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('View all FREE6 commands')
  .addStringOption((o) =>
    o.setName('category')
      .setDescription('Command category')
      .addChoices(
        { name: '🛡️ Moderation', value: 'moderation' },
        { name: '📈 Leveling', value: 'leveling' },
        { name: '💰 Economy', value: 'economy' },
        { name: '🎉 Fun', value: 'fun' },
        { name: '🔧 Utility', value: 'utility' }
      )
  );

/**
 * Filter a category's command list to only include commands whose
 * plugin is enabled (or core commands with plugin === null).
 */
function filterCommands(commands, enabledPlugins) {
  return commands.filter((cmd) => {
    const plugin = COMMAND_PLUGIN_MAP[cmd];
    return plugin === null || enabledPlugins.has(plugin);
  });
}

export async function execute(interaction) {
  const category = interaction.options.getString('category');
  const enabledPlugins = getEnabledPlugins(interaction.guild.id);

  if (category && CATEGORIES[category]) {
    const cat = CATEGORIES[category];
    const cmds = filterCommands(cat.commands, enabledPlugins);

    if (cmds.length === 0) {
      return interaction.reply({
        content: `${cat.emoji} The **${category}** plugin is not enabled. Enable it from the [dashboard](${process.env.DASHBOARD_URL || 'http://localhost:3000'}).`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${cat.emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
      .setDescription(cmds.map((c) => `\`/${c}\``).join(', '))
      .setFooter({ text: 'FREE6 — The free MEE6 alternative' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Build fields only for categories that have at least one available command
  const fields = [];
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const cmds = filterCommands(cat.commands, enabledPlugins);
    if (cmds.length > 0) {
      fields.push({
        name: `${cat.emoji} ${key.charAt(0).toUpperCase() + key.slice(1)}`,
        value: cmds.map((c) => `\`/${c}\``).join(', '),
        inline: true,
      });
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📖 FREE6 Help')
    .setDescription('FREE6 is the 100% free MEE6 alternative!\n\nSelect a category below or use `/help [category]`.')
    .addFields(fields)
    .setFooter({ text: 'FREE6 v1.0.0 — Made with ❤️ by jasonzli-DEV' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
