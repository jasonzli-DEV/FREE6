# FREE6 🤖

<div align="center">

[![Discord](https://img.shields.io/discord/000000000000000000?color=5865F2&logo=discord&logoColor=white&label=Support%20Server)](https://discord.gg/free6)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![GitHub Stars](https://img.shields.io/github/stars/jasonzli-DEV/FREE6?style=social)](https://github.com/jasonzli-DEV/FREE6)

**FREE6** is a fully-featured, open-source Discord bot that is a **110% replica of MEE6** — with every feature MEE6 offers, _plus_ exclusive extras that make it even better. And it's completely **free**.

[Features](#features) • [Setup](#setup) • [Dashboard](#web-dashboard) • [Contributing](#contributing) • [License](#license)

</div>

---

## ✨ Features

### 🛡️ Moderation
- **Auto-Moderation** — Filter bad words, links, spam, excessive caps/emojis, and invite links
- **Moderation Commands** — `/ban`, `/kick`, `/mute`, `/unmute`, `/warn`, `/infractions`, `/clear`, `/slowmode`, `/lock`, `/unlock`
- **Audit Logging** — Full server activity log: message edits/deletes, member joins/leaves, role changes, bans, voice events
- **Temp Bans/Mutes** — Time-based punishment with automatic expiration

### 🎉 Welcome & Goodbye
- Custom welcome/goodbye messages with rich embed support
- Personalized welcome cards with custom backgrounds
- Auto-assign roles on member join (autorole)

### 📈 Leveling & XP
- Message-based XP with configurable rate and cooldown
- Level-up notifications (channel or DM)
- Role rewards at configurable levels
- Leaderboard per server
- Customizable rank card with background & color

### 🎭 Reaction Roles
- Assign roles via emoji reactions on any message
- Modes: Normal, Unique (only one at a time), Verify, Reversed
- Unlimited reaction role sets

### 🛠️ Custom Commands
- Create server-specific slash commands
- Actions: send message, send DM, add/remove/toggle role, add response
- Variable support: `{user}`, `{server}`, `{membercount}`, etc.

### 🎰 Economy
- Daily coin rewards with the `/daily` command
- Games: roulette, rock-paper-scissors, slots, coinflip
- Shop with purchasable roles and items
- Server leaderboard for coins

### 🎁 Giveaways
- Easy giveaway creation with `/giveaway start`
- Custom duration, winner count, and requirements
- Reroll and end giveaways manually

### 📊 Polls
- Create polls with up to 10 options
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
- `/ticket` command to open support tickets
- Private thread or channel per ticket
- Staff assignment and ticket transcripts

### 🤖 Automation
- Trigger → Condition → Action automation system
- Supports message triggers, join/leave events, time-based triggers

### 🔢 Invite Tracker
- Track which member invited whom
- Invite leaderboard per server
- Rejoin/bonus invite tracking

### 📌 Utilities
- Rich embed builder with live preview in dashboard
- Timed/scheduled messages (recurring or one-time)
- Server statistics counters in voice channel names
- Temporary voice channels (auto-create on join)
- `/poll`, `/remind`, `/serverinfo`, `/userinfo`, `/avatar`, `/help`

### 🌟 Exclusive FREE6 Extras (The +10%)
- **Starboard** — Highlight popular messages automatically
- **Anti-Raid Protection** — Detect and lockdown server during raids
- **Thread Management** — Auto-archive, auto-lock, thread only channels
- **Anonymous Suggestions** — `/suggest` with anonymous voting
- **Advanced Dashboard** — Graphs, logs view, per-plugin analytics
- **Per-Channel Slowmode Manager** — Auto-adjust slowmode based on activity
- **Server Backup** — Backup and restore server settings
- **Custom Bot Personalizer** — Use your OWN bot token to power FREE6 under a custom identity

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

## 🖥️ Web Dashboard

FREE6 comes with a full web dashboard, just like MEE6.

Access it at `http://localhost:3000` (or your configured `DASHBOARD_PORT`).

Features:
- Login with Discord OAuth2
- Configure all plugins per server
- Live leaderboard view
- Audit log viewer
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
