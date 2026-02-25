import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { createGiveaway } from '../../plugins/giveaways/handler.js';
import { parseTime } from '../../utils/parseTime.js';

export const data = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Manage giveaways')
  .addSubcommand((s) =>
    s.setName('start')
      .setDescription('Start a giveaway')
      .addStringOption((o) => o.setName('prize').setDescription('Prize to give away').setRequired(true))
      .addStringOption((o) => o.setName('duration').setDescription('Duration (e.g. 1h, 1d, 7d)').setRequired(true))
      .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20))
  )
  .addSubcommand((s) =>
    s.setName('end')
      .setDescription('End a giveaway early')
      .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
  )
  .addSubcommand((s) =>
    s.setName('reroll')
      .setDescription('Reroll winners for an ended giveaway')
      .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'start') {
    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winners = interaction.options.getInteger('winners') || 1;

    const duration = parseTime(durationStr);
    if (!duration) return interaction.reply({ embeds: [errorEmbed('Invalid Duration', 'Use formats like `1h`, `1d`, `7d`.')], ephemeral: true });

    return await createGiveaway(interaction, prize, duration, winners);
  }

  if (sub === 'end') {
    const messageId = interaction.options.getString('message_id');
    const giveaway = db.prepare('SELECT * FROM giveaways WHERE message_id = ? AND ended = 0').get(messageId);
    if (!giveaway) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Giveaway not found or already ended.')], ephemeral: true });

    const { endGiveaway } = await import('../../plugins/giveaways/handler.js');
    await endGiveaway(interaction.client, giveaway.id);
    return interaction.reply({ embeds: [successEmbed('Ended', 'Giveaway ended!')], ephemeral: true });
  }

  if (sub === 'reroll') {
    const messageId = interaction.options.getString('message_id');
    const giveaway = db.prepare('SELECT * FROM giveaways WHERE message_id = ? AND ended = 1').get(messageId);
    if (!giveaway) return interaction.reply({ embeds: [errorEmbed('Not Found', 'Ended giveaway not found.')], ephemeral: true });

    let entries = [];
    try { entries = JSON.parse(giveaway.entries); } catch {}
    if (entries.length === 0) return interaction.reply({ embeds: [errorEmbed('No Entries', 'No entries found.')], ephemeral: true });

    const winner = entries[Math.floor(Math.random() * entries.length)];
    return interaction.reply({ content: `🎉 New winner: <@${winner}>! Congratulations!` });
  }
}
