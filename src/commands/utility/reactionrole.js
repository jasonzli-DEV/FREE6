import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('reactionrole')
  .setDescription('Manage reaction roles')
  .addSubcommand((s) =>
    s.setName('add')
      .setDescription('Add a reaction role to a message')
      .addStringOption((o) => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addStringOption((o) => o.setName('emoji').setDescription('Emoji to react with').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Role to assign').setRequired(true))
      .addStringOption((o) =>
        o.setName('mode').setDescription('Mode')
          .addChoices(
            { name: 'Normal', value: 'normal' },
            { name: 'Unique (one at a time)', value: 'unique' },
            { name: 'Verify (add only)', value: 'verify' },
            { name: 'Reversed (remove on react)', value: 'reversed' }
          )
      )
  )
  .addSubcommand((s) =>
    s.setName('remove')
      .setDescription('Remove a reaction role')
      .addStringOption((o) => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addStringOption((o) => o.setName('emoji').setDescription('Emoji').setRequired(true))
  )
  .addSubcommand((s) =>
    s.setName('list')
      .setDescription('List all reaction roles in this server')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const { guild, channel } = interaction;

  if (sub === 'add') {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');
    const mode = interaction.options.getString('mode') || 'normal';

    try {
      const msg = await channel.messages.fetch(messageId);
      await msg.react(emoji);
    } catch {
      return interaction.reply({ embeds: [errorEmbed('Message Not Found', 'Could not find that message in this channel.')], ephemeral: true });
    }

    db.prepare(
      'INSERT INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id, mode) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(guild.id, channel.id, messageId, emoji, role.id, mode);

    return interaction.reply({ embeds: [successEmbed('Reaction Role Added', `${emoji} → <@&${role.id}> (${mode} mode)`)], ephemeral: true });
  }

  if (sub === 'remove') {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');

    db.prepare('DELETE FROM reaction_roles WHERE message_id = ? AND emoji = ?').run(messageId, emoji);
    return interaction.reply({ embeds: [successEmbed('Removed', `Reaction role for ${emoji} removed.`)], ephemeral: true });
  }

  if (sub === 'list') {
    const rrs = db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?').all(guild.id);
    if (rrs.length === 0) return interaction.reply({ content: 'No reaction roles configured.', ephemeral: true });

    const list = rrs.map((r) => `${r.emoji} → <@&${r.role_id}> (msg: \`${r.message_id}\`, mode: ${r.mode})`).join('\n');
    return interaction.reply({ content: `**Reaction Roles:**\n${list}`, ephemeral: true });
  }
}
