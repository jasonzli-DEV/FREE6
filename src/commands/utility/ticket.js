import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { openTicket } from '../../plugins/ticketing/handler.js';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Manage tickets')
  .addSubcommand((s) => s.setName('open').setDescription('Open a support ticket'))
  .addSubcommand((s) =>
    s.setName('setup')
      .setDescription('Configure the ticket system')
      .addChannelOption((o) => o.setName('category').setDescription('Category for tickets'))
      .addRoleOption((o) => o.setName('support_role').setDescription('Support team role'))
      .addChannelOption((o) => o.setName('log_channel').setDescription('Ticket log channel'))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const { guild } = interaction;

  if (sub === 'open') {
    return await openTicket(interaction);
  }

  if (sub === 'setup') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [errorEmbed('No Permission', 'Requires Manage Server.')], ephemeral: true });
    }
    const category = interaction.options.getChannel('category');
    const role = interaction.options.getRole('support_role');
    const logChannel = interaction.options.getChannel('log_channel');

    db.prepare(`
      INSERT INTO ticket_settings (guild_id, enabled, category_id, support_role, log_channel)
      VALUES (?, 1, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET enabled = 1, category_id = ?, support_role = ?, log_channel = ?
    `).run(guild.id, category?.id, role?.id, logChannel?.id, category?.id, role?.id, logChannel?.id);

    return interaction.reply({ embeds: [successEmbed('Ticket Setup', `Ticketing configured!\n• Category: ${category ? `<#${category.id}>` : 'None'}\n• Support Role: ${role ? `<@&${role.id}>` : 'None'}`)], ephemeral: true });
  }
}
