import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Claim your daily coins');

export async function execute(interaction) {
  const { guild, user } = interaction;
  const dailyAmount = 100;

  db.prepare('INSERT OR IGNORE INTO economy (guild_id, user_id) VALUES (?, ?)').run(guild.id, user.id);
  const row = db.prepare('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?').get(guild.id, user.id);

  const now = Math.floor(Date.now() / 1000);
  const cooldown = 86400; // 24 hours
  const remaining = (row.last_daily + cooldown) - now;

  if (remaining > 0) {
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`⏰ You already claimed your daily coins! Come back in **${hours}h ${minutes}m**.`)
      ],
      ephemeral: true
    });
  }

  db.prepare('UPDATE economy SET coins = coins + ?, last_daily = ? WHERE guild_id = ? AND user_id = ?').run(dailyAmount, now, guild.id, user.id);

  const newBalance = row.coins + dailyAmount;
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('💰 Daily Reward!')
        .setDescription(`You claimed **${dailyAmount} coins**!\n\n💳 New balance: **${newBalance} coins**`)
        .setFooter({ text: 'Come back in 24h for more!' })
    ]
  });
}
