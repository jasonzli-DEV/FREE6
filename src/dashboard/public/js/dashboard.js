/* ── Tab Switching ─────────────────────────────────────────────────────── */
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab)?.classList.add('active');
  });
});

/* ── Flash Helper ─────────────────────────────────────────────────────── */
function showFlash(msg, type = 'success') {
  const el = document.getElementById('flash-message');
  if (!el) return;
  el.textContent = msg;
  el.className = 'flash flash--' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

/* ── Generic API call ─────────────────────────────────────────────────── */
async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/* ── Load Stats ───────────────────────────────────────────────────────── */
const statsGrid = document.querySelector('.stats-grid[data-guild]');
if (statsGrid) {
  const guildId = statsGrid.dataset.guild;
  fetch('/api/guild/' + guildId + '/stats')
    .then((r) => r.json())
    .then((data) => {
      document.getElementById('stat-xp').textContent = data.membersWithXP ?? '—';
      document.getElementById('stat-infractions').textContent = data.totalInfractions ?? '—';
      document.getElementById('stat-tickets').textContent = data.totalTickets ?? '—';
      document.getElementById('stat-open-tickets').textContent = data.openTickets ?? '—';
    })
    .catch(() => {});
}

/* ── Load Leveling Settings ───────────────────────────────────────────── */
const formLeveling = document.getElementById('form-leveling');
if (formLeveling) {
  const guildId = formLeveling.dataset.guild;
  fetch('/api/guild/' + guildId + '/levels')
    .then((r) => r.json())
    .then((data) => {
      if (data.enabled) document.getElementById('levels-enabled').checked = true;
      if (data.announce_channel) document.getElementById('announce-channel').value = data.announce_channel;
      if (data.announce_message) document.getElementById('announce-message').value = data.announce_message;
      if (data.xp_min) document.getElementById('xp-min').value = data.xp_min;
      if (data.xp_max) document.getElementById('xp-max').value = data.xp_max;
      if (data.xp_cooldown) document.getElementById('xp-cooldown').value = data.xp_cooldown;
    })
    .catch(() => {});

  formLeveling.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formLeveling));
    data.enabled = document.getElementById('levels-enabled').checked ? 1 : 0;
    const result = await apiPost('/api/guild/' + guildId + '/levels', data);
    showFlash(result.error ? result.error : 'Leveling settings saved!', result.error ? 'error' : 'success');
  });
}

/* ── Load Welcome Settings ────────────────────────────────────────────── */
const formWelcome = document.getElementById('form-welcome');
if (formWelcome) {
  const guildId = formWelcome.dataset.guild;
  fetch('/api/guild/' + guildId + '/welcome')
    .then((r) => r.json())
    .then((data) => {
      if (data.enabled) document.getElementById('welcome-enabled').checked = true;
      if (data.channel_id) document.getElementById('welcome-channel').value = data.channel_id;
      if (data.message) document.getElementById('welcome-message').value = data.message;
    })
    .catch(() => {});

  formWelcome.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formWelcome));
    data.enabled = document.getElementById('welcome-enabled').checked ? 1 : 0;
    const result = await apiPost('/api/guild/' + guildId + '/welcome', data);
    showFlash(result.error ? result.error : 'Welcome settings saved!', result.error ? 'error' : 'success');
  });
}

/* ── Load Custom Commands ─────────────────────────────────────────────── */
const commandsList = document.getElementById('commands-list');
const formCommand = document.getElementById('form-command');
if (commandsList) {
  const guildId = commandsList.dataset.guild;

  function loadCommands() {
    fetch('/api/guild/' + guildId + '/commands')
      .then((r) => r.json())
      .then((cmds) => {
        if (!cmds.length) {
          commandsList.innerHTML = '<p class="muted">No custom commands yet.</p>';
          return;
        }
        commandsList.innerHTML = '<div class="commands-list">' + cmds.map((c) => `
          <div class="command-item">
            <span class="command-name">/${c.name}</span>
            <span class="command-response">${escapeHtml(c.response || '')}</span>
            <button class="btn btn-danger btn-sm" data-id="${c.id}">Delete</button>
          </div>
        `).join('') + '</div>';

        commandsList.querySelectorAll('[data-id]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            await fetch('/api/guild/' + guildId + '/commands/' + btn.dataset.id, { method: 'DELETE' });
            loadCommands();
            showFlash('Command deleted.');
          });
        });
      })
      .catch(() => { commandsList.innerHTML = '<p class="muted">Failed to load commands.</p>'; });
  }

  loadCommands();

  if (formCommand) {
    formCommand.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(formCommand));
      const result = await apiPost('/api/guild/' + guildId + '/commands', data);
      showFlash(result.error ? result.error : 'Command added!', result.error ? 'error' : 'success');
      if (!result.error) { formCommand.reset(); loadCommands(); }
    });
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
