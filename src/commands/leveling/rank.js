import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { xpForLevel } from '../../plugins/leveling/xp.js';
import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';

export const data = new SlashCommandBuilder()
  .setName('rank')
  .setDescription('View your rank card or another member\'s')
  .addUserOption((o) => o.setName('user').setDescription('User to check'));

export async function execute(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const { guild } = interaction;

  await interaction.deferReply();

  const row = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guild.id, target.id);

  if (!row) {
    return interaction.editReply({ content: `**${target.username}** hasn't earned any XP yet!` });
  }

  const rank = db.prepare('SELECT COUNT(*) as rank FROM levels WHERE guild_id = ? AND total_xp > ?').get(guild.id, row.total_xp).rank + 1;
  const total = db.prepare('SELECT COUNT(*) as total FROM levels WHERE guild_id = ?').get(guild.id).total;
  const needed = xpForLevel(row.level);
  const progress = row.xp / needed;

  // Generate rank card
  try {
    const buffer = await generateRankCard(target, row, rank, total, progress, needed);
    const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
    return interaction.editReply({ files: [attachment] });
  } catch {
    // Fallback to embed
    const embed = new EmbedBuilder()
      .setColor(0xfaa61a)
      .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
      .addFields(
        { name: 'Level', value: `${row.level}`, inline: true },
        { name: 'XP', value: `${row.xp} / ${needed}`, inline: true },
        { name: 'Rank', value: `#${rank} / ${total}`, inline: true },
        { name: 'Total XP', value: `${row.total_xp}`, inline: true }
      );
    return interaction.editReply({ embeds: [embed] });
  }
}

async function generateRankCard(user, row, rank, total, progress, needed) {
  const width = 800, height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#2c2f33';
  ctx.fillRect(0, 0, width, height);

  // Avatar
  const avatarURL = user.displayAvatarURL({ extension: 'png', size: 128 });
  try {
    const res = await axios.get(avatarURL, { responseType: 'arraybuffer' });
    const avatar = await loadImage(Buffer.from(res.data));
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 100, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 30, 30, 140, 140);
    ctx.restore();
  } catch {}

  // Username
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(user.username, 200, 70);

  // Rank
  ctx.fillStyle = '#faa61a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Rank #${rank}`, 200, 105);

  // Level
  ctx.fillStyle = '#99aab5';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Level ${row.level}`, 530, 105);

  // XP text
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '18px sans-serif';
  ctx.fillText(`${row.xp} / ${needed} XP`, 200, 140);

  // Progress bar background
  ctx.fillStyle = '#4f545c';
  ctx.beginPath();
  ctx.roundRect(200, 155, 550, 20, 10);
  ctx.fill();

  // Progress bar fill
  const filledWidth = Math.max(20, Math.floor(progress * 550));
  ctx.fillStyle = '#faa61a';
  ctx.beginPath();
  ctx.roundRect(200, 155, filledWidth, 20, 10);
  ctx.fill();

  return canvas.toBuffer('image/png');
}
