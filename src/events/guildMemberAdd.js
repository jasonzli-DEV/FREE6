import { logger } from '../utils/logger.js';
import { handleWelcome } from '../plugins/welcome/handler.js';
import { trackInvite } from '../plugins/inviteTracker/tracker.js';
import { checkAntiRaid } from '../plugins/antiRaid/detector.js';
import { db } from '../database/db.js';

export const name = 'guildMemberAdd';

export async function execute(member) {
  const { guild } = member;

  // Anti-raid detection
  await checkAntiRaid(member);

  // Invite tracking
  await trackInvite(member);

  // Welcome message / auto-role
  await handleWelcome(member);

  // Auto-role from welcome settings
  const welcome = db.prepare('SELECT auto_role FROM welcome_settings WHERE guild_id = ?').get(guild.id);
  if (welcome) {
    let roles = [];
    try { roles = JSON.parse(welcome.auto_role); } catch {}
    for (const roleId of roles) {
      try {
        const role = guild.roles.cache.get(roleId);
        if (role) await member.roles.add(role);
      } catch (err) {
        logger.warn(`Could not assign auto-role ${roleId} in ${guild.id}: ${err.message}`);
      }
    }
  }

  // Invite cache update
  try {
    const invites = await guild.invites.fetch();
    if (member.client.inviteCache) {
      member.client.inviteCache.set(guild.id, new Map(invites.map((inv) => [inv.code, inv.uses])));
    }
  } catch {}
}
