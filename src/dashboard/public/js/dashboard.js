/* ══════════════════════════════════════════════════════════════════════════
   FREE6 Dashboard — Client-side JS
   MEE6-style sidebar navigation, plugin toggles, per-plugin forms
   ══════════════════════════════════════════════════════════════════════════ */

const mainContent = document.getElementById('main-content');
const GUILD_ID = mainContent?.dataset.guild;

// Only run dashboard logic on server config pages
if (!GUILD_ID) {
  // We're on index, server-picker, or leaderboard — nothing to do
  document.addEventListener('DOMContentLoaded', () => {});
} else {
  document.addEventListener('DOMContentLoaded', init);
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function api(path, opts = {}) {
  const url = '/api/guild/' + GUILD_ID + path;
  if (opts.body && typeof opts.body === 'object') {
    opts.headers = { 'Content-Type': 'application/json', ...opts.headers };
    opts.body = JSON.stringify(opts.body);
  }
  return fetch(url, opts).then((r) => r.json());
}

function showFlash(msg, type = 'success') {
  const el = document.getElementById('flash-message');
  if (!el) return;
  el.textContent = msg;
  el.className = 'flash flash--' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Cache for channels / roles
let channelsCache = [];
let rolesCache = [];

async function loadChannelsAndRoles() {
  if (channelsCache.length === 0) {
    channelsCache = await api('/channels');
  }
  if (rolesCache.length === 0) {
    rolesCache = await api('/roles');
  }
  // Populate all channel selects
  document.querySelectorAll('.channel-select').forEach((sel) => {
    const current = sel.value;
    const firstOpt = sel.querySelector('option');
    sel.innerHTML = firstOpt ? firstOpt.outerHTML : '<option value="">Select channel</option>';
    channelsCache.forEach((ch) => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = '#' + ch.name;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  });
  // Populate all role selects
  document.querySelectorAll('.role-select').forEach((sel) => {
    const current = sel.value;
    const firstOpt = sel.querySelector('option');
    sel.innerHTML = firstOpt ? firstOpt.outerHTML : '<option value="">Select role</option>';
    rolesCache.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = '@' + r.name;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  });
}

/* ── Init ─────────────────────────────────────────────────────────────── */

async function init() {
  // Mobile hamburger
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));
    // Close sidebar when clicking outside on mobile
    mainContent.addEventListener('click', () => sidebar.classList.remove('open'));
  }

  // Sidebar navigation
  document.querySelectorAll('.sidebar-item[data-page]').forEach((item) => {
    item.addEventListener('click', (e) => {
      // Don't navigate if clicking the toggle switch
      if (e.target.closest('.toggle-switch')) return;
      // External links
      if (item.getAttribute('target') === '_blank') return;
      e.preventDefault();

      const page = item.dataset.page;
      // Update active states
      document.querySelectorAll('.sidebar-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      // Show correct page
      document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
      const target = document.getElementById('page-' + page);
      if (target) target.classList.add('active');
      // Close mobile sidebar
      sidebar?.classList.remove('open');
      // Load page data
      loadPageData(page);
    });
  });

  // Toggle switches — prevent link navigation and handle toggle
  document.querySelectorAll('.toggle-switch').forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const input = toggle.querySelector('input');
      input.checked = !input.checked;
      const pluginName = toggle.dataset.plugin;
      if (pluginName) {
        togglePlugin(pluginName, input.checked);
      }
    });
  });

  // Load initial data
  await loadChannelsAndRoles();
  await loadPlugins();
  await loadStats();

  // Set up form handlers
  setupForms();
}

/* ── Plugin Loading ──────────────────────────────────────────────────── */

let pluginsData = [];

async function loadPlugins() {
  try {
    pluginsData = await api('/plugins');
  } catch { pluginsData = []; }

  // Update sidebar toggles
  pluginsData.forEach((p) => {
    const toggle = document.querySelector(`.sidebar-item[data-plugin="${p.name}"] .toggle-switch input`);
    if (toggle) toggle.checked = !!p.enabled;
  });

  // Build plugin grid on dashboard home
  const grid = document.getElementById('plugin-grid');
  if (grid) {
    grid.innerHTML = pluginsData.map((p) => `
      <div class="plugin-card" data-page="${p.name}">
        <span class="plugin-card-icon">${p.icon}</span>
        <div class="plugin-card-info">
          <div class="plugin-card-name">${escapeHtml(p.label)}</div>
          <div class="plugin-card-desc">${escapeHtml(p.description)}</div>
        </div>
        <label class="toggle-switch" data-plugin="${p.name}">
          <input type="checkbox" ${p.enabled ? 'checked' : ''}/>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `).join('');

    // Plugin card click handlers
    grid.querySelectorAll('.plugin-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.toggle-switch')) return;
        const page = card.dataset.page;
        // Navigate to that plugin page
        const sidebarItem = document.querySelector(`.sidebar-item[data-page="${page}"]`);
        if (sidebarItem) sidebarItem.click();
      });
    });

    // Toggle handlers in grid
    grid.querySelectorAll('.toggle-switch').forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = toggle.querySelector('input');
        input.checked = !input.checked;
        const pluginName = toggle.dataset.plugin;
        if (pluginName) togglePlugin(pluginName, input.checked);
      });
    });
  }

  // Apply disabled overlays to all plugin config pages
  applyAllPageOverlays();
}

async function togglePlugin(name, enabled) {
  try {
    const result = await api('/plugins/' + name + '/toggle', { method: 'POST', body: { enabled } });
    // Sync all toggles with this plugin name
    document.querySelectorAll(`.toggle-switch[data-plugin="${name}"] input`).forEach((inp) => {
      inp.checked = enabled;
    });
    // Update the plugin data cache
    const plug = pluginsData.find((p) => p.name === name);
    if (plug) plug.enabled = enabled ? 1 : 0;
    // Update the current page's disabled overlay if we're on that plugin's page
    // Use setTimeout(0) to ensure DOM updates complete (overlay button click context)
    setTimeout(() => updatePageOverlay(name, enabled), 0);
    showFlash(
      enabled
        ? 'Plugin enabled! Slash commands updated for this server.'
        : 'Plugin disabled. Related slash commands removed from this server.'
    );
  } catch {
    showFlash('Failed to toggle plugin.', 'error');
  }
}

/**
 * Show/hide a "plugin disabled" overlay on plugin config pages.
 * When a plugin is off, its config page shows an overlay prompting the user to enable it.
 */
function updatePageOverlay(pluginName, enabled) {
  const page = document.getElementById('page-' + pluginName);
  if (!page) return;
  let overlay = page.querySelector('.plugin-disabled-overlay');
  if (enabled) {
    if (overlay) overlay.remove();
    page.classList.remove('plugin-page-disabled');
  } else {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'plugin-disabled-overlay';
      overlay.innerHTML = `
        <div class="plugin-disabled-content">
          <h2>Plugin Disabled</h2>
          <p>Enable this plugin from the sidebar toggle to configure it and register its slash commands.</p>
          <button class="btn btn-primary enable-plugin-btn" data-plugin="${pluginName}">Enable Plugin</button>
        </div>
      `;
      overlay.querySelector('.enable-plugin-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const toggle = document.querySelector(`.sidebar-item[data-plugin="${pluginName}"] .toggle-switch input`);
        if (toggle) toggle.checked = true;
        togglePlugin(pluginName, true);
      });
      page.style.position = 'relative';
      page.appendChild(overlay);
    }
    page.classList.add('plugin-page-disabled');
  }
}

/**
 * Apply overlays for all plugin pages on initial load.
 */
function applyAllPageOverlays() {
  pluginsData.forEach((p) => {
    updatePageOverlay(p.name, !!p.enabled);
  });
}

/* ── Stats ────────────────────────────────────────────────────────────── */

async function loadStats() {
  try {
    const data = await api('/stats');
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };
    set('stat-members', data.memberCount);
    set('stat-xp', data.membersWithXP);
    set('stat-infractions', data.totalInfractions);
    set('stat-tickets', data.openTickets);
  } catch {}
}

/* ── Page Data Loading ───────────────────────────────────────────────── */

const loadedPages = new Set();

async function loadPageData(page) {
  if (loadedPages.has(page)) return;
  loadedPages.add(page);

  await loadChannelsAndRoles();

  switch (page) {
    case 'welcome': await loadWelcome(); break;
    case 'reaction-roles': await loadReactionRoles(); break;
    case 'moderator': await loadAutoMod(); break;
    case 'levels': await loadLevels(); break;
    case 'starboard': await loadStarboard(); break;
    case 'automations': await loadAutomations(); break;
    case 'custom-commands': await loadCommands(); break;
    case 'invite-tracker': await loadInviteTracker(); break;
    case 'ticketing': await loadTicketing(); break;
    case 'embed-messages': await loadEmbeds(); break;
    case 'temp-channels': await loadTempChannels(); break;
    case 'youtube': await loadYoutube(); break;
    case 'rss-feeds': await loadRss(); break;
    case 'reddit': await loadReddit(); break;
    case 'birthdays': await loadBirthdays(); break;
  }
}

/* ── Welcome & Goodbye ───────────────────────────────────────────────── */

async function loadWelcome() {
  try {
    const data = await api('/welcome');
    const w = data.welcome || {};
    const g = data.goodbye || {};
    if (w.enabled) document.getElementById('welcome-enabled').checked = true;
    if (w.channel_id) document.getElementById('welcome-channel').value = w.channel_id;
    if (w.message) document.getElementById('welcome-message').value = w.message;
    if (w.card_enabled) document.getElementById('welcome-card').checked = true;
    if (g.enabled) document.getElementById('goodbye-enabled').checked = true;
    if (g.channel_id) document.getElementById('goodbye-channel').value = g.channel_id;
    if (g.message) document.getElementById('goodbye-message').value = g.message;
  } catch {}
}

/* ── Reaction Roles ──────────────────────────────────────────────────── */

async function loadReactionRoles() {
  try {
    const roles = await api('/reaction-roles');
    renderReactionRoles(roles);
  } catch {}
}

function renderReactionRoles(roles) {
  const list = document.getElementById('reaction-roles-list');
  if (!list) return;
  if (!roles.length) { list.innerHTML = '<p class="muted">No reaction roles configured.</p>'; return; }
  list.innerHTML = '<div class="item-list">' + roles.map((r) => `
    <div class="item-row">
      <div class="item-row-info">
        <div class="item-row-title">${r.emoji} → <@&${r.role_id}></div>
        <div class="item-row-sub">Channel: ${r.channel_id} | Message: ${r.message_id} | Mode: ${r.mode}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteReactionRole(${r.id})">Delete</button>
    </div>
  `).join('') + '</div>';
}

window.deleteReactionRole = async function(id) {
  await api('/reaction-roles/' + id, { method: 'DELETE' });
  loadedPages.delete('reaction-roles');
  loadReactionRoles();
  showFlash('Reaction role deleted.');
};

/* ── AutoMod ─────────────────────────────────────────────────────────── */

async function loadAutoMod() {
  try {
    const s = await api('/automod');
    if (s.enabled) document.getElementById('automod-enabled').checked = true;
    if (s.anti_spam) document.getElementById('automod-anti-spam').checked = true;
    if (s.anti_caps) document.getElementById('automod-anti-caps').checked = true;
    if (s.caps_threshold) document.getElementById('automod-caps-threshold').value = s.caps_threshold;
    if (s.anti_links) document.getElementById('automod-anti-links').checked = true;
    if (s.anti_invites) document.getElementById('automod-anti-invites').checked = true;
    if (s.anti_bad_words) document.getElementById('automod-anti-words').checked = true;
    if (s.anti_emoji_spam) document.getElementById('automod-anti-emoji').checked = true;
    if (s.emoji_threshold) document.getElementById('automod-emoji-threshold').value = s.emoji_threshold;
    if (s.anti_mention_spam) document.getElementById('automod-anti-mention').checked = true;
    if (s.mention_threshold) document.getElementById('automod-mention-threshold').value = s.mention_threshold;
    if (s.action) document.getElementById('automod-action').value = s.action;
    if (s.mute_duration) document.getElementById('automod-mute-duration').value = Math.floor(s.mute_duration / 1000);
    try {
      const words = JSON.parse(s.bad_words || '[]');
      document.getElementById('automod-bad-words').value = words.join(', ');
    } catch {}
  } catch {}
}

/* ── Levels ──────────────────────────────────────────────────────────── */

async function loadLevels() {
  try {
    const data = await api('/levels');
    if (data.enabled) document.getElementById('levels-enabled').checked = true;
    if (data.announce_channel) document.getElementById('levels-announce-channel').value = data.announce_channel;
    if (data.announce_message) document.getElementById('levels-announce-message').value = data.announce_message;
    if (data.xp_min) document.getElementById('levels-xp-min').value = data.xp_min;
    if (data.xp_max) document.getElementById('levels-xp-max').value = data.xp_max;
    if (data.xp_cooldown) document.getElementById('levels-xp-cooldown').value = data.xp_cooldown;
    renderLevelRoles(data.roles || []);
  } catch {}
}

function renderLevelRoles(roles) {
  const list = document.getElementById('level-roles-list');
  if (!list) return;
  if (!roles.length) { list.innerHTML = '<p class="muted">No level role rewards configured.</p>'; return; }
  list.innerHTML = '<div class="item-list">' + roles.map((r) => {
    const roleName = rolesCache.find((rc) => rc.id === r.role_id)?.name || r.role_id;
    return `
      <div class="item-row">
        <div class="item-row-info">
          <div class="item-row-title">Level ${r.level} → @${escapeHtml(roleName)}</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteLevelRole(${r.level})">Delete</button>
      </div>
    `;
  }).join('') + '</div>';
}

window.deleteLevelRole = async function(level) {
  await api('/levels/roles/' + level, { method: 'DELETE' });
  loadedPages.delete('levels');
  loadLevels();
  showFlash('Level role removed.');
};

/* ── Starboard ───────────────────────────────────────────────────────── */

async function loadStarboard() {
  try {
    const s = await api('/starboard');
    if (s.enabled) document.getElementById('starboard-enabled').checked = true;
    if (s.channel_id) document.getElementById('starboard-channel').value = s.channel_id;
    if (s.threshold) document.getElementById('starboard-threshold').value = s.threshold;
    if (s.emoji) document.getElementById('starboard-emoji').value = s.emoji;
  } catch {}
}

/* ── Automations ─────────────────────────────────────────────────────── */

async function loadAutomations() {
  try {
    const automations = await api('/automations');
    renderAutomations(automations);
  } catch {}
}

function renderAutomations(items) {
  const list = document.getElementById('automations-list');
  if (!list) return;
  if (!items.length) { list.innerHTML = '<p class="muted">No automations configured.</p>'; return; }
  list.innerHTML = '<div class="item-list">' + items.map((a) => `
    <div class="item-row">
      <div class="item-row-info">
        <div class="item-row-title">${escapeHtml(a.name)}</div>
        <div class="item-row-sub">Trigger: ${a.trigger_type} | ${a.enabled ? 'Enabled' : 'Disabled'}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteAutomation(${a.id})">Delete</button>
    </div>
  `).join('') + '</div>';
}

window.deleteAutomation = async function(id) {
  await api('/automations/' + id, { method: 'DELETE' });
  loadedPages.delete('automations');
  loadAutomations();
  showFlash('Automation deleted.');
};

/* ── Custom Commands ─────────────────────────────────────────────────── */

async function loadCommands() {
  try {
    const cmds = await api('/commands');
    renderCommands(cmds);
  } catch {}
}

function renderCommands(cmds) {
  const list = document.getElementById('commands-list');
  if (!list) return;
  if (!cmds.length) { list.innerHTML = '<p class="muted">No custom commands yet.</p>'; return; }
  list.innerHTML = '<div class="item-list">' + cmds.map((c) => `
    <div class="item-row">
      <div class="item-row-info">
        <div class="item-row-title">/${escapeHtml(c.name)}</div>
        <div class="item-row-sub">${escapeHtml(c.response || '')}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteCommand(${c.id})">Delete</button>
    </div>
  `).join('') + '</div>';
}

window.deleteCommand = async function(id) {
  await api('/commands/' + id, { method: 'DELETE' });
  loadedPages.delete('custom-commands');
  loadCommands();
  showFlash('Command deleted.');
};

/* ── Invite Tracker ──────────────────────────────────────────────────── */

async function loadInviteTracker() {
  try {
    const invites = await api('/invite-tracker');
    const list = document.getElementById('invite-tracker-list');
    if (!list) return;
    if (!invites.length) { list.innerHTML = '<p class="muted">No invite data yet.</p>'; return; }
    list.innerHTML = '<div class="item-list">' + invites.map((inv) => `
      <div class="item-row">
        <div class="item-row-info">
          <div class="item-row-title">User: ${inv.user_id}</div>
          <div class="item-row-sub">Real: ${inv.real} | Bonus: ${inv.bonus} | Left: ${inv.left} | Fake: ${inv.fake}</div>
        </div>
      </div>
    `).join('') + '</div>';
  } catch {}
}

/* ── Ticketing ───────────────────────────────────────────────────────── */

async function loadTicketing() {
  try {
    const data = await api('/ticketing');
    const s = data.settings || {};
    if (s.enabled) document.getElementById('ticket-enabled').checked = true;
    if (s.category_id) document.getElementById('ticket-category').value = s.category_id;
    if (s.support_role) document.getElementById('ticket-support-role').value = s.support_role;
    if (s.log_channel) document.getElementById('ticket-log-channel').value = s.log_channel;

    const tickets = data.tickets || [];
    const list = document.getElementById('tickets-list');
    if (!list) return;
    if (!tickets.length) { list.innerHTML = '<p class="muted">No tickets yet.</p>'; return; }
    list.innerHTML = '<div class="item-list">' + tickets.slice(0, 20).map((t) => `
      <div class="item-row">
        <div class="item-row-info">
          <div class="item-row-title">Ticket #${t.id}</div>
          <div class="item-row-sub">User: ${t.user_id} | Status: ${t.status} | Channel: ${t.channel_id}</div>
        </div>
      </div>
    `).join('') + '</div>';
  } catch {}
}

/* ── Embed Messages ──────────────────────────────────────────────────── */

async function loadEmbeds() {
  try {
    const embeds = await api('/embeds');
    const list = document.getElementById('embeds-list');
    if (!list) return;
    if (!embeds.length) { list.innerHTML = '<p class="muted">No embeds sent yet.</p>'; return; }
    list.innerHTML = '<div class="item-list">' + embeds.map((e) => `
      <div class="item-row">
        <div class="item-row-info">
          <div class="item-row-title">${escapeHtml(e.name)}</div>
          <div class="item-row-sub">Channel: ${e.channel_id}${e.message_id ? ' | Message: ' + e.message_id : ''}</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteEmbed(${e.id})">Delete</button>
      </div>
    `).join('') + '</div>';
  } catch {}
}

window.deleteEmbed = async function(id) {
  await api('/embeds/' + id, { method: 'DELETE' });
  loadedPages.delete('embed-messages');
  loadEmbeds();
  showFlash('Embed deleted.');
};

/* ── Temporary Channels ──────────────────────────────────────────────── */

async function loadTempChannels() {
  try {
    const s = await api('/temp-channels');
    if (s.enabled) document.getElementById('tc-enabled').checked = true;
    if (s.trigger_channel_id) document.getElementById('tc-trigger-channel').value = s.trigger_channel_id;
    if (s.category_id) document.getElementById('tc-category').value = s.category_id;
  } catch {}
}

/* ── YouTube ─────────────────────────────────────────────────────────── */

async function loadYoutube() {
  try {
    const alerts = await api('/youtube');
    renderYoutube(alerts);
  } catch {}
}

function renderYoutube(alerts) {
  const list = document.getElementById('youtube-list');
  if (!list) return;
  if (!alerts.length) { list.innerHTML = '<p class="muted">No YouTube alerts configured.</p>'; return; }
  list.innerHTML = '<div class="item-list">' + alerts.map((a) => `
    <div class="item-row">
      <div class="item-row-info">
        <div class="item-row-title">📺 ${escapeHtml(a.youtube_channel_name || a.youtube_channel_id)}</div>
        <div class="item-row-sub">Channel: ${a.channel_id} | YT ID: ${a.youtube_channel_id}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteYoutube(${a.id})">Delete</button>
    </div>
  `).join('') + '</div>';
}

window.deleteYoutube = async function(id) {
  await api('/youtube/' + id, { method: 'DELETE' });
  loadedPages.delete('youtube');
  loadYoutube();
  showFlash('YouTube alert deleted.');
};

/* ── RSS Feeds ───────────────────────────────────────────────────────── */

async function loadRss() {
  try {
    const feeds = await api('/rss-feeds');
    renderRss(feeds);
  } catch {}
}

function renderRss(feeds) {
  const list = document.getElementById('rss-list');
  if (!list) return;
  if (!feeds.length) { list.innerHTML = '<p class="muted">No RSS feeds configured.</p>'; return; }
  list.innerHTML = '<div class="item-list">' + feeds.map((f) => `
    <div class="item-row">
      <div class="item-row-info">
        <div class="item-row-title">📡 ${escapeHtml(f.feed_name || f.feed_url)}</div>
        <div class="item-row-sub">URL: ${escapeHtml(f.feed_url)} | Channel: ${f.channel_id}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteRss(${f.id})">Delete</button>
    </div>
  `).join('') + '</div>';
}

window.deleteRss = async function(id) {
  await api('/rss-feeds/' + id, { method: 'DELETE' });
  loadedPages.delete('rss-feeds');
  loadRss();
  showFlash('RSS feed deleted.');
};

/* ── Reddit ──────────────────────────────────────────────────────────── */

async function loadReddit() {
  try {
    const alerts = await api('/reddit');
    renderReddit(alerts);
  } catch {}
}

function renderReddit(alerts) {
  const list = document.getElementById('reddit-list');
  if (!list) return;
  if (!alerts.length) { list.innerHTML = '<p class="muted">No Reddit alerts configured.</p>'; return; }
  list.innerHTML = '<div class="item-list">' + alerts.map((a) => `
    <div class="item-row">
      <div class="item-row-info">
        <div class="item-row-title">🔗 r/${escapeHtml(a.subreddit)}</div>
        <div class="item-row-sub">Channel: ${a.channel_id}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteReddit(${a.id})">Delete</button>
    </div>
  `).join('') + '</div>';
}

window.deleteReddit = async function(id) {
  await api('/reddit/' + id, { method: 'DELETE' });
  loadedPages.delete('reddit');
  loadReddit();
  showFlash('Reddit alert deleted.');
};

/* ── Birthdays ───────────────────────────────────────────────────────── */

async function loadBirthdays() {
  try {
    const data = await api('/birthdays');
    const s = data.settings || {};
    if (s.enabled) document.getElementById('bday-enabled').checked = true;
    if (s.channel_id) document.getElementById('bday-channel').value = s.channel_id;
    if (s.role_id) document.getElementById('bday-role').value = s.role_id;
    if (s.message) document.getElementById('bday-message').value = s.message;
  } catch {}
}

/* ══════════════════════════════════════════════════════════════════════════
   FORM HANDLERS
   ══════════════════════════════════════════════════════════════════════════ */

function setupForms() {
  // Welcome & Goodbye
  const saveWelcome = document.getElementById('save-welcome');
  if (saveWelcome) {
    saveWelcome.addEventListener('click', async () => {
      const result = await api('/welcome', {
        method: 'POST',
        body: {
          welcome: {
            enabled: document.getElementById('welcome-enabled').checked,
            channel_id: document.getElementById('welcome-channel').value,
            message: document.getElementById('welcome-message').value,
            card_enabled: document.getElementById('welcome-card').checked,
          },
          goodbye: {
            enabled: document.getElementById('goodbye-enabled').checked,
            channel_id: document.getElementById('goodbye-channel').value,
            message: document.getElementById('goodbye-message').value,
          },
        },
      });
      showFlash(result.error ? result.error : 'Welcome/Goodbye saved!', result.error ? 'error' : 'success');
    });
  }

  // Reaction Roles
  formHandler('form-reaction-role', '/reaction-roles', () => ({
    channel_id: document.getElementById('rr-channel').value,
    message_id: document.getElementById('rr-message-id').value,
    emoji: document.getElementById('rr-emoji').value,
    role_id: document.getElementById('rr-role').value,
    mode: document.getElementById('rr-mode').value,
  }), () => { loadedPages.delete('reaction-roles'); loadReactionRoles(); });

  // AutoMod
  formHandler('form-automod', '/automod', () => ({
    enabled: document.getElementById('automod-enabled').checked,
    anti_spam: document.getElementById('automod-anti-spam').checked,
    anti_caps: document.getElementById('automod-anti-caps').checked,
    caps_threshold: parseInt(document.getElementById('automod-caps-threshold').value) || 70,
    anti_links: document.getElementById('automod-anti-links').checked,
    anti_invites: document.getElementById('automod-anti-invites').checked,
    anti_bad_words: document.getElementById('automod-anti-words').checked,
    bad_words: document.getElementById('automod-bad-words').value.split(',').map((w) => w.trim()).filter(Boolean),
    anti_emoji_spam: document.getElementById('automod-anti-emoji').checked,
    emoji_threshold: parseInt(document.getElementById('automod-emoji-threshold').value) || 10,
    anti_mention_spam: document.getElementById('automod-anti-mention').checked,
    mention_threshold: parseInt(document.getElementById('automod-mention-threshold').value) || 5,
    action: document.getElementById('automod-action').value,
    mute_duration: (parseInt(document.getElementById('automod-mute-duration').value) || 300) * 1000,
  }));

  // Levels
  formHandler('form-levels', '/levels', () => ({
    enabled: document.getElementById('levels-enabled').checked,
    announce_channel: document.getElementById('levels-announce-channel').value,
    announce_message: document.getElementById('levels-announce-message').value,
    xp_min: parseInt(document.getElementById('levels-xp-min').value) || 15,
    xp_max: parseInt(document.getElementById('levels-xp-max').value) || 25,
    xp_cooldown: parseInt(document.getElementById('levels-xp-cooldown').value) || 60,
  }));

  // Level Roles
  formHandler('form-level-role', '/levels/roles', () => ({
    level: parseInt(document.getElementById('lr-level').value),
    role_id: document.getElementById('lr-role').value,
  }), () => { loadedPages.delete('levels'); loadLevels(); });

  // Starboard
  formHandler('form-starboard', '/starboard', () => ({
    enabled: document.getElementById('starboard-enabled').checked,
    channel_id: document.getElementById('starboard-channel').value,
    threshold: parseInt(document.getElementById('starboard-threshold').value) || 3,
    emoji: document.getElementById('starboard-emoji').value || '⭐',
  }));

  // Automations
  formHandler('form-automation', '/automations', () => {
    let actions;
    try { actions = JSON.parse(document.getElementById('auto-actions').value); } catch { actions = []; }
    return {
      name: document.getElementById('auto-name').value,
      trigger_type: document.getElementById('auto-trigger-type').value,
      trigger_value: document.getElementById('auto-trigger-value').value,
      actions,
    };
  }, () => { loadedPages.delete('automations'); loadAutomations(); });

  // Custom Commands
  formHandler('form-command', '/commands', () => ({
    name: document.getElementById('cmd-name').value,
    description: document.getElementById('cmd-description').value,
    response: document.getElementById('cmd-response').value,
  }), () => { loadedPages.delete('custom-commands'); loadCommands(); });

  // Ticketing
  formHandler('form-ticketing', '/ticketing', () => ({
    enabled: document.getElementById('ticket-enabled').checked,
    category_id: document.getElementById('ticket-category').value,
    support_role: document.getElementById('ticket-support-role').value,
    log_channel: document.getElementById('ticket-log-channel').value,
  }));

  // Embed Messages
  formHandler('form-embed', '/embeds', () => ({
    name: document.getElementById('embed-name').value,
    channel_id: document.getElementById('embed-channel').value,
    embed_data: {
      title: document.getElementById('embed-title').value || undefined,
      description: document.getElementById('embed-description').value || undefined,
      color: parseInt(document.getElementById('embed-color').value.replace('#', ''), 16),
      footer: document.getElementById('embed-footer').value ? { text: document.getElementById('embed-footer').value } : undefined,
      image: document.getElementById('embed-image').value ? { url: document.getElementById('embed-image').value } : undefined,
      thumbnail: document.getElementById('embed-thumbnail').value ? { url: document.getElementById('embed-thumbnail').value } : undefined,
    },
  }), () => { loadedPages.delete('embed-messages'); loadEmbeds(); });

  // Temp Channels
  formHandler('form-temp-channels', '/temp-channels', () => ({
    enabled: document.getElementById('tc-enabled').checked,
    trigger_channel_id: document.getElementById('tc-trigger-channel').value,
    category_id: document.getElementById('tc-category').value,
  }));

  // YouTube
  formHandler('form-youtube', '/youtube', () => ({
    channel_id: document.getElementById('yt-channel').value,
    youtube_channel_id: document.getElementById('yt-channel-id').value,
    youtube_channel_name: document.getElementById('yt-channel-name').value,
    message: document.getElementById('yt-message').value,
  }), () => { loadedPages.delete('youtube'); loadYoutube(); });

  // RSS Feeds
  formHandler('form-rss', '/rss-feeds', () => ({
    channel_id: document.getElementById('rss-channel').value,
    feed_url: document.getElementById('rss-url').value,
    feed_name: document.getElementById('rss-name').value,
    message: document.getElementById('rss-message').value,
  }), () => { loadedPages.delete('rss-feeds'); loadRss(); });

  // Reddit
  formHandler('form-reddit', '/reddit', () => ({
    channel_id: document.getElementById('reddit-channel').value,
    subreddit: document.getElementById('reddit-subreddit').value,
    message: document.getElementById('reddit-message').value,
  }), () => { loadedPages.delete('reddit'); loadReddit(); });

  // Birthdays
  formHandler('form-birthdays', '/birthdays', () => ({
    enabled: document.getElementById('bday-enabled').checked,
    channel_id: document.getElementById('bday-channel').value,
    role_id: document.getElementById('bday-role').value,
    message: document.getElementById('bday-message').value,
  }));
}

function formHandler(formId, endpoint, getData, onSuccess) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = getData();
      const result = await api(endpoint, { method: 'POST', body: data });
      showFlash(result.error ? result.error : 'Saved!', result.error ? 'error' : 'success');
      if (!result.error && onSuccess) onSuccess();
      if (!result.error) form.reset?.();
    } catch (err) {
      showFlash('Failed: ' + err.message, 'error');
    }
  });
}
