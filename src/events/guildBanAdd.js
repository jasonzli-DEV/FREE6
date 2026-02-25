import { auditLog } from '../plugins/auditLog/logger.js';

export const name = 'guildBanAdd';

export async function execute(ban) {
  await auditLog(ban.guild, 'MEMBER_BAN', { user: ban.user, reason: ban.reason });
}
