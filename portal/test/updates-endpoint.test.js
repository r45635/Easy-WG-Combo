'use strict';

// The network half of /api/system/updates is disabled here
// (UPDATE_CHECK_ENABLED=no) so the suite never reaches GitHub. What we assert
// is the contract around it: authentication, the local Caddyfile drift read,
// and that a disabled or unreachable check degrades quietly instead of 5xx.
process.env.UPDATE_CHECK_ENABLED = 'no';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const h = require('./helpers');

const CADDYFILE = path.join(h.TMP, 'Caddyfile');

const HARDENED = `example.com {
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "same-origin"
    X-Frame-Options "SAMEORIGIN"
    Permissions-Policy "geolocation=(), microphone=(), camera=()"
    Content-Security-Policy "default-src 'self'"
  }
}
`;

test('GET /api/system/updates requires authentication', async () => {
  const r = await h.api('/api/system/updates', { auth: false });
  assert.strictEqual(r.status, 401);
});

test('reports its own version and does not call out when disabled', async () => {
  const r = await h.api('/api/system/updates');
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.version, 'a version is always reported');
  assert.strictEqual(b.release.updateAvailable, false);
  assert.strictEqual(b.release.reason, 'disabled');
});

test('a missing Caddyfile is unknown, not drift', async () => {
  try { fs.unlinkSync(CADDYFILE); } catch { /* already absent */ }
  const b = await (await h.api('/api/system/updates')).json();
  assert.strictEqual(b.drift.drift, false);
  assert.strictEqual(b.drift.reason, 'caddyfile-unreadable');
});

test('a fully hardened Caddyfile reports no drift', async () => {
  fs.writeFileSync(CADDYFILE, HARDENED);
  const b = await (await h.api('/api/system/updates')).json();
  assert.strictEqual(b.drift.drift, false);
  assert.strictEqual(b.drift.csp, 'enforced');
  assert.deepStrictEqual(b.drift.missing, []);
});

test('a Caddyfile predating the hardening is flagged', async () => {
  fs.writeFileSync(CADDYFILE, `example.com {
  header {
    Strict-Transport-Security "max-age=31536000"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "same-origin"
  }
}
`);
  const b = await (await h.api('/api/system/updates')).json();
  assert.strictEqual(b.drift.drift, true);
  assert.strictEqual(b.drift.reason, 'headers-missing');
  assert.ok(b.drift.missing.includes('Content-Security-Policy'));
});

test('a report-only CSP is flagged as drift', async () => {
  fs.writeFileSync(CADDYFILE, HARDENED.replace(
    'Content-Security-Policy "', 'Content-Security-Policy-Report-Only "',
  ));
  const b = await (await h.api('/api/system/updates')).json();
  assert.strictEqual(b.drift.drift, true);
  assert.strictEqual(b.drift.csp, 'report-only');
});
