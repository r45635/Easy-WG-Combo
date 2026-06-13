'use strict';

const express    = require('express');
const session    = require('express-session');
const QRCode     = require('qrcode');
const fs         = require('fs');
const os         = require('os');
const path       = require('path');
const http       = require('http');
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
const FAIL2BAN_JAIL    = process.env.FAIL2BAN_JAIL    || 'easy-wg-portal';
const ACCESS_LOG_PATH  = process.env.ACCESS_LOG_PATH  || '/var/log/easy-wg-portal/access.log';
const FAIL2BAN_LOG     = process.env.FAIL2BAN_LOG     || '/var/log/fail2ban.log';
const BACKUP_DIR       = process.env.BACKUP_DIR       || '/backups';
const BACKUP_SRC_DIR   = process.env.BACKUP_SRC_DIR   || '/backup-src';
const BACKUP_KEEP      = parseInt(process.env.BACKUP_KEEP || '10', 10);
const DOCKER_SOCK      = '/var/run/docker.sock';
const SSH_CONFIG_PATH  = '/etc/ssh/sshd_config';
const UFW_CONF_PATH    = '/etc/ufw/ufw.conf';
const NOTIF_FILE       = '/data/notifications.json';
const NOTIF_HIST_FILE  = '/data/notifications-history.json';
const ALERT_DISK_THRESHOLD  = parseInt(process.env.ALERT_DISK_THRESHOLD  || '85',  10);
const ALERT_CERT_EXPIRY_DAYS = parseInt(process.env.ALERT_CERT_EXPIRY_DAYS || '14', 10);
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

let currentPortalPass = loadSettings().adminPassword || PORTAL_PASS;

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

function isValidIpOrCidr(value) {
  const raw = String(value || '').trim();
  const ipv4 = /^((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)(\/([0-9]|[12]\d|3[0-2]))?$/;
  const ipv6 = /^[0-9a-fA-F:]+(?:\/\d+)?$/;
  return ipv4.test(raw) || ipv6.test(raw);
}

const sessionRegistry = new Map(); // sessionId → {ip, ua, loginAt, lastSeen}

function clientIp(req) {
  return (
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  ).replace(/^::ffff:/, '');
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

const auth = (req, res, next) => {
  if (!req.session.ok) return res.status(401).json({ error: 'Unauthorized' });
  const meta = sessionRegistry.get(req.sessionID);
  if (meta) meta.lastSeen = Date.now();
  next();
};

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

function buildUpstreamPath(req, basePath, keepPrefix = false) {
  if (keepPrefix) return req.originalUrl || '/';
  const pathValue = req.originalUrl.replace(new RegExp(`^${basePath}`), '');
  return pathValue || '/';
}

function proxyTo(basePath, targetBaseUrl, opts = {}) {
  return async (req, res) => {
    try {
      // Ensure wg-easy session is active before proxying
      if (opts.wgAuth && !wgCookie) await wgAuth();

      const upstreamPath = buildUpstreamPath(req, basePath, opts.keepPrefix);
      const upstreamUrl = new URL(upstreamPath, targetBaseUrl);

      const headers = forwardReqHeaders(req);

      // Inject managed wg-easy session cookie (replaces browser cookies)
      if (opts.wgAuth) headers.cookie = wgCookie || '';

      // Inject AdGuard Basic auth (overrides any browser auth header)
      if (opts.agAuth) {
        delete headers.authorization;
        Object.assign(headers, agAuth());
      }

      const init = {
        method: req.method,
        headers,
        redirect: 'manual',
      };

      if (!['GET', 'HEAD'].includes(req.method)) {
        const ct = (req.headers['content-type'] || '').toLowerCase();
        if (ct.includes('application/json')) {
          // express.json() already consumed the stream — re-serialize from req.body
          init.body = JSON.stringify(req.body ?? {});
        } else {
          init.body = req;
          init.duplex = 'half';
        }
      }

      const upstream = await fetch(upstreamUrl, init);

      res.status(upstream.status);

      upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        if (key.toLowerCase() === 'x-frame-options') return;
        if (key.toLowerCase() === 'content-security-policy') return;
        if (key.toLowerCase() === 'content-encoding') return;  // body is decompressed by fetch
        if (key.toLowerCase() === 'content-length') return;    // length changes after decompression
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

// wg-easy iframe SPA: its JS makes absolute calls to /api/session and /api/wireguard/*
// These must be declared BEFORE the portal's own /api/* routes
app.use('/api/session',   auth, proxyTo('/api/session',   WG_URL, { wgAuth: true }));
app.use('/api/wireguard', auth, proxyTo('/api/wireguard', WG_URL, { wgAuth: true }));
app.use('/wireguard',     auth, proxyTo('/wireguard',     WG_URL, { wgAuth: true }));

// AdGuard iframe SPA: its JS makes absolute calls to /control/* — keep the full path
app.use('/control', auth, proxyTo('/control', AG_URL, { agAuth: true, keepPrefix: true }));
app.use('/adguard',  auth, proxyTo('/adguard',  AG_URL, { agAuth: true }));

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  if (req.body.password === currentPortalPass) {
    req.session.ok = true;
    sessionRegistry.set(req.sessionID, {
      ip:       clientIp(req),
      ua:       (req.headers['user-agent'] || '').slice(0, 120),
      loginAt:  Date.now(),
      lastSeen: Date.now(),
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

app.post('/api/logout', (req, res) => {
  sessionRegistry.delete(req.sessionID);
  req.session.destroy();
  res.json({ success: true });
});

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

// ── Fail2Ban extended ────────────────────────────────────────────────────────

app.post('/api/fail2ban/ban', auth, async (req, res) => {
  const ip = String(req.body.ip || '').trim();
  if (!isValidIp(ip)) return res.status(400).json({ error: 'Invalid IP address.' });
  try {
    await runCmd('fail2ban-client', ['set', FAIL2BAN_JAIL, 'banip', ip], { timeout: 4000 });
    const status = await fail2banStatus();
    res.json({ success: true, jail: FAIL2BAN_JAIL, ...status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fail2ban/unban-all', auth, async (_req, res) => {
  try {
    const current = await fail2banStatus();
    await Promise.all(current.ips.map(ip =>
      runCmd('fail2ban-client', ['set', FAIL2BAN_JAIL, 'unbanip', ip], { timeout: 4000 }).catch(() => {})
    ));
    const status = await fail2banStatus();
    res.json({ success: true, jail: FAIL2BAN_JAIL, ...status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fail2ban/config', auth, async (_req, res) => {
  try {
    const [bt, ft, mr] = await Promise.all([
      runCmd('fail2ban-client', ['get', FAIL2BAN_JAIL, 'bantime'],  { timeout: 4000 }),
      runCmd('fail2ban-client', ['get', FAIL2BAN_JAIL, 'findtime'], { timeout: 4000 }),
      runCmd('fail2ban-client', ['get', FAIL2BAN_JAIL, 'maxretry'], { timeout: 4000 }),
    ]);
    res.json({
      jail:     FAIL2BAN_JAIL,
      bantime:  parseInt(bt.stdout.trim(),  10),
      findtime: parseInt(ft.stdout.trim(), 10),
      maxretry: parseInt(mr.stdout.trim(), 10),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fail2ban/logs', auth, (req, res) => {
  const n      = Math.min(parseInt(req.query.n || '200', 10), 500);
  const filter = req.query.status || '';
  try {
    if (!fs.existsSync(ACCESS_LOG_PATH))
      return res.json({ lines: [], total: 0, error: 'Log file not available yet.' });
    const raw    = fs.readFileSync(ACCESS_LOG_PATH, 'utf8');
    const parsed = raw.trim().split('\n').filter(Boolean).map(line => {
      try {
        const o = JSON.parse(line);
        return {
          ts:       o.ts,
          ip:       o.request?.remote_ip || o.request?.client_ip || '',
          method:   o.request?.method || '',
          uri:      o.request?.uri || '',
          status:   o.status || 0,
          duration: o.duration || 0,
          ua:       (o.request?.headers?.['User-Agent'] || [])[0] || '',
        };
      } catch { return null; }
    }).filter(Boolean);
    const filtered = filter === '401'    ? parsed.filter(l => l.status === 401)
                   : filter === 'errors' ? parsed.filter(l => l.status >= 400)
                   : parsed;
    res.json({ lines: filtered.slice(-n).reverse(), total: filtered.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── My IP ────────────────────────────────────────────────────────────────────

app.get('/api/myip', (req, res) => {
  res.json({ ip: clientIp(req) });
});

// ── Fail2Ban whitelist ────────────────────────────────────────────────────────

app.get('/api/fail2ban/ignoreip', auth, async (_req, res) => {
  try {
    const { stdout } = await runCmd('fail2ban-client', ['get', FAIL2BAN_JAIL, 'ignoreip'], { timeout: 4000 });
    const raw = stdout.trim();
    // fail2ban-client outputs "No IP address/network is in the ignore list" when empty
    const ips = (raw && !raw.startsWith('No '))
      ? raw.split(/\s+/).filter(s => /^[\d:.\/a-fA-F]+$/.test(s))
      : [];
    res.json({ ips });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fail2ban/ignoreip', auth, async (req, res) => {
  const ip = String(req.body.ip || '').trim();
  if (!isValidIpOrCidr(ip)) return res.status(400).json({ error: 'Invalid IP or CIDR notation.' });
  try {
    await runCmd('fail2ban-client', ['set', FAIL2BAN_JAIL, 'addignoreip', ip], { timeout: 4000 });
    const { stdout } = await runCmd('fail2ban-client', ['get', FAIL2BAN_JAIL, 'ignoreip'], { timeout: 4000 });
    const raw = stdout.trim();
    const ips = (raw && !raw.startsWith('No ')) ? raw.split(/\s+/).filter(s => /^[\d:.\/a-fA-F]+$/.test(s)) : [];
    res.json({ ips });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/fail2ban/ignoreip', auth, async (req, res) => {
  const ip = String(req.body.ip || '').trim();
  if (!isValidIpOrCidr(ip)) return res.status(400).json({ error: 'Invalid IP or CIDR notation.' });
  try {
    await runCmd('fail2ban-client', ['set', FAIL2BAN_JAIL, 'delignoreip', ip], { timeout: 4000 });
    const { stdout } = await runCmd('fail2ban-client', ['get', FAIL2BAN_JAIL, 'ignoreip'], { timeout: 4000 });
    const raw = stdout.trim();
    const ips = (raw && !raw.startsWith('No ')) ? raw.split(/\s+/).filter(s => /^[\d:.\/a-fA-F]+$/.test(s)) : [];
    res.json({ ips });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Fail2Ban live config edit ─────────────────────────────────────────────────

app.post('/api/fail2ban/set-config', auth, async (req, res) => {
  const { bantime, findtime, maxretry } = req.body;
  const cmds = [];
  if (bantime  !== undefined) cmds.push(runCmd('fail2ban-client', ['set', FAIL2BAN_JAIL, 'bantime',  String(bantime)],  { timeout: 4000 }));
  if (findtime !== undefined) cmds.push(runCmd('fail2ban-client', ['set', FAIL2BAN_JAIL, 'findtime', String(findtime)], { timeout: 4000 }));
  if (maxretry !== undefined) cmds.push(runCmd('fail2ban-client', ['set', FAIL2BAN_JAIL, 'maxretry', String(maxretry)], { timeout: 4000 }));
  if (!cmds.length) return res.status(400).json({ error: 'Nothing to update.' });
  try {
    await Promise.all(cmds);
    const [bt, ft, mr] = await Promise.all([
      runCmd('fail2ban-client', ['get', FAIL2BAN_JAIL, 'bantime'],  { timeout: 4000 }),
      runCmd('fail2ban-client', ['get', FAIL2BAN_JAIL, 'findtime'], { timeout: 4000 }),
      runCmd('fail2ban-client', ['get', FAIL2BAN_JAIL, 'maxretry'], { timeout: 4000 }),
    ]);
    res.json({
      jail:     FAIL2BAN_JAIL,
      bantime:  parseInt(bt.stdout.trim(),  10),
      findtime: parseInt(ft.stdout.trim(), 10),
      maxretry: parseInt(mr.stdout.trim(), 10),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Fail2Ban jail log ─────────────────────────────────────────────────────────

app.get('/api/fail2ban/jaillog', auth, (req, res) => {
  const n = Math.min(parseInt(req.query.n || '100', 10), 500);
  try {
    if (!fs.existsSync(FAIL2BAN_LOG))
      return res.json({ lines: [], error: 'Fail2Ban log file not found.' });
    const raw   = fs.readFileSync(FAIL2BAN_LOG, 'utf8');
    const lines = raw.trim().split('\n')
      .filter(l => l.includes(FAIL2BAN_JAIL))
      .slice(-n).reverse();
    res.json({ lines });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Password change ───────────────────────────────────────────────────────────

app.post('/api/auth/password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || currentPassword !== currentPortalPass)
    return res.status(403).json({ error: 'Current password is incorrect.' });
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  const settings = loadSettings();
  settings.adminPassword = newPassword;
  saveSettings(settings);
  currentPortalPass = newPassword;
  res.json({ success: true });
});

// ── System service status ─────────────────────────────────────────────────────

async function checkService(name, url, okStatuses = [200, 401]) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'manual' });
    clearTimeout(timer);
    return { name, up: okStatuses.includes(r.status), code: r.status };
  } catch (e) {
    clearTimeout(timer);
    return { name, up: false, error: e.message };
  }
}

app.get('/api/system/status', auth, async (_req, res) => {
  const [wg, ag, caddyUp] = await Promise.all([
    checkService('wg-easy',  `${WG_URL}/api/session`,    [200, 401]),
    checkService('adguard',  `${AG_URL}/control/status`, [200, 401]),
    tcpOpen(getHostIp(), 443),
  ]);
  const caddy = { name: 'caddy', up: caddyUp };
  res.json({ 'wg-easy': wg, adguard: ag, caddy, portal: { name: 'portal', up: true } });
});

// ── TLS certificate info ──────────────────────────────────────────────────────

app.get('/api/tls/cert', auth, (req, res) => {
  const tls = require('tls');
  let resolved = false;
  const done = (payload) => { if (!resolved) { resolved = true; res.json(payload); } };
  const hostIp = getHostIp();
  const sock  = tls.connect(
    { host: hostIp, port: 443, rejectUnauthorized: false, servername: hostIp },
    () => {
      try {
        const cert = sock.getPeerCertificate();
        sock.destroy();
        done({
          subject:     cert.subject?.CN || cert.subject?.O || '—',
          issuer:      cert.issuer?.CN  || cert.issuer?.O  || '—',
          validFrom:   cert.valid_from  || '—',
          validTo:     cert.valid_to    || '—',
          fingerprint: cert.fingerprint256 || cert.fingerprint || '—',
          isInternal:  (cert.issuer?.O || '').toLowerCase().includes('caddy') ||
                       (cert.issuer?.CN || '').toLowerCase().includes('local'),
        });
      } catch (e) { sock.destroy(); done({ error: e.message }); }
    },
  );
  sock.on('error', e => { sock.destroy(); done({ error: e.message }); });
  setTimeout(() => { sock.destroy(); done({ error: 'TLS connection timeout.' }); }, 3000);
});

// ── Session management ────────────────────────────────────────────────────────

app.get('/api/sessions', auth, (req, res) => {
  const sessions = [...sessionRegistry.entries()].map(([id, m]) => ({
    id,
    ip:        m.ip,
    ua:        m.ua,
    loginAt:   m.loginAt,
    lastSeen:  m.lastSeen,
    isCurrent: id === req.sessionID,
  })).sort((a, b) => b.loginAt - a.loginAt);
  res.json({ sessions });
});

app.delete('/api/sessions/:id', auth, (req, res) => {
  const id = req.params.id;
  if (id === req.sessionID) return res.status(400).json({ error: 'Cannot revoke your current session.' });
  sessionRegistry.delete(id);
  req.sessionStore.destroy(id, () => res.json({ success: true }));
});

// ── GeoIP proxy ───────────────────────────────────────────────────────────────

app.get('/api/geoip/:ip', auth, async (req, res) => {
  if (!isValidIp(req.params.ip)) return res.status(400).json({ error: 'Invalid IP.' });
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(req.params.ip)}?fields=status,country,countryCode`,
      { signal: ctrl.signal },
    );
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Docker API (Unix socket) ──────────────────────────────────────────────────

// Returns the first non-loopback IPv4 on the host (used for TLS / Caddy checks).
function getHostIp() {
  const ifaces = os.networkInterfaces();
  for (const iface of Object.values(ifaces)) {
    for (const addr of (iface || [])) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return '127.0.0.1';
}

// TCP port-open check (used for Caddy whose admin API is disabled).
function tcpOpen(host, port, timeoutMs = 2500) {
  return new Promise(resolve => {
    const net = require('net');
    const sock = net.createConnection({ host, port });
    const timer = setTimeout(() => { sock.destroy(); resolve(false); }, timeoutMs);
    sock.once('connect', () => { clearTimeout(timer); sock.destroy(); resolve(true); });
    sock.once('error',   () => { clearTimeout(timer); resolve(false); });
  });
}

function dockerApiRequest(apiPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath: DOCKER_SOCK, path: apiPath, method: 'GET' }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve([]); }
      });
    });
    req.on('error', reject);
    req.setTimeout(4000, () => { req.destroy(); reject(new Error('Docker socket timeout')); });
    req.end();
  });
}

// ── Health module ─────────────────────────────────────────────────────────────

async function getSystemMetrics() {
  // CPU usage: sample /proc/stat twice
  function readCpuTimes() {
    const line = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0];
    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + (parts[4] || 0);
    const total = parts.reduce((a, b) => a + b, 0);
    return { idle, total };
  }
  let cpuPct = 0;
  try {
    const t1 = readCpuTimes();
    await new Promise(r => setTimeout(r, 200));
    const t2 = readCpuTimes();
    const dIdle = t2.idle - t1.idle;
    const dTotal = t2.total - t1.total;
    cpuPct = dTotal > 0 ? Math.round((1 - dIdle / dTotal) * 100) : 0;
  } catch { /* /proc not available in container – fallback */ }

  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;

  // Disk usage via df
  let disk = { used: 0, total: 0, free: 0, pct: 0 };
  try {
    const { stdout } = await runCmd('df', ['-BM', '--output=size,used,avail,pcent', '/'], { timeout: 5000 });
    const row = stdout.trim().split('\n')[1].trim().split(/\s+/);
    disk = {
      total: parseInt(row[0], 10),
      used:  parseInt(row[1], 10),
      free:  parseInt(row[2], 10),
      pct:   parseInt(row[3], 10),
    };
  } catch { /* ignore */ }

  // Network RX/TX from /proc/net/dev
  let net = { rx: 0, tx: 0 };
  try {
    const devFile = fs.readFileSync('/proc/net/dev', 'utf8');
    const lines = devFile.split('\n').filter(l => l.includes(':') && !l.trim().startsWith('lo'));
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      net.rx += parseInt(parts[1], 10) || 0;
      net.tx += parseInt(parts[9], 10) || 0;
    }
  } catch { /* ignore */ }

  return {
    cpu:    { pct: cpuPct, cores: os.cpus().length },
    ram:    { total: totalMem, used: usedMem, free: freeMem, pct: Math.round(usedMem / totalMem * 100) },
    disk,
    swap:   {},
    uptime: Math.round(os.uptime()),
    loadavg: os.loadavg(),
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    net,
  };
}

app.get('/api/health', auth, async (_req, res) => {
  try {
    const metrics = await getSystemMetrics();
    res.json(metrics);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health/services', auth, async (_req, res) => {
  try {
    const [wg, ag, caddyUp] = await Promise.all([
      checkService('wg-easy',  `${WG_URL}/api/session`,    [200, 401]),
      checkService('adguard',  `${AG_URL}/control/status`, [200, 401]),
      tcpOpen(getHostIp(), 443),
    ]);
    const caddy = { name: 'caddy', up: caddyUp };

    // Docker containers via socket
    let containers = [];
    try {
      const raw = await dockerApiRequest('/containers/json?all=true');
      containers = (raw || []).map(c => ({
        name:    (c.Names || [])[0]?.replace(/^\//, '') || 'unknown',
        image:   c.Image,
        status:  c.State,
        state:   c.Status,
        ports:   (c.Ports || []).map(p => p.PublicPort).filter(Boolean),
      }));
    } catch { /* Docker socket not available */ }

    res.json({
      services:   { 'wg-easy': wg, adguard: ag, caddy, portal: { name: 'portal', up: true } },
      containers,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Security module ───────────────────────────────────────────────────────────

let securityCache = null;
let securityCacheAt = 0;
const SECURITY_CACHE_TTL = 5 * 60 * 1000; // 5 min

function parseSshConfig(configPath) {
  const result = {};
  // Check drop-in dir first
  const dropin = configPath + '.d';
  const readConfig = (p) => {
    try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
  };
  let content = readConfig(configPath);
  if (fs.existsSync(dropin)) {
    try {
      for (const f of fs.readdirSync(dropin).filter(f => f.endsWith('.conf'))) {
        content += '\n' + readConfig(path.join(dropin, f));
      }
    } catch { /* ignore */ }
  }
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z]+)\s+(.+)/);
    if (m) result[m[1].toLowerCase()] = m[2].trim();
  }
  return result;
}

async function computeSecurityScore() {
  const checks = [];

  function check(id, label, pts, status, note = '') {
    checks.push({ id, label, pts, status, note });
    return status === 'pass' ? pts : 0;
  }

  let score = 0;

  // SSH checks
  const sshCfg = parseSshConfig(SSH_CONFIG_PATH);
  const rootLogin = (sshCfg['permitrootlogin'] || 'yes').toLowerCase();
  score += check('ssh_root', 'SSH root login restricted', 10,
    (rootLogin === 'no' || rootLogin === 'prohibit-password') ? 'pass' : 'fail',
    `PermitRootLogin: ${sshCfg['permitrootlogin'] || 'yes (default)'}`);

  const pwAuth = (sshCfg['passwordauthentication'] || 'yes').toLowerCase();
  score += check('ssh_password', 'SSH password auth disabled', 10,
    pwAuth === 'no' ? 'pass' : 'fail',
    `PasswordAuthentication: ${sshCfg['passwordauthentication'] || 'yes (default)'}`);

  // UFW
  let ufwActive = false;
  try {
    const ufwConf = fs.readFileSync(UFW_CONF_PATH, 'utf8');
    ufwActive = /ENABLED=yes/i.test(ufwConf);
  } catch { /* ufw.conf not mounted */ }
  score += check('ufw', 'Firewall (UFW) active', 15, ufwActive ? 'pass' : 'fail');

  // Fail2Ban
  let f2bActive = false;
  try {
    await runCmd('fail2ban-client', ['ping'], { timeout: 4000 });
    f2bActive = true;
  } catch { /* not active */ }
  score += check('fail2ban', 'Fail2Ban active', 15, f2bActive ? 'pass' : 'fail');

  // TLS / HTTPS
  let tlsPts = 0;
  let certDaysLeft = null;
  let certIsInternal = false;
  try {
    const tls = require('tls');
    await new Promise((resolve, reject) => {
      const hostIp = getHostIp();
      const sock = tls.connect({ host: hostIp, port: 443, rejectUnauthorized: false, servername: hostIp }, () => {
        const cert = sock.getPeerCertificate();
        sock.destroy();
        if (cert.valid_to) {
          certDaysLeft = Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000);
          tlsPts = 15;
          // Caddy-managed internal certs are auto-renewed; mark as internal
          const issuerO = (cert.issuer?.O || '').toLowerCase();
          const issuerCN = (cert.issuer?.CN || '').toLowerCase();
          certIsInternal = issuerO.includes('caddy') || issuerCN.includes('local') ||
                           issuerCN.includes('caddy');
        }
        resolve();
      });
      sock.on('error', reject);
      setTimeout(() => { sock.destroy(); reject(new Error('timeout')); }, 3000);
    });
  } catch { /* no TLS */ }
  score += check('tls', 'HTTPS active', 15, tlsPts > 0 ? 'pass' : 'fail');
  if (certDaysLeft !== null) {
    if (certIsInternal) {
      // Internal CA certs are short-lived but auto-renewed by Caddy — not a concern
      score += check('cert_expiry', 'Certificate (managed by Caddy)', 5, 'pass');
    } else {
      score += check('cert_expiry', `Certificate valid (${certDaysLeft} days left)`, 5,
        certDaysLeft > ALERT_CERT_EXPIRY_DAYS ? 'pass' : 'fail');
    }
  } else {
    check('cert_expiry', 'Certificate expiry check', 5, 'warn', 'HTTPS not active');
  }

  // Reboot required
  const rebootRequired = fs.existsSync('/var/run/reboot-required');
  score += check('reboot', 'No reboot required', 5, rebootRequired ? 'fail' : 'pass');

  // Auto-updates
  let autoUpdates = false;
  try {
    const auContent = fs.readFileSync('/etc/apt/apt.conf.d/20auto-upgrades', 'utf8');
    autoUpdates = /Unattended-Upgrade\s+"1"/i.test(auContent);
  } catch { /* not available */ }
  score += check('auto_updates', 'Automatic security updates enabled', 10,
    autoUpdates ? 'pass' : (fs.existsSync('/etc/apt/apt.conf.d/20auto-upgrades') ? 'fail' : 'warn'),
    autoUpdates ? '' : 'Install unattended-upgrades to enable');

  // Admin portal exposure
  const portalBoundLocally = (process.env.PORTAL_HOST || '127.0.0.1') === '127.0.0.1';
  score += check('portal_exposure', 'Admin portal bound to localhost', 15,
    portalBoundLocally ? 'pass' : 'fail',
    `PORTAL_HOST=${process.env.PORTAL_HOST || '127.0.0.1'}`);

  const maxScore = checks.reduce((s, c) => s + (c.status !== 'warn' ? c.pts : 0), 0);
  const pct = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;
  let grade;
  if (pct >= 90) grade = 'strong';
  else if (pct >= 70) grade = 'good';
  else if (pct >= 50) grade = 'needs_attention';
  else grade = 'risky';

  return { score, maxScore, pct, grade, checks, scannedAt: Date.now() };
}

app.get('/api/security', auth, async (_req, res) => {
  try {
    if (!securityCache || (Date.now() - securityCacheAt) > SECURITY_CACHE_TTL) {
      securityCache = await computeSecurityScore();
      securityCacheAt = Date.now();
    }
    res.json(securityCache);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/security/rescan', auth, async (_req, res) => {
  try {
    securityCache = await computeSecurityScore();
    securityCacheAt = Date.now();
    res.json(securityCache);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Backup module ─────────────────────────────────────────────────────────────

function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => /^easy-wg-combo-backup-.+\.(tar\.gz|tar\.gz\.age)$/.test(f))
      .sort()
      .reverse()
      .map(f => {
        const fullPath = path.join(BACKUP_DIR, f);
        const stat = fs.statSync(fullPath);
        return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
      });
  } catch { return []; }
}

function assertSafeBackupFilename(filename) {
  if (!/^easy-wg-combo-backup-.+\.(tar\.gz|tar\.gz\.age)$/.test(filename)) {
    throw new Error('Invalid backup filename.');
  }
  if (filename.includes('/') || filename.includes('..')) {
    throw new Error('Invalid backup filename.');
  }
}

async function createBackupArchive(encrypt = false) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archiveName = `easy-wg-combo-backup-${timestamp}.tar.gz`;
  const archivePath = path.join(BACKUP_DIR, archiveName);

  const stage = fs.mkdtempSync('/tmp/ewg-backup-');
  try {
    // Manifest
    const manifest = {
      project: 'Easy-WG-Combo',
      backup_version: '1',
      created_at: new Date().toISOString(),
      hostname: os.hostname(),
      os: os.type() + ' ' + os.release(),
      components: {
        wg_easy:     fs.existsSync(path.join(BACKUP_SRC_DIR, 'wireguard')),
        adguard_home: fs.existsSync(path.join(BACKUP_SRC_DIR, 'adguard')),
        caddy:       fs.existsSync(path.join(BACKUP_SRC_DIR, 'caddy')),
        fail2ban:    true,
        portal:      true,
      },
    };
    fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Copy from mounted backup source
    const copyDir = (src, dst) => {
      if (!fs.existsSync(src)) return;
      fs.mkdirSync(dst, { recursive: true });
      for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (entry.name.endsWith('.log')) continue;
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else fs.copyFileSync(s, d);
      }
    };

    for (const d of ['wireguard', 'adguard', 'caddy']) {
      const srcDir = path.join(BACKUP_SRC_DIR, d);
      if (fs.existsSync(srcDir)) copyDir(srcDir, path.join(stage, d));
    }
    // Remove AdGuard work dir (large, not needed)
    try { fs.rmSync(path.join(stage, 'adguard', 'work'), { recursive: true }); } catch { /* ok */ }

    for (const f of ['.env', '.env.secrets', 'docker-compose.yml']) {
      const srcFile = path.join(BACKUP_SRC_DIR, f);
      if (fs.existsSync(srcFile)) fs.copyFileSync(srcFile, path.join(stage, f));
    }

    // Portal data
    const dataSrc = '/data';
    if (fs.existsSync(dataSrc)) copyDir(dataSrc, path.join(stage, 'portal', 'data'));

    await runCmd('tar', ['-czf', archivePath, '-C', stage, '.'], { timeout: 60000 });
    fs.chmodSync(archivePath, 0o600);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }

  if (encrypt) {
    // age encryption not available in container by default; skip gracefully
    throw new Error('Encryption via age is not available in the portal. Use ./easywg backup --encrypt from the host CLI.');
  }

  // Rotate old backups
  const backups = listBackups();
  if (backups.length > BACKUP_KEEP) {
    for (const old of backups.slice(BACKUP_KEEP)) {
      try { fs.unlinkSync(path.join(BACKUP_DIR, old.filename)); } catch { /* ignore */ }
    }
  }

  // Fire notification
  sendNotification('backup_success', { filename: archiveName }).catch(() => {});
  return archiveName;
}

app.get('/api/backup', auth, (_req, res) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    res.json({ backups: listBackups() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/backup/create', auth, async (req, res) => {
  const encrypt = req.body.encrypt === true;
  try {
    const filename = await createBackupArchive(encrypt);
    res.json({ success: true, filename, backups: listBackups() });
  } catch (e) {
    sendNotification('backup_failure', { error: e.message }).catch(() => {});
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/backup/download/:filename', auth, (req, res) => {
  try {
    assertSafeBackupFilename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found.' });
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    res.setHeader('Content-Type', 'application/gzip');
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/backup/restore', auth, async (req, res) => {
  const { filename, dryRun, confirmed } = req.body;
  try {
    assertSafeBackupFilename(filename);
  } catch (e) { return res.status(400).json({ error: e.message }); }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found.' });

  if (filename.endsWith('.age')) {
    return res.status(422).json({ error: 'Encrypted backups must be restored from the CLI: ./easywg restore <file>' });
  }

  // Validate archive
  try {
    await runCmd('tar', ['-tzf', filePath], { timeout: 15000 });
  } catch { return res.status(422).json({ error: 'Archive validation failed — file may be corrupt.' }); }

  // Check manifest
  let manifest = {};
  try {
    const { stdout } = await runCmd('tar', ['-xOf', filePath, 'manifest.json'], { timeout: 10000 });
    manifest = JSON.parse(stdout);
  } catch { return res.status(422).json({ error: 'Backup is missing manifest.json — cannot verify compatibility.' }); }

  if (dryRun) {
    const { stdout: listing } = await runCmd('tar', ['-tzf', filePath], { timeout: 10000 });
    return res.json({
      dryRun: true,
      manifest,
      files: listing.trim().split('\n').slice(0, 50),
    });
  }

  if (!confirmed) {
    return res.status(400).json({ error: 'Restore requires confirmed=true in the request body.' });
  }

  // Create pre-restore backup
  let preRestoreFile = null;
  try {
    preRestoreFile = await createBackupArchive(false);
  } catch { /* non-fatal */ }

  // Restore
  const stage = fs.mkdtempSync('/tmp/ewg-restore-');
  try {
    await runCmd('tar', ['-xzf', filePath, '-C', stage], { timeout: 60000 });

    const restoreDir = (src, dst) => {
      if (!fs.existsSync(src)) return;
      fs.rmSync(dst, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.cpSync(src, dst, { recursive: true });
    };

    for (const d of ['wireguard', 'adguard', 'caddy']) {
      const srcDir = path.join(stage, d);
      if (fs.existsSync(srcDir)) restoreDir(srcDir, path.join(BACKUP_SRC_DIR, d));
    }
    for (const f of ['.env', 'docker-compose.yml']) {
      const srcFile = path.join(stage, f);
      if (fs.existsSync(srcFile)) fs.copyFileSync(srcFile, path.join(BACKUP_SRC_DIR, f));
    }
    const portalData = path.join(stage, 'portal', 'data');
    if (fs.existsSync(portalData)) restoreDir(portalData, '/data');

    sendNotification('restore_success', { filename }).catch(() => {});
    res.json({ success: true, manifest, preRestoreFile });
  } catch (e) {
    sendNotification('restore_failure', { filename, error: e.message }).catch(() => {});
    res.status(500).json({ error: `Restore failed: ${e.message}` });
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
});

app.delete('/api/backup/:filename', auth, (req, res) => {
  try {
    assertSafeBackupFilename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found.' });
    fs.unlinkSync(filePath);
    res.json({ success: true, backups: listBackups() });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Notification module ───────────────────────────────────────────────────────

const NOTIF_DEFAULTS = {
  enabled: false,
  channels: {
    email:   { enabled: false, smtp_host: '', smtp_port: 587, from: '', to: '', username: '', password: '' },
    webhook: { enabled: false, url: '' },
  },
  alerts: {
    disk_usage_threshold:    ALERT_DISK_THRESHOLD,
    certificate_expiry_days: ALERT_CERT_EXPIRY_DAYS,
  },
};

function loadNotifConfig() {
  try {
    const saved = JSON.parse(fs.readFileSync(NOTIF_FILE, 'utf8'));
    // Deep-merge saved over defaults so newly added keys always appear
    return {
      ...NOTIF_DEFAULTS, ...saved,
      channels: {
        email:   { ...NOTIF_DEFAULTS.channels.email,   ...(saved.channels?.email   || {}) },
        webhook: { ...NOTIF_DEFAULTS.channels.webhook, ...(saved.channels?.webhook || {}) },
      },
      alerts: { ...NOTIF_DEFAULTS.alerts, ...(saved.alerts || {}) },
    };
  }
  catch { return NOTIF_DEFAULTS; }
}

function saveNotifConfig(cfg) {
  fs.writeFileSync(NOTIF_FILE, JSON.stringify(cfg, null, 2));
}

function maskSecrets(cfg) {
  const m = JSON.parse(JSON.stringify(cfg));
  if (m.channels?.email?.password)     m.channels.email.password     = '***';
  if (m.channels?.webhook?.url)        m.channels.webhook.url        = '***';
  if (m.channels?.webhook?.token)      m.channels.webhook.token      = '***';
  return m;
}

async function sendEmailNotif(subject, body) {
  let nodemailer;
  try { nodemailer = require('nodemailer'); } catch { throw new Error('nodemailer not installed'); }
  const cfg = loadNotifConfig();
  const ec = cfg.channels?.email || {};
  if (!ec.enabled || !ec.smtp_host || !ec.to) throw new Error('Email not configured');
  const transporter = nodemailer.createTransporter({
    host: ec.smtp_host,
    port: ec.smtp_port || 587,
    secure: (ec.smtp_port || 587) === 465,
    auth: ec.username ? { user: ec.username, pass: ec.password } : undefined,
  });
  await transporter.sendMail({
    from: ec.from || ec.username,
    to:   ec.to,
    subject: `[Easy-WG-Combo] ${subject}`,
    text: body,
  });
}

async function sendWebhookNotif(message) {
  const cfg = loadNotifConfig();
  const wc = cfg.channels?.webhook || {};
  if (!wc.enabled || !wc.url) throw new Error('Webhook not configured');
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 8000);
  await fetch(wc.url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text: message, hostname: os.hostname() }),
    signal:  ctrl.signal,
  });
}

async function sendNotification(event, details = {}) {
  const cfg = loadNotifConfig();
  if (!cfg.enabled) return;

  const message = `[${os.hostname()}] ${event}: ${JSON.stringify(details)}`;
  const results = [];

  try { await sendEmailNotif(event, message); results.push({ channel: 'email', ok: true }); }
  catch (e) { results.push({ channel: 'email', ok: false, error: e.message }); }

  try { await sendWebhookNotif(message); results.push({ channel: 'webhook', ok: true }); }
  catch (e) { results.push({ channel: 'webhook', ok: false, error: e.message }); }

  // Log to history
  try {
    let hist = [];
    try { hist = JSON.parse(fs.readFileSync(NOTIF_HIST_FILE, 'utf8')); } catch { /* ok */ }
    hist.unshift({ event, details, results, sentAt: new Date().toISOString() });
    fs.writeFileSync(NOTIF_HIST_FILE, JSON.stringify(hist.slice(0, 100), null, 2));
  } catch { /* non-fatal */ }
}

async function checkAlerts() {
  // Disk threshold
  try {
    const { stdout } = await runCmd('df', ['--output=pcent', '/'], { timeout: 5000 });
    const pct = parseInt(stdout.trim().split('\n')[1], 10);
    if (!isNaN(pct) && pct >= ALERT_DISK_THRESHOLD) {
      await sendNotification('disk_usage_alert', { pct, threshold: ALERT_DISK_THRESHOLD });
    }
  } catch { /* ignore */ }

  // Cert expiry
  if (securityCache?.checks) {
    const certCheck = securityCache.checks.find(c => c.id === 'cert_expiry');
    if (certCheck?.status === 'fail') {
      await sendNotification('certificate_expiring', { check: certCheck.note });
    }
  }

  // Services down
  try {
    const [wg, ag, caddyUp] = await Promise.all([
      checkService('wg-easy', `${WG_URL}/api/session`, [200, 401]),
      checkService('adguard', `${AG_URL}/control/status`, [200, 401]),
      tcpOpen(getHostIp(), 443),
    ]);
    const caddy = { name: 'caddy', up: caddyUp };
    for (const svc of [wg, ag, caddy]) {
      if (!svc.up) await sendNotification('service_down', { service: svc.name });
    }
  } catch { /* ignore */ }
}

app.get('/api/notifications/config', auth, (_req, res) => {
  res.json(maskSecrets(loadNotifConfig()));
});

app.post('/api/notifications/config', auth, (req, res) => {
  const existing = loadNotifConfig();
  const incoming = req.body;

  // Merge: never overwrite secret fields with '***'
  const merge = (dst, src) => {
    if (!src || typeof src !== 'object') return dst;
    const result = { ...dst };
    for (const [k, v] of Object.entries(src)) {
      if (v === '***') continue; // client didn't change this secret
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        result[k] = merge(dst[k] || {}, v);
      } else {
        result[k] = v;
      }
    }
    return result;
  };

  const merged = merge(existing, incoming);
  saveNotifConfig(merged);
  res.json(maskSecrets(merged));
});

app.post('/api/notifications/test', auth, async (_req, res) => {
  const results = [];
  try {
    await sendEmailNotif('Test notification', `Test from Easy-WG-Combo on ${os.hostname()}`);
    results.push({ channel: 'email', ok: true });
  } catch (e) { results.push({ channel: 'email', ok: false, error: e.message }); }

  try {
    await sendWebhookNotif(`Test from Easy-WG-Combo on ${os.hostname()}`);
    results.push({ channel: 'webhook', ok: true });
  } catch (e) { results.push({ channel: 'webhook', ok: false, error: e.message }); }

  // Log
  try {
    let hist = [];
    try { hist = JSON.parse(fs.readFileSync(NOTIF_HIST_FILE, 'utf8')); } catch { /* ok */ }
    hist.unshift({ event: 'test', results, sentAt: new Date().toISOString() });
    fs.writeFileSync(NOTIF_HIST_FILE, JSON.stringify(hist.slice(0, 100), null, 2));
  } catch { /* non-fatal */ }

  res.json({ results });
});

app.get('/api/notifications/history', auth, (_req, res) => {
  try {
    const hist = JSON.parse(fs.readFileSync(NOTIF_HIST_FILE, 'utf8'));
    res.json({ history: hist.slice(0, 50) });
  } catch { res.json({ history: [] }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, HOST, () => console.log(`Portal listening on ${HOST}:${PORT}`));
