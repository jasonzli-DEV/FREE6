import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('Check your coin balance or another member\'s')
  .addUserOption((o) => o.setName('user').setDescription('User to check'));

export async function execute(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const { guild } = interaction;

  db.prepare('INSERT OR IGNORE INTO economy (guild_id, user_id) VALUES (?, ?)').run(guild.id, target.id);
  const row = db.prepare('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?').get(guild.id, target.id);

  const rank = db.prepare('SELECT COUNT(*) as rank FROM economy WHERE guild_id = ? AND coins > ?').get(guild.id, row.coins).rank + 1;

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
    .setTitle('💰 Balance')
    .addFields(
      { name: 'Wallet', value: `**${row.coins}** coins`, inline: true },
      { name: 'Bank', value: `**${row.bank}** coins`, inline: true },
      { name: 'Total', value: `**${row.coins + row.bank}** coins`, inline: true },
      { name: 'Server Rank', value: `#${rank}`, inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}
