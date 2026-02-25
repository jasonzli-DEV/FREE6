import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../utils/logger.js';
import { db } from '../database/db.js';
import { authRouter } from './routes/auth.js';
import { apiRouter } from './routes/api.js';
import bot from '../bot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// Helper: does the user have Manage Server in this guild? (bit 0x20)
function canManage(guild) {
  return (BigInt(guild.permissions || 0) & BigInt(0x20)) === BigInt(0x20);
}
const PORT = process.env.DASHBOARD_PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// ── Session ────────────────────────────────────────────────────────────────
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// ── Passport / Discord OAuth2 ──────────────────────────────────────────────
passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.REDIRECT_URI,
  scope: ['identify', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
  return done(null, { ...profile, accessToken });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

// ── Make user available to templates ──────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/api', apiRouter);

// Home
app.get('/', (req, res) => {
  res.render('index', { title: 'FREE6 — The Free MEE6 Alternative' });
});

// Dashboard — server picker
// Shows ALL the user's servers (like MEE6's /manage page).
// Servers where the bot is already present get a "Configure" button.
// Servers where it isn't get an "Add Bot" button.
app.get('/dashboard', ensureAuth, (req, res) => {
  const userGuilds = (req.user.guilds || []).filter(canManage);
  const guilds = userGuilds.map((g) => ({
    ...g,
    botPresent: bot.guilds.cache.has(g.id),
  }));
  // Sort: bot-present first, then alphabetically
  guilds.sort((a, b) => {
    if (a.botPresent && !b.botPresent) return -1;
    if (!a.botPresent && b.botPresent) return 1;
    return a.name.localeCompare(b.name);
  });
  res.render('dashboard', { title: 'Dashboard', user: req.user, guilds });
});

// Per-server config panel
// Guard: user must have Manage Server AND bot must be in the guild
app.get('/dashboard/:guildId', ensureAuth, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds?.find((g) => g.id === guildId);
  if (!userGuild || !canManage(userGuild)) return res.redirect('/dashboard');
  if (!bot.guilds.cache.has(guildId)) {
    // Bot not in this server — redirect to add-bot URL
    return res.redirect(
      `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&guild_id=${guildId}&permissions=8&scope=bot+applications.commands`
    );
  }
  const guild = bot.guilds.cache.get(guildId);
  const guildData = { id: guild.id, name: guild.name, icon: guild.icon };
  res.render('server', { title: `${guild.name} — Dashboard`, guild: guildData });
});

// Leaderboard (public — no login required)
app.get('/leaderboard/:guildId', (req, res) => {
  const { guildId } = req.params;
  const rows = db.prepare('SELECT * FROM levels WHERE guild_id = ? ORDER BY total_xp DESC LIMIT 100').all(guildId);
  // Try to get guild name from bot cache for the title
  const cached = bot.guilds.cache.get(guildId);
  const guild = cached ? { id: cached.id, name: cached.name, icon: cached.icon } : { id: guildId, name: guildId };
  res.render('leaderboard', { title: `${guild.name} — Leaderboard`, rows, guild });
});

// 404
app.use((req, res) => {
  res.status(404).render('error', { status: 404, message: 'Page not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Dashboard error:', err);
  res.status(500).render('error', { status: 500, message: err.message || 'Something went wrong.' });
});

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/discord');
}

app.listen(PORT, () => {
  logger.info(`Dashboard running at http://localhost:${PORT}`);
});

export default app;
