import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View the server XP leaderboard')
  .addIntegerOption((o) => o.setName('page').setDescription('Page number').setMinValue(1));

export async function execute(interaction) {
  const page = interaction.options.getInteger('page') || 1;
  const pageSize = 10;
  const offset = (page - 1) * pageSize;
  const { guild } = interaction;

  await interaction.deferReply();

  const rows = db.prepare(
    'SELECT * FROM levels WHERE guild_id = ? ORDER BY total_xp DESC LIMIT ? OFFSET ?'
  ).all(guild.id, pageSize, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM levels WHERE guild_id = ?').get(guild.id).count;
  const totalPages = Math.ceil(total / pageSize);

  const medals = ['🥇', '🥈', '🥉'];

  const description = rows.length === 0
    ? 'No one has earned XP yet!'
    : rows.map((row, i) => {
        const position = offset + i + 1;
        const medal = medals[position - 1] || `**${position}.**`;
        return `${medal} <@${row.user_id}> — Level **${row.level}** (${row.total_xp} XP)`;
      }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(0xfaa61a)
    .setTitle(`🏆 ${guild.name} — Leaderboard`)
    .setDescription(description)
    .setFooter({ text: `Page ${page}/${totalPages} • ${total} members ranked` });

  await interaction.editReply({ embeds: [embed] });
}
