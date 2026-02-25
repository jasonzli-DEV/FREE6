# FREE6 🤖

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![GitHub Stars](https://img.shields.io/github/stars/jasonzli-DEV/FREE6?style=social)](https://github.com/jasonzli-DEV/FREE6)

**FREE6** is a fully-featured, open-source Discord bot — a **100% free alternative to MEE6**. Every feature MEE6 locks behind a paywall, FREE6 gives you for free.

[Features](#features) • [Setup](#setup) • [Dashboard](#web-dashboard) • [Commands](#slash-commands) • [Contributing](#contributing) • [License](#license)

</div>

---

## ✨ Features

### 🛡️ Moderation
- **Auto-Moderation** — Filter bad words, links, spam, excessive caps/emojis, and invite links (configured via dashboard)
- **Moderation Commands** — `/ban`, `/kick`, `/mute`, `/unmute`, `/warn`, `/infractions`, `/clear`, `/slowmode`, `/unban`
- **Audit Logging** — Full server activity log: message edits/deletes, member joins/leaves, role changes, bans, voice events
- **Temp Bans/Mutes** — Time-based punishment with automatic expiration

### 🎉 Welcome & Goodbye
- Custom welcome/goodbye messages with rich embed support
- Personalized welcome cards with custom backgrounds
- Auto-assign roles on member join (autorole)

### 📈 Levels
- Message-based XP with configurable rate and cooldown
- Level-up notifications (channel or DM)
- Role rewards at configurable levels
- `/rank` and `/leaderboard` commands
- Customizable rank card with background & color

### 🎭 Reaction Roles
- Assign roles via emoji reactions or buttons (configured via dashboard)
- Modes: Normal, Unique (only one at a time), Verify, Reversed
- Unlimited reaction role sets

### 🛠️ Custom Commands
- Create server-specific commands via the dashboard
- Actions: send message, send DM, add/remove/toggle role, add response
- Variable support: `{user}`, `{server}`, `{membercount}`, etc.

### 🎰 Economy
- Daily coin rewards with `/daily`
- Gambling games with `/gamble` (coinflip, slots, roulette, rock-paper-scissors)
- Check balance with `/balance`
- Server leaderboard for coins

### 🎁 Giveaways
- Easy giveaway creation with `/giveaway start`
- Custom duration, winner count, and requirements
- Reroll and end giveaways manually

### 📊 Polls
- Create polls with up to 10 options via `/poll`
- Timed polls with automatic results
- Single-choice or multi-choice modes

### 🎂 Birthdays
- Members set their own birthday with `/birthday set`
- Auto-birthday messages and optional birthday role

### 🔔 Social Alerts
- **YouTube** — New video upload alerts (requires `YOUTUBE_API_KEY`)
- **RSS Feeds** — Generic feed support for any public RSS/Atom feed (no key required)
- **Reddit** — New post notifications for any subreddit (no key required)

### 🎫 Ticketing
- Dashboard-configured support ticket system
- Private thread or channel per ticket
- Staff assignment and ticket transcripts

### 🤖 Automations
- Trigger → Condition → Action automation system
- Supports message triggers, join/leave events, time-based triggers

### 🔢 Invite Tracker
- Track which member invited whom (configured via dashboard)
- Invite leaderboard per server

### ⭐ Starboards
- Pin the best messages to a starboard channel automatically
- Configurable star threshold

### 📌 Utilities
- Rich embed builder with live preview in dashboard
- Timed reminders (configured via dashboard)
- Temporary voice channels (auto-create on join)
- `/help` and `/dashboard` commands

---

## 🚀 Setup

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- A Discord Bot Token ([guide](https://discord.com/developers/applications))

> ⚠️ **Privileged Intents required** — In the [Discord Developer Portal](https://discord.com/developers/applications), open your app → **Bot** → enable all three Privileged Gateway Intents:
> - Server Members Intent
> - Message Content Intent
> - (Presence Intent is NOT needed)

### Installation

```bash
# Clone the repository
git clone https://github.com/jasonzli-DEV/FREE6.git
cd FREE6

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Deploy slash commands (required once — registers /commands with Discord)
npm run build

# Start the bot
npm start
```

### Development mode (auto-restart)
```bash
npm run dev
```

---

## ⌨️ Slash Commands

FREE6 has 19 slash commands — matching what MEE6 provides. Most features (automod, reaction roles, ticketing, etc.) are configured via the dashboard, just like MEE6.

| Category | Commands |
|---|---|
| **Moderation** | `/ban`, `/kick`, `/mute`, `/unmute`, `/warn`, `/infractions`, `/clear`, `/slowmode`, `/unban` |
| **Leveling** | `/rank`, `/leaderboard` |
| **Economy** | `/balance`, `/daily`, `/gamble` |
| **Fun** | `/birthday`, `/giveaway`, `/poll` |
| **Utility** | `/help`, `/dashboard` |

---

## 🖥️ Web Dashboard

FREE6 comes with a full web dashboard, just like MEE6.

Access it at `http://localhost:3000` (or your configured `DASHBOARD_PORT`).

Features:
- Login with Discord OAuth2
- Configure all 20 plugins per server
- Live leaderboard view
- Embed builder
- Custom command editor

---

## 📁 Project Structure

```
FREE6/
├── src/
│   ├── index.js              # Entry point
│   ├── bot.js                # Discord client
│   ├── deploy-commands.js    # Slash command deployer
│   ├── database/
│   │   └── db.js             # SQLite database setup
│   ├── commands/             # All slash commands
│   │   ├── moderation/
│   │   ├── leveling/
│   │   ├── economy/
│   │   ├── fun/
│   │   └── utility/
│   ├── events/               # Discord event handlers
│   ├── plugins/              # Feature plugin modules
│   │   ├── automod/
│   │   ├── welcome/
│   │   ├── leveling/
│   │   ├── reactionRoles/
│   │   ├── customCommands/
│   │   ├── giveaways/
│   │   ├── economy/
│   │   ├── social/
│   │   ├── ticketing/
│   │   ├── polls/
│   │   ├── birthdays/
│   │   ├── inviteTracker/
│   │   ├── starboard/
│   │   ├── antiRaid/
│   │   ├── socialAlerts/     # YouTube / RSS / Reddit pollers
│   │   └── schedulers.js
│   └── dashboard/            # Web dashboard (Express)
│       ├── server.js
│       ├── routes/
│       └── public/
├── .env.example
└── package.json
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

## 📜 Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 🔒 Security

Found a vulnerability? Please report it privately — see [SECURITY.md](SECURITY.md).

---

## 📄 License

MIT License — Copyright (c) 2026 [jasonzli-DEV](https://github.com/jasonzli-DEV)

> FREE6 is not affiliated with or endorsed by MEE6 or Sidescroll Ventures SAS.
