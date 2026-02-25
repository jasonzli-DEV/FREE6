import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { auditLog } from '../../plugins/auditLog/logger.js';

export const data = new SlashCommandBuilder()
  .setName('unmute')
  .setDescription('Remove a timeout from a member')
  .addUserOption((o) => o.setName('user').setDescription('Member to unmute').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  const target = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const { guild, user: mod } = interaction;

  const member = guild.members.cache.get(target.id);
  if (!member) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Member not found.')], ephemeral: true });

  await interaction.deferReply();
  try {
    await member.timeout(null, `${mod.tag}: ${reason}`);
    await interaction.editReply({ embeds: [successEmbed('Unmuted', `**${target.tag}** has been unmuted.`)] });
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed('Unmute Failed', err.message)] });
  }
}
