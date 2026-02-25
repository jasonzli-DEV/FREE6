import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

const CATEGORIES = {
  moderation: { emoji: '🛡️', description: 'Server moderation tools', commands: ['ban', 'kick', 'mute', 'unmute', 'warn', 'infractions', 'clear', 'slowmode', 'lock', 'unlock', 'unban', 'automod', 'setup'] },
  leveling: { emoji: '📈', description: 'XP and leveling system', commands: ['rank', 'leaderboard', 'xp'] },
  economy: { emoji: '💰', description: 'Economy and games', commands: ['daily', 'balance', 'gamble'] },
  fun: { emoji: '🎉', description: 'Fun and engagement', commands: ['poll', 'giveaway', 'birthday'] },
  utility: { emoji: '🔧', description: 'Useful tools', commands: ['serverinfo', 'userinfo', 'avatar', 'remind', 'ticket', 'reactionrole', 'suggest', 'invites', 'starboard'] },
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

export async function execute(interaction) {
  const category = interaction.options.getString('category');

  if (category && CATEGORIES[category]) {
    const cat = CATEGORIES[category];
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${cat.emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
      .setDescription(cat.commands.map((c) => `\`/${c}\``).join(', '))
      .setFooter({ text: 'FREE6 — The free MEE6 alternative' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📖 FREE6 Help')
    .setDescription('FREE6 is a 110% free replica of MEE6 with extra features!\n\nSelect a category below or use `/help [category]`.')
    .addFields(
      Object.entries(CATEGORIES).map(([key, cat]) => ({
        name: `${cat.emoji} ${key.charAt(0).toUpperCase() + key.slice(1)}`,
        value: cat.description,
        inline: true,
      }))
    )
    .setFooter({ text: `FREE6 v1.0.0 — Made with ❤️ by jasonzli-DEV` });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
