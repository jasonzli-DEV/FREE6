import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';

const dbPath = './data/free6.sqlite';
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

// Performance settings
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Guild Settings ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!',
    language TEXT DEFAULT 'en',
    log_channel TEXT,
    mute_role TEXT,
    settings JSON DEFAULT '{}'
  );
`);

// ── Moderation / Infractions ────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS infractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    duration INTEGER,
    expires_at INTEGER,
    active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_infractions_guild_user
    ON infractions(guild_id, user_id);
`);

// ── Temporary Punishments ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS temp_punishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    active INTEGER DEFAULT 1
  );
`);

// ── Leveling ───────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS levels (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    last_message INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS level_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    announce_channel TEXT,
    announce_dm INTEGER DEFAULT 0,
    announce_message TEXT DEFAULT 'GG {user}, you just advanced to **level {level}**!',
    xp_min INTEGER DEFAULT 15,
    xp_max INTEGER DEFAULT 25,
    xp_cooldown INTEGER DEFAULT 60,
    no_xp_roles JSON DEFAULT '[]',
    no_xp_channels JSON DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS level_roles (
    guild_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, level)
  );
`);

// ── Economy ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS economy (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    coins INTEGER DEFAULT 0,
    bank INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    type TEXT DEFAULT 'role',
    role_id TEXT,
    quantity INTEGER DEFAULT -1
  );
`);

// ── Welcome / Goodbye ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS welcome_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    channel_id TEXT,
    message TEXT DEFAULT 'Welcome to **{server}**, {user}!',
    embed JSON DEFAULT NULL,
    card_enabled INTEGER DEFAULT 0,
    card_background TEXT DEFAULT NULL,
    card_color TEXT DEFAULT '#ffffff',
    auto_role JSON DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS goodbye_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    channel_id TEXT,
    message TEXT DEFAULT 'Goodbye {username}, we hope to see you again!'
  );
`);

// ── Reaction Roles ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS reaction_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    role_id TEXT NOT NULL,
    mode TEXT DEFAULT 'normal'
  );

  CREATE INDEX IF NOT EXISTS idx_rr_message
    ON reaction_roles(message_id, emoji);
`);

// ── Custom Commands ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS custom_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT 'A custom command',
    response TEXT,
    actions JSON DEFAULT '[]',
    cooldown INTEGER DEFAULT 0,
    UNIQUE(guild_id, name)
  );
`);

// ── Giveaways ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    prize TEXT NOT NULL,
    winner_count INTEGER DEFAULT 1,
    ends_at INTEGER NOT NULL,
    ended INTEGER DEFAULT 0,
    host_id TEXT NOT NULL,
    entries JSON DEFAULT '[]',
    winners JSON DEFAULT '[]',
    requirements JSON DEFAULT '{}'
  );
`);

// ── Polls ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    question TEXT NOT NULL,
    options JSON NOT NULL,
    votes JSON DEFAULT '{}',
    ends_at INTEGER,
    ended INTEGER DEFAULT 0,
    multi_choice INTEGER DEFAULT 0
  );
`);

// ── Birthdays ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS birthdays (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    birthday TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS birthday_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    channel_id TEXT,
    role_id TEXT,
    message TEXT DEFAULT '🎂 Happy Birthday {user}! 🎉'
  );
`);

// ── Social Alerts ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS social_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    handle TEXT NOT NULL,
    message TEXT,
    last_checked INTEGER DEFAULT 0,
    last_post_id TEXT
  );
`);

// ── Ticketing ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS ticket_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    category_id TEXT,
    support_role TEXT,
    log_channel TEXT,
    panel_channel TEXT,
    panel_message TEXT
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

// ── Invite Tracker ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS invites (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    inviter_id TEXT,
    code TEXT,
    joined_at INTEGER DEFAULT (unixepoch()),
    left INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS invite_counts (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    real INTEGER DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    left INTEGER DEFAULT 0,
    fake INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );
`);

// ── Starboard ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS starboard_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    channel_id TEXT,
    threshold INTEGER DEFAULT 3,
    emoji TEXT DEFAULT '⭐',
    ignore_bots INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS starboard_messages (
    guild_id TEXT NOT NULL,
    original_message_id TEXT NOT NULL,
    starboard_message_id TEXT,
    star_count INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, original_message_id)
  );
`);

// ── Auto-mod Settings ─────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS automod_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    anti_spam INTEGER DEFAULT 0,
    anti_caps INTEGER DEFAULT 0,
    caps_threshold INTEGER DEFAULT 70,
    anti_links INTEGER DEFAULT 0,
    allowed_links JSON DEFAULT '[]',
    anti_invites INTEGER DEFAULT 0,
    allowed_invites JSON DEFAULT '[]',
    anti_bad_words INTEGER DEFAULT 0,
    bad_words JSON DEFAULT '[]',
    anti_emoji_spam INTEGER DEFAULT 0,
    emoji_threshold INTEGER DEFAULT 10,
    anti_mention_spam INTEGER DEFAULT 0,
    mention_threshold INTEGER DEFAULT 5,
    ignore_roles JSON DEFAULT '[]',
    ignore_channels JSON DEFAULT '[]',
    action TEXT DEFAULT 'warn',
    mute_duration INTEGER DEFAULT 300000
  );
`);

// ── Automation ───────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    trigger_type TEXT NOT NULL,
    trigger_value JSON,
    conditions JSON DEFAULT '[]',
    actions JSON NOT NULL
  );
`);

// ── Reminders ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT,
    channel_id TEXT,
    message TEXT NOT NULL,
    remind_at INTEGER NOT NULL,
    sent INTEGER DEFAULT 0
  );
`);

// ── Timed Messages ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS timed_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message TEXT,
    embed JSON,
    cron TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_sent INTEGER
  );
`);

// ── Temp Channels ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS temp_channel_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    trigger_channel_id TEXT,
    category_id TEXT
  );

  CREATE TABLE IF NOT EXISTS temp_channels (
    channel_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

// ── Anti-Raid ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS anti_raid_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    join_threshold INTEGER DEFAULT 10,
    join_interval INTEGER DEFAULT 10,
    action TEXT DEFAULT 'kick',
    lockdown_active INTEGER DEFAULT 0
  );
`);

// ── Plugin Settings (enable/disable per guild) ────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS plugin_settings (
    guild_id TEXT NOT NULL,
    plugin_name TEXT NOT NULL,
    enabled INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, plugin_name)
  );
`);

// ── YouTube Alerts ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS youtube_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    youtube_channel_id TEXT NOT NULL,
    youtube_channel_name TEXT,
    message TEXT DEFAULT '{channel} uploaded a new video!\n{url}',
    last_video_id TEXT,
    last_checked INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_youtube_guild
    ON youtube_alerts(guild_id);
`);

// ── RSS Feeds ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS rss_feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    feed_url TEXT NOT NULL,
    feed_name TEXT,
    message TEXT DEFAULT 'New post from {feed}: **{title}**\n{url}',
    last_item_id TEXT,
    last_checked INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_rss_guild
    ON rss_feeds(guild_id);
`);

// ── Reddit Alerts ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS reddit_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    subreddit TEXT NOT NULL,
    message TEXT DEFAULT 'New post in r/{subreddit}: **{title}**\n{url}',
    last_post_id TEXT,
    last_checked INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_reddit_guild
    ON reddit_alerts(guild_id);
`);

// ── Embed Messages ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS embed_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    channel_id TEXT,
    message_id TEXT,
    embed_data JSON NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

logger.info('Database initialized successfully');
