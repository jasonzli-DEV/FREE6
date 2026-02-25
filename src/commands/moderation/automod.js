import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('automod')
  .setDescription('Configure auto-moderation settings')
  .addSubcommand((s) =>
    s.setName('enable').setDescription('Enable auto-moderation')
  )
  .addSubcommand((s) =>
    s.setName('disable').setDescription('Disable auto-moderation')
  )
  .addSubcommand((s) =>
    s.setName('status').setDescription('View current auto-mod settings')
  )
  .addSubcommand((s) =>
    s.setName('set')
      .setDescription('Configure an auto-mod filter')
      .addStringOption((o) =>
        o.setName('filter')
          .setDescription('Filter to configure')
          .setRequired(true)
          .addChoices(
            { name: 'Anti-Spam', value: 'anti_spam' },
            { name: 'Anti-Caps', value: 'anti_caps' },
            { name: 'Anti-Links', value: 'anti_links' },
            { name: 'Anti-Invites', value: 'anti_invites' },
            { name: 'Anti-Bad-Words', value: 'anti_bad_words' },
            { name: 'Anti-Emoji-Spam', value: 'anti_emoji_spam' },
            { name: 'Anti-Mention-Spam', value: 'anti_mention_spam' }
          )
      )
      .addBooleanOption((o) => o.setName('enabled').setDescription('Enable or disable').setRequired(true))
  )
  .addSubcommand((s) =>
    s.setName('action')
      .setDescription('Set the action taken when a rule is violated')
      .addStringOption((o) =>
        o.setName('action')
          .setDescription('Action')
          .setRequired(true)
          .addChoices(
            { name: 'Warn', value: 'warn' },
            { name: 'Mute (5 min)', value: 'mute' },
            { name: 'Kick', value: 'kick' },
            { name: 'Ban', value: 'ban' }
          )
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const { guild } = interaction;

  // Ensure row exists
  db.prepare('INSERT OR IGNORE INTO automod_settings (guild_id) VALUES (?)').run(guild.id);
  const settings = db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?').get(guild.id);

  if (sub === 'enable') {
    db.prepare('UPDATE automod_settings SET enabled = 1 WHERE guild_id = ?').run(guild.id);
    return interaction.reply({ embeds: [successEmbed('Auto-Mod Enabled', 'Auto-moderation is now active.')], ephemeral: true });
  }

  if (sub === 'disable') {
    db.prepare('UPDATE automod_settings SET enabled = 0 WHERE guild_id = ?').run(guild.id);
    return interaction.reply({ embeds: [successEmbed('Auto-Mod Disabled', 'Auto-moderation has been disabled.')], ephemeral: true });
  }

  if (sub === 'set') {
    const filter = interaction.options.getString('filter');
    const enabled = interaction.options.getBoolean('enabled') ? 1 : 0;
    db.prepare(`UPDATE automod_settings SET ${filter} = ? WHERE guild_id = ?`).run(enabled, guild.id);
    return interaction.reply({ embeds: [successEmbed('Updated', `\`${filter}\` is now **${enabled ? 'enabled' : 'disabled'}**.`)], ephemeral: true });
  }

  if (sub === 'action') {
    const action = interaction.options.getString('action');
    db.prepare('UPDATE automod_settings SET action = ? WHERE guild_id = ?').run(action, guild.id);
    return interaction.reply({ embeds: [successEmbed('Action Updated', `AutoMod will now **${action}** rule violators.`)], ephemeral: true });
  }

  if (sub === 'status') {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🤖 AutoMod Settings')
      .addFields(
        { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Action', value: settings.action || 'warn', inline: true },
        { name: 'Anti-Spam', value: settings.anti_spam ? '✅' : '❌', inline: true },
        { name: 'Anti-Caps', value: settings.anti_caps ? '✅' : '❌', inline: true },
        { name: 'Anti-Links', value: settings.anti_links ? '✅' : '❌', inline: true },
        { name: 'Anti-Invites', value: settings.anti_invites ? '✅' : '❌', inline: true },
        { name: 'Anti-Bad-Words', value: settings.anti_bad_words ? '✅' : '❌', inline: true },
        { name: 'Anti-Emoji-Spam', value: settings.anti_emoji_spam ? '✅' : '❌', inline: true },
        { name: 'Anti-Mention-Spam', value: settings.anti_mention_spam ? '✅' : '❌', inline: true }
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
