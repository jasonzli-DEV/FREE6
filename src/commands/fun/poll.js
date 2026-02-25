import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { parseTime } from '../../utils/parseTime.js';

const EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

export const data = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Create a poll')
  .addStringOption((o) => o.setName('question').setDescription('Poll question').setRequired(true))
  .addStringOption((o) => o.setName('option1').setDescription('Option 1').setRequired(true))
  .addStringOption((o) => o.setName('option2').setDescription('Option 2').setRequired(true))
  .addStringOption((o) => o.setName('option3').setDescription('Option 3'))
  .addStringOption((o) => o.setName('option4').setDescription('Option 4'))
  .addStringOption((o) => o.setName('option5').setDescription('Option 5'))
  .addStringOption((o) => o.setName('duration').setDescription('Poll duration (e.g. 1h, 1d)'));

export async function execute(interaction) {
  const question = interaction.options.getString('question');
  const options = [1, 2, 3, 4, 5]
    .map((n) => interaction.options.getString(`option${n}`))
    .filter(Boolean);

  const durationStr = interaction.options.getString('duration');
  const duration = durationStr ? parseTime(durationStr) : null;
  const endsAt = duration ? Math.floor((Date.now() + duration) / 1000) : null;

  await interaction.deferReply();

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📊 ${question}`)
    .setDescription(options.map((opt, i) => `${EMOJIS[i]} ${opt}`).join('\n'))
    .setFooter({ text: endsAt ? `Poll ends at` : 'React to vote!' });

  if (endsAt) embed.setTimestamp(endsAt * 1000);

  const msg = await interaction.editReply({ embeds: [embed], fetchReply: true });

  for (let i = 0; i < options.length; i++) {
    await msg.react(EMOJIS[i]);
  }

  db.prepare(
    'INSERT INTO polls (guild_id, channel_id, message_id, question, options, ends_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(interaction.guild.id, interaction.channel.id, msg.id, question, JSON.stringify(options), endsAt);
}
