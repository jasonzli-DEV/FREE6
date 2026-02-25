import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

export async function handleVoiceState(oldState, newState) {
  const guild = newState.guild || oldState.guild;

  const settings = db.prepare('SELECT * FROM temp_channel_settings WHERE guild_id = ?').get(guild.id);
  if (!settings || !settings.enabled || !settings.trigger_channel_id) return;

  // User joined the trigger channel → create temp channel
  if (newState.channelId === settings.trigger_channel_id) {
    try {
      const member = newState.member;
      const channel = await guild.channels.create({
        name: `${member.displayName}'s Channel`,
        type: ChannelType.GuildVoice,
        parent: settings.category_id || null,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect],
          },
        ],
      });

      db.prepare('INSERT OR REPLACE INTO temp_channels (channel_id, guild_id, owner_id) VALUES (?, ?, ?)').run(
        channel.id, guild.id, member.id
      );

      await member.voice.setChannel(channel);
    } catch (err) {
      logger.error('Temp channel creation error:', err);
    }
  }

  // User left a temp channel → delete if empty
  if (oldState.channelId) {
    const temp = db.prepare('SELECT * FROM temp_channels WHERE channel_id = ?').get(oldState.channelId);
    if (temp) {
      const channel = guild.channels.cache.get(oldState.channelId);
      if (channel && channel.members.size === 0) {
        try {
          await channel.delete();
          db.prepare('DELETE FROM temp_channels WHERE channel_id = ?').run(oldState.channelId);
        } catch {}
      }
    }
  }
}
