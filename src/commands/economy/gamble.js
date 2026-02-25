import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../../database/db.js';
import { errorEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('gamble')
  .setDescription('Gamble your coins')
  .addSubcommand((s) =>
    s.setName('coinflip')
      .setDescription('Flip a coin to double your bet or lose it')
      .addIntegerOption((o) => o.setName('amount').setDescription('Amount to bet').setRequired(true).setMinValue(1))
      .addStringOption((o) =>
        o.setName('side').setDescription('Heads or tails').setRequired(true)
          .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })
      )
  )
  .addSubcommand((s) =>
    s.setName('roulette')
      .setDescription('Bet on a roulette color')
      .addIntegerOption((o) => o.setName('amount').setDescription('Amount to bet').setRequired(true).setMinValue(1))
      .addStringOption((o) =>
        o.setName('color').setDescription('Color to bet on').setRequired(true)
          .addChoices({ name: 'Red (2x)', value: 'red' }, { name: 'Black (2x)', value: 'black' }, { name: 'Green (14x)', value: 'green' })
      )
  )
  .addSubcommand((s) =>
    s.setName('slots')
      .setDescription('Play the slot machine')
      .addIntegerOption((o) => o.setName('amount').setDescription('Amount to bet').setRequired(true).setMinValue(1))
  )
  .addSubcommand((s) =>
    s.setName('rps')
      .setDescription('Rock Paper Scissors')
      .addIntegerOption((o) => o.setName('amount').setDescription('Amount to bet').setRequired(true).setMinValue(1))
      .addStringOption((o) =>
        o.setName('choice').setDescription('Your choice').setRequired(true)
          .addChoices({ name: 'Rock', value: 'rock' }, { name: 'Paper', value: 'paper' }, { name: 'Scissors', value: 'scissors' })
      )
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const amount = interaction.options.getInteger('amount');
  const { guild, user } = interaction;

  db.prepare('INSERT OR IGNORE INTO economy (guild_id, user_id) VALUES (?, ?)').run(guild.id, user.id);
  const row = db.prepare('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?').get(guild.id, user.id);

  if (row.coins < amount) {
    return interaction.reply({ embeds: [errorEmbed('Not Enough Coins', `You only have **${row.coins}** coins.`)], ephemeral: true });
  }

  if (sub === 'coinflip') {
    const choice = interaction.options.getString('side');
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = choice === result;
    const change = won ? amount : -amount;
    db.prepare('UPDATE economy SET coins = coins + ? WHERE guild_id = ? AND user_id = ?').run(change, guild.id, user.id);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(won ? 0x57f287 : 0xed4245)
        .setTitle(won ? '🪙 You Won!' : '🪙 You Lost!')
        .setDescription(`The coin landed on **${result}**.\n${won ? `+${amount}` : `-${amount}`} coins\n💳 New balance: **${row.coins + change}**`)]
    });
  }

  if (sub === 'roulette') {
    const color = interaction.options.getString('color');
    const roll = Math.floor(Math.random() * 37); // 0-36
    let result;
    if (roll === 0) result = 'green';
    else if (roll % 2 === 0) result = 'black';
    else result = 'red';

    const multipliers = { red: 2, black: 2, green: 14 };
    const won = color === result;
    const change = won ? amount * (multipliers[color] - 1) : -amount;
    db.prepare('UPDATE economy SET coins = coins + ? WHERE guild_id = ? AND user_id = ?').run(change, guild.id, user.id);

    const colorEmoji = { red: '🔴', black: '⚫', green: '🟢' };
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(won ? 0x57f287 : 0xed4245)
        .setTitle('🎰 Roulette')
        .setDescription(`Ball landed on **${colorEmoji[result]} ${result} (${roll})**!\n${won ? `+${change}` : `-${amount}`} coins\n💳 New balance: **${row.coins + change}**`)]
    });
  }

  if (sub === 'slots') {
    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];
    const reels = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
    const [a, b, c] = reels;

    let multiplier = 0;
    if (a === b && b === c) {
      multiplier = a === '💎' ? 10 : a === '⭐' ? 5 : 3;
    } else if (a === b || b === c || a === c) {
      multiplier = 1.5;
    }

    const won = multiplier > 0;
    const change = won ? Math.floor(amount * multiplier) : -amount;
    db.prepare('UPDATE economy SET coins = coins + ? WHERE guild_id = ? AND user_id = ?').run(change, guild.id, user.id);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(won ? 0x57f287 : 0xed4245)
        .setTitle('🎰 Slots')
        .setDescription(`[ ${reels.join(' | ')} ]\n\n${won ? `🎉 **${multiplier}x** multiplier! +${change} coins` : `❌ Lost ${amount} coins`}\n💳 Balance: **${row.coins + change}**`)]
    });
  }

  if (sub === 'rps') {
    const userChoice = interaction.options.getString('choice');
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

    const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    let result, change;
    if (userChoice === botChoice) { result = 'tie'; change = 0; }
    else if (beats[userChoice] === botChoice) { result = 'win'; change = amount; }
    else { result = 'lose'; change = -amount; }

    db.prepare('UPDATE economy SET coins = coins + ? WHERE guild_id = ? AND user_id = ?').run(change, guild.id, user.id);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(result === 'win' ? 0x57f287 : result === 'tie' ? 0xfee75c : 0xed4245)
        .setTitle('✂️ Rock Paper Scissors')
        .setDescription(`You: ${emojis[userChoice]} | Bot: ${emojis[botChoice]}\n\n${result === 'win' ? `🎉 You won! +${amount} coins` : result === 'tie' ? "🤝 It's a tie!" : `❌ You lost! -${amount} coins`}\n💳 Balance: **${row.coins + change}**`)]
    });
  }
}
