import { handleReactionRemove } from '../plugins/reactionRoles/handler.js';

export const name = 'messageReactionRemove';

export async function execute(reaction, user) {
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  await handleReactionRemove(reaction, user);
}
