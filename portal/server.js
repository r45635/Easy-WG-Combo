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
const { randomUUID, randomBytes, createHash, timingSafeEqual } = require('crypto');
const netGuards = require('./lib/net-guards');

const app  = express();
const PORT = parseInt(process.env.PORTAL_PORT  || '8080', 10);
const HOST = process.env.PORTAL_HOST || '127.0.0.1';

// State/config roots. Overridable so tests can point them at a temp dir; the
// defaults are the container bind-mount paths and unchanged in production.
const DATA_DIR      = process.env.PORTAL_DATA_DIR     || '/data';
const CADDY_DIR     = process.env.PORTAL_CADDY_DIR    || '/app-caddy';
const FILEDROP_ROOT = process.env.PORTAL_FILEDROP_DIR || '/filedrop';

const WG_URL       = process.env.WG_EASY_URL   || 'http://127.0.0.1:51821';
const AG_URL       = process.env.ADGUARD_URL   || 'http://127.0.0.1:3000';
const WG_PASSWORD  = process.env.WG_EASY_PASSWORD  || process.env.ADMIN_PASSWORD || '';
const AG_USER      = process.env.ADGUARD_USER      || 'admin';
const AG_PASSWORD  = process.env.ADGUARD_PASSWORD  || process.env.ADMIN_PASSWORD || '';
const PORTAL_PASS  = process.env.ADMIN_PASSWORD    || '';
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
const NOTIF_FILE       = path.join(DATA_DIR, 'notifications.json');
const NOTIF_HIST_FILE  = path.join(DATA_DIR, 'notifications-history.json');
const ALERT_DISK_THRESHOLD  = parseInt(process.env.ALERT_DISK_THRESHOLD  || '85',  10);
const ALERT_CERT_EXPIRY_DAYS = parseInt(process.env.ALERT_CERT_EXPIRY_DAYS || '14', 10);
const runCmd = promisify(execFile);

// ── Xray VLESS+Reality ────────────────────────────────────────────────────────
const XRAY_ENABLED    = (process.env.XRAY_ENABLED || 'no').toLowerCase() === 'yes';
const XRAY_UUID       = process.env.XRAY_UUID       || '';
const XRAY_PUBLIC_KEY = process.env.XRAY_PUBLIC_KEY || '';
const XRAY_SHORT_ID   = process.env.XRAY_SHORT_ID   || '';
const XRAY_SNI_TARGET = process.env.XRAY_SNI_TARGET || 'www.cloudflare.com';
const XRAY_PORT       = parseInt(process.env.XRAY_PORT || '443', 10);
const XRAY_CONFIG_PATH = '/xray-config/config.json';

// ── Phase 2: constants ─────────────────────────────────────────────────────────

const DEVICES_FILE        = path.join(DATA_DIR, 'devices.json');
const DNS_PROFILES_FILE   = path.join(DATA_DIR, 'dns-profiles.json');
const PROXY_SERVICES_FILE = path.join(DATA_DIR, 'proxy-services.json');
const CADDY_SERVICES_FILE = path.join(CADDY_DIR, 'easywg-services.caddy');
const CADDY_FILE          = path.join(CADDY_DIR, 'Caddyfile');
const VPN_DNS_IP          = process.env.WG_DEFAULT_DNS || '10.8.0.1';
const VPN_SUBNET          = (() => { const p = VPN_DNS_IP.split('.'); p[3] = '0'; return p.join('.') + '/24'; })();

const ROUTING_MODES_DEF = {
  full_tunnel:    { id: 'full_tunnel',    name: 'Full Tunnel',         allowedIps: ['0.0.0.0/0', '::/0'], description: 'All device traffic routes through the VPS.' },
  dns_only:       { id: 'dns_only',       name: 'DNS Filtering Only',  allowedIps: [],                    description: 'Only DNS queries route through the VPN. Experimental.', experimental: true },
  private_access: { id: 'private_access', name: 'Private Access Only', allowedIps: [],                    description: 'Access VPN-only services only. Normal browsing is unaffected.' },
  custom:         { id: 'custom',         name: 'Custom Split-Tunnel',  allowedIps: [],                    description: 'Specify exactly which CIDRs go through the VPN.' },
};
ROUTING_MODES_DEF.dns_only.allowedIps       = [`${VPN_DNS_IP}/32`];
ROUTING_MODES_DEF.private_access.allowedIps = [VPN_SUBNET];

const BUILTIN_DNS_PROFILES = {
  default_filtered: { id: 'default_filtered', name: 'Default Filtered', type: 'managed', adguardPolicy: 'default_filtered', dnsIp: VPN_DNS_IP,        description: 'Block ads, trackers, malware and phishing.' },
  malware_only:     { id: 'malware_only',     name: 'Malware Only',      type: 'managed', adguardPolicy: 'malware_only',     dnsIp: VPN_DNS_IP,        description: 'Block malware and phishing (Cloudflare for Families).' },
  family_safe:      { id: 'family_safe',      name: 'Family Safe',       type: 'managed', adguardPolicy: 'family_safe',      dnsIp: VPN_DNS_IP,        description: 'Block malware, phishing, adult content and gambling.' },
  strict:           { id: 'strict',           name: 'Strict',            type: 'managed', adguardPolicy: 'strict',           dnsIp: VPN_DNS_IP,        description: 'Block ads, trackers, malware, adult content and social media.' },
  unfiltered:       { id: 'unfiltered',       name: 'Unfiltered',        type: 'managed', adguardPolicy: 'unfiltered',       dnsIp: '1.1.1.1, 8.8.8.8', description: 'No filtering, direct DNS via 1.1.1.1.' },
};

const DNS_PRESETS = [
  { id: 'filtered', label: 'Filtré complet',    value: '10.8.0.1' },
  { id: 'malware',  label: 'Malware seulement', value: '1.1.1.2, 1.0.0.2' },
  { id: 'none',     label: 'Sans filtre',        value: '1.1.1.1, 8.8.8.8' },
];

function dnsToPreset(dns) {
  return DNS_PRESETS.find(p => p.value === dns?.trim()) || { id: 'custom', label: dns || '—' };
}

const DATA_FILE = path.join(DATA_DIR, 'client-dns.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'portal-config.json');

const VALID_INTERFACE_MODES = ['user', 'super_user', 'advanced'];
const DEFAULT_INTERFACE_MODE = 'super_user';

const UI_CAPABILITIES = {
  user: {
    modules: ['dashboard', 'devices', 'dns_basic', 'settings'],
    actions: {
      createDevice: true, deleteDevice: true, assignBasicDns: true,
      viewQrCode: true, downloadConfig: true,
      createBackup: false, guidedRestore: false, restoreBackup: false,
      configureNotifications: false, viewSecurityScore: false,
      publicGateway: false, fileDropPublic: false, appsLifecycle: false,
      rawLogs: false, advancedSecurity: false,
    },
  },
  super_user: {
    modules: ['dashboard', 'devices', 'dns_profiles', 'backups',
              'monitoring', 'notifications', 'security', 'settings'],
    actions: {
      createDevice: true, deleteDevice: true, assignDnsProfile: true,
      temporaryDnsBypass: true, createBackup: true, guidedRestore: true,
      restoreBackup: true, configureNotifications: true,
      viewSecurityScore: true, viewMonitoring: true,
      publicGateway: false, fileDropPublic: false, appsLifecycle: false,
      rawLogs: false, advancedSecurity: false,
    },
  },
  advanced: {
    modules: ['dashboard', 'devices', 'clients', 'wireguard', 'adguard',
              'dns_profiles', 'gateway', 'monitoring', 'apps', 'filedrop',
              'migration', 'security', 'backups', 'notifications', 'xray', 'settings'],
    actions: { all: true },
  },
};

function sanitizeServerName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    || 'vpn-server';
}

function isValidServerName(value) {
  return /^[A-Za-z0-9._-]+$/.test(String(value || ''));
}

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

function updateHostEnvValue(key, value) {
  const envPath = '/backup-src/.env';
  if (!fs.existsSync(envPath)) return;
  let content = fs.readFileSync(envPath, 'utf8');
  const re = new RegExp(`^${key}=.*`, 'm');
  const line = `${key}=${value}`;
  content = re.test(content) ? content.replace(re, line) : content + `\n${line}\n`;
  fs.writeFileSync(envPath, content);
}

function readEnvValue(key) {
  try {
    const content = fs.readFileSync('/backup-src/.env', 'utf8');
    const m = content.match(new RegExp(`^${key}=(.*)`, 'm'));
    return m ? m[1].trim() : '';
  } catch { return ''; }
}

// Keep this in sync with configure_caddy() in bootstrap.sh — the two generators must
// produce the same Caddyfile. A public (Let's Encrypt) cert needs a real FQDN + email;
// otherwise Caddy falls back to a self-signed internal cert.
function generateMainCaddyfile(adminDomain, tlsEmail, domainPointsHere = true) {
  const caddyHttpsPort = process.env.CADDY_HTTPS_PORT || '';
  const publicHttps = String(process.env.PUBLIC_HTTPS_ENABLED || 'no').toLowerCase() === 'yes';
  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(adminDomain);
  const usePublicTls = !!adminDomain && !!tlsEmail && !isIp && domainPointsHere;

  let out = '{\n';
  if (publicHttps && usePublicTls) out += `  email ${tlsEmail}\n`;
  out += '  admin localhost:2019\n';
  out += '}\n\n';

  if (caddyHttpsPort) {
    // Xray mode: 443 is held by Xray, so the portal is served on caddyHttpsPort.
    if (!publicHttps) {
      // Local-only: bind to loopback (SSH-tunnel access), self-signed. Must stay
      // in phase with bootstrap.sh configure_caddy — do not re-publish here.
      out += `127.0.0.1:${caddyHttpsPort} {\n`;
      out += '  tls internal\n';
    } else if (usePublicTls) {
      // Real Let's Encrypt cert. Xray owns :443 so TLS-ALPN-01 is impossible —
      // force HTTP-01 (served by Caddy on :80). Requires port 80 open in UFW.
      out += `${adminDomain || ':'}:${caddyHttpsPort} {\n`;
      out += '  tls {\n';
      out += '    issuer acme {\n';
      out += `      email ${tlsEmail}\n`;
      out += '      disable_tlsalpn_challenge\n';
      out += '    }\n';
      out += '  }\n';
    } else {
      out += `${adminDomain || ':'}:${caddyHttpsPort} {\n`;
      out += '  tls internal\n';
    }
  } else {
    const binding = adminDomain || ':443';
    out += `${binding} {\n`;
    if (isIp || binding === ':443' || !tlsEmail) out += '  tls internal\n';
  }

  out += '  encode zstd gzip\n';
  out += '  log {\n';
  out += '    output file /var/log/easy-wg-portal/access.log\n';
  out += '    format json\n';
  out += '  }\n';
  out += `  reverse_proxy 127.0.0.1:${PORT}\n`;
  out += '  header {\n';
  out += '    Strict-Transport-Security "max-age=31536000; includeSubDomains"\n';
  out += '    X-Content-Type-Options "nosniff"\n';
  out += '    Referrer-Policy "same-origin"\n';
  out += '  }\n';
  out += '}\n\n';
  out += 'import /etc/caddy/easywg-services.caddy\n';
  return out;
}

// This VPS's public IPv4, used to check that a Server Endpoint FQDN actually points here
// before attempting a public cert. Prefers WG_HOST when it is already an IP (no network
// call); otherwise asks an echo service. Returns '' if it cannot be determined (callers
// then default to allowing ACME rather than blocking on our own inability to check).
async function getPublicIp() {
  const wgHost = readEnvValue('WG_HOST') || process.env.WG_HOST || '';
  if (/^\d+\.\d+\.\d+\.\d+$/.test(wgHost)) return wgHost;
  for (const url of ['https://api.ipify.org', 'https://ifconfig.me/ip']) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const ip = (await r.text()).trim();
        if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
      }
    } catch { /* try next source */ }
  }
  return '';
}

// Best-effort: open port 80 so Caddy can complete the Let's Encrypt HTTP-01 challenge
// (used in Xray mode, where Xray owns :443 and TLS-ALPN-01 is impossible). Requires the
// portal to have NET_ADMIN + writable /etc/ufw (see docker-compose.yml). Resolves to
// true on success, false otherwise — the caller surfaces a manual-fallback hint on false.
function openHttpChallengePort() {
  return new Promise((resolve) => {
    execFile('ufw', ['allow', '80/tcp'], (err, _stdout, stderr) => {
      if (err) { console.error('ufw allow 80/tcp failed:', (stderr || err.message || '').trim()); resolve(false); }
      else resolve(true);
    });
  });
}

let currentPortalPass = loadSettings().adminPassword || PORTAL_PASS;

// Fail closed: never serve with a missing or well-known default credential.
// Empty ADMIN_PASSWORD used to fall back to 'changeme', so a bare
// `docker compose up` (or an empty .env) booted a publicly reachable admin
// portal with a known password. Refuse to start instead.
if (!currentPortalPass || currentPortalPass === 'changeme') {
  console.error(
    'FATAL: no admin password set. The portal will not start.\n' +
    '       Set ADMIN_PASSWORD in .env (min 16 chars recommended) and use\n' +
    '       ./compose.sh, or run ./install.sh / ./bootstrap.sh which set it for you.'
  );
  process.exit(1);
}

function getServerName() {
  return loadSettings().serverName || sanitizeServerName(DEFAULT_SERVER_NAME);
}

function setServerName(serverName) {
  const settings = loadSettings();
  settings.serverName = serverName;
  saveSettings(settings);
}

function getInterfaceMode() {
  const mode = loadSettings().interfaceMode;
  return VALID_INTERFACE_MODES.includes(mode) ? mode : DEFAULT_INTERFACE_MODE;
}

function setInterfaceMode(mode) {
  if (!VALID_INTERFACE_MODES.includes(mode)) throw new Error('Invalid interface mode');
  const settings = loadSettings();
  settings.interfaceMode = mode;
  saveSettings(settings);
}

function requiresAction(action) {
  return (req, res, next) => {
    const caps = UI_CAPABILITIES[getInterfaceMode()];
    if (caps.actions?.all || caps.actions?.[action]) return next();
    res.status(403).json({ error: `Action '${action}' not allowed in current interface mode.` });
  };
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

// Delegates to the trust-proxy-aware helper. The old hand-rolled version
// trusted client-supplied X-Real-IP / X-Forwarded-For before the socket, which
// let any request spoof its source address. With trust proxy = 'loopback',
// XFF is only honored from a loopback peer (Caddy / SSH tunnel).
function clientIp(req) {
  return netGuards.trustedClientIp(req) || 'unknown';
}

async function fail2banStatus() {
  const { stdout } = await runCmd('fail2ban-client', ['status', FAIL2BAN_JAIL], { timeout: 4000 });
  return parseFail2banStatus(stdout);
}

// ── Express setup ────────────────────────────────────────────────────────────

app.use(express.json());
// Express 5 / body-parser 2 leave req.body undefined when no JSON body was
// parsed (Express 4 gave {}); handlers destructure req.body unguarded.
app.use((req, _res, next) => { req.body ??= {}; next(); });
app.use(express.static(path.join(__dirname, 'public')));
// Behind Caddy (TLS) X-Forwarded-Proto marks the connection secure; direct
// SSH-tunnel access stays plain HTTP and must still receive the cookie.
// 'loopback' (not 1): trust X-Forwarded-* only when the socket peer is
// loopback — i.e. Caddy (reverse-proxies from 127.0.0.1) or an SSH tunnel.
// A remote client can no longer forge XFF to spoof its source IP.
app.set('trust proxy', 'loopback');
app.use(session({
  name:              'portal.sid',
  // Random per-boot secret when SESSION_SECRET is unset: sessions do not
  // survive a restart (fine for a single-admin portal) and the secret can
  // no longer be derived from a default admin password.
  secret:            process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax', secure: 'auto' },
}));

// Constant-time password comparison (hash both sides to equalize length).
function passwordsMatch(a, b) {
  const ha = createHash('sha256').update(String(a ?? '')).digest();
  const hb = createHash('sha256').update(String(b ?? '')).digest();
  return timingSafeEqual(ha, hb);
}

const auth = (req, res, next) => {
  // Accept HTTP Basic auth for CLI / scripted access
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const password = decoded.slice(decoded.indexOf(':') + 1);
    if (passwordsMatch(password, currentPortalPass)) return next();
  }
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
  if (passwordsMatch(req.body.password, currentPortalPass)) {
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
  interfaceMode: getInterfaceMode(),
  xrayEnabled: XRAY_ENABLED,
}));

app.post('/api/server-name', auth, (req, res) => {
  const serverName = String(req.body.serverName || '').trim();
  if (!isValidServerName(serverName)) {
    return res.status(400).json({ error: 'Invalid server name. Use only letters, numbers, - or _.' });
  }

  setServerName(serverName);
  res.json({ success: true, serverName });
});

// ── Interface Mode / UI Capabilities ─────────────────────────────────────────

app.get('/api/settings/interface-mode', auth, (_req, res) => {
  res.json({ interfaceMode: getInterfaceMode() });
});

app.post('/api/settings/interface-mode', auth, (req, res) => {
  const mode = String(req.body.interfaceMode || '').trim();
  if (!VALID_INTERFACE_MODES.includes(mode)) {
    return res.status(400).json({ error: `Invalid interface mode. Must be one of: ${VALID_INTERFACE_MODES.join(', ')}.` });
  }
  setInterfaceMode(mode);
  res.json({ success: true, interfaceMode: mode });
});

app.get('/api/settings/ui-capabilities', auth, (_req, res) => {
  const mode = getInterfaceMode();
  const caps = UI_CAPABILITIES[mode];
  const modules = [...caps.modules];
  if (XRAY_ENABLED && mode !== 'user' && !modules.includes('xray')) {
    modules.push('xray');
  }
  res.json({ interfaceMode: mode, modules, actions: caps.actions });
});

// ── Server endpoint ───────────────────────────────────────────────────────────

app.get('/api/settings/server-endpoint', auth, (_req, res) => {
  const settings = loadSettings();
  res.json({
    host:        VPS_HOST,
    source:      settings.wgHost ? 'config' : 'env',
    adminDomain: readEnvValue('ADMIN_DOMAIN') || VPS_HOST,
    tlsEmail:    readEnvValue('TLS_EMAIL') || '',
    xrayMode:    !!(process.env.CADDY_HTTPS_PORT),
  });
});

app.get('/api/settings/validate-host', auth, async (req, res) => {
  const host = String(req.query.host || '').trim();
  if (!host) return res.status(400).json({ ok: false, error: 'Missing host parameter.' });

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) {
    return res.json({ ok: true, type: 'ip' });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const result = await dnsLib.promises.lookup(host);
    clearTimeout(timer);
    res.json({ ok: true, type: 'hostname', resolvedIp: result.address });
  } catch (e) {
    clearTimeout(timer);
    res.json({ ok: false, error: `Cannot resolve '${host}'. Check your DNS record.` });
  }
});

app.post('/api/settings/server-endpoint', auth, async (req, res) => {
  const host     = String(req.body.host     || '').trim();
  const tlsEmail = String(req.body.tlsEmail || '').trim();
  if (!host) return res.status(400).json({ error: 'Missing host.' });

  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':');
  // Protect the user: a public cert is only attempted when the FQDN resolves to THIS
  // server. If it points elsewhere, fall back to a self-signed cert (avoids doomed ACME
  // + Let's Encrypt rate limits) and tell the user exactly what to fix.
  let domainPointsHere = true;
  let dnsWarn = '';
  if (!isIp) {
    let resolvedIp = '';
    try { resolvedIp = (await dnsLib.promises.lookup(host)).address; }
    catch { return res.status(422).json({ error: `Cannot resolve '${host}'. Update DNS before saving.` }); }
    const ourIp = await getPublicIp();
    if (ourIp && resolvedIp && resolvedIp !== ourIp) {
      domainPointsHere = false;
      dnsWarn = ` ⚠ ${host} resolves to ${resolvedIp}, not this server (${ourIp}) — a self-signed certificate is used. Point the DNS A record here and save again for a valid certificate.`;
    }
  }

  const settings = loadSettings();
  settings.wgHost = host;
  saveSettings(settings);

  updateHostEnvValue('WG_HOST', host);
  updateHostEnvValue('ADMIN_DOMAIN', host);
  if (tlsEmail) updateHostEnvValue('TLS_EMAIL', tlsEmail);

  const effective = tlsEmail || readEnvValue('TLS_EMAIL');
  const caddyContent = generateMainCaddyfile(host, effective, domainPointsHere);
  fs.writeFileSync(CADDY_FILE, caddyContent);

  // When switching to a public cert while Xray owns :443, Caddy validates via HTTP-01 on
  // port 80 — open it so issuance succeeds. Bare-IP / self-signed setups don't need it.
  const caddyHttpsPort = process.env.CADDY_HTTPS_PORT || '';
  const usePublicTls = !isIp && !!effective && domainPointsHere;
  let portMsg = '';
  if (caddyHttpsPort && usePublicTls) {
    const opened = await openHttpChallengePort();
    portMsg = opened
      ? ' Port 80 opened for the Let’s Encrypt (HTTP-01) challenge.'
      : ' ⚠ Could not open port 80 automatically — run “ufw allow 80/tcp” on the host, or the certificate will stay self-signed.';
  }

  await reloadCaddy();

  res.json({ ok: true, message: `Endpoint saved, Caddy reloaded.${dnsWarn}${portMsg} Portal restarting…` });
  setTimeout(() => dockerPost('/containers/portal/restart', null).catch(() => {}), 500);
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

// Phase 2: extended AdGuard policy presets (aliases + new)
AG_PER_CLIENT.default_filtered = AG_PER_CLIENT.filtered;
AG_PER_CLIENT.malware_only = {
  use_global_settings:         false,
  filtering_enabled:           false,
  safebrowsing_enabled:        true,
  parental_enabled:            false,
  use_global_blocked_services: true,
  safe_search:                 { enabled: false },
  upstreams:                   ['1.1.1.2', '1.0.0.2'],
};
AG_PER_CLIENT.unfiltered  = AG_PER_CLIENT.none;
AG_PER_CLIENT.family_safe = {
  use_global_settings:         false,
  filtering_enabled:           true,
  safebrowsing_enabled:        true,
  parental_enabled:            true,
  use_global_blocked_services: false,
  safe_search:                 { enabled: true },
  upstreams:                   [],
};
AG_PER_CLIENT.strict = {
  use_global_settings:         false,
  filtering_enabled:           true,
  safebrowsing_enabled:        true,
  parental_enabled:            true,
  use_global_blocked_services: false,
  safe_search:                 { enabled: true },
  blocked_services: {
    schedule: { time_zone: 'UTC' },
    ids: ['youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'snapchat', 'discord'],
  },
  upstreams: [],
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
  if (!currentPassword || !passwordsMatch(currentPassword, currentPortalPass))
    return res.status(403).json({ error: 'Current password is incorrect.' });
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  const settings = loadSettings();
  settings.adminPassword = newPassword;
  saveSettings(settings);
  currentPortalPass = newPassword;
  // This only changes the portal login. wg-easy (PASSWORD_HASH), AdGuard and the
  // CLI scripts read their credential from .env — they are NOT rotated here.
  // `./easywg passwd` rotates all of them together.
  res.json({
    success: true,
    warning: 'Only the portal login was changed. wg-easy, AdGuard and the CLI still use the previous password. Run "./easywg passwd" on the server to rotate everything.',
  });
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
  const [wg, ag, caddyR] = await Promise.all([
    checkService('wg-easy',  `${WG_URL}/api/session`,    [200, 401]),
    checkService('adguard',  `${AG_URL}/control/status`, [200, 401, 403]),
    checkDockerContainer('caddy'),
  ]);
  const caddy = { name: 'caddy', up: caddyR.ok };
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
    // HTTPS provider (ip-api free tier is HTTP-only); response mapped to the
    // { status, country, countryCode } shape the frontend expects.
    const r = await fetch(
      `https://ipwho.is/${encodeURIComponent(req.params.ip)}?fields=success,country,country_code`,
      { signal: ctrl.signal },
    );
    const d = await r.json();
    res.json({ status: d.success ? 'success' : 'fail', country: d.country, countryCode: d.country_code });
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
    const [wg, ag, caddyR] = await Promise.all([
      checkService('wg-easy',  `${WG_URL}/api/session`,    [200, 401]),
      checkService('adguard',  `${AG_URL}/control/status`, [200, 401, 403]),
      checkDockerContainer('caddy'),
    ]);
    const caddy = { name: 'caddy', up: caddyR.ok };

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
    const dataSrc = DATA_DIR;
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
    if (fs.existsSync(portalData)) restoreDir(portalData, DATA_DIR);

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
  const transporter = nodemailer.createTransport({
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

// ── Phase 2: Data helpers ─────────────────────────────────────────────────────

function loadDevices() {
  try { return JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8')); }
  catch { return {}; }
}
function saveDevices(devices) {
  fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2));
}

function loadDnsProfiles() {
  let custom = {};
  try { custom = JSON.parse(fs.readFileSync(DNS_PROFILES_FILE, 'utf8')); } catch { /* seed built-ins */ }
  return { ...BUILTIN_DNS_PROFILES, ...custom };
}
function saveDnsProfiles(profiles) {
  const custom = {};
  for (const [id, p] of Object.entries(profiles)) {
    if (p.type === 'custom') custom[id] = p;
  }
  fs.writeFileSync(DNS_PROFILES_FILE, JSON.stringify(custom, null, 2));
}

function loadProxyServices() {
  try { return JSON.parse(fs.readFileSync(PROXY_SERVICES_FILE, 'utf8')); }
  catch { return {}; }
}
function saveProxyServices(services) {
  fs.writeFileSync(PROXY_SERVICES_FILE, JSON.stringify(services, null, 2));
}

// Auto-import wg-easy peers that have no device record yet
function importPeersAsDevices(peers, devices) {
  let changed = false;
  for (const peer of peers) {
    if (!peer.id) continue;
    if (!devices[peer.id]) {
      devices[peer.id] = {
        id: peer.id, wgPeerId: peer.id, name: peer.name || peer.id,
        owner: '', type: 'other', vpnIp: peer.address || '',
        dnsProfile: 'default_filtered', routingMode: 'full_tunnel',
        customAllowedIps: [], expiresAt: null, revokedAt: null,
        bypassUntil: null, tags: [], notes: '', createdAt: new Date().toISOString(),
      };
      changed = true;
    } else if (peer.address && devices[peer.id].vpnIp !== peer.address) {
      devices[peer.id].vpnIp = peer.address;
      changed = true;
    }
  }
  return changed;
}

// Restore expired DNS bypasses; auto-disable expired devices
async function checkExpiredDevices(devices) {
  const now = Date.now();
  let changed = false;
  for (const dev of Object.values(devices)) {
    if (dev.bypassUntil && dev.bypassUntil !== 'permanent' && new Date(dev.bypassUntil).getTime() < now) {
      dev.bypassUntil = null;
      changed = true;
      if (dev.vpnIp) {
        try { await agSetClientFilter(dev.name, dev.vpnIp, getAdguardPolicy(dev.dnsProfile)); } catch { /* non-fatal */ }
      }
    }
    if (dev.expiresAt && !dev.revokedAt && new Date(dev.expiresAt).getTime() < now) {
      dev.revokedAt = new Date().toISOString();
      changed = true;
      try { await wgFetch(`/api/wireguard/client/${dev.wgPeerId}/disable`, { method: 'POST' }); } catch { /* non-fatal */ }
    }
  }
  return changed;
}

function deviceStatus(device, wgClient) {
  if (device.revokedAt) return 'revoked';
  if (device.expiresAt && new Date(device.expiresAt).getTime() < Date.now()) return 'expired';
  if (!wgClient) return 'unknown';
  if (wgClient.enabled === false) return 'inactive';
  const hs = wgClient.latestHandshakeAt;
  if (!hs) return 'never_connected';
  const age = Date.now() - new Date(hs).getTime();
  if (age < 3 * 60 * 1000)        return 'online';
  if (age < 24 * 60 * 60 * 1000)  return 'recently_seen';
  return 'offline';
}

function getAdguardPolicy(profileId) {
  return loadDnsProfiles()[profileId]?.adguardPolicy || 'default_filtered';
}
function getDnsIpForProfile(profileId) {
  return loadDnsProfiles()[profileId]?.dnsIp || VPN_DNS_IP;
}

function patchClientConfig(configText, device) {
  let text = configText;
  let allowedIps;
  if (device.routingMode === 'custom' && device.customAllowedIps?.length) {
    allowedIps = device.customAllowedIps.join(', ');
  } else {
    allowedIps = (ROUTING_MODES_DEF[device.routingMode] || ROUTING_MODES_DEF.full_tunnel).allowedIps.join(', ');
  }
  const bypassActive = device.bypassUntil === 'permanent' ||
    (device.bypassUntil && new Date(device.bypassUntil).getTime() > Date.now());
  const dnsIp = bypassActive ? '1.1.1.1, 8.8.8.8' : getDnsIpForProfile(device.dnsProfile);
  text = text.replace(/^(AllowedIPs\s*=\s*).*$/m, `$1${allowedIps}`);
  text = text.replace(/^(DNS\s*=\s*).*$/m, `$1${dnsIp}`);
  return text;
}

function isValidDomain(str) {
  if (typeof str !== 'string' || str.length > 253) return false;
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(str);
}
function isValidTargetUrl(str) {
  try { const u = new URL(str); return ['http:', 'https:'].includes(u.protocol); }
  catch { return false; }
}
function isValidCustomAllowedIps(ips) {
  return Array.isArray(ips) && ips.length > 0 && ips.every(ip => isValidIpOrCidr(ip));
}

// ── Caddy helpers (Module D) ──────────────────────────────────────────────────

function generateCaddyServices(services) {
  const enabled = Object.values(services).filter(s => s.enabled !== false);
  if (!enabled.length) return '# No easywg-managed proxy services\n';
  return enabled.map(svc => {
    const lines = [`# easywg-managed: ${svc.id}`];
    const site = svc.exposure === 'vpn_only' ? `http://${svc.domain}` : svc.domain;
    lines.push(`${site} {`);
    if (svc.exposure === 'vpn_only') lines.push(`  bind ${VPN_DNS_IP}`);
    if (svc.basicAuth && svc.basicAuthUser && svc.basicAuthPasswordHash) {
      lines.push('  basicauth {', `    ${svc.basicAuthUser} ${svc.basicAuthPasswordHash}`, '  }');
    }
    if (svc.ipAllowlist?.length) {
      lines.push('  @allowed {', ...svc.ipAllowlist.map(ip => `    remote_ip ${ip}`), '  }');
      lines.push('  handle @allowed {', `    reverse_proxy ${svc.target}`, '  }');
      lines.push('  respond 403');
    } else {
      lines.push(`  reverse_proxy ${svc.target}`);
    }
    lines.push('  header {', '    X-Content-Type-Options "nosniff"', '    Referrer-Policy "same-origin"', '  }');
    lines.push('}');
    return lines.join('\n');
  }).join('\n\n') + '\n';
}

async function reloadCaddy() {
  try {
    const caddyText = fs.readFileSync(CADDY_FILE, 'utf8');
    return await new Promise(resolve => {
      const req = http.request({
        host: '127.0.0.1',
        port: 2019,
        path: '/load',
        method: 'POST',
        headers: {
          // Caddy v2.8+ uses Host header for DNS-rebinding protection — must match admin listen address
          'Host': 'localhost:2019',
          'Content-Type': 'text/caddyfile',
          'Cache-Control': 'must-revalidate',
          'Content-Length': Buffer.byteLength(caddyText),
        },
      }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, body }));
      });
      req.setTimeout(8000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
      req.on('error', e => resolve({ ok: false, error: e.message }));
      req.write(caddyText);
      req.end();
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function writeCaddyServices(services) {
  let prev = '';
  try { prev = fs.readFileSync(CADDY_SERVICES_FILE, 'utf8'); } catch { /* new file */ }
  const content = generateCaddyServices(services);
  try {
    fs.writeFileSync(CADDY_SERVICES_FILE, content);
    const result = await reloadCaddy();
    if (!result.ok) {
      try { fs.writeFileSync(CADDY_SERVICES_FILE, prev); } catch { /* ignore */ }
      return { ok: false, error: result.error || `Caddy reload HTTP ${result.status}: ${result.body}` };
    }
    return { ok: true };
  } catch (e) {
    try { fs.writeFileSync(CADDY_SERVICES_FILE, prev); } catch { /* ignore */ }
    return { ok: false, error: e.message };
  }
}

// ── Device Inventory (Module C) ───────────────────────────────────────────────

app.get('/api/devices', auth, async (_req, res) => {
  try {
    const wgRes  = await wgFetch('/api/wireguard/client');
    const peers  = await wgRes.json();
    const devices = loadDevices();
    const imp = importPeersAsDevices(peers, devices);
    const exp = await checkExpiredDevices(devices);
    if (imp || exp) saveDevices(devices);
    const wgMap = Object.fromEntries(peers.map(p => [p.id, p]));
    res.json({
      devices: Object.values(devices).map(dev => ({
        ...dev,
        status:      deviceStatus(dev, wgMap[dev.wgPeerId]),
        wgClient:    wgMap[dev.wgPeerId] || null,
        bypassActive: dev.bypassUntil === 'permanent' ||
          (dev.bypassUntil && new Date(dev.bypassUntil).getTime() > Date.now()),
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/devices', auth, async (req, res) => {
  const { name, owner = '', type = 'other', dnsProfile = 'default_filtered',
          routingMode = 'full_tunnel', expiresAt = null, notes = '' } = req.body;
  if (!name || typeof name !== 'string' || !name.trim())
    return res.status(400).json({ error: 'Device name is required' });
  try {
    await wgFetch('/api/wireguard/client', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
    const listRes = await wgFetch('/api/wireguard/client');
    const peers   = await listRes.json();
    const wgClient = peers.find(p => p.name === name.trim());
    if (!wgClient?.id) return res.status(500).json({ error: 'WireGuard peer creation failed' });
    const device = {
      id: wgClient.id, wgPeerId: wgClient.id, name: name.trim(),
      owner, type, vpnIp: wgClient.address || '',
      dnsProfile, routingMode, customAllowedIps: [],
      expiresAt: expiresAt || null, revokedAt: null, bypassUntil: null,
      tags: [], notes, createdAt: new Date().toISOString(),
    };
    const devices = loadDevices();
    if (XRAY_ENABLED) device.xrayUuid = randomUUID();
    devices[device.id] = device;
    saveDevices(devices);
    if (wgClient.address) {
      try { await agSetClientFilter(device.name, wgClient.address, getAdguardPolicy(dnsProfile)); } catch { /* non-fatal */ }
    }
    if (XRAY_ENABLED) syncXrayClients().catch(() => {});
    res.json({ device, wgClient });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/devices/:id', auth, async (req, res) => {
  try {
    const devices = loadDevices();
    const dev = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    let wgClient = null;
    try { wgClient = await (await wgFetch(`/api/wireguard/client/${dev.wgPeerId}`)).json(); } catch { /* ok */ }
    res.json({ device: { ...dev, status: deviceStatus(dev, wgClient), wgClient } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/devices/:id', auth, (req, res) => {
  try {
    const devices = loadDevices();
    const dev = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    for (const key of ['name', 'owner', 'type', 'expiresAt', 'tags', 'notes']) {
      if (req.body[key] !== undefined) dev[key] = req.body[key];
    }
    saveDevices(devices);
    res.json({ device: dev });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/devices/:id/enable', auth, async (req, res) => {
  try {
    const devices = loadDevices();
    const dev = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    if (dev.revokedAt) return res.status(400).json({ error: 'Cannot re-enable a revoked device' });
    await wgFetch(`/api/wireguard/client/${dev.wgPeerId}/enable`, { method: 'POST' });
    dev.expiresAt = null;
    saveDevices(devices);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/devices/:id/disable', auth, async (req, res) => {
  try {
    const devices = loadDevices();
    const dev = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    await wgFetch(`/api/wireguard/client/${dev.wgPeerId}/disable`, { method: 'POST' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/devices/:id/revoke', auth, async (req, res) => {
  if (!req.body.confirmed) return res.status(400).json({ error: 'Requires confirmed: true' });
  try {
    const devices = loadDevices();
    const dev = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    dev.revokedAt = new Date().toISOString();
    await wgFetch(`/api/wireguard/client/${dev.wgPeerId}/disable`, { method: 'POST' });
    saveDevices(devices);
    if (XRAY_ENABLED) syncXrayClients().catch(() => {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/devices/:id', auth, async (req, res) => {
  const { confirmed, deleteWgPeer = false } = req.body;
  if (!confirmed) return res.status(400).json({ error: 'Requires confirmed: true' });
  try {
    const devices = loadDevices();
    const dev = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    if (!dev.revokedAt) return res.status(400).json({ error: 'Device must be revoked before deletion' });
    if (deleteWgPeer) {
      try { await wgFetch(`/api/wireguard/client/${dev.wgPeerId}`, { method: 'DELETE' }); } catch { /* ignore */ }
    }
    delete devices[req.params.id];
    saveDevices(devices);
    if (XRAY_ENABLED) syncXrayClients().catch(() => {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/devices/:id/config', auth, async (req, res) => {
  try {
    const devices = loadDevices();
    const dev = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    const configText = await (await wgFetch(`/api/wireguard/client/${dev.wgPeerId}/configuration`)).text();
    res.type('text/plain').send(patchClientConfig(configText, dev));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/devices/:id/qr', auth, async (req, res) => {
  try {
    const devices = loadDevices();
    const dev = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    const configText = await (await wgFetch(`/api/wireguard/client/${dev.wgPeerId}/configuration`)).text();
    const patched = patchClientConfig(configText, dev);
    const svg = await QRCode.toString(patched, { type: 'svg', errorCorrectionLevel: 'L' });
    res.type('image/svg+xml').send(svg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/devices/:id/xray-qr', auth, async (req, res) => {
  if (!XRAY_ENABLED) return res.json({ enabled: false });
  try {
    const devices = loadDevices();
    const dev = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    if (dev.revokedAt) return res.status(403).json({ error: 'Device is revoked' });
    if (!dev.xrayUuid) {
      dev.xrayUuid = randomUUID();
      devices[req.params.id] = dev;
      saveDevices(devices);
      await syncXrayClients();
    }
    const label  = String(req.query.label || dev.name || getServerName()).slice(0, 64);
    const host   = VPS_HOST || '0.0.0.0';
    const params = new URLSearchParams({
      encryption: 'none', flow: 'xtls-rprx-vision', security: 'reality',
      sni: XRAY_SNI_TARGET, fp: 'chrome', pbk: XRAY_PUBLIC_KEY,
      sid: XRAY_SHORT_ID, type: 'tcp',
    });
    const uri     = `vless://${dev.xrayUuid}@${host}:${XRAY_PORT}?${params.toString()}#${encodeURIComponent(label)}`;
    const qrcode  = await QRCode.toDataURL(uri, { width: 256, margin: 2 });
    res.json({ enabled: true, uri, qrcode, label, deviceName: dev.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DNS Profiles (Module A) ────────────────────────────────────────────────────

app.get('/api/dns-profiles', auth, (_req, res) => {
  res.json({ profiles: Object.values(loadDnsProfiles()) });
});

app.post('/api/dns-profiles', auth, (req, res) => {
  const { id, name, description = '' } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
  if (!/^[a-z0-9_]+$/.test(id)) return res.status(400).json({ error: 'id must be lowercase alphanumeric + underscores' });
  const profiles = loadDnsProfiles();
  if (profiles[id]) return res.status(409).json({ error: 'Profile ID already exists' });
  const profile = { id, name, type: 'custom', adguardPolicy: 'default_filtered', dnsIp: VPN_DNS_IP, description };
  profiles[id] = profile;
  saveDnsProfiles(profiles);
  res.json({ profile });
});

app.delete('/api/dns-profiles/:id', auth, (req, res) => {
  const profiles = loadDnsProfiles();
  const profile  = profiles[req.params.id];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (profile.type === 'managed') return res.status(400).json({ error: 'Built-in profiles cannot be deleted' });
  delete profiles[req.params.id];
  saveDnsProfiles(profiles);
  res.json({ ok: true });
});

app.post('/api/devices/:id/dns-profile', auth, async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: 'profileId is required' });
  try {
    const devices  = loadDevices();
    const dev      = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    if (!loadDnsProfiles()[profileId]) return res.status(400).json({ error: 'Unknown DNS profile' });
    dev.dnsProfile  = profileId;
    dev.bypassUntil = null;
    saveDevices(devices);
    if (dev.vpnIp) {
      try { await agSetClientFilter(dev.name, dev.vpnIp, getAdguardPolicy(profileId)); } catch { /* non-fatal */ }
    }
    res.json({ ok: true, device: dev });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/devices/:id/dns-bypass', auth, async (req, res) => {
  const { duration = '1h' } = req.body;
  const durationMs = { '15m': 15*60*1000, '1h': 60*60*1000, '4h': 4*60*60*1000, '24h': 24*60*60*1000 };
  if (duration !== 'permanent' && !durationMs[duration])
    return res.status(400).json({ error: 'Invalid duration. Use: 15m, 1h, 4h, 24h, permanent' });
  try {
    const devices = loadDevices();
    const dev     = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    dev.bypassUntil = duration === 'permanent'
      ? 'permanent'
      : new Date(Date.now() + durationMs[duration]).toISOString();
    saveDevices(devices);
    if (dev.vpnIp) {
      try { await agSetClientFilter(dev.name, dev.vpnIp, 'none'); } catch { /* non-fatal */ }
    }
    res.json({ ok: true, bypassUntil: dev.bypassUntil });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/devices/:id/dns-bypass', auth, async (req, res) => {
  try {
    const devices = loadDevices();
    const dev     = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    dev.bypassUntil = null;
    saveDevices(devices);
    if (dev.vpnIp) {
      try { await agSetClientFilter(dev.name, dev.vpnIp, getAdguardPolicy(dev.dnsProfile)); } catch { /* non-fatal */ }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Routing Wizard (Module B) ─────────────────────────────────────────────────

app.get('/api/routing-modes', auth, (_req, res) => {
  res.json({ modes: Object.values(ROUTING_MODES_DEF) });
});

app.patch('/api/devices/:id/routing-mode', auth, (req, res) => {
  const { mode, customAllowedIps = [] } = req.body;
  if (!ROUTING_MODES_DEF[mode]) return res.status(400).json({ error: 'Invalid routing mode' });
  if (mode === 'custom' && !isValidCustomAllowedIps(customAllowedIps))
    return res.status(400).json({ error: 'customAllowedIps must be a non-empty array of valid CIDRs' });
  try {
    const devices = loadDevices();
    const dev     = devices[req.params.id];
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    dev.routingMode = mode;
    if (mode === 'custom') dev.customAllowedIps = customAllowedIps;
    saveDevices(devices);
    const allowedIps = mode === 'custom' ? customAllowedIps : ROUTING_MODES_DEF[mode].allowedIps;
    res.json({ ok: true, device: dev, allowedIps, requiresClientUpdate: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reverse Proxy (Module D) ──────────────────────────────────────────────────

app.get('/api/proxy/services', auth, (_req, res) => {
  res.json({ services: Object.values(loadProxyServices()) });
});

app.post('/api/proxy/services', auth, requiresAction('publicGateway'), async (req, res) => {
  const { name, domain, target, exposure = 'vpn_only', ipAllowlist = [], notes = '', confirmed = false } = req.body;
  if (!name || !domain || !target) return res.status(400).json({ error: 'name, domain, and target are required' });
  if (!isValidDomain(domain)) return res.status(400).json({ error: 'Invalid domain' });
  if (!isValidTargetUrl(target)) return res.status(400).json({ error: 'target must be a valid http:// or https:// URL' });
  if (!['vpn_only', 'public'].includes(exposure)) return res.status(400).json({ error: 'exposure must be vpn_only or public' });
  if (exposure === 'public' && !confirmed) return res.status(400).json({ error: 'Public exposure requires confirmed: true' });
  if (ipAllowlist.length && !ipAllowlist.every(ip => isValidIpOrCidr(ip))) return res.status(400).json({ error: 'Invalid IP in ipAllowlist' });
  try {
    const services = loadProxyServices();
    if (Object.values(services).some(s => s.domain === domain))
      return res.status(409).json({ error: 'Domain already registered' });
    const id = `svc_${Date.now()}`;
    const service = {
      id, name, domain, target, exposure, tls: exposure !== 'vpn_only',
      basicAuth: false, basicAuthUser: '', basicAuthPasswordHash: '',
      ipAllowlist, enabled: true, notes, createdAt: new Date().toISOString(),
    };
    services[id] = service;
    const reload = await writeCaddyServices(services);
    if (!reload.ok) return res.status(500).json({ error: reload.error });
    saveProxyServices(services);
    if (exposure === 'vpn_only') {
      try { await agFetch('/control/rewrite/add', { method: 'POST', body: JSON.stringify({ domain, answer: VPN_DNS_IP }) }); } catch { /* non-fatal */ }
    }
    res.json({ service });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/proxy/services/:id', auth, async (req, res) => {
  try {
    const services = loadProxyServices();
    const svc      = services[req.params.id];
    if (!svc) return res.status(404).json({ error: 'Service not found' });
    for (const key of ['name', 'notes', 'ipAllowlist']) {
      if (req.body[key] !== undefined) svc[key] = req.body[key];
    }
    const reload = await writeCaddyServices(services);
    if (!reload.ok) return res.status(500).json({ error: reload.error });
    saveProxyServices(services);
    res.json({ service: svc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/proxy/services/:id', auth, async (req, res) => {
  try {
    const services = loadProxyServices();
    const svc      = services[req.params.id];
    if (!svc) return res.status(404).json({ error: 'Service not found' });
    if (svc.exposure === 'vpn_only') {
      try { await agFetch('/control/rewrite/delete', { method: 'POST', body: JSON.stringify({ domain: svc.domain, answer: VPN_DNS_IP }) }); } catch { /* non-fatal */ }
    }
    delete services[req.params.id];
    const reload = await writeCaddyServices(services);
    if (!reload.ok) return res.status(500).json({ error: reload.error });
    saveProxyServices(services);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/proxy/services/:id/enable', auth, async (req, res) => {
  try {
    const services = loadProxyServices();
    const svc      = services[req.params.id];
    if (!svc) return res.status(404).json({ error: 'Service not found' });
    svc.enabled = true;
    const reload = await writeCaddyServices(services);
    if (!reload.ok) return res.status(500).json({ error: reload.error });
    saveProxyServices(services);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/proxy/services/:id/disable', auth, async (req, res) => {
  try {
    const services = loadProxyServices();
    const svc      = services[req.params.id];
    if (!svc) return res.status(404).json({ error: 'Service not found' });
    svc.enabled = false;
    const reload = await writeCaddyServices(services);
    if (!reload.ok) return res.status(500).json({ error: reload.error });
    saveProxyServices(services);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/proxy/validate', auth, async (req, res) => {
  try {
    const services    = loadProxyServices();
    const configText  = generateCaddyServices(services);
    const adminUp     = await tcpOpen('127.0.0.1', 2019, 2000);
    res.json({ ok: true, adminUp, configPreview: configText });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── Phase 3: requires ─────────────────────────────────────────────────────────
const crypto   = require('crypto');
const httpsLib = require('https');
const dnsLib   = require('dns');

// ── Phase 3: constants ────────────────────────────────────────────────────────
const MONITORS_FILE      = path.join(DATA_DIR, 'monitors.json');
const MONITOR_HIST_FILE  = path.join(DATA_DIR, 'monitor-history.json');
const APPS_FILE          = path.join(DATA_DIR, 'apps.json');
const FILEDROP_META_FILE = path.join(DATA_DIR, 'filedrop-shares.json');
const FILEDROP_DIR       = path.join(FILEDROP_ROOT, 'storage');
const FILEDROP_MAX_MB    = parseInt(process.env.FILEDROP_MAX_MB   || '500');
const FILEDROP_TOTAL_GB  = parseInt(process.env.FILEDROP_TOTAL_GB  || '5');
const FILEDROP_DEFAULT_EXPIRY = 7;
const FILEDROP_MAX_EXPIRY     = 30;
const VPS_HOST           = loadSettings().wgHost || process.env.WG_HOST || '';

// ── Phase 3: App catalog ─────────────────────────────────────────────────────
// Image tags below are pinned (Dependabot cannot see them) — review quarterly.
const APP_CATALOG = {
  'uptime-kuma': {
    id: 'uptime-kuma', name: 'Uptime Kuma', category: 'monitoring',
    description: 'Self-hosted uptime monitoring tool with a beautiful UI and status pages.',
    image: 'louislam/uptime-kuma:1',
    internalPort: 3001, minRamMb: 512, defaultExposure: 'vpn_only',
    namedVolumes: [{ name: 'easywg-uptime-kuma-data', target: '/app/data' }],
    env: [],
    securityNotes: ['Create a strong admin password on first login.'],
    healthcheck: { type: 'http', path: '/', port: 3001 },
  },
  'ntfy': {
    id: 'ntfy', name: 'ntfy', category: 'notifications',
    description: 'Simple self-hosted push notification service for any platform.',
    image: 'binwiederhier/ntfy:v2',
    internalPort: 8080, minRamMb: 128, defaultExposure: 'vpn_only',
    namedVolumes: [
      { name: 'easywg-ntfy-cache', target: '/var/cache/ntfy' },
      { name: 'easywg-ntfy-etc',   target: '/etc/ntfy' },
    ],
    env: ['NTFY_BASE_URL=http://localhost:8080'],
    securityNotes: ['Configure access control in /etc/ntfy/server.yml to restrict who can publish.'],
    healthcheck: { type: 'http', path: '/v1/health', port: 8080 },
  },
  'filebrowser': {
    id: 'filebrowser', name: 'FileBrowser', category: 'files',
    description: 'Web-based file manager with user management and sharing.',
    image: 'filebrowser/filebrowser:v2',
    internalPort: 8081, minRamMb: 64, defaultExposure: 'vpn_only',
    namedVolumes: [
      { name: 'easywg-filebrowser-db',  target: '/database' },
      { name: 'easywg-filebrowser-srv', target: '/srv' },
    ],
    env: ['FB_PORT=8081'],
    securityNotes: ['Change default admin/admin credentials immediately after install.'],
    healthcheck: { type: 'http', path: '/', port: 8081 },
  },
  'stirling-pdf': {
    id: 'stirling-pdf', name: 'Stirling PDF', category: 'productivity',
    description: 'Powerful web-based PDF manipulation tool. All processing is local.',
    image: 'frooodle/s-pdf:2.14.2',
    internalPort: 8082, minRamMb: 256, defaultExposure: 'vpn_only',
    namedVolumes: [
      { name: 'easywg-stirling-configs', target: '/configs' },
      { name: 'easywg-stirling-logs',    target: '/logs' },
    ],
    env: ['SERVER_PORT=8082'],
    securityNotes: ['Enable login if exposing to public networks.'],
    healthcheck: { type: 'http', path: '/', port: 8082 },
  },
  'vaultwarden': {
    id: 'vaultwarden', name: 'Vaultwarden', category: 'security',
    description: 'Lightweight Bitwarden-compatible password manager server.',
    image: 'vaultwarden/server:1.37.0',
    internalPort: 8083, minRamMb: 256, defaultExposure: 'vpn_only',
    namedVolumes: [{ name: 'easywg-vaultwarden-data', target: '/data' }],
    env: ['ROCKET_PORT=8083', 'SIGNUPS_ALLOWED=false'],
    securityNotes: [
      'Disable signups (SIGNUPS_ALLOWED=false) after creating your account.',
      'Set a strong ADMIN_TOKEN to enable the admin panel.',
      'Never expose without HTTPS — Bitwarden clients require it.',
    ],
    healthcheck: { type: 'http', path: '/alive', port: 8083 },
  },
};

// ── Phase 3: load/save helpers ─────────────────────────────────────────────
function loadMonitors() {
  try { return JSON.parse(fs.readFileSync(MONITORS_FILE, 'utf8')); }
  catch { return {}; }
}
function saveMonitors(data) {
  fs.writeFileSync(MONITORS_FILE, JSON.stringify(data, null, 2));
}
function loadMonitorHistory() {
  try { return JSON.parse(fs.readFileSync(MONITOR_HIST_FILE, 'utf8')); }
  catch { return {}; }
}
function saveMonitorHistory(data) {
  fs.writeFileSync(MONITOR_HIST_FILE, JSON.stringify(data, null, 2));
}
function loadApps() {
  try { return JSON.parse(fs.readFileSync(APPS_FILE, 'utf8')); }
  catch { return {}; }
}
function saveApps(data) {
  fs.writeFileSync(APPS_FILE, JSON.stringify(data, null, 2));
}
function loadFiledropShares() {
  try { return JSON.parse(fs.readFileSync(FILEDROP_META_FILE, 'utf8')); }
  catch { return {}; }
}
function saveFiledropShares(data) {
  fs.writeFileSync(FILEDROP_META_FILE, JSON.stringify(data, null, 2));
}

// ── Phase 3: Docker write helpers ───────────────────────────────────────────
function dockerPost(apiPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body != null ? JSON.stringify(body) : '';
    const req = http.request({
      socketPath: DOCKER_SOCK, path: apiPath, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
    }, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Docker POST timeout')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}
function dockerDelete(apiPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath: DOCKER_SOCK, path: apiPath, method: 'DELETE' }, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Docker DELETE timeout')); });
    req.end();
  });
}

// ── Phase 3: Monitor check functions ─────────────────────────────────────────
async function checkHttp(url, timeoutMs, expectedStatus) {
  const start = Date.now();
  const lib = url.startsWith('https') ? httpsLib : http;
  return new Promise(resolve => {
    try {
      const req = lib.get(url, { rejectUnauthorized: false, timeout: timeoutMs }, res => {
        res.resume();
        resolve({ ok: res.statusCode === expectedStatus, statusCode: res.statusCode, ms: Date.now() - start });
      });
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout', ms: timeoutMs }); });
      req.on('error',   e  => resolve({ ok: false, error: e.message, ms: Date.now() - start }));
    } catch (e) { resolve({ ok: false, error: e.message, ms: Date.now() - start }); }
  });
}
async function checkTcp(host, port, timeoutMs) {
  const start = Date.now();
  const ok = await tcpOpen(host, port, timeoutMs);
  return { ok, ms: Date.now() - start };
}
async function checkDnsResolve(target, resolver) {
  const start = Date.now();
  return new Promise(resolve => {
    try {
      const r = new dnsLib.Resolver({ timeout: 5000 });
      r.setServers([resolver]);
      r.resolve4(target, err => {
        resolve({ ok: !err, ms: Date.now() - start, error: err?.message });
      });
    } catch (e) { resolve({ ok: false, error: e.message, ms: Date.now() - start }); }
  });
}
async function checkDockerContainer(name) {
  try {
    const data = await dockerApiRequest(`/containers/${encodeURIComponent(name)}/json`);
    return { ok: data?.State?.Running === true };
  } catch (e) { return { ok: false, error: e.message }; }
}
async function checkTlsDaysLeft(host, port) {
  return new Promise(resolve => {
    const tls = require('tls');
    const isIp = /^[\d.:]+$/.test(host);
    const opts = { host, port, rejectUnauthorized: false };
    if (!isIp) opts.servername = host;
    const sock = tls.connect(opts, () => {
      try {
        const cert = sock.getPeerCertificate();
        sock.destroy();
        const daysLeft = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000);
        resolve({ ok: daysLeft >= 0, daysLeft });
      } catch (e) { sock.destroy(); resolve({ ok: false, error: e.message }); }
    });
    sock.on('error', e => resolve({ ok: false, error: e.message }));
    setTimeout(() => { sock.destroy(); resolve({ ok: false, error: 'timeout' }); }, 5000);
  });
}

async function runMonitorCheck(monitor) {
  let result = { ok: false, error: 'unknown type', ms: 0 };
  try {
    const to = (monitor.timeoutSeconds || 5) * 1000;
    if (monitor.type === 'http' || monitor.type === 'https') {
      result = await checkHttp(monitor.target, to, monitor.expectedStatus || 200);
    } else if (monitor.type === 'tcp') {
      const [h, p] = (monitor.target || '').split(':');
      result = await checkTcp(h, parseInt(p || '80'), to);
    } else if (monitor.type === 'dns') {
      result = await checkDnsResolve(monitor.target, monitor.resolver || VPN_DNS_IP);
    } else if (monitor.type === 'docker' || monitor.type === 'wireguard') {
      result = await checkDockerContainer(monitor.target);
    } else if (monitor.type === 'tls') {
      const [h, p] = (monitor.target || '').split(':');
      const r = await checkTlsDaysLeft(h, parseInt(p || '443'));
      const minDays = monitor.minDaysLeft || ALERT_CERT_EXPIRY_DAYS;
      result = { ...r, ok: typeof r.daysLeft === 'number' && r.daysLeft >= minDays };
    }
  } catch (e) { result = { ok: false, error: e.message, ms: 0 }; }

  const monitors = loadMonitors();
  const m = monitors[monitor.id];
  if (!m) return result;

  const prevStatus = m.lastStatus;
  const now = new Date().toISOString();
  m.lastCheck = now;
  m.lastStatus = result.ok ? 'up' : 'down';
  m.lastResponseMs = result.ms || null;
  m.nextCheckAt = new Date(Date.now() + (m.intervalSeconds || 300) * 1000).toISOString();

  if (result.ok) {
    m.consecutiveFailures = 0;
    m.lastSuccess = now;
    if (prevStatus === 'down' && m.notify) {
      sendNotification('monitor_recovered', { name: m.name, type: m.type }).catch(() => {});
    }
  } else {
    m.consecutiveFailures = (m.consecutiveFailures || 0) + 1;
    m.failureCount = (m.failureCount || 0) + 1;
    m.lastFailure = now;
    if (m.notify && m.consecutiveFailures >= (m.notifyAfterFailures || 2) && prevStatus !== 'down') {
      sendNotification('monitor_down', { name: m.name, type: m.type, error: result.error }).catch(() => {});
    }
  }
  saveMonitors(monitors);

  const hist = loadMonitorHistory();
  if (!hist[m.id]) hist[m.id] = [];
  hist[m.id].push({ t: now, ok: result.ok, ms: result.ms || null, err: result.error || null });
  if (hist[m.id].length > 100) hist[m.id] = hist[m.id].slice(-100);
  saveMonitorHistory(hist);

  return result;
}

function seedDefaultMonitors() {
  const monitors = loadMonitors();
  if (Object.keys(monitors).length > 0) return;
  const now = Date.now();
  const defaults = [
    { id: 'mon_portal',  name: 'Portal',       type: 'http',   target: `http://127.0.0.1:${PORT}`, expectedStatus: 200 },
    { id: 'mon_wgeasy',  name: 'wg-easy',      type: 'docker', target: 'wg-easy' },
    { id: 'mon_adguard', name: 'AdGuard Home', type: 'docker', target: 'adguard' },
    { id: 'mon_caddy',   name: 'Caddy',        type: 'docker', target: 'caddy' },
    { id: 'mon_dns',     name: 'AdGuard DNS',  type: 'dns',    target: 'example.com', resolver: '127.0.0.1' },
  ];
  if (VPS_HOST) {
    defaults.push({ id: 'mon_tls', name: 'TLS Certificate', type: 'tls', target: `${VPS_HOST}:443` });
  }
  if (XRAY_ENABLED) {
    defaults.push({ id: 'mon_xray', name: 'Xray', type: 'docker', target: 'xray' });
  }
  const services = loadProxyServices();
  for (const svc of Object.values(services)) {
    if (svc.enabled && svc.exposure === 'public') {
      defaults.push({ id: `mon_svc_${svc.id}`, name: `${svc.name} (proxy)`, type: 'http', target: `https://${svc.domain}`, expectedStatus: 200 });
    }
  }
  for (const d of defaults) {
    monitors[d.id] = {
      id: d.id, name: d.name, type: d.type, target: d.target,
      expectedStatus: d.expectedStatus || null, resolver: d.resolver || null,
      intervalSeconds: 300, timeoutSeconds: 5, retries: 2,
      enabled: true, notify: true, notifyAfterFailures: 2,
      lastCheck: null, lastStatus: 'unknown', lastSuccess: null, lastFailure: null,
      failureCount: 0, consecutiveFailures: 0, lastResponseMs: null,
      nextCheckAt: new Date(now + 60000).toISOString(), tags: [], notes: '',
    };
  }
  saveMonitors(monitors);
}

// ── Phase 3: File Drop helpers ───────────────────────────────────────────────
function generateShareToken() {
  return crypto.randomBytes(24).toString('hex');
}
function hashFilePassword(pass) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pass, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}
function verifyFilePassword(pass, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  try {
    const attempt = crypto.pbkdf2Sync(pass, salt, 100000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
  } catch { return false; }
}
function getFiledropUsageMb() {
  try {
    let total = 0;
    const files = fs.readdirSync(FILEDROP_DIR);
    for (const f of files) {
      try { total += fs.statSync(path.join(FILEDROP_DIR, f)).size; } catch {}
    }
    return Math.round(total / (1024 * 1024));
  } catch { return 0; }
}
function cleanupExpiredShares() {
  const shares = loadFiledropShares();
  let changed = false;
  for (const [id, share] of Object.entries(shares)) {
    const expired = share.expiresAt && new Date(share.expiresAt).getTime() < Date.now();
    const exhausted = share.maxDownloads && share.downloads >= share.maxDownloads;
    if (expired || exhausted || share.status === 'expired') {
      try { fs.unlinkSync(path.join(FILEDROP_DIR, share.storedName)); } catch {}
      delete shares[id];
      changed = true;
    }
  }
  if (changed) saveFiledropShares(shares);
  return changed;
}

// ── Phase 3: Module A — Uptime Monitor ───────────────────────────────────────

app.get('/api/monitors', auth, (req, res) => {
  seedDefaultMonitors();
  const monitors = loadMonitors();
  res.json({ monitors: Object.values(monitors) });
});

app.get('/api/monitors/:id', auth, (req, res) => {
  const monitors = loadMonitors();
  const m = monitors[req.params.id];
  if (!m) return res.status(404).json({ error: 'Monitor not found' });
  res.json(m);
});

const MONITOR_VALID_TYPES = ['http', 'https', 'tcp', 'dns', 'docker', 'tls'];
const MONITOR_SAFE_CONTAINER_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;
const MONITOR_SAFE_DOMAIN_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

app.post('/api/monitors', auth, (req, res) => {
  const { name, type, target, expectedStatus, resolver, intervalSeconds, timeoutSeconds, retries, notify, notifyAfterFailures, tags, notes } = req.body;
  if (!name || !type || !target) return res.status(400).json({ error: 'name, type, target required' });
  if (!MONITOR_VALID_TYPES.includes(type))
    return res.status(400).json({ error: `type must be one of: ${MONITOR_VALID_TYPES.join(', ')}` });
  if ((type === 'http' || type === 'https') && !/^https?:\/\/.+/.test(target))
    return res.status(400).json({ error: 'HTTP/HTTPS monitor target must be a valid URL starting with http:// or https://' });
  if (type === 'tcp' || type === 'tls') {
    const p = parseInt(req.body.port || 443);
    if (!p || p < 1 || p > 65535) return res.status(400).json({ error: 'port must be between 1 and 65535' });
  }
  if (type === 'docker' && !MONITOR_SAFE_CONTAINER_RE.test(target))
    return res.status(400).json({ error: 'docker target must be a valid container name (alphanumeric, dash, dot, underscore)' });
  if (type === 'dns' && !MONITOR_SAFE_DOMAIN_RE.test(target))
    return res.status(400).json({ error: 'dns target must be a valid domain name' });
  const monitors = loadMonitors();
  const id = `mon_${Date.now()}`;
  monitors[id] = {
    id, name, type, target,
    expectedStatus: expectedStatus || 200, resolver: resolver || null,
    intervalSeconds: intervalSeconds || 300, timeoutSeconds: timeoutSeconds || 5,
    retries: retries || 2, enabled: true,
    notify: notify !== false, notifyAfterFailures: notifyAfterFailures || 2,
    lastCheck: null, lastStatus: 'unknown', lastSuccess: null, lastFailure: null,
    failureCount: 0, consecutiveFailures: 0, lastResponseMs: null,
    nextCheckAt: new Date(Date.now() + 30000).toISOString(),
    tags: tags || [], notes: notes || '',
  };
  saveMonitors(monitors);
  res.json({ ok: true, monitor: monitors[id] });
});

app.patch('/api/monitors/:id', auth, (req, res) => {
  const monitors = loadMonitors();
  const m = monitors[req.params.id];
  if (!m) return res.status(404).json({ error: 'Monitor not found' });
  const fields = ['name','type','target','expectedStatus','resolver','intervalSeconds','timeoutSeconds','retries','notify','notifyAfterFailures','tags','notes'];
  for (const f of fields) { if (req.body[f] !== undefined) m[f] = req.body[f]; }
  saveMonitors(monitors);
  res.json({ ok: true, monitor: m });
});

app.delete('/api/monitors/:id', auth, (req, res) => {
  const monitors = loadMonitors();
  if (!monitors[req.params.id]) return res.status(404).json({ error: 'Monitor not found' });
  delete monitors[req.params.id];
  saveMonitors(monitors);
  const hist = loadMonitorHistory();
  delete hist[req.params.id];
  saveMonitorHistory(hist);
  res.json({ ok: true });
});

app.post('/api/monitors/:id/enable', auth, (req, res) => {
  const monitors = loadMonitors();
  const m = monitors[req.params.id];
  if (!m) return res.status(404).json({ error: 'Monitor not found' });
  m.enabled = true;
  if (m.lastStatus === 'disabled') m.lastStatus = 'unknown';
  m.nextCheckAt = new Date(Date.now() + 30000).toISOString();
  saveMonitors(monitors);
  res.json({ ok: true });
});

app.post('/api/monitors/:id/disable', auth, (req, res) => {
  const monitors = loadMonitors();
  const m = monitors[req.params.id];
  if (!m) return res.status(404).json({ error: 'Monitor not found' });
  m.enabled = false;
  m.lastStatus = 'disabled';
  saveMonitors(monitors);
  res.json({ ok: true });
});

app.post('/api/monitors/:id/check', auth, async (req, res) => {
  const monitors = loadMonitors();
  const m = monitors[req.params.id];
  if (!m) return res.status(404).json({ error: 'Monitor not found' });
  m.nextCheckAt = new Date().toISOString(); // mark as due immediately
  saveMonitors(monitors);
  const result = await runMonitorCheck(m);
  const updated = loadMonitors()[m.id];
  res.json({ ok: true, status: updated?.lastStatus, ms: result.ms, error: result.error });
});

app.get('/api/monitors/:id/history', auth, (req, res) => {
  const hist = loadMonitorHistory();
  res.json({ history: hist[req.params.id] || [] });
});

// ── Phase 3: Module B — Curated App Launcher ─────────────────────────────────

app.get('/api/apps/catalog', auth, (req, res) => {
  res.json({ catalog: Object.values(APP_CATALOG) });
});

app.get('/api/apps', auth, async (req, res) => {
  const apps = loadApps();
  const result = await Promise.all(Object.values(apps).map(async app => {
    try {
      const data = await dockerApiRequest(`/containers/${encodeURIComponent('easywg-' + app.id)}/json`);
      return { ...app, containerStatus: data?.State?.Status || 'unknown', running: data?.State?.Running === true };
    } catch { return { ...app, containerStatus: 'not_found', running: false }; }
  }));
  res.json({ apps: result });
});

app.post('/api/apps/:id/install', auth, requiresAction('appsLifecycle'), async (req, res) => {
  const catalogEntry = APP_CATALOG[req.params.id];
  if (!catalogEntry) return res.status(404).json({ error: 'App not in catalog' });
  const apps = loadApps();
  if (apps[req.params.id]) return res.status(400).json({ error: 'App already installed' });

  const { exposure, domain, confirmed } = req.body;
  const mode = exposure === 'public' ? 'public' : 'vpn_only';
  if (mode === 'public' && !confirmed) return res.status(400).json({ error: 'Public exposure requires confirmed:true' });

  const containerName = `easywg-${catalogEntry.id}`;
  try {
    // Create container via Docker Engine API
    const binds = (catalogEntry.namedVolumes || []).map(v => `${v.name}:${v.target}`);
    const createBody = {
      Image: catalogEntry.image,
      Env: catalogEntry.env || [],
      HostConfig: {
        Binds: binds,
        NetworkMode: 'host',
        RestartPolicy: { Name: 'unless-stopped' },
      },
    };
    const created = await dockerPost(`/containers/create?name=${encodeURIComponent(containerName)}`, createBody);
    if (created.status !== 201) {
      return res.status(500).json({ error: `Docker create failed: ${JSON.stringify(created.body)}` });
    }
    const containerId = created.body.Id;

    // Start container
    const started = await dockerPost(`/containers/${containerId}/start`, null);
    if (started.status !== 204) {
      return res.status(500).json({ error: `Docker start failed: ${JSON.stringify(started.body)}` });
    }

    const appRecord = {
      id: catalogEntry.id, catalogId: catalogEntry.id,
      containerId, containerName, status: 'running',
      exposure: mode, domain: domain || '',
      proxyServiceId: null, monitorId: null,
      installedAt: new Date().toISOString(),
    };

    // Create proxy service if domain provided
    if (domain) {
      const services = loadProxyServices();
      const svcId = `svc_app_${catalogEntry.id}`;
      services[svcId] = {
        id: svcId, name: catalogEntry.name, domain,
        target: `http://127.0.0.1:${catalogEntry.internalPort}`,
        exposure: mode, enabled: true,
        createdAt: new Date().toISOString(), notes: `Auto-created for ${catalogEntry.name}`,
      };
      const reload = await writeCaddyServices(services);
      if (reload.ok) { saveProxyServices(services); appRecord.proxyServiceId = svcId; }
    }

    // Create health monitor
    const monitors = loadMonitors();
    const monId = `mon_app_${catalogEntry.id}`;
    monitors[monId] = {
      id: monId, name: `${catalogEntry.name} (app)`,
      type: catalogEntry.healthcheck.type || 'http',
      target: `http://127.0.0.1:${catalogEntry.healthcheck.port}${catalogEntry.healthcheck.path || '/'}`,
      expectedStatus: 200, resolver: null,
      intervalSeconds: 120, timeoutSeconds: 5, retries: 2,
      enabled: true, notify: true, notifyAfterFailures: 3,
      lastCheck: null, lastStatus: 'unknown', lastSuccess: null, lastFailure: null,
      failureCount: 0, consecutiveFailures: 0, lastResponseMs: null,
      nextCheckAt: new Date(Date.now() + 60000).toISOString(), tags: ['app'], notes: '',
    };
    saveMonitors(monitors);
    appRecord.monitorId = monId;

    apps[catalogEntry.id] = appRecord;
    saveApps(apps);

    res.json({ ok: true, app: appRecord });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/apps/:id/start', auth, requiresAction('appsLifecycle'), async (req, res) => {
  try {
    const r = await dockerPost(`/containers/${encodeURIComponent('easywg-' + req.params.id)}/start`, null);
    if (r.status === 204 || r.status === 304) return res.json({ ok: true });
    res.status(500).json({ error: JSON.stringify(r.body) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/apps/:id/stop', auth, async (req, res) => {
  try {
    const r = await dockerPost(`/containers/${encodeURIComponent('easywg-' + req.params.id)}/stop`, null);
    if (r.status === 204 || r.status === 304) return res.json({ ok: true });
    res.status(500).json({ error: JSON.stringify(r.body) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/apps/:id/restart', auth, async (req, res) => {
  try {
    const r = await dockerPost(`/containers/${encodeURIComponent('easywg-' + req.params.id)}/restart`, null);
    if (r.status === 204) return res.json({ ok: true });
    res.status(500).json({ error: JSON.stringify(r.body) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/apps/:id/logs', auth, async (req, res) => {
  try {
    const tail = parseInt(req.query.tail || '200');
    const data = await new Promise((resolve, reject) => {
      const req2 = http.request({
        socketPath: DOCKER_SOCK,
        path: `/containers/${encodeURIComponent('easywg-' + req.params.id)}/logs?stdout=1&stderr=1&tail=${tail}&timestamps=1`,
        method: 'GET',
      }, r => {
        const chunks = [];
        r.on('data', d => chunks.push(d));
        r.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req2.on('error', reject);
      req2.setTimeout(8000, () => { req2.destroy(); reject(new Error('timeout')); });
      req2.end();
    });
    // Docker multiplexed log stream: strip 8-byte headers
    let text = '';
    let i = 0;
    while (i + 8 <= data.length) {
      const size = data.readUInt32BE(i + 4);
      if (i + 8 + size > data.length) break;
      text += data.slice(i + 8, i + 8 + size).toString('utf8');
      i += 8 + size;
    }
    if (!text) text = data.toString('utf8');
    res.json({ ok: true, logs: text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/apps/:id/update', auth, async (req, res) => {
  try {
    const cName = encodeURIComponent('easywg-' + req.params.id);
    const catalogEntry = APP_CATALOG[req.params.id];
    if (!catalogEntry) return res.status(404).json({ error: 'App not in catalog' });
    // Pull new image
    const pull = await dockerPost(`/images/create?fromImage=${encodeURIComponent(catalogEntry.image)}`, null);
    // Restart container
    await dockerPost(`/containers/${cName}/restart`, null);
    res.json({ ok: true, pullStatus: pull.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/apps/:id/remove', auth, requiresAction('appsLifecycle'), async (req, res) => {
  const { confirmed, deleteData } = req.body;
  if (!confirmed) return res.status(400).json({ error: 'requires confirmed:true' });
  const apps = loadApps();
  const appRec = apps[req.params.id];
  const cName = encodeURIComponent('easywg-' + req.params.id);
  try {
    // Stop + remove container
    await dockerPost(`/containers/${cName}/stop`, null);
    await dockerDelete(`/containers/${cName}?force=true`);
    // Remove named volumes if deleteData
    if (deleteData === true) {
      const catalogEntry = APP_CATALOG[req.params.id];
      if (catalogEntry) {
        for (const v of (catalogEntry.namedVolumes || [])) {
          await dockerDelete(`/volumes/${encodeURIComponent(v.name)}`);
        }
      }
    }
    // Remove proxy service
    if (appRec?.proxyServiceId) {
      const services = loadProxyServices();
      delete services[appRec.proxyServiceId];
      await writeCaddyServices(services);
      saveProxyServices(services);
    }
    // Remove monitor
    if (appRec?.monitorId) {
      const monitors = loadMonitors();
      delete monitors[appRec.monitorId];
      saveMonitors(monitors);
    }
    delete apps[req.params.id];
    saveApps(apps);
    res.json({ ok: true, dataDeleted: !!deleteData });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Phase 3: Module C — Secure File Drop ─────────────────────────────────────

app.get('/api/filedrop', auth, (req, res) => {
  cleanupExpiredShares();
  const shares = loadFiledropShares();
  res.json({ shares: Object.values(shares) });
});

app.post('/api/filedrop/upload', auth, requiresAction('fileDropPublic'), (req, res) => {
  let responded = false;
  const respond = (code, body) => { if (!responded) { responded = true; res.status(code).json(body); } };

  // Ensure storage dir exists
  try { fs.mkdirSync(FILEDROP_DIR, { recursive: true }); } catch {}

  // Total storage check
  if (getFiledropUsageMb() >= FILEDROP_TOTAL_GB * 1024) {
    return respond(507, { error: `Storage limit of ${FILEDROP_TOTAL_GB} GB reached. Run cleanup first.` });
  }

  let Busboy;
  try { Busboy = require('busboy'); } catch {
    return respond(500, { error: 'busboy not installed — run: npm install in portal directory' });
  }

  const formFields = {};
  let fileToken = null, origName = 'upload', mimeType = 'application/octet-stream';
  let fileWriteDone = Promise.resolve(0);
  let fileLimitHit = false;

  const bb = Busboy({ headers: req.headers, limits: { fileSize: FILEDROP_MAX_MB * 1024 * 1024, files: 1 } });

  bb.on('field', (name, val) => { formFields[name] = val; });

  bb.on('file', (_name, stream, info) => {
    fileToken = generateShareToken();
    origName  = path.basename(info.filename || 'upload');
    mimeType  = info.mimeType || 'application/octet-stream';
    const destPath = path.join(FILEDROP_DIR, fileToken);
    const ws = fs.createWriteStream(destPath);
    stream.on('limit', () => { fileLimitHit = true; stream.resume(); });
    fileWriteDone = new Promise((resolve, reject) => {
      stream.pipe(ws);
      ws.on('finish', () => resolve(ws.bytesWritten));
      ws.on('error', reject);
    });
  });

  bb.on('close', async () => {
    if (!fileToken) return respond(400, { error: 'No file uploaded' });
    try {
      const fileSize = await fileWriteDone;
      if (fileLimitHit) {
        try { fs.unlinkSync(path.join(FILEDROP_DIR, fileToken)); } catch {}
        return respond(400, { error: `File exceeds ${FILEDROP_MAX_MB} MB limit` });
      }
      const mode = formFields.mode === 'public' ? 'public' : 'vpn_only';
      if (mode === 'public' && formFields.confirmed !== 'true') {
        try { fs.unlinkSync(path.join(FILEDROP_DIR, fileToken)); } catch {}
        return respond(400, { error: 'Public mode requires confirmed=true' });
      }
      const expiryDays = Math.min(FILEDROP_MAX_EXPIRY, Math.max(1, parseInt(formFields.expires || String(FILEDROP_DEFAULT_EXPIRY))));
      const maxDownloads = Math.max(1, parseInt(formFields.maxDownloads || '5'));
      const pass = formFields.password || '';
      const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();
      const share = {
        id: fileToken, token: fileToken,
        originalName: origName, storedName: fileToken,
        sizeBytes: fileSize, mimeType,
        uploadedAt: new Date().toISOString(), expiresAt,
        maxDownloads, downloads: 0,
        passwordProtected: !!pass,
        passwordHash: pass ? hashFilePassword(pass) : null,
        mode, status: 'active', notes: '',
      };
      const shares = loadFiledropShares();
      shares[fileToken] = share;
      saveFiledropShares(shares);
      sendNotification('filedrop_shared', { name: origName, mode }).catch(() => {});
      respond(200, { ok: true, id: fileToken, token: fileToken, url: `/files/${fileToken}`, expiresAt, originalName: origName });
    } catch (e) { respond(500, { error: e.message }); }
  });

  bb.on('error', e => respond(500, { error: e.message }));
  req.pipe(bb);
});

app.delete('/api/filedrop/:id', auth, (req, res) => {
  const shares = loadFiledropShares();
  const share = shares[req.params.id];
  if (!share) return res.status(404).json({ error: 'Share not found' });
  try { fs.unlinkSync(path.join(FILEDROP_DIR, share.storedName)); } catch {}
  delete shares[req.params.id];
  saveFiledropShares(shares);
  res.json({ ok: true });
});

app.post('/api/filedrop/cleanup', auth, (req, res) => {
  const cleaned = cleanupExpiredShares();
  res.json({ ok: true, cleaned });
});

app.get('/api/filedrop/status', auth, (req, res) => {
  const shares = loadFiledropShares();
  const usageMb = getFiledropUsageMb();
  res.json({
    shares: Object.keys(shares).length,
    usageMb, limitMb: FILEDROP_TOTAL_GB * 1024,
    pct: Math.round(usageMb / (FILEDROP_TOTAL_GB * 1024) * 100),
  });
});

// Public download endpoint (no auth — token is the secret)
function serveFiledrop(req, res) {
  const { token } = req.params;
  const shares = loadFiledropShares();
  const share = shares[token];
  if (!share || share.status !== 'active') return res.status(404).json({ error: 'File not found' });
  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Link has expired' });
  }
  if (share.maxDownloads && share.downloads >= share.maxDownloads) {
    return res.status(410).json({ error: 'Download limit reached' });
  }
  // VPN-only shares: enforce source membership in the VPN subnet (or loopback =
  // SSH-tunnel admin) server-side. The token alone must not let a public client
  // download. Legacy shares without a `mode` are treated as public.
  if (share.mode === 'vpn_only' && !netGuards.isVpnOrLocalClient(req, VPN_SUBNET)) {
    return res.status(403).json({ error: 'This file is only available over the VPN.' });
  }
  // Password check — POST body only. Query strings land in access logs, browser
  // history, referrers and were echoed into the Security → Logs panel.
  if (share.passwordProtected) {
    const pw = (req.method === 'POST' ? req.body?.password : null) || '';
    if (!pw) return res.status(401).json({ error: 'Password required', passwordRequired: true });
    if (!verifyFilePassword(pw, share.passwordHash)) return res.status(401).json({ error: 'Wrong password' });
  }
  const filePath = path.join(FILEDROP_DIR, share.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  share.downloads += 1;
  shares[token] = share;
  saveFiledropShares(shares);
  sendNotification('filedrop_downloaded', { name: share.originalName }).catch(() => {});

  res.setHeader('Content-Disposition', `attachment; filename="${share.originalName.replace(/"/g, '')}"`);
  res.setHeader('Content-Type', share.mimeType || 'application/octet-stream');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  fs.createReadStream(filePath).pipe(res);
}

app.get('/files/:token',  serveFiledrop);
app.post('/files/:token', serveFiledrop);

// ── Phase 3: Module D — VPS Migration Assistant ───────────────────────────────

app.get('/api/migration/readiness', auth, async (req, res) => {
  const [wg, ag, caddyR] = await Promise.all([
    checkService('wg-easy', `${WG_URL}/api/session`, [200, 401]),
    checkService('adguard', `${AG_URL}/control/status`, [200, 401, 403]),
    checkDockerContainer('caddy'),
  ]);
  const caddy = { name: 'caddy', up: caddyR.ok };
  const portal = { name: 'portal', up: true };
  const services = loadProxyServices();
  const devices  = loadDevices();
  const monitors = loadMonitors();
  const apps     = loadApps();
  res.json({
    vpsHost: VPS_HOST, vpnSubnet: VPN_SUBNET,
    services: { wg, ag, caddy, portal },
    counts: {
      devices:  Object.keys(devices).length,
      proxySvc: Object.keys(services).length,
      monitors: Object.keys(monitors).length,
      apps:     Object.keys(apps).length,
    },
    readyForMigration: wg.up && ag.up,
  });
});

app.get('/api/migration/dns-plan', auth, (req, res) => {
  const services = loadProxyServices();
  const domains = [];
  if (VPS_HOST) {
    for (const svc of Object.values(services)) {
      if (svc.exposure === 'public' && svc.domain) {
        domains.push({ domain: svc.domain, currentIp: VPS_HOST, service: svc.name });
      }
    }
  }
  res.json({ currentIp: VPS_HOST, domains });
});

app.get('/api/migration/client-impact', auth, async (req, res) => {
  try {
    const cfgRaw = await wgFetch('/api/wireguard/client');
    const clients = Array.isArray(cfgRaw) ? cfgRaw : (cfgRaw?.data || []);
    const usesIp = VPS_HOST && /^\d+\.\d+\.\d+\.\d+$/.test(VPS_HOST);
    res.json({
      endpointType: usesIp ? 'ip' : 'hostname',
      endpoint: VPS_HOST,
      clientCount: clients.length,
      clientsNeedUpdate: usesIp,
      message: usesIp
        ? 'WireGuard endpoint is an IP address. Clients must be regenerated or updated after migration.'
        : 'WireGuard endpoint is a hostname. Clients will reconnect automatically after DNS update.',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/migration/export', auth, async (req, res) => {
  try {
    const filename = await createBackupArchive(false);
    res.json({ ok: true, filename, path: path.join(BACKUP_DIR, filename) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/migration/checklist', auth, async (req, res) => {
  const services = loadProxyServices();
  const domains = Object.values(services).filter(s => s.exposure === 'public').map(s => s.domain);
  const usesIp = VPS_HOST && /^\d+\.\d+\.\d+\.\d+$/.test(VPS_HOST);
  const steps = [
    { step: 1, title: 'Create migration backup on old VPS', cmd: './easywg backup', value: 'backup file in ./backups/' },
    { step: 2, title: 'Download backup to local machine', detail: 'Download via portal Backups tab or scp', value: null },
    { step: 3, title: 'Set up new VPS with Easy-WG-Combo', detail: 'Run bootstrap.sh on the new VPS', value: null },
    { step: 4, title: 'Upload backup to new VPS', detail: 'scp backup.tar.gz root@new-vps:/root/Easy-WG-Combo/backups/', value: null },
    { step: 5, title: 'Run restore dry-run on new VPS', cmd: './easywg restore --dry-run <file>', value: null },
    { step: 6, title: 'Restore on new VPS', cmd: './easywg restore <file>', value: null },
    { step: 7, title: 'Validate services on new VPS', detail: './easywg health', value: null },
    { step: 8, title: 'Update DNS records', detail: domains.length ? `Update: ${domains.join(', ')} → new IP` : 'No public domains configured', value: VPS_HOST || 'unknown' },
    { step: 9, title: 'Test WireGuard clients', detail: usesIp ? 'REQUIRED: Clients use old IP — regenerate configs' : 'Clients reconnect automatically after DNS TTL', value: VPS_HOST },
    { step: 10, title: 'Decommission old VPS', detail: 'Verify all services work on new VPS first', value: null },
  ];
  res.json({ steps, currentIp: VPS_HOST, domains, endpointType: usesIp ? 'ip' : 'hostname' });
});

app.post('/api/migration/validate', auth, async (req, res) => {
  const [wg, ag, caddyR] = await Promise.all([
    checkService('wg-easy',  `${WG_URL}/api/session`,    [200, 401]),
    checkService('adguard',  `${AG_URL}/control/status`, [200, 401, 403]),
    checkDockerContainer('caddy'),
  ]);
  const monitors = loadMonitors();
  const devices  = loadDevices();
  const services = loadProxyServices();
  const apps     = loadApps();
  res.json({
    services: {
      'wg-easy': wg.up, 'adguard': ag.up, 'caddy': caddyR.ok, 'portal': true,
    },
    data: {
      devices:  Object.keys(devices).length,
      monitors: Object.keys(monitors).length,
      services: Object.keys(services).length,
      apps:     Object.keys(apps).length,
    },
    score: [wg.up, ag.up, caddyR.ok].filter(Boolean).length,
    maxScore: 3,
  });
});

// ── Xray helpers ─────────────────────────────────────────────────────────────

// Reconcile the derived xray/config.json client list from devices.json, which is
// the source of truth for per-device UUIDs. Idempotent: only rewrites the file and
// restarts Xray when the client set actually changed, so it is cheap to call on boot.
async function syncXrayClients() {
  if (!XRAY_ENABLED) return;
  try {
    const cfg = JSON.parse(fs.readFileSync(XRAY_CONFIG_PATH, 'utf8'));
    const devices = loadDevices();
    const clients = [];
    if (XRAY_UUID) clients.push({ id: XRAY_UUID, flow: 'xtls-rprx-vision' });
    for (const dev of Object.values(devices)) {
      if (!dev.revokedAt && dev.xrayUuid && dev.xrayUuid !== XRAY_UUID)
        clients.push({ id: dev.xrayUuid, flow: 'xtls-rprx-vision' });
    }
    const current = cfg.inbounds?.[0]?.settings?.clients || [];
    const inSync = current.length === clients.length &&
      current.every((c, i) => c.id === clients[i].id && c.flow === clients[i].flow);
    if (inSync) return;
    cfg.inbounds[0].settings.clients = clients;
    fs.writeFileSync(XRAY_CONFIG_PATH, JSON.stringify(cfg, null, 2));
    await dockerPost('/containers/xray/restart', null);
  } catch (e) {
    console.error('syncXrayClients failed:', e.message);
  }
}

// ── Xray VLESS+Reality routes ────────────────────────────────────────────────

app.get('/api/xray/status', auth, async (_req, res) => {
  if (!XRAY_ENABLED) return res.json({ enabled: false });
  try {
    const data = await dockerApiRequest('/containers/xray/json');
    res.json({
      enabled:   true,
      running:   data?.State?.Running === true,
      status:    data?.State?.Status || 'unknown',
      startedAt: data?.State?.StartedAt || null,
      uuid:      XRAY_UUID,
      publicKey: XRAY_PUBLIC_KEY,
      sniTarget: XRAY_SNI_TARGET,
      port:      XRAY_PORT,
    });
  } catch (e) {
    res.json({ enabled: true, running: false, status: 'error', error: e.message });
  }
});

app.get('/api/xray/config', auth, (_req, res) => {
  if (!XRAY_ENABLED) return res.json({ enabled: false });
  try {
    const cfg = JSON.parse(fs.readFileSync(XRAY_CONFIG_PATH, 'utf8'));
    // Redact private key before returning to browser
    if (cfg?.inbounds?.[0]?.streamSettings?.realitySettings) {
      cfg.inbounds[0].streamSettings.realitySettings.privateKey = '***';
    }
    res.json({ enabled: true, config: cfg });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/xray/client-config', auth, async (req, res) => {
  if (!XRAY_ENABLED) return res.json({ enabled: false });
  const label = String(req.query.label || getServerName()).slice(0, 64);
  const host  = VPS_HOST || '0.0.0.0';
  const params = new URLSearchParams({
    encryption: 'none',
    flow:       'xtls-rprx-vision',
    security:   'reality',
    sni:        XRAY_SNI_TARGET,
    fp:         'chrome',
    pbk:        XRAY_PUBLIC_KEY,
    sid:        XRAY_SHORT_ID,
    type:       'tcp',
  });
  const uri = `vless://${XRAY_UUID}@${host}:${XRAY_PORT}?${params.toString()}#${encodeURIComponent(label)}`;
  try {
    const qrcode = await QRCode.toDataURL(uri, { width: 256, margin: 2 });
    res.json({ enabled: true, uri, qrcode, label });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/xray/restart', auth, async (_req, res) => {
  if (!XRAY_ENABLED) return res.status(404).json({ error: 'Xray not enabled' });
  try {
    await new Promise((resolve, reject) => {
      const req2 = http.request({ socketPath: DOCKER_SOCK, path: '/containers/xray/restart', method: 'POST' }, r => {
        if (r.statusCode === 204) return resolve();
        reject(new Error(`Docker restart returned ${r.statusCode}`));
      });
      req2.on('error', reject);
      req2.end();
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start (skipped when the module is require()'d, e.g. by the test suite) ────
if (require.main === module) {
  // Monitor scheduler
  setInterval(() => {
    const monitors = loadMonitors();
    for (const m of Object.values(monitors)) {
      if (!m.enabled) continue;
      if (m.nextCheckAt && Date.now() < new Date(m.nextCheckAt).getTime()) continue;
      runMonitorCheck(m);
    }
  }, 60_000);

  app.listen(PORT, HOST, () => {
    console.log(`Portal listening on ${HOST}:${PORT}`);
    // Re-derive xray/config.json from devices.json on boot so per-device UUIDs survive a
    // bootstrap.sh re-run (configure_xray regenerates config.json with only the global UUID).
    if (XRAY_ENABLED) syncXrayClients().catch(() => {});
  });
}

module.exports = app;
