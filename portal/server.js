'use strict';

const express    = require('express');
const session    = require('express-session');
const QRCode     = require('qrcode');
const fs         = require('fs');
const path       = require('path');

const app  = express();
const PORT = parseInt(process.env.PORTAL_PORT  || '8080', 10);

const WG_URL       = process.env.WG_EASY_URL   || 'http://127.0.0.1:51821';
const AG_URL       = process.env.ADGUARD_URL   || 'http://127.0.0.1:3000';
const WG_PASSWORD  = process.env.WG_EASY_PASSWORD  || process.env.ADMIN_PASSWORD || 'changeme';
const AG_USER      = process.env.ADGUARD_USER      || 'admin';
const AG_PASSWORD  = process.env.ADGUARD_PASSWORD  || process.env.ADMIN_PASSWORD || 'changeme';
const PORTAL_PASS  = process.env.ADMIN_PASSWORD    || 'changeme';

const WG_EXT_PORT  = process.env.WG_EASY_EXTERNAL_PORT  || '51821';
const AG_EXT_PORT  = process.env.ADGUARD_EXTERNAL_PORT  || '3000';

const DATA_FILE = '/data/client-dns.json';

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

// ── Express setup ────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret:            process.env.SESSION_SECRET || PORTAL_PASS + '_sess',
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 24 * 60 * 60 * 1000 },
}));

const auth = (req, res, next) => req.session.ok ? next() : res.status(401).json({ error: 'Unauthorized' });

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
  wgEasyPort:  WG_EXT_PORT,
  adguardPort: AG_EXT_PORT,
}));

// ── WireGuard clients ─────────────────────────────────────────────────────────

app.get('/api/clients', auth, async (_req, res) => {
  try {
    const r       = await wgFetch('/api/wireguard/client');
    const clients = await r.json();
    const store   = loadStore();
    const enriched = clients.map(c => ({
      ...c,
      dnsPreset: store[c.id]?.preset || null,
      dns:       store[c.id]?.dns    || null,
    }));
    res.json(enriched);
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

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => console.log(`Portal listening on :${PORT}`));
