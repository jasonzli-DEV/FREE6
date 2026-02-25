import { auditLog } from '../plugins/auditLog/logger.js';

export const name = 'messageDelete';

export async function execute(message) {
  if (message.partial) return;
  if (message.author?.bot) return;
  await auditLog(message.guild, 'MESSAGE_DELETE', {
    user: message.author,
    channel: message.channel,
    content: message.content,
  });
}
