import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { auditLog } from '../../plugins/auditLog/logger.js';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Warn a member')
  .addUserOption((o) => o.setName('user').setDescription('Member to warn').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason for warning').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  const target = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const { guild, user: mod } = interaction;

  await interaction.deferReply();
  try {
    db.prepare('INSERT INTO infractions (guild_id, user_id, moderator_id, type, reason) VALUES (?, ?, ?, ?, ?)').run(guild.id, target.id, mod.id, 'warn', reason);

    // DM the user
    try {
      const dm = await target.createDM();
      await dm.send(`⚠️ You have been warned in **${guild.name}**.\n**Reason:** ${reason}`);
    } catch {}

    await auditLog(guild, 'MODERATION', { action: 'Warn', user: target, mod, reason });
    await interaction.editReply({ embeds: [successEmbed('Warned', `**${target.tag}** has been warned.\n**Reason:** ${reason}`)] });
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed('Warn Failed', err.message)] });
  }
}
