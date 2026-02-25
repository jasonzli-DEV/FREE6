import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('infractions')
  .setDescription('View infractions for a user')
  .addUserOption((o) => o.setName('user').setDescription('User to check').setRequired(true))
  .addSubcommand((s) => s.setName('list').setDescription('List all infractions'))
  .addSubcommand((s) => s.setName('clear').setDescription('Clear all infractions').addUserOption((o) => o.setName('user').setDescription('User').setRequired(true)))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand(false) || 'list';
  const target = interaction.options.getUser('user');
  const { guild } = interaction;

  if (sub === 'clear') {
    db.prepare('DELETE FROM infractions WHERE guild_id = ? AND user_id = ?').run(guild.id, target.id);
    return interaction.reply({ content: `✅ Cleared all infractions for **${target.tag}**.`, ephemeral: true });
  }

  const infractions = db.prepare('SELECT * FROM infractions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 20').all(guild.id, target.id);

  const embed = new EmbedBuilder()
    .setColor(0xfaa61a)
    .setTitle(`📋 Infractions — ${target.tag}`)
    .setThumbnail(target.displayAvatarURL());

  if (infractions.length === 0) {
    embed.setDescription('No infractions found.');
  } else {
    embed.setDescription(
      infractions.map((i, idx) =>
        `**#${idx + 1}** \`${i.type.toUpperCase()}\` — ${i.reason}\n┗ *<@${i.moderator_id}>* • <t:${i.created_at}:R>`
      ).join('\n\n')
    );
    embed.setFooter({ text: `Total: ${infractions.length}` });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
