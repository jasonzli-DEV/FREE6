import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('unban')
  .setDescription('Unban a user from the server')
  .addStringOption((o) => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
  const userId = interaction.options.getString('user_id');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const { guild, user: mod } = interaction;

  try {
    await guild.members.unban(userId, `${mod.tag}: ${reason}`);
    const target = await interaction.client.users.fetch(userId).catch(() => null);
    await interaction.reply({ embeds: [successEmbed('Unbanned', `**${target?.tag || userId}** has been unbanned.`)], ephemeral: true });
  } catch (err) {
    await interaction.reply({ embeds: [errorEmbed('Unban Failed', 'User not found in ban list or invalid ID.')], ephemeral: true });
  }
}
