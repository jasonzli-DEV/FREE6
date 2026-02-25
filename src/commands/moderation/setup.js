import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure FREE6 for this server')
  .addSubcommand((s) =>
    s.setName('log')
      .setDescription('Set the audit log channel')
      .addChannelOption((o) => o.setName('channel').setDescription('Log channel').setRequired(true))
  )
  .addSubcommand((s) =>
    s.setName('welcome')
      .setDescription('Configure welcome messages')
      .addChannelOption((o) => o.setName('channel').setDescription('Welcome channel').setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription('Welcome message (use {user}, {server}, {membercount})'))
  )
  .addSubcommand((s) =>
    s.setName('goodbye')
      .setDescription('Configure goodbye messages')
      .addChannelOption((o) => o.setName('channel').setDescription('Goodbye channel').setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription('Goodbye message'))
  )
  .addSubcommand((s) =>
    s.setName('autorole')
      .setDescription('Set a role to auto-assign to new members')
      .addRoleOption((o) => o.setName('role').setDescription('Role to auto-assign').setRequired(true))
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const { guild } = interaction;

  db.prepare('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)').run(guild.id);

  if (sub === 'log') {
    const channel = interaction.options.getChannel('channel');
    db.prepare('UPDATE guild_settings SET log_channel = ? WHERE guild_id = ?').run(channel.id, guild.id);
    return interaction.reply({ embeds: [successEmbed('Log Channel Set', `Audit logs will be sent to <#${channel.id}>`)], ephemeral: true });
  }

  if (sub === 'welcome') {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    db.prepare('INSERT OR REPLACE INTO welcome_settings (guild_id, enabled, channel_id, message) VALUES (?, 1, ?, ?)').run(guild.id, channel.id, message || 'Welcome to **{server}**, {user}! 🎉');
    return interaction.reply({ embeds: [successEmbed('Welcome Setup', `Welcome messages will be sent to <#${channel.id}>`)], ephemeral: true });
  }

  if (sub === 'goodbye') {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    db.prepare('INSERT OR REPLACE INTO goodbye_settings (guild_id, enabled, channel_id, message) VALUES (?, 1, ?, ?)').run(guild.id, channel.id, message || 'Goodbye **{username}**, we hope to see you again!');
    return interaction.reply({ embeds: [successEmbed('Goodbye Setup', `Goodbye messages will be sent to <#${channel.id}>`)], ephemeral: true });
  }

  if (sub === 'autorole') {
    const role = interaction.options.getRole('role');
    const current = db.prepare('SELECT auto_role FROM welcome_settings WHERE guild_id = ?').get(guild.id);
    let roles = [];
    if (current) { try { roles = JSON.parse(current.auto_role); } catch {} }
    if (!roles.includes(role.id)) roles.push(role.id);

    db.prepare('INSERT INTO welcome_settings (guild_id, enabled, auto_role) VALUES (?, 0, ?) ON CONFLICT(guild_id) DO UPDATE SET auto_role = ?').run(guild.id, JSON.stringify(roles), JSON.stringify(roles));
    return interaction.reply({ embeds: [successEmbed('Auto-Role Set', `<@&${role.id}> will be assigned to new members.`)], ephemeral: true });
  }
}
