import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { auditLog } from '../../plugins/auditLog/logger.js';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kick a member from the server')
  .addUserOption((o) => o.setName('user').setDescription('Member to kick').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason for kick'))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
  const target = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const { guild, user: mod } = interaction;

  const member = guild.members.cache.get(target.id);
  if (!member) return interaction.reply({ embeds: [errorEmbed('Not Found', 'That member is not in this server.')], ephemeral: true });
  if (!member.kickable) return interaction.reply({ embeds: [errorEmbed('Cannot Kick', 'This member cannot be kicked.')], ephemeral: true });

  await interaction.deferReply();
  try {
    await member.kick(`${mod.tag}: ${reason}`);
    db.prepare('INSERT INTO infractions (guild_id, user_id, moderator_id, type, reason) VALUES (?, ?, ?, ?, ?)').run(guild.id, target.id, mod.id, 'kick', reason);
    await auditLog(guild, 'MODERATION', { action: 'Kick', user: target, mod, reason });
    await interaction.editReply({ embeds: [successEmbed('Kicked', `**${target.tag}** has been kicked.\n**Reason:** ${reason}`)] });
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed('Kick Failed', err.message)] });
  }
}
