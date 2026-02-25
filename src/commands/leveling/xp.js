import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('xp')
  .setDescription('Manage XP for members')
  .addSubcommand((s) =>
    s.setName('set')
      .setDescription('Set total XP for a user')
      .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption((o) => o.setName('amount').setDescription('XP amount').setRequired(true).setMinValue(0))
  )
  .addSubcommand((s) =>
    s.setName('give')
      .setDescription('Give XP to a user')
      .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption((o) => o.setName('amount').setDescription('XP to give').setRequired(true).setMinValue(1))
  )
  .addSubcommand((s) =>
    s.setName('remove')
      .setDescription('Remove XP from a user')
      .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption((o) => o.setName('amount').setDescription('XP to remove').setRequired(true).setMinValue(1))
  )
  .addSubcommand((s) =>
    s.setName('reset')
      .setDescription('Reset a user\'s XP')
      .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const target = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount') ?? 0;
  const { guild } = interaction;

  db.prepare('INSERT OR IGNORE INTO levels (guild_id, user_id) VALUES (?, ?)').run(guild.id, target.id);
  const row = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guild.id, target.id);

  if (sub === 'set') {
    db.prepare('UPDATE levels SET total_xp = ?, xp = ?, level = 0 WHERE guild_id = ? AND user_id = ?').run(amount, amount, guild.id, target.id);
    return interaction.reply({ embeds: [successEmbed('XP Set', `Set **${target.tag}**'s XP to **${amount}**.`)], ephemeral: true });
  }

  if (sub === 'give') {
    db.prepare('UPDATE levels SET total_xp = total_xp + ?, xp = xp + ? WHERE guild_id = ? AND user_id = ?').run(amount, amount, guild.id, target.id);
    return interaction.reply({ embeds: [successEmbed('XP Given', `Gave **${amount} XP** to **${target.tag}**.`)], ephemeral: true });
  }

  if (sub === 'remove') {
    const newXP = Math.max(0, row.total_xp - amount);
    db.prepare('UPDATE levels SET total_xp = ?, xp = ? WHERE guild_id = ? AND user_id = ?').run(newXP, newXP, guild.id, target.id);
    return interaction.reply({ embeds: [successEmbed('XP Removed', `Removed **${amount} XP** from **${target.tag}**.`)], ephemeral: true });
  }

  if (sub === 'reset') {
    db.prepare('UPDATE levels SET xp = 0, level = 0, total_xp = 0 WHERE guild_id = ? AND user_id = ?').run(guild.id, target.id);
    return interaction.reply({ embeds: [successEmbed('XP Reset', `Reset **${target.tag}**'s XP to 0.`)], ephemeral: true });
  }
}
