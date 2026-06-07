'use strict';

const express    = require('express');
const session    = require('express-session');
const QRCode     = require('qrcode');
const fs         = require('fs');
const os         = require('os');
const path       = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { Readable } = require('stream');

const app  = express();
const PORT = parseInt(process.env.PORTAL_PORT  || '8080', 10);
const HOST = process.env.PORTAL_HOST || '127.0.0.1';

const WG_URL       = process.env.WG_EASY_URL   || 'http://127.0.0.1:51821';
const AG_URL       = process.env.ADGUARD_URL   || 'http://127.0.0.1:3000';
const WG_PASSWORD  = process.env.WG_EASY_PASSWORD  || process.env.ADMIN_PASSWORD || 'changeme';
const AG_USER      = process.env.ADGUARD_USER      || 'admin';
const AG_PASSWORD  = process.env.ADGUARD_PASSWORD  || process.env.ADMIN_PASSWORD || 'changeme';
const PORTAL_PASS  = process.env.ADMIN_PASSWORD    || 'changeme';
const DEFAULT_SERVER_NAME = process.env.SERVER_NAME || os.hostname();
const FAIL2BAN_JAIL = process.env.FAIL2BAN_JAIL || 'easy-wg-portal';
const runCmd = promisify(execFile);

const DNS_PRESETS = [
  { id: 'filtered', label: 'Filtré complet',    value: '10.8.0.1' },
  { id: 'malware',  label: 'Malware seulement', value: '1.1.1.2, 1.0.0.2' },
  { id: 'none',     label: 'Sans filtre',        value: '1.1.1.1, 8.8.8.8' },
];

function dnsToPreset(dns) {
  return DNS_PRESETS.find(p => p.value === dns?.trim()) || { id: 'custom', label: dns || '—' };
}

const DATA_FILE = '/data/client-dns.json';
const SETTINGS_FILE = '/data/portal-config.json';

function sanitizeServerName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    || 'vpn-server';
}

function isValidServerName(value) {
  return /^[A-Za-z0-9_-]+$/.test(String(value || ''));
}

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

function getServerName() {
  return loadSettings().serverName || sanitizeServerName(DEFAULT_SERVER_NAME);
}

function setServerName(serverName) {
  const settings = loadSettings();
  settings.serverName = serverName;
  saveSettings(settings);
}

// ── Persistence ─────────────────────────────────────────────────────────────

function loadStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}

function saveStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function setClientDns(id, preset, dns) {
  const s = loadStore();
  s[id] = { preset, dns };
  saveStore(s);
}

function getClientDns(id) {
  return loadStore()[id] || null;
}

function removeClientDns(id) {
  const s = loadStore();
  delete s[id];
  saveStore(s);
}

// ── wg-easy session ──────────────────────────────────────────────────────────

let wgCookie = null;

async function wgAuth() {
  const r = await fetch(`${WG_URL}/api/session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ password: WG_PASSWORD }),
  });
  const raw = r.headers.get('set-cookie') || '';
  wgCookie = raw.split(';')[0] || null;
}

async function wgFetch(endpoint, opts = {}) {
  if (!wgCookie) await wgAuth();
  const r = await fetch(`${WG_URL}${endpoint}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Cookie: wgCookie, ...opts.headers },
  });
  if (r.status === 401) { wgCookie = null; await wgAuth(); return wgFetch(endpoint, opts); }
  return r;
}

// ── AdGuard helpers ──────────────────────────────────────────────────────────

function agAuth() {
  return { Authorization: 'Basic ' + Buffer.from(`${AG_USER}:${AG_PASSWORD}`).toString('base64') };
}

async function agFetch(endpoint, opts = {}) {
  return fetch(`${AG_URL}${endpoint}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...agAuth(), ...opts.headers },
  });
}

function parseFail2banStatus(output) {
  const currentlyBanned = Number((output.match(/Currently banned:\s*(\d+)/i) || [])[1] || 0);
  const totalBanned = Number((output.match(/Total banned:\s*(\d+)/i) || [])[1] || 0);
  const listRaw = (output.match(/Banned IP list:\s*(.*)/i) || [])[1] || '';
  const ips = listRaw.trim() ? listRaw.trim().split(/\s+/) : [];
  return { currentlyBanned, totalBanned, ips };
}

function isValidIp(value) {
  const raw = String(value || '').trim();
  const ipv4 = /^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(raw) || ipv6.test(raw);
}

async function fail2banStatus() {
  const { stdout } = await runCmd('fail2ban-client', ['status', FAIL2BAN_JAIL], { timeout: 4000 });
  return parseFail2banStatus(stdout);
}

// ── Express setup ────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  name:              'portal.sid',
  secret:            process.env.SESSION_SECRET || PORTAL_PASS + '_sess',
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 24 * 60 * 60 * 1000 },
}));

const auth = (req, res, next) => req.session.ok ? next() : res.status(401).json({ error: 'Unauthorized' });

function rewriteSetCookiePath(cookie, basePath) {
  if (!cookie) return cookie;
  if (/;\s*Path=/i.test(cookie)) {
    return cookie.replace(/;\s*Path=\/[^;]*/i, `; Path=${basePath}/`);
  }
  return `${cookie}; Path=${basePath}/`;
}

function forwardReqHeaders(req) {
  const headers = { ...req.headers };
  delete headers.host;
  return headers;
}

function buildUpstreamPath(req, basePath) {
  const pathValue = req.originalUrl.replace(new RegExp(`^${basePath}`), '');
  return pathValue || '/';
}

function proxyTo(basePath, targetBaseUrl) {
  return async (req, res) => {
    try {
      const upstreamPath = buildUpstreamPath(req, basePath);
      const upstreamUrl = new URL(upstreamPath, targetBaseUrl);

      const init = {
        method: req.method,
        headers: forwardReqHeaders(req),
        redirect: 'manual',
      };

      if (!['GET', 'HEAD'].includes(req.method)) {
        init.body = req;
        init.duplex = 'half';
      }

      const upstream = await fetch(upstreamUrl, init);

      res.status(upstream.status);

      upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        if (key.toLowerCase() === 'x-frame-options') return;
        if (key.toLowerCase() === 'content-security-policy') return;
        if (key.toLowerCase() === 'location' && value.startsWith('/')) {
          res.setHeader('location', `${basePath}${value}`);
          return;
        }
        res.setHeader(key, value);
      });

      if (typeof upstream.headers.getSetCookie === 'function') {
        const setCookies = upstream.headers.getSetCookie();
        if (setCookies.length) {
          res.setHeader('set-cookie', setCookies.map((cookie) => rewriteSetCookiePath(cookie, basePath)));
        }
      } else {
        const setCookie = upstream.headers.get('set-cookie');
        if (setCookie) {
          res.setHeader('set-cookie', rewriteSetCookiePath(setCookie, basePath));
        }
      }

      if (!upstream.body) {
        res.end();
        return;
      }

      Readable.fromWeb(upstream.body).pipe(res);
    } catch (error) {
      res.status(502).send(`Proxy error: ${error.message}`);
    }
  };
}

app.use('/wireguard', auth, proxyTo('/wireguard', WG_URL));
app.use('/adguard', auth, proxyTo('/adguard', AG_URL));

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  if (req.body.password === PORTAL_PASS) {
    req.session.ok = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/me', (req, res) => res.json({ authenticated: !!req.session.ok }));

// ── Config (iframe ports for browser) ────────────────────────────────────────

app.get('/api/config', auth, (_req, res) => res.json({
  wgEasyPath: '/wireguard/',
  adguardPath: '/adguard/',
  serverName: getServerName(),
}));

app.post('/api/server-name', auth, (req, res) => {
  const serverName = String(req.body.serverName || '').trim();
  if (!isValidServerName(serverName)) {
    return res.status(400).json({ error: 'Invalid server name. Use only letters, numbers, - or _.' });
  }

  setServerName(serverName);
  res.json({ success: true, serverName });
});

// ── WireGuard clients ─────────────────────────────────────────────────────────

app.get('/api/clients', auth, async (_req, res) => {
  try {
    const r       = await wgFetch('/api/wireguard/client');
    const clients = await r.json();
    let store     = loadStore();

    // Auto-discover DNS for clients not yet in the store
    const unknown = clients.filter(c => !store[c.id]);
    if (unknown.length) {
      await Promise.all(unknown.map(async c => {
        try {
          const cr  = await wgFetch(`/api/wireguard/client/${c.id}/configuration`);
          const cfg = await cr.text();
          const m   = cfg.match(/^DNS\s*=\s*(.+)$/m);
          if (m) {
            const dns    = m[1].trim();
            const preset = dnsToPreset(dns);
            setClientDns(c.id, preset.id, dns);
          }
        } catch { /* ignore individual failures */ }
      }));
      store = loadStore();
    }

    res.json(clients.map(c => ({
      ...c,
      dnsPreset: store[c.id]?.preset || null,
      dnsLabel:  store[c.id] ? dnsToPreset(store[c.id].dns).label : null,
      dns:       store[c.id]?.dns || null,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', auth, async (req, res) => {
  const { name, preset, dns } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    await wgFetch('/api/wireguard/client', {
      method: 'POST',
      body:   JSON.stringify({ name }),
    });

    const listRes = await wgFetch('/api/wireguard/client');
    const clients = await listRes.json();
    const client  = clients.filter(c => c.name === name).pop();
    if (!client) return res.status(500).json({ error: 'Client not found after creation' });

    const configRes = await wgFetch(`/api/wireguard/client/${client.id}/configuration`);
    let config = await configRes.text();
    if (dns) config = config.replace(/^DNS = .*/m, `DNS = ${dns}`);

    if (preset && dns) setClientDns(client.id, preset, dns);

    const qrcode = await QRCode.toDataURL(config, { width: 256, margin: 2 });
    res.json({ client, config, qrcode });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/clients/:id', auth, async (req, res) => {
  try {
    await wgFetch(`/api/wireguard/client/${req.params.id}`, { method: 'DELETE' });
    removeClientDns(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients/:id/enable', auth, async (req, res) => {
  try {
    await wgFetch(`/api/wireguard/client/${req.params.id}/enable`, { method: 'POST' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients/:id/disable', auth, async (req, res) => {
  try {
    await wgFetch(`/api/wireguard/client/${req.params.id}/disable`, { method: 'POST' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients/:id/config', auth, async (req, res) => {
  try {
    const r      = await wgFetch(`/api/wireguard/client/${req.params.id}/configuration`);
    const config = await r.text();
    const qrcode = await QRCode.toDataURL(config, { width: 256, margin: 2 });
    res.json({ config, qrcode });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Filter change (AdGuard per-client settings) ───────────────────────────────

// AdGuard per-client settings per filter preset
const AG_PER_CLIENT = {
  filtered: {
    use_global_settings:        true,
    filtering_enabled:          true,
    safebrowsing_enabled:       true,
    parental_enabled:           false,
    use_global_blocked_services: true,
    safe_search:                { enabled: false },
    upstreams:                  [],
  },
  malware: {
    use_global_settings:        false,
    filtering_enabled:          false,
    safebrowsing_enabled:       false,
    parental_enabled:           false,
    use_global_blocked_services: true,
    safe_search:                { enabled: false },
    upstreams:                  ['1.1.1.2', '1.0.0.2'],
  },
  none: {
    use_global_settings:        false,
    filtering_enabled:          false,
    safebrowsing_enabled:       false,
    parental_enabled:           false,
    use_global_blocked_services: false,
    safe_search:                { enabled: false },
    upstreams:                  ['1.1.1.1', '8.8.8.8'],
  },
};

async function agSetClientFilter(clientName, clientIp, preset) {
  const settings = AG_PER_CLIENT[preset] || AG_PER_CLIENT.filtered;

  // Check if AdGuard already has a client entry for this IP
  const listRes = await agFetch('/control/clients');
  const list    = await listRes.json();
  const exists  = (list.clients || []).find(c => c.ids?.includes(clientIp));

  const payload = { name: clientName, ids: [clientIp], tags: [], ...settings };

  if (exists) {
    await agFetch('/control/clients/update', {
      method: 'POST',
      body:   JSON.stringify({ name: exists.name, data: payload }),
    });
  } else {
    await agFetch('/control/clients/add', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
  }
}

app.post('/api/clients/:id/filter', auth, async (req, res) => {
  const { preset } = req.body;
  if (!preset || !AG_PER_CLIENT[preset])
    return res.status(400).json({ error: 'Invalid preset' });

  try {
    // Get client details from wg-easy
    const listRes = await wgFetch('/api/wireguard/client');
    const clients = await listRes.json();
    const client  = clients.find(c => c.id === req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const store = loadStore();
    const dns   = store[client.id]?.dns || '10.8.0.1';

    if (dns !== '10.8.0.1')
      return res.status(422).json({
        error:   'non_adguard',
        message: 'Ce client n\'utilise pas AdGuard DNS (10.8.0.1). Regénérez sa config pour changer son filtre.',
      });

    // Apply per-client filter in AdGuard
    await agSetClientFilter(client.name, client.address, preset);

    // Persist in portal store
    setClientDns(client.id, preset, '10.8.0.1');

    res.json({ success: true, preset, label: dnsToPreset('10.8.0.1').label });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Patch DNS on existing client config (for non-AdGuard → AdGuard migration)
app.post('/api/clients/:id/patch-dns', auth, async (req, res) => {
  const { preset } = req.body;
  const presetDef  = DNS_PRESETS.find(p => p.id === preset);
  if (!presetDef) return res.status(400).json({ error: 'Invalid preset' });

  try {
    const configRes = await wgFetch(`/api/wireguard/client/${req.params.id}/configuration`);
    let config = await configRes.text();
    config = config.replace(/^DNS = .*/m, `DNS = ${presetDef.value}`);

    // If switching to AdGuard, also set per-client filter
    if (presetDef.value === '10.8.0.1') {
      const listRes = await wgFetch('/api/wireguard/client');
      const client  = (await listRes.json()).find(c => c.id === req.params.id);
      if (client) await agSetClientFilter(client.name, client.address, preset);
    }

    setClientDns(req.params.id, preset, presetDef.value);

    const qrcode = await QRCode.toDataURL(config, { width: 256, margin: 2 });
    res.json({ config, qrcode, preset });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AdGuard ───────────────────────────────────────────────────────────────────

app.get('/api/adguard/stats', auth, async (_req, res) => {
  try {
    const r = await agFetch('/control/stats');
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/adguard/status', auth, async (_req, res) => {
  try {
    const r = await agFetch('/control/status');
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/adguard/protection', auth, async (req, res) => {
  try {
    await agFetch('/control/protection', {
      method: 'POST',
      body:   JSON.stringify({ enabled: req.body.enabled }),
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Fail2Ban ─────────────────────────────────────────────────────────────────

app.get('/api/fail2ban/status', auth, async (_req, res) => {
  try {
    const status = await fail2banStatus();
    res.json({ enabled: true, jail: FAIL2BAN_JAIL, ...status });
  } catch (e) {
    res.json({
      enabled: false,
      jail: FAIL2BAN_JAIL,
      currentlyBanned: 0,
      totalBanned: 0,
      ips: [],
      error: e.message,
    });
  }
});

app.post('/api/fail2ban/unban', auth, async (req, res) => {
  const ip = String(req.body.ip || '').trim();
  if (!isValidIp(ip)) {
    return res.status(400).json({ error: 'Invalid IP address.' });
  }

  try {
    await runCmd('fail2ban-client', ['set', FAIL2BAN_JAIL, 'unbanip', ip], { timeout: 4000 });
    const status = await fail2banStatus();
    res.json({ success: true, jail: FAIL2BAN_JAIL, ...status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, HOST, () => console.log(`Portal listening on ${HOST}:${PORT}`));
