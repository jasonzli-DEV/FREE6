import {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { db } from '../../database/db.js';
import { logger } from '../../utils/logger.js';

export async function openTicket(interaction) {
  const { guild, user } = interaction;
  const settings = db.prepare('SELECT * FROM ticket_settings WHERE guild_id = ?').get(guild.id);

  if (!settings || !settings.enabled) {
    return interaction.reply({ content: '❌ Ticketing is not enabled on this server.', ephemeral: true });
  }

  // Check if user already has an open ticket
  const existing = db.prepare(
    'SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = ?'
  ).get(guild.id, user.id, 'open');

  if (existing) {
    const ch = guild.channels.cache.get(existing.channel_id);
    return interaction.reply({
      content: `❌ You already have an open ticket: ${ch ? `<#${ch.id}>` : 'unknown channel'}`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?').get(guild.id).count;
    const channelName = `ticket-${user.username}-${ticketCount + 1}`;

    const permOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: guild.members.me.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
      },
    ];

    if (settings.support_role) {
      permOverwrites.push({
        id: settings.support_role,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      });
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: settings.category_id || null,
      permissionOverwrites: permOverwrites,
    });

    db.prepare(
      'INSERT INTO tickets (guild_id, channel_id, user_id) VALUES (?, ?, ?)'
    ).run(guild.id, channel.id, user.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎫 Support Ticket')
      .setDescription(`Hello <@${user.id}>! A member of our support team will be with you shortly.\n\nPlease describe your issue below.`)
      .setFooter({ text: `Ticket opened by ${user.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    await channel.send({ content: `<@${user.id}>${settings.support_role ? ` <@&${settings.support_role}>` : ''}`, embeds: [embed], components: [row] });

    await interaction.editReply({ content: `✅ Your ticket has been created: <#${channel.id}>` });
  } catch (err) {
    logger.error('Ticket creation error:', err);
    await interaction.editReply({ content: '❌ Failed to create ticket. Check my permissions.' });
  }
}

export async function handleTicketButton(interaction) {
  const { customId, guild, channel, user, member } = interaction;

  if (customId === 'ticket_close') {
    const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND status = ?').get(channel.id, 'open');
    if (!ticket) return interaction.reply({ content: '❌ This is not an open ticket.', ephemeral: true });

    const settings = db.prepare('SELECT * FROM ticket_settings WHERE guild_id = ?').get(guild.id);
    const isSupport = settings?.support_role && member.roles.cache.has(settings.support_role);
    const isOwner = ticket.user_id === user.id;
    const isAdmin = member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!isOwner && !isSupport && !isAdmin) {
      return interaction.reply({ content: '❌ You cannot close this ticket.', ephemeral: true });
    }

    db.prepare('UPDATE tickets SET status = ? WHERE channel_id = ?').run('closed', channel.id);

    await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });
    setTimeout(async () => {
      try { await channel.delete(); } catch {}
    }, 5000);
  }
}
