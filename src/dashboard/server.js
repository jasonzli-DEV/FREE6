import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { logger } from '../utils/logger.js';
import { db } from '../database/db.js';
import { authRouter } from './routes/auth.js';
import { apiRouter } from './routes/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// ── Session ────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'free6-default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// ── Passport / Discord OAuth2 ──────────────────────────────────────────────
passport.use(new DiscordStrategy({
  clientID: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  callbackURL: process.env.OAUTH_REDIRECT_URI,
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

// Dashboard (requires login)
app.get('/dashboard', ensureAuth, (req, res) => {
  res.render('dashboard', { title: 'Dashboard', user: req.user });
});

// Server config
app.get('/dashboard/:guildId', ensureAuth, (req, res) => {
  const { guildId } = req.params;
  const guild = req.user.guilds?.find((g) => g.id === guildId);
  if (!guild) return res.redirect('/dashboard');

  const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId) || {};
  res.render('server', { title: `${guild.name} — Dashboard`, guild, settings });
});

// Leaderboard (public)
app.get('/leaderboard/:guildId', (req, res) => {
  const { guildId } = req.params;
  const rows = db.prepare('SELECT * FROM levels WHERE guild_id = ? ORDER BY total_xp DESC LIMIT 50').all(guildId);
  res.render('leaderboard', { title: 'Leaderboard', rows, guildId });
});

// 404
app.use((req, res) => {
  res.status(404).render('error', { title: '404 Not Found', message: 'Page not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Dashboard error:', err);
  res.status(500).render('error', { title: '500 Error', message: 'Something went wrong.' });
});

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/discord');
}

app.listen(PORT, () => {
  logger.info(`Dashboard running at http://localhost:${PORT}`);
});

export default app;
