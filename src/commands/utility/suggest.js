import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('suggest')
  .setDescription('Submit an anonymous suggestion')
  .addStringOption((o) => o.setName('suggestion').setDescription('Your suggestion').setRequired(true))
  .addChannelOption((o) => o.setName('channel').setDescription('Channel to post the suggestion in'));

export async function execute(interaction) {
  const suggestion = interaction.options.getString('suggestion');
  const channel = interaction.options.getChannel('channel') || interaction.channel;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('💡 New Suggestion')
    .setDescription(suggestion)
    .setFooter({ text: 'Vote with 👍 or 👎' })
    .setTimestamp();

  try {
    const msg = await channel.send({ embeds: [embed] });
    await msg.react('👍');
    await msg.react('👎');
    await interaction.reply({ content: `✅ Your suggestion has been posted anonymously in <#${channel.id}>!`, ephemeral: true });
  } catch {
    await interaction.reply({ content: '❌ Could not post suggestion. Check channel permissions.', ephemeral: true });
  }
}
