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

module.exports = {
  normalizeIp, trustedClientIp, isLoopback, ipv4ToInt, ipInCidr, isVpnOrLocalClient,
};
