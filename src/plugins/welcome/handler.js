import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';
import { createWelcomeCard } from './card.js';

export async function handleWelcome(member) {
  const { guild } = member;
  const settings = db.prepare('SELECT * FROM welcome_settings WHERE guild_id = ?').get(guild.id);
  if (!settings || !settings.enabled || !settings.channel_id) return;

  const channel = guild.channels.cache.get(settings.channel_id);
  if (!channel) return;

  try {
    let message = settings.message || 'Welcome to **{server}**, {user}!';
    message = formatMessage(message, member, guild);

    const payload = { content: message };

    // Custom embed
    if (settings.embed) {
      try {
        const embedData = JSON.parse(settings.embed);
        payload.embeds = [EmbedBuilder.from(embedData)];
        delete payload.content;
      } catch {}
    }

    // Welcome card
    if (settings.card_enabled) {
      try {
        const cardBuffer = await createWelcomeCard(member, settings);
          if (cardBuffer) {
            payload.files = [new AttachmentBuilder(cardBuffer, { name: 'welcome.png' })];
          }

    await channel.send(payload);
  } catch (err) {
    logger.error('Welcome handler error:', err);
  }
}

export async function handleGoodbye(member) {
  const { guild } = member;
  const settings = db.prepare('SELECT * FROM goodbye_settings WHERE guild_id = ?').get(guild.id);
  if (!settings || !settings.enabled || !settings.channel_id) return;

  const channel = guild.channels.cache.get(settings.channel_id);
  if (!channel) return;

  try {
    let message = settings.message || 'Goodbye **{username}**, we hope to see you again!';
    message = formatMessage(message, member, guild);
    await channel.send(message);
  } catch {}
}

function formatMessage(template, member, guild) {
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{server}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount)
    .replace(/{mention}/g, `<@${member.id}>`);
}
