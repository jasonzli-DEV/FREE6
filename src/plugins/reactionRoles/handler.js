import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

export async function handleReactionAdd(reaction, user) {
  const { message, emoji } = reaction;
  const guild = message.guild;
  if (!guild) return;

  const emojiKey = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;

  const rr = db.prepare(
    'SELECT * FROM reaction_roles WHERE message_id = ? AND emoji = ?'
  ).get(message.id, emojiKey);

  if (!rr) return;

  try {
    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.get(rr.role_id);
    if (!role) return;

    if (rr.mode === 'unique') {
      // Remove all other roles from the same message
      const others = db.prepare(
        'SELECT * FROM reaction_roles WHERE message_id = ? AND emoji != ?'
      ).all(message.id, emojiKey);

      for (const other of others) {
        try {
          const otherRole = guild.roles.cache.get(other.role_id);
          if (otherRole && member.roles.cache.has(otherRole.id)) {
            await member.roles.remove(otherRole);
            // Remove the corresponding reaction
            const otherReaction = message.reactions.cache.find(
              (r) => (r.emoji.id ? `<:${r.emoji.name}:${r.emoji.id}>` : r.emoji.name) === other.emoji
            );
            if (otherReaction) await otherReaction.users.remove(user.id).catch(() => {});
          }
        } catch {}
      }
    }

    if (rr.mode === 'reversed') {
      await member.roles.remove(role);
    } else {
      await member.roles.add(role);
    }
  } catch (err) {
    logger.error('Reaction role add error:', err);
  }
}

export async function handleReactionRemove(reaction, user) {
  const { message, emoji } = reaction;
  const guild = message.guild;
  if (!guild) return;

  const emojiKey = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;

  const rr = db.prepare(
    'SELECT * FROM reaction_roles WHERE message_id = ? AND emoji = ?'
  ).get(message.id, emojiKey);

  if (!rr) return;

  try {
    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.get(rr.role_id);
    if (!role) return;

    if (rr.mode === 'verify') return; // Verify mode: don't remove on unreact
    if (rr.mode === 'reversed') {
      await member.roles.add(role);
    } else {
      await member.roles.remove(role);
    }
  } catch (err) {
    logger.error('Reaction role remove error:', err);
  }
}

export async function handleReactionRoleButton(interaction) {
  // Used for select-menu based reaction roles
  await interaction.reply({ content: 'Role updated!', ephemeral: true });
}
