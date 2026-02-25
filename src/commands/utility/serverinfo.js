import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('serverinfo')
  .setDescription('View information about this server');

export async function execute(interaction) {
  const { guild } = interaction;
  await guild.fetch();

  const owner = await guild.fetchOwner();
  const channels = guild.channels.cache;
  const textChannels = channels.filter((c) => c.type === 0).size;
  const voiceChannels = channels.filter((c) => c.type === 2).size;
  const roles = guild.roles.cache.size - 1; // exclude @everyone

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(guild.name)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: '👑 Owner', value: owner.user.tag, inline: true },
      { name: '🆔 ID', value: guild.id, inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
      { name: '💬 Text Channels', value: `${textChannels}`, inline: true },
      { name: '🔊 Voice Channels', value: `${voiceChannels}`, inline: true },
      { name: '🎭 Roles', value: `${roles}`, inline: true },
      { name: '🌍 Region', value: guild.preferredLocale, inline: true },
      { name: '🔒 Verification', value: guild.verificationLevel.toString(), inline: true }
    )
    .setImage(guild.bannerURL({ size: 1024 }))
    .setFooter({ text: `Boost Level: ${guild.premiumTier}  •  ${guild.premiumSubscriptionCount} boosts` });

  await interaction.reply({ embeds: [embed] });
}
