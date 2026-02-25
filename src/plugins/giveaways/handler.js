import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';
import { formatDuration } from '../../utils/parseTime.js';

export async function createGiveaway(interaction, prize, duration, winnerCount) {
  const { guild, user, channel } = interaction;

  const endsAt = Math.floor((Date.now() + duration) / 1000);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('🎉 GIVEAWAY 🎉')
    .setDescription(`**Prize:** ${prize}\n\n**Winners:** ${winnerCount}\n**Ends:** <t:${endsAt}:R>\n**Hosted by:** <@${user.id}>`)
    .setFooter({ text: 'React with 🎉 to enter! | Ends' })
    .setTimestamp(Date.now() + duration);

  await interaction.deferReply({ ephemeral: true });

  try {
    const msg = await channel.send({ embeds: [embed] });
    await msg.react('🎉');

    db.prepare(
      'INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winner_count, ends_at, host_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(guild.id, channel.id, msg.id, prize, winnerCount, endsAt, user.id);

    await interaction.editReply({ content: `✅ Giveaway started in <#${channel.id}>!` });
  } catch (err) {
    logger.error('Giveaway creation error:', err);
    await interaction.editReply({ content: '❌ Failed to create giveaway.' });
  }
}

export async function endGiveaway(client, giveawayId) {
  const giveaway = db.prepare('SELECT * FROM giveaways WHERE id = ? AND ended = 0').get(giveawayId);
  if (!giveaway) return;

  db.prepare('UPDATE giveaways SET ended = 1 WHERE id = ?').run(giveawayId);

  try {
    const guild = client.guilds.cache.get(giveaway.guild_id);
    if (!guild) return;

    const channel = guild.channels.cache.get(giveaway.channel_id);
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
    if (!message) return;

    const reaction = message.reactions.cache.get('🎉');
    const users = await reaction?.users.fetch();
    const entries = users?.filter((u) => !u.bot).map((u) => u.id) || [];

    const winners = [];
    const pool = [...entries];
    for (let i = 0; i < Math.min(giveaway.winner_count, pool.length); i++) {
      const index = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(index, 1)[0]);
    }

    db.prepare('UPDATE giveaways SET entries = ?, winners = ? WHERE id = ?').run(
      JSON.stringify(entries),
      JSON.stringify(winners),
      giveawayId
    );

    const winnerText = winners.length > 0
      ? winners.map((id) => `<@${id}>`).join(', ')
      : 'No valid entries';

    const endEmbed = new EmbedBuilder()
      .setColor(winners.length > 0 ? 0x57f287 : 0xed4245)
      .setTitle('🎉 GIVEAWAY ENDED 🎉')
      .setDescription(`**Prize:** ${giveaway.prize}\n**Winners:** ${winnerText}\n**Hosted by:** <@${giveaway.host_id}>`)
      .setTimestamp();

    await message.edit({ embeds: [endEmbed] });

    if (winners.length > 0) {
      await channel.send(`🎉 Congratulations ${winnerText}! You won **${giveaway.prize}**!`);
    }
  } catch (err) {
    logger.error('Giveaway end error:', err);
  }
}
