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

// Non-globally-routable IPv4 ranges (loopback, RFC1918, link-local incl. cloud
// metadata 169.254.169.254, CGNAT, benchmarking, TEST-NET, multicast, reserved).
const BLOCKED_V4_CIDRS = [
  '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16',
  '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.168.0.0/16',
  '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24',
  '224.0.0.0/4', '240.0.0.0/4', '255.255.255.255/32',
];

function isReservedV4(dotted) {
  return BLOCKED_V4_CIDRS.some(c => ipInCidr(dotted, c));
}

// Parse an IPv6 literal (incl. IPv4-mapped forms, dotted or hex) into 16 bytes,
// or null if malformed. Handles a single '::' compression and an embedded IPv4
// tail such as ::ffff:1.2.3.4.
function parseIpv6(input) {
  let s = String(input).trim();
  if (s === '' || s.indexOf(':') === -1) return null;
  // Embedded dotted-IPv4 tail → convert to two hex groups so the rest is uniform.
  const lastColon = s.lastIndexOf(':');
  const tail = s.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = ipv4ToInt(tail);
    if (v4 === null) return null;
    s = s.slice(0, lastColon + 1) + ((v4 >>> 16) & 0xffff).toString(16) + ':' + (v4 & 0xffff).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] === '' ? [] : halves[0].split(':');
  let groups;
  if (halves.length === 2) {
    const back = halves[1] === '' ? [] : halves[1].split(':');
    const missing = 8 - head.length - back.length;
    if (missing < 1) return null;                 // '::' must compress ≥1 group
    groups = [...head, ...Array(missing).fill('0'), ...back];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(groups[i])) return null;
    const v = parseInt(groups[i], 16);
    bytes[i * 2] = (v >> 8) & 0xff;
    bytes[i * 2 + 1] = v & 0xff;
  }
  return bytes;
}

// Semantic classification: true unless the address is a globally routable unicast
// destination. Covers loopback / RFC1918 / link-local (incl. cloud metadata) /
// CGNAT and, crucially, IPv4-mapped IPv6 in BOTH dotted (::ffff:127.0.0.1) and hex
// (::ffff:7f00:1) notation, plus IPv6 loopback/ULA/link-local. Only IPv6 global
// unicast (2000::/3) is allowed. Hostnames (non-literals) return false — resolved
// and re-checked at connect time by the guarded lookup.
function isReservedIp(value) {
  const s = String(value || '').trim().replace(/^\[|\]$/g, '');
  if (s === '') return true;                                  // fail closed
  if (!s.includes(':')) {
    return ipv4ToInt(s) === null ? false : isReservedV4(s);   // dotted IPv4, or hostname
  }
  const bytes = parseIpv6(s);
  if (!bytes) return true;                                    // malformed IPv6 → fail closed
  // IPv4-mapped ::ffff:0:0/96 → classify the embedded IPv4.
  if (bytes.slice(0, 10).every(b => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isReservedV4(`${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`);
  }
  if (bytes.every(b => b === 0)) return true;                                     // ::
  if (bytes.slice(0, 15).every(b => b === 0) && bytes[15] === 1) return true;     // ::1
  return (bytes[0] & 0xe0) !== 0x20;                          // allow only 2000::/3
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

// Returns a dns.lookup-compatible function that refuses to resolve to a
// private/reserved address. Because the socket uses this lookup's result as its
// actual connect target, the validated address IS the connected address — there
// is no separate "resolve then reconnect by hostname" step, so DNS-rebinding /
// TOCTOU cannot slip a reserved IP past the check. Reuses isReservedIp (v4+v6).
function makeGuardedLookup(dnsLookup) {
  const lookup = dnsLookup || require('dns').lookup;
  return function guardedLookup(hostname, options, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    lookup(hostname, options || {}, (err, address, family) => {
      if (err) return callback(err);
      // options.all:true → address is [{address, family}, ...]
      if (Array.isArray(address)) {
        const bad = address.find(a => isReservedIp(a.address));
        if (bad) return callback(new Error(`blocked: ${hostname} resolves to a private/reserved address (${bad.address})`));
        return callback(null, address);
      }
      if (isReservedIp(address)) return callback(new Error(`blocked: ${hostname} resolves to a private/reserved address (${address})`));
      return callback(null, address, family);
    });
  };
}

module.exports = {
  normalizeIp, trustedClientIp, isLoopback, ipv4ToInt, ipInCidr, isVpnOrLocalClient,
  isReservedIp, isLiteralIp, splitHostPort, validateMonitor, makeGuardedLookup,
};
