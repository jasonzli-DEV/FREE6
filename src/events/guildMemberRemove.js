import { handleGoodbye } from '../plugins/welcome/handler.js';

export const name = 'guildMemberRemove';

export async function execute(member) {
  await handleGoodbye(member);
}
