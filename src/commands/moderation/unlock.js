import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('unlock')
  .setDescription('Unlock a locked channel')
  .addChannelOption((o) => o.setName('channel').setDescription('Channel to unlock (default: current)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
  const ch = interaction.options.getChannel('channel') || interaction.channel;

  try {
    await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null,
    });
    await interaction.reply({ embeds: [successEmbed('Unlocked', `🔓 <#${ch.id}> has been unlocked.`)], ephemeral: true });
    await ch.send('🔓 This channel has been unlocked.');
  } catch (err) {
    await interaction.reply({ embeds: [errorEmbed('Failed', err.message)], ephemeral: true });
  }
}
