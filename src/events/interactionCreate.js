import { Collection } from 'discord.js';
import { logger } from '../utils/logger.js';
import { errorEmbed } from '../utils/embeds.js';
import { handleCustomCommand } from '../plugins/customCommands/handler.js';
import { handleReactionRoleButton } from '../plugins/reactionRoles/handler.js';
import { handleTicketButton } from '../plugins/ticketing/handler.js';

export const name = 'interactionCreate';

export async function execute(interaction) {
  const { client } = interaction;

  // ── Slash Commands ──────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      // Try custom commands
      return await handleCustomCommand(interaction);
    }

    // Cooldown check
    if (!client.cooldowns.has(command.data.name)) {
      client.cooldowns.set(command.data.name, new Collection());
    }
    const now = Date.now();
    const timestamps = client.cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expiration = timestamps.get(interaction.user.id) + cooldownAmount;
      if (now < expiration) {
        const timeLeft = ((expiration - now) / 1000).toFixed(1);
        return interaction.reply({
          embeds: [errorEmbed('Cooldown', `Please wait **${timeLeft}s** before using \`/${command.data.name}\` again.`)],
          ephemeral: true,
        });
      }
    }
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(`Error executing /${command.data.name}:`, err);
      const reply = {
        embeds: [errorEmbed('Command Error', 'An unexpected error occurred. Please try again.')],
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
    return;
  }

  // ── Button Interactions ─────────────────────────────────────────────────
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('ticket_')) {
      return await handleTicketButton(interaction);
    }
    if (interaction.customId.startsWith('rr_')) {
      return await handleReactionRoleButton(interaction);
    }
  }

  // ── Select Menu ─────────────────────────────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('rr_select_')) {
      return await handleReactionRoleButton(interaction);
    }
  }
}
