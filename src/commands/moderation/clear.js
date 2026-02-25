import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Delete messages from a channel')
  .addIntegerOption((o) => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
  .addUserOption((o) => o.setName('user').setDescription('Only delete messages from this user'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
  const amount = interaction.options.getInteger('amount');
  const user = interaction.options.getUser('user');
  const { channel } = interaction;

  await interaction.deferReply({ ephemeral: true });

  try {
    let messages = await channel.messages.fetch({ limit: 100 });

    if (user) messages = messages.filter((m) => m.author.id === user.id);
    messages = [...messages.values()].slice(0, amount);

    // Split into groups (bulk delete only works for <14 days old)
    const recent = messages.filter((m) => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
    const old = messages.filter((m) => Date.now() - m.createdTimestamp >= 14 * 24 * 60 * 60 * 1000);

    if (recent.length > 0) await channel.bulkDelete(recent, true);
    for (const msg of old) await msg.delete().catch(() => {});

    await interaction.editReply({ embeds: [successEmbed('Cleared', `Deleted **${messages.length}** messages.`)] });
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed('Clear Failed', err.message)] });
  }
}
