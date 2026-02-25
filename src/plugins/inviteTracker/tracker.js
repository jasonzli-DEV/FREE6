import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

export async function trackInvite(member) {
  const { guild, client } = member;

  try {
    const newInvites = await guild.invites.fetch();
    const cachedInvites = client.inviteCache?.get(guild.id) || new Map();

    let usedInvite = null;
    for (const [code, invite] of newInvites) {
      const cachedUses = cachedInvites.get(code) || 0;
      if (invite.uses > cachedUses) {
        usedInvite = invite;
        break;
      }
    }

    const inviterId = usedInvite?.inviter?.id || null;
    const code = usedInvite?.code || null;

    // Record join
    db.prepare(
      'INSERT OR REPLACE INTO invites (guild_id, user_id, inviter_id, code) VALUES (?, ?, ?, ?)'
    ).run(guild.id, member.id, inviterId, code);

    if (inviterId) {
      db.prepare(
        'INSERT INTO invite_counts (guild_id, user_id, real) VALUES (?, ?, 1) ON CONFLICT(guild_id, user_id) DO UPDATE SET real = real + 1'
      ).run(guild.id, inviterId);
    }

    // Update cache
    if (client.inviteCache) {
      client.inviteCache.set(guild.id, new Map(newInvites.map((inv) => [inv.code, inv.uses])));
    }
  } catch (err) {
    logger.warn(`Invite tracking error in ${guild.id}: ${err.message}`);
  }
}
