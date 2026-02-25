import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('lock')
  .setDescription('Lock a channel (prevent members from sending messages)')
  .addChannelOption((o) => o.setName('channel').setDescription('Channel to lock (default: current)'))
  .addStringOption((o) => o.setName('reason').setDescription('Reason'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
  const ch = interaction.options.getChannel('channel') || interaction.channel;
  const reason = interaction.options.getString('reason') || 'No reason';

  try {
    await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false,
    });
    await interaction.reply({ embeds: [successEmbed('Locked', `🔒 <#${ch.id}> has been locked.\n**Reason:** ${reason}`)], ephemeral: true });
    await ch.send(`🔒 This channel has been locked by a moderator. **Reason:** ${reason}`);
  } catch (err) {
    await interaction.reply({ embeds: [errorEmbed('Failed', err.message)], ephemeral: true });
  }
}
