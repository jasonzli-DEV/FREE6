import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../database/db.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('birthday')
  .setDescription('Manage birthdays')
  .addSubcommand((s) =>
    s.setName('set')
      .setDescription('Set your birthday')
      .addStringOption((o) => o.setName('date').setDescription('Your birthday (MM-DD or YYYY-MM-DD)').setRequired(true))
  )
  .addSubcommand((s) =>
    s.setName('view')
      .setDescription('View a member\'s birthday')
      .addUserOption((o) => o.setName('user').setDescription('User'))
  )
  .addSubcommand((s) =>
    s.setName('setup')
      .setDescription('Configure birthday announcements')
      .addChannelOption((o) => o.setName('channel').setDescription('Announcement channel').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Birthday role (optional)'))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const { guild, user } = interaction;

  if (sub === 'set') {
    const date = interaction.options.getString('date');
    const dateRegex = /^(\d{4}-)?(\d{2})-(\d{2})$/;
    if (!dateRegex.test(date)) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Date', 'Use format `MM-DD` or `YYYY-MM-DD`.')], ephemeral: true });
    }

    db.prepare('INSERT OR REPLACE INTO birthdays (guild_id, user_id, birthday) VALUES (?, ?, ?)').run(guild.id, user.id, date);
    return interaction.reply({ embeds: [successEmbed('Birthday Set', `🎂 Your birthday has been set to **${date}**!`)], ephemeral: true });
  }

  if (sub === 'view') {
    const target = interaction.options.getUser('user') || user;
    const row = db.prepare('SELECT birthday FROM birthdays WHERE guild_id = ? AND user_id = ?').get(guild.id, target.id);
    if (!row) return interaction.reply({ content: `**${target.username}** hasn't set their birthday.`, ephemeral: true });
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xf1c40f).setDescription(`🎂 **${target.username}**'s birthday: **${row.birthday}**`)]
    });
  }

  if (sub === 'setup') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server permission.')], ephemeral: true });
    }
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');

    db.prepare('INSERT OR REPLACE INTO birthday_settings (guild_id, enabled, channel_id, role_id) VALUES (?, 1, ?, ?)').run(guild.id, channel.id, role?.id || null);
    return interaction.reply({ embeds: [successEmbed('Birthday Setup', `Birthday announcements will be sent to <#${channel.id}>${role ? ` with the <@&${role.id}> role` : ''}.`)], ephemeral: true });
  }
}
