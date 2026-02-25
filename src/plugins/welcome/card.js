import { createCanvas, loadImage, registerFont } from 'canvas';
import axios from 'axios';

/**
 * Generate a welcome card image for a new member.
 */
export async function createWelcomeCard(member, settings) {
  const width = 800;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  if (settings.card_background) {
    try {
      const bg = await loadImage(settings.card_background);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch {
      ctx.fillStyle = '#23272a';
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = '#23272a';
    ctx.fillRect(0, 0, width, height);
  }

  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, width, height);

  // Avatar
  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
  try {
    const res = await axios.get(avatarURL, { responseType: 'arraybuffer' });
    const avatar = await loadImage(Buffer.from(res.data));

    // Circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(125, 125, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 45, 45, 160, 160);
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(125, 125, 80, 0, Math.PI * 2);
    ctx.strokeStyle = settings.card_color || '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();
  } catch {}

  // Welcome text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('WELCOME', 250, 90);

  ctx.fillStyle = settings.card_color || '#ffffff';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(member.user.username, 250, 145);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '22px sans-serif';
  ctx.fillText(`Member #${member.guild.memberCount}`, 250, 190);

  return canvas.toBuffer('image/png');
}
