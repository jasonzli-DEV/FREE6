import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('userinfo')
  .setDescription('View information about a user')
  .addUserOption((o) => o.setName('user').setDescription('User to check'));

export async function execute(interaction) {
  const target = interaction.options.getMember('user') || interaction.member;
  const user = target.user;

  const roles = target.roles.cache
    .filter((r) => r.id !== interaction.guild.roles.everyone.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => `<@&${r.id}>`)
    .slice(0, 10);

  const embed = new EmbedBuilder()
    .setColor(target.displayHexColor || 0x5865f2)
    .setTitle(user.tag)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '🆔 User ID', value: user.id, inline: true },
      { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
      { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
      { name: '📥 Joined Server', value: target.joinedTimestamp ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>` : 'Unknown', inline: true },
      { name: '🎭 Display Name', value: target.displayName, inline: true },
      { name: `🎫 Roles (${roles.length})`, value: roles.length > 0 ? roles.join(', ') : 'None' }
    );

  await interaction.reply({ embeds: [embed] });
}
