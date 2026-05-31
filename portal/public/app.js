'use strict';

// ── Config ───────────────────────────────────────────────────────────────────

const DNS_PRESETS = [
  {
    id:    'filtered',
    label: 'Filtré complet',
    desc:  'Pubs + malware bloqués via AdGuard sur le VPS',
    value: '10.8.0.1',
  },
  {
    id:    'malware',
    label: 'Malware seulement',
    desc:  'Cloudflare for Families — pubs autorisées',
    value: '1.1.1.2, 1.0.0.2',
  },
  {
    id:    'none',
    label: 'Sans filtre',
    desc:  'DNS direct Cloudflare — aucune restriction',
    value: '1.1.1.1, 8.8.8.8',
  },
];

// ── State ────────────────────────────────────────────────────────────────────

const state = {
  tab:             'dashboard',
  clients:         [],
  iframesLoaded:   { wireguard: false, adguard: false },
  iframePorts:     { wg: '51821', ag: '3000' },
};

// ── API ──────────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  if (r.status === 401 && path !== '/api/login') { showLogin(); return null; }
  return r.json().catch(() => null);
}

const GET  = path        => api('GET',    path);
const POST = (path, b)   => api('POST',   path, b);
const DEL  = path        => api('DELETE', path);

// ── Auth ─────────────────────────────────────────────────────────────────────

function showLogin() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

async function checkAuth() {
  const data = await GET('/api/me');
  if (data?.authenticated) {
    showApp();
    loadConfig();
    switchTab('dashboard');
  } else {
    showLogin();
  }
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function switchTab(name) {
  state.tab = name;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('hidden', el.id !== `tab-${name}`);
  });

  if (name === 'dashboard') loadDashboard();
  if (name === 'clients')   loadClients();
  if (name === 'wireguard') loadIframe('wireguard');
  if (name === 'adguard')   loadIframe('adguard');
}

function loadIframe(name) {
  if (state.iframesLoaded[name]) return;
  const port = name === 'wireguard' ? state.iframePorts.wg : state.iframePorts.ag;
  document.getElementById(name === 'wireguard' ? 'wg-iframe' : 'ag-iframe').src =
    `http://localhost:${port}`;
  state.iframesLoaded[name] = true;
}

// ── Config ───────────────────────────────────────────────────────────────────

async function loadConfig() {
  const cfg = await GET('/api/config');
  if (cfg) {
    state.iframePorts.wg = cfg.wgEasyPort  || '51821';
    state.iframePorts.ag = cfg.adguardPort || '3000';
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function loadDashboard() {
  const [clients, stats] = await Promise.all([
    GET('/api/clients'),
    GET('/api/adguard/stats'),
  ]);

  if (clients) {
    state.clients = clients;
    const now       = Date.now();
    const connected = clients.filter(c => c.latestHandshakeAt &&
      now - new Date(c.latestHandshakeAt).getTime() < 3 * 60 * 1000).length;
    document.getElementById('stat-total').textContent     = clients.length;
    document.getElementById('stat-connected').textContent = connected;
    renderDashClientList(clients.slice(0, 6));
  }

  if (stats) {
    const total   = stats.num_dns_queries || 0;
    const blocked = stats.num_blocked_filtering || 0;
    const pct     = total > 0 ? Math.round(blocked / total * 100) : 0;
    document.getElementById('stat-queries').textContent = fmtNum(total);
    document.getElementById('stat-blocked').textContent = fmtNum(blocked);
    document.getElementById('stat-pct').textContent     = total > 0 ? `(${pct}%)` : '';
  }
}

function renderDashClientList(clients) {
  const el = document.getElementById('dash-client-list');
  if (!clients.length) { el.innerHTML = '<div class="empty">Aucun client</div>'; return; }
  el.innerHTML = renderClientTable(clients, false);
  bindClientActions(el);
}

// ── Clients ───────────────────────────────────────────────────────────────────

async function loadClients() {
  const el = document.getElementById('client-table-wrap');
  el.innerHTML = '<div class="loading">Chargement…</div>';
  const clients = await GET('/api/clients');
  if (!clients) return;
  state.clients = clients;
  el.innerHTML = clients.length ? renderClientTable(clients, true) : '<div class="empty">Aucun client — créez-en un !</div>';
  bindClientActions(el);
}

function renderClientTable(clients, showAll) {
  const now = Date.now();
  const rows = clients.map(c => {
    const connected = c.latestHandshakeAt &&
      now - new Date(c.latestHandshakeAt).getTime() < 3 * 60 * 1000;

    const statusBadge = c.enabled === false
      ? `<span class="badge badge-dim"><span class="dot"></span>Désactivé</span>`
      : connected
        ? `<span class="badge badge-green"><span class="dot"></span>Connecté</span>`
        : `<span class="badge badge-dim"><span class="dot"></span>Inactif</span>`;

    const dnsBadge = c.dnsLabel
      ? `<span class="dns-badge dns-${c.dnsPreset || 'custom'}">${esc(c.dnsLabel)}</span>`
      : `<span class="dns-badge unknown">—</span>`;

    const lastSeen = c.latestHandshakeAt
      ? timeAgo(new Date(c.latestHandshakeAt))
      : 'Jamais';

    return `<tr>
      <td><span class="client-name">${esc(c.name)}</span></td>
      <td><span class="client-ip">${esc(c.address)}</span></td>
      <td>${statusBadge}</td>
      <td>${dnsBadge}</td>
      <td style="color:var(--text-dim);font-size:.8rem">${lastSeen}</td>
      <td>
        <div class="actions">
          <button class="btn-icon" data-action="qr"     data-id="${c.id}" title="QR / Config">⊞</button>
          <button class="btn-icon" data-action="toggle" data-id="${c.id}"
                  data-enabled="${c.enabled !== false}"
                  title="${c.enabled !== false ? 'Désactiver' : 'Activer'}">
            ${c.enabled !== false ? '⏸' : '▶'}
          </button>
          <button class="btn-icon" data-action="filter" data-id="${c.id}"
                  data-name="${esc(c.name)}" data-preset="${c.dnsPreset || ''}"
                  data-dns="${esc(c.dns || '')}" title="Changer le filtre DNS">⚙</button>
          <button class="btn-icon danger" data-action="delete" data-id="${c.id}"
                  data-name="${esc(c.name)}" title="Supprimer">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<table>
    <thead><tr>
      <th>Nom</th><th>IP VPN</th><th>Statut</th><th>DNS</th>
      <th>Dernière connexion</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function bindClientActions(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, name, enabled } = btn.dataset;

    if (action === 'filter') {
      openFilterModal({ id, name, preset: btn.dataset.preset, dns: btn.dataset.dns });
    }
    if (action === 'qr') {
      const data = await GET(`/api/clients/${id}/config`);
      if (data) showQrModal(data.config, data.qrcode);
    }
    if (action === 'toggle') {
      const isEnabled = enabled === 'true';
      await POST(`/api/clients/${id}/${isEnabled ? 'disable' : 'enable'}`);
      if (state.tab === 'clients') loadClients();
      else loadDashboard();
    }
    if (action === 'delete') {
      if (!confirm(`Supprimer le client "${name}" ?`)) return;
      await DEL(`/api/clients/${id}`);
      if (state.tab === 'clients') loadClients();
      else loadDashboard();
    }
  });
}

// ── New client modal ──────────────────────────────────────────────────────────

function openNewClientModal() {
  // Restaurer le footer (peut avoir été remplacé par le résultat de création)
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn-ghost" id="modal-cancel-btn">Annuler</button>
    <button class="btn-primary" id="modal-submit-btn">Créer →</button>
  `;
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-submit-btn').addEventListener('click', submitNewClient);

  // Reset état
  document.getElementById('modal-form').classList.remove('hidden');
  document.getElementById('modal-result').classList.add('hidden');
  document.getElementById('modal-footer').classList.remove('hidden');
  document.querySelector('.result-success').style.display = '';
  document.getElementById('modal-title').textContent = 'Nouveau client WireGuard';
  document.getElementById('client-name-input').value = '';
  document.getElementById('create-error').classList.add('hidden');

  // Render DNS options
  const container = document.getElementById('dns-options');
  container.innerHTML = DNS_PRESETS.map((p, i) => `
    <label class="dns-option${i === 0 ? ' selected' : ''}">
      <input type="radio" name="dns-preset" value="${p.id}" ${i === 0 ? 'checked' : ''}>
      <div class="dns-option-text">
        <div class="dns-option-label">${p.label}</div>
        <div class="dns-option-desc">${p.desc}</div>
        <div class="dns-option-value">${p.value}</div>
      </div>
    </label>
  `).join('');

  container.querySelectorAll('.dns-option').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.dns-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      el.querySelector('input').checked = true;
    });
  });

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('client-name-input').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

async function submitNewClient() {
  const name = document.getElementById('client-name-input').value.trim();
  const errorEl = document.getElementById('create-error');
  errorEl.classList.add('hidden');

  if (!name) {
    errorEl.textContent = 'Le nom est requis.';
    errorEl.classList.remove('hidden');
    return;
  }

  const checked = document.querySelector('input[name="dns-preset"]:checked');
  const preset  = checked?.value || 'filtered';
  const dns     = DNS_PRESETS.find(p => p.id === preset)?.value || '10.8.0.1';

  const btn = document.getElementById('modal-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Création…';

  const data = await POST('/api/clients', { name, preset, dns });

  if (!data || data.error) {
    errorEl.textContent = data?.error || 'Erreur lors de la création.';
    errorEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Créer →';
    return;
  }

  // Show result
  document.getElementById('modal-title').textContent = 'Client créé';
  document.getElementById('modal-form').classList.add('hidden');
  document.getElementById('modal-footer').classList.add('hidden');

  document.getElementById('result-name').textContent = data.client.name;
  document.getElementById('result-qr').src   = data.qrcode;
  document.getElementById('result-config').textContent = data.config;

  // Footer becomes download + close
  const footer = document.getElementById('modal-footer');
  footer.innerHTML = `
    <button class="btn-ghost" id="dl-config-btn">↓ Télécharger .conf</button>
    <button class="btn-primary" id="modal-done-btn">Fermer</button>
  `;
  footer.classList.remove('hidden');

  document.getElementById('modal-result').classList.remove('hidden');

  document.getElementById('modal-done-btn').addEventListener('click', () => {
    closeModal();
    if (state.tab === 'clients') loadClients();
    else loadDashboard();
  });

  document.getElementById('dl-config-btn').addEventListener('click', () => {
    const blob = new Blob([data.config], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `wireguard-${data.client.name.replace(/\s+/g, '-')}.conf`
    });
    a.click();
    URL.revokeObjectURL(url);
  });
}

// QR-only modal (for existing clients)
function showQrModal(config, qrcode) {
  document.getElementById('modal-title').textContent = 'Config & QR Code';
  document.getElementById('modal-form').classList.add('hidden');

  document.getElementById('result-name').textContent = '';
  document.getElementById('result-qr').src   = qrcode;
  document.getElementById('result-config').textContent = config;

  const footer = document.getElementById('modal-footer');
  footer.innerHTML = `
    <button class="btn-ghost" id="copy-cfg-btn">⎘ Copier config</button>
    <button class="btn-primary" id="modal-done-btn2">Fermer</button>
  `;
  footer.classList.remove('hidden');

  document.querySelector('.result-success').style.display = 'none';
  document.getElementById('modal-result').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');

  document.getElementById('modal-done-btn2').addEventListener('click', () => {
    document.querySelector('.result-success').style.display = '';
    closeModal();
  });
  document.getElementById('copy-cfg-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(config);
    document.getElementById('copy-cfg-btn').textContent = '✓ Copié';
  });
}

// ── Filter modal ─────────────────────────────────────────────────────────────

let _filterClient = null;

function openFilterModal(client) {
  _filterClient = client;
  const isAdGuard = client.dns === '10.8.0.1';

  // Info client
  document.getElementById('filter-client-info').innerHTML =
    `<strong>${esc(client.name)}</strong> — DNS actuel : <code>${esc(client.dns || '—')}</code>`;

  // Reset
  document.getElementById('filter-result').classList.add('hidden');
  document.getElementById('filter-regen-result').classList.add('hidden');
  document.getElementById('filter-error').classList.add('hidden');
  document.getElementById('filter-footer').innerHTML = `
    <button class="btn-ghost" id="filter-cancel-btn">Annuler</button>
    <button class="btn-primary" id="filter-submit-btn">${isAdGuard ? 'Appliquer' : 'Générer nouvelle config'}</button>
  `;
  document.getElementById('filter-cancel-btn').addEventListener('click', closeFilterModal);
  document.getElementById('filter-submit-btn').addEventListener('click', submitFilter);

  if (isAdGuard) {
    document.getElementById('filter-form').classList.remove('hidden');
    document.getElementById('filter-non-adguard').classList.add('hidden');
    renderFilterOptions('filter-dns-options', client.preset || 'filtered');
  } else {
    document.getElementById('filter-form').classList.add('hidden');
    document.getElementById('filter-non-adguard').classList.remove('hidden');
    renderFilterOptions('filter-regen-options', client.preset || 'filtered');
  }

  document.getElementById('filter-overlay').classList.remove('hidden');
}

function renderFilterOptions(containerId, selectedPreset) {
  const container = document.getElementById(containerId);
  container.innerHTML = DNS_PRESETS.map(p => `
    <label class="dns-option${p.id === selectedPreset ? ' selected' : ''}">
      <input type="radio" name="${containerId}" value="${p.id}" ${p.id === selectedPreset ? 'checked' : ''}>
      <div class="dns-option-text">
        <div class="dns-option-label">${p.label}</div>
        <div class="dns-option-desc">${p.desc}</div>
        <div class="dns-option-value">${p.value}</div>
      </div>
    </label>
  `).join('');
  container.querySelectorAll('.dns-option').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.dns-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      el.querySelector('input').checked = true;
    });
  });
}

function closeFilterModal() {
  document.getElementById('filter-overlay').classList.add('hidden');
  _filterClient = null;
}

async function submitFilter() {
  const client   = _filterClient;
  const isAdGuard = client.dns === '10.8.0.1';
  const optionsId = isAdGuard ? 'filter-dns-options' : 'filter-regen-options';
  const checked  = document.querySelector(`input[name="${optionsId}"]:checked`);
  const preset   = checked?.value || 'filtered';
  const errEl    = document.getElementById('filter-error');
  errEl.classList.add('hidden');

  const btn = document.getElementById('filter-submit-btn');
  btn.disabled = true;
  btn.textContent = 'En cours…';

  let data;
  if (isAdGuard) {
    data = await POST(`/api/clients/${client.id}/filter`, { preset });
  } else {
    data = await POST(`/api/clients/${client.id}/patch-dns`, { preset });
  }

  btn.disabled = false;

  if (!data || data.error) {
    errEl.textContent = data?.message || data?.error || 'Erreur.';
    errEl.classList.remove('hidden');
    btn.textContent = isAdGuard ? 'Appliquer' : 'Générer nouvelle config';
    return;
  }

  // Show result
  const resultMsg = isAdGuard
    ? `Filtre mis à jour : ${DNS_PRESETS.find(p => p.id === preset)?.label}`
    : `Nouvelle config générée avec : ${DNS_PRESETS.find(p => p.id === preset)?.label}`;

  document.getElementById('filter-result-msg').textContent = resultMsg;
  document.getElementById('filter-result').classList.remove('hidden');

  if (!isAdGuard && data.config) {
    document.getElementById('filter-qr').src = data.qrcode;
    document.getElementById('filter-config').textContent = data.config;
    document.getElementById('filter-regen-result').classList.remove('hidden');
  }

  document.getElementById('filter-footer').innerHTML = `
    ${!isAdGuard && data.config ? '<button class="btn-ghost" id="filter-dl-btn">↓ Télécharger .conf</button>' : ''}
    <button class="btn-primary" id="filter-done-btn">Fermer</button>
  `;
  document.getElementById('filter-done-btn').addEventListener('click', () => {
    closeFilterModal();
    if (state.tab === 'clients') loadClients(); else loadDashboard();
  });
  if (!isAdGuard && data.config) {
    document.getElementById('filter-dl-btn').addEventListener('click', () => {
      const blob = new Blob([data.config], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url, download: `wireguard-${client.name.replace(/\s+/g, '-')}.conf`
      });
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

// ── Help modal ────────────────────────────────────────────────────────────────

function openHelpModal() {
  document.getElementById('help-overlay').classList.remove('hidden');
}
function closeHelpModal() {
  document.getElementById('help-overlay').classList.add('hidden');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function timeAgo(date) {
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 60)         return 'Il y a ' + s + 's';
  if (s < 3600)       return 'Il y a ' + Math.floor(s/60) + 'min';
  if (s < 86400)      return 'Il y a ' + Math.floor(s/3600) + 'h';
  return 'Il y a '    + Math.floor(s/86400) + 'j';
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const pw  = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.classList.add('hidden');
  const data = await POST('/api/login', { password: pw });
  if (data?.success) {
    showApp();
    loadConfig();
    switchTab('dashboard');
  } else {
    err.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await POST('/api/logout');
  showLogin();
});

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    switchTab(el.dataset.tab);
  });
});

document.getElementById('new-client-btn').addEventListener('click', openNewClientModal);
document.getElementById('dash-new-btn').addEventListener('click', openNewClientModal);
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('filter-close-btn').addEventListener('click', closeFilterModal);
document.getElementById('help-dns-btn').addEventListener('click', openHelpModal);
document.getElementById('help-dns-btn2').addEventListener('click', openHelpModal);
document.getElementById('help-close-btn').addEventListener('click', closeHelpModal);
document.getElementById('help-ok-btn').addEventListener('click', closeHelpModal);
document.getElementById('filter-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('filter-overlay')) closeFilterModal();
});
document.getElementById('help-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('help-overlay')) closeHelpModal();
});
document.getElementById('refresh-btn').addEventListener('click', loadDashboard);

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.getElementById('copy-config-btn')?.addEventListener('click', () => {
  const config = document.getElementById('result-config').textContent;
  navigator.clipboard.writeText(config);
});

checkAuth();
