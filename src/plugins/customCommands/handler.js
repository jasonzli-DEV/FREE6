import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

export async function handleCustomCommand(interaction) {
  const { guild, user, member, commandName } = interaction;
  if (!guild) return;

  const cmd = db.prepare(
    'SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?'
  ).get(guild.id, commandName);

  if (!cmd) {
    return interaction.reply({ content: `❓ Unknown command: \`/${commandName}\``, ephemeral: true });
  }

  await interaction.deferReply();

  // Process variables
  const format = (str) => str
    .replace(/{user}/g, `<@${user.id}>`)
    .replace(/{username}/g, user.username)
    .replace(/{tag}/g, user.tag)
    .replace(/{server}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount);

  // Execute actions
  let actions = [];
  try { actions = JSON.parse(cmd.actions); } catch {}

  let replyContent = cmd.response ? format(cmd.response) : null;

  for (const action of actions) {
    try {
      if (action.type === 'send_message') {
        replyContent = format(action.content);
      } else if (action.type === 'add_role') {
        const role = guild.roles.cache.get(action.role_id);
        if (role) await member.roles.add(role);
      } else if (action.type === 'remove_role') {
        const role = guild.roles.cache.get(action.role_id);
        if (role) await member.roles.remove(role);
      } else if (action.type === 'toggle_role') {
        const role = guild.roles.cache.get(action.role_id);
        if (role) {
          if (member.roles.cache.has(role.id)) await member.roles.remove(role);
          else await member.roles.add(role);
        }
      } else if (action.type === 'send_dm') {
        const dm = await user.createDM();
        await dm.send(format(action.content));
      }
    } catch (err) {
      logger.warn(`Custom command action error: ${err.message}`);
    }
  }

  await interaction.editReply(replyContent || '✅ Done!');
}
