import { handleReactionAdd } from '../plugins/reactionRoles/handler.js';
import { handleStarReaction } from '../plugins/starboard/handler.js';

export const name = 'messageReactionAdd';

export async function execute(reaction, user) {
  if (user.bot) return;

  // Fetch partial reaction/message if needed
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  await handleReactionAdd(reaction, user);
  await handleStarReaction(reaction, user);
}
