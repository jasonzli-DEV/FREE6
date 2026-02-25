import { auditLog } from '../plugins/auditLog/logger.js';

export const name = 'messageUpdate';

export async function execute(oldMessage, newMessage) {
  if (newMessage.partial) return;
  if (newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  await auditLog(newMessage.guild, 'MESSAGE_EDIT', {
    user: newMessage.author,
    channel: newMessage.channel,
    before: oldMessage.content,
    after: newMessage.content,
    url: newMessage.url,
  });
}
