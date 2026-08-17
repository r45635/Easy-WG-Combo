'use strict';

// Network trust helpers, kept pure and dependency-free so they can be unit
// tested without booting the HTTP server.

function normalizeIp(ip) {
  if (!ip) return '';
  return String(ip).replace(/^::ffff:/i, '').trim();
}

// Trustworthy client IP. Relies on app.set('trust proxy', 'loopback'): Express
// then honors X-Forwarded-For only when the immediate socket peer is loopback
// (Caddy reverse-proxies from 127.0.0.1, or an admin SSH tunnel), and uses the
// raw socket address for any remote peer. req.ip already encodes that policy;
// here we just strip the ::ffff: IPv4-mapped prefix.
function trustedClientIp(req) {
  return normalizeIp((req && (req.ip || (req.socket && req.socket.remoteAddress))) || '');
}

function isLoopback(ip) {
  const n = normalizeIp(ip);
  return n === '::1' || n === '127.0.0.1' || n.startsWith('127.');
}

function ipv4ToInt(ip) {
  const parts = normalizeIp(ip).split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const o = Number(p);
    if (o > 255) return null;
    n = (n * 256) + o;
  }
  return n >>> 0;
}

// Membership test for an IPv4 CIDR (e.g. '10.8.0.0/24'). Non-IPv4 inputs → false.
function ipInCidr(ip, cidr) {
  const [range, bitsStr] = String(cidr).split('/');
  const bits = Number(bitsStr);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = (bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0);
  return (ipInt & mask) === (rangeInt & mask);
}

// vpn_only gate: allow clients inside the VPN subnet and the loopback admin
// (SSH tunnel / same host). Everything else (public Internet) is denied.
function isVpnOrLocalClient(req, vpnSubnet) {
  const ip = trustedClientIp(req);
  return isLoopback(ip) || ipInCidr(ip, vpnSubnet);
}

// ── SSRF guards for the monitoring module ────────────────────────────────────

const BLOCKED_V4_CIDRS = [
  '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8',
  '169.254.0.0/16', '172.16.0.0/12', '192.168.0.0/16',
];

// True for loopback / private / link-local (incl. cloud metadata 169.254.169.254)
// / CGNAT literal IPs. Hostnames (non-literals) return false — those are checked
// at connect time by the probe functions.
function isReservedIp(value) {
  const n = normalizeIp(value).replace(/^\[|\]$/g, '');
  if (ipv4ToInt(n) !== null) return BLOCKED_V4_CIDRS.some(c => ipInCidr(n, c));
  if (n.includes(':')) {
    const low = n.toLowerCase();
    return low === '::1' || low === '::' || low.startsWith('fe8') || low.startsWith('fe9') ||
           low.startsWith('fea') || low.startsWith('feb') || low.startsWith('fc') || low.startsWith('fd');
  }
  return false; // hostname — resolved and re-checked at connect time
}

function isLiteralIp(host) {
  const h = normalizeIp(host).replace(/^\[|\]$/g, '');
  return ipv4ToInt(h) !== null || h.includes(':');
}

function splitHostPort(target) {
  const t = String(target || '');
  if (t.startsWith('[')) { const i = t.indexOf(']'); return { host: t.slice(1, i), port: t.slice(i + 2) }; }
  const idx = t.lastIndexOf(':');
  if (idx === -1) return { host: t, port: '' };
  return { host: t.slice(0, idx), port: t.slice(idx + 1) };
}

const MONITOR_TYPES  = ['http', 'https', 'tcp', 'dns', 'docker', 'tls'];
const MON_DOMAIN_RE  = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MON_CONTAINER_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;

// Validate a (possibly PATCH-merged) monitor definition. Returns an error string,
// or null when valid. Built-in/seeded monitors may target local services.
function validateMonitor(m, opts = {}) {
  const isBuiltin = !!opts.isBuiltin;
  const type = m.type;
  if (!MONITOR_TYPES.includes(type)) return `type must be one of: ${MONITOR_TYPES.join(', ')}`;
  const target = String(m.target || '');
  if (!target) return 'target is required';

  if (type === 'http' || type === 'https') {
    let u;
    try { u = new URL(target); } catch { return 'target must be a valid URL'; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'target must be http:// or https://';
    if (!isBuiltin && isLiteralIp(u.hostname) && isReservedIp(u.hostname)) return 'target is a private/reserved address';
  } else if (type === 'tcp' || type === 'tls') {
    const { host, port } = splitHostPort(target);
    const p = parseInt(port || m.port || (type === 'tls' ? 443 : 0), 10);
    if (!p || p < 1 || p > 65535) return 'port must be between 1 and 65535';
    if (!host) return 'target host is required';
    if (!isBuiltin && isLiteralIp(host) && isReservedIp(host)) return 'target is a private/reserved address';
  } else if (type === 'dns') {
    if (!MON_DOMAIN_RE.test(target)) return 'dns target must be a valid domain name';
    if (m.resolver) {
      if (!isLiteralIp(m.resolver)) return 'resolver must be an IP address';
      if (!isBuiltin && isReservedIp(m.resolver)) return 'resolver must be a public IP';
    }
  } else if (type === 'docker') {
    if (!MON_CONTAINER_RE.test(target)) return 'docker target must be a valid container name';
  }

  if (m.intervalSeconds !== undefined) {
    const iv = Number(m.intervalSeconds);
    if (!Number.isInteger(iv) || iv < 30 || iv > 86400) return 'intervalSeconds must be between 30 and 86400';
  }
  if (m.timeoutSeconds !== undefined) {
    const to = Number(m.timeoutSeconds);
    if (!Number.isInteger(to) || to < 1 || to > 60) return 'timeoutSeconds must be between 1 and 60';
  }
  return null;
}

module.exports = {
  normalizeIp, trustedClientIp, isLoopback, ipv4ToInt, ipInCidr, isVpnOrLocalClient,
  isReservedIp, isLiteralIp, splitHostPort, validateMonitor,
};
