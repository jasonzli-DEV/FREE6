import { EmbedBuilder } from 'discord.js';

export const Colors = {
  PRIMARY: 0x5865f2,
  SUCCESS: 0x57f287,
  WARNING: 0xfee75c,
  ERROR: 0xed4245,
  INFO: 0x5865f2,
  LEVELING: 0xfaa61a,
  ECONOMY: 0xf1c40f,
  MOD: 0xed4245,
};

export function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(Colors.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

export function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(Colors.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

export function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(Colors.INFO)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description);
}

export function warnEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(Colors.WARNING)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description);
}
