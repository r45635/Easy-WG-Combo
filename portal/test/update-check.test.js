'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const u = require('../lib/update-check');

test('parseVersion — tolerates the v prefix and rejects junk', () => {
  assert.deepStrictEqual(u.parseVersion('0.4.0').parts, [0, 4, 0]);
  assert.deepStrictEqual(u.parseVersion('v0.4.0').parts, [0, 4, 0]);
  assert.deepStrictEqual(u.parseVersion(' V1.2.3 ').parts, [1, 2, 3]);
  assert.strictEqual(u.parseVersion('0.3.0-alpha').prerelease, 'alpha');
  assert.strictEqual(u.parseVersion(''), null);
  assert.strictEqual(u.parseVersion('dev'), null);
  assert.strictEqual(u.parseVersion(null), null);
  assert.strictEqual(u.parseVersion('0.4'), null);
});

test('compareVersions — ordering, including prereleases', () => {
  assert.strictEqual(u.compareVersions('0.4.0', '0.5.0'), -1);
  assert.strictEqual(u.compareVersions('0.5.0', '0.4.0'), 1);
  assert.strictEqual(u.compareVersions('0.4.0', 'v0.4.0'), 0);
  assert.strictEqual(u.compareVersions('0.4.9', '0.5.0'), -1);
  assert.strictEqual(u.compareVersions('1.0.0', '0.9.9'), 1);
  // a prerelease precedes its own release
  assert.strictEqual(u.compareVersions('0.5.0-rc.1', '0.5.0'), -1);
  assert.strictEqual(u.compareVersions('0.5.0', '0.5.0-rc.1'), 1);
  // unreadable input never pretends to know
  assert.strictEqual(u.compareVersions('dev', '0.5.0'), null);
  assert.strictEqual(u.compareVersions('0.4.0', ''), null);
});

test('parseLatestRelease — reads a GitHub payload, refuses a malformed one', () => {
  const r = u.parseLatestRelease({
    tag_name: 'v0.5.0',
    html_url: 'https://github.com/r45635/Easy-WG-Combo/releases/tag/v0.5.0',
    published_at: '2026-10-19T00:00:00Z',
    prerelease: false,
  });
  assert.strictEqual(r.version, '0.5.0');
  assert.strictEqual(r.prerelease, false);
  assert.match(r.url, /releases\/tag\/v0\.5\.0$/);

  assert.strictEqual(u.parseLatestRelease(null), null);
  assert.strictEqual(u.parseLatestRelease({}), null);
  assert.strictEqual(u.parseLatestRelease({ tag_name: 'nightly' }), null);
  assert.strictEqual(u.parseLatestRelease('v0.5.0'), null);
});

test('evaluateUpdate — only flags a genuinely newer release', () => {
  const latest = { version: '0.5.0', url: 'u', publishedAt: 'p', prerelease: false };
  assert.strictEqual(u.evaluateUpdate('0.4.0', latest).updateAvailable, true);
  assert.strictEqual(u.evaluateUpdate('0.5.0', latest).updateAvailable, false);
  assert.strictEqual(u.evaluateUpdate('0.6.0', latest).updateAvailable, false);
});

test('evaluateUpdate — fails quiet when either side is unknown', () => {
  const latest = { version: '0.5.0' };
  const a = u.evaluateUpdate('dev', latest);
  assert.strictEqual(a.updateAvailable, false);
  assert.strictEqual(a.reason, 'unknown-current');

  const b = u.evaluateUpdate('0.4.0', null);
  assert.strictEqual(b.updateAvailable, false);
  assert.strictEqual(b.reason, 'unknown-latest');

  const c = u.evaluateUpdate('0.4.0', { version: 'nightly' });
  assert.strictEqual(c.updateAvailable, false);
  assert.strictEqual(c.reason, 'unknown-latest');
});

const FULL_CADDYFILE = `
example.com {
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "same-origin"
    X-Frame-Options "SAMEORIGIN"
    Permissions-Policy "geolocation=(), microphone=(), camera=()"
    Content-Security-Policy "default-src 'self'"
  }
  reverse_proxy 127.0.0.1:8080
}
`;

test('inspectCaddyHeaders — a fully hardened Caddyfile', () => {
  const r = u.inspectCaddyHeaders(FULL_CADDYFILE);
  assert.strictEqual(r.readable, true);
  assert.deepStrictEqual(r.missing, []);
  assert.strictEqual(r.present.length, 6);
  assert.strictEqual(r.csp, 'enforced');
  assert.strictEqual(u.evaluateDrift(r).drift, false);
});

test('inspectCaddyHeaders — the pre-hardening Caddyfile that shipped for weeks', () => {
  // Exactly Toronto's case before 2026-10-02: three headers, no CSP.
  const partial = `
example.com {
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "same-origin"
  }
}
`;
  const r = u.inspectCaddyHeaders(partial);
  assert.strictEqual(r.present.length, 3);
  assert.deepStrictEqual(r.missing.sort(), [
    'Content-Security-Policy', 'Permissions-Policy', 'X-Frame-Options',
  ].sort());
  assert.strictEqual(r.csp, 'missing');
  const d = u.evaluateDrift(r);
  assert.strictEqual(d.drift, true);
  assert.strictEqual(d.reason, 'headers-missing');
});

test('inspectCaddyHeaders — report-only CSP is drift, not protection', () => {
  const reportOnly = FULL_CADDYFILE.replace(
    'Content-Security-Policy "default-src',
    'Content-Security-Policy-Report-Only "default-src',
  );
  const r = u.inspectCaddyHeaders(reportOnly);
  assert.strictEqual(r.csp, 'report-only');
  assert.ok(r.missing.includes('Content-Security-Policy'));
  const d = u.evaluateDrift(r);
  assert.strictEqual(d.drift, true);
});

test('inspectCaddyHeaders — a commented-out header does not count as present', () => {
  const commented = `
example.com {
  header {
    # X-Frame-Options "SAMEORIGIN"
    Strict-Transport-Security "max-age=31536000"
  }
}
`;
  const r = u.inspectCaddyHeaders(commented);
  assert.ok(r.missing.includes('X-Frame-Options'));
  assert.ok(r.present.includes('Strict-Transport-Security'));
});

test('inspectCaddyHeaders — unreadable input reports unknown, never drift', () => {
  for (const bad of ['', null, undefined, 42]) {
    const r = u.inspectCaddyHeaders(bad);
    assert.strictEqual(r.readable, false);
    assert.strictEqual(r.csp, 'unknown');
    assert.strictEqual(u.evaluateDrift(r).drift, false, 'must not alarm on an unreadable file');
  }
});
