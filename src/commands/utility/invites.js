import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('invites')
  .setDescription('Check invite stats')
  .addUserOption((o) => o.setName('user').setDescription('User to check'));

export async function execute(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const { guild } = interaction;

  const row = db.prepare('SELECT * FROM invite_counts WHERE guild_id = ? AND user_id = ?').get(guild.id, target.id);
  const member = guild.members.cache.get(target.id);

  const invitedBy = db.prepare('SELECT inviter_id FROM invites WHERE guild_id = ? AND user_id = ?').get(guild.id, target.id);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
    .setTitle('Invite Statistics')
    .addFields(
      { name: '✅ Real Invites', value: `${row?.real || 0}`, inline: true },
      { name: '👋 Left', value: `${row?.left || 0}`, inline: true },
      { name: '🎁 Bonus', value: `${row?.bonus || 0}`, inline: true },
      { name: '❌ Fake', value: `${row?.fake || 0}`, inline: true },
      { name: '🏆 Total', value: `${(row?.real || 0) + (row?.bonus || 0) - (row?.left || 0) - (row?.fake || 0)}`, inline: true },
      { name: '📨 Invited By', value: invitedBy?.inviter_id ? `<@${invitedBy.inviter_id}>` : 'Unknown', inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}
