'use strict';

const { test } = require('node:test');
const assert   = require('node:assert');
const h        = require('./helpers');

function sidFrom(res) {
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of cookies) { const m = c.match(/portal\.sid=([^;]+)/); if (m) return m[1]; }
  return null;
}
// A login that returns no cookie used to surface as `assert.ok(cookieA && cookieB)`
// failing — true for a 429, a 500 and a genuinely cookie-less 200 alike, which
// is no help at all when it happens once in five runs on a loaded CI machine.
// Assert the status here, where the status is still in hand.
async function sid(res) {
  const id = sidFrom(res);
  if (!id) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`login returned no session cookie: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return id;
}
function login(pw, extraHeaders) {
  return fetch(h.base() + '/api/login', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, extraHeaders),
    body: JSON.stringify({ password: pw }),
    redirect: 'manual',
  });
}
const me = (cookie) => fetch(h.base() + '/api/me', { headers: { Cookie: `portal.sid=${cookie}` } }).then(r => r.json());

// Every test uses its own source IP. The portal counts failed logins per IP and
// that counter lives for the whole file, so without this a failed login in one
// test can rate-limit a later one — the only shared state between these tests,
// and the only plausible reading of the flake seen in CI.
const from = (ip) => ({ 'X-Forwarded-For': ip });

test('login issues a session cookie and rotates the id (session fixation)', async () => {
  const ip = from('198.51.100.1');
  const r1 = await login(h.ADMIN_PASSWORD, ip);
  assert.strictEqual(r1.status, 200);
  const s1 = await sid(r1);
  const s2 = await sid(await login(h.ADMIN_PASSWORD, ip));
  assert.notStrictEqual(s1, s2, 'session id changes across logins');
});

test('login rate limiting: 429 after repeated failures, per source IP', async () => {
  const ip = '198.51.100.7';
  for (let i = 0; i < 10; i++) {
    assert.strictEqual((await login('wrong', { 'X-Forwarded-For': ip })).status, 401);
  }
  assert.strictEqual((await login(h.ADMIN_PASSWORD, { 'X-Forwarded-For': ip })).status, 429, 'blocked even with correct password');
  assert.strictEqual((await login(h.ADMIN_PASSWORD, { 'X-Forwarded-For': '198.51.100.8' })).status, 200, 'other IP unaffected');
});

test('CSRF: cross-origin state-changing request is rejected', async () => {
  const ip = '198.51.100.2';
  assert.strictEqual((await login('whatever', { Origin: 'https://evil.example', 'X-Forwarded-For': ip })).status, 403);
  assert.notStrictEqual((await login('whatever', from(ip))).status, 403); // no Origin -> passes gate
});

test('password change enforces the 12-char minimum policy', async () => {
  // Correct current password + too-short new password -> 400 (no rotation).
  const res = await h.api('/api/auth/password', {
    method: 'POST', body: { currentPassword: h.ADMIN_PASSWORD, newPassword: 'short-11chr' },
  });
  assert.strictEqual(res.status, 400);
  assert.match((await res.json()).error, /at least 12/);
});

test('password change rejects a "$" (Docker Compose env unsafe)', async () => {
  const res = await h.api('/api/auth/password', {
    method: 'POST', body: { currentPassword: h.ADMIN_PASSWORD, newPassword: 'has$dollarsign' },
  });
  assert.strictEqual(res.status, 400);
  assert.match((await res.json()).error, /\$/);
});

// LAST: rotates the admin password, which invalidates Basic-auth for later tests.
test('password change revokes other sessions', async () => {
  const ip = from('198.51.100.3');
  const cookieA = await sid(await login(h.ADMIN_PASSWORD, ip));
  const cookieB = await sid(await login(h.ADMIN_PASSWORD, ip));
  const chg = await fetch(h.base() + '/api/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `portal.sid=${cookieA}` },
    body: JSON.stringify({ currentPassword: h.ADMIN_PASSWORD, newPassword: 'brand-new-pass-1234' }),
  });
  assert.strictEqual(chg.status, 200);
  assert.strictEqual((await me(cookieB)).authenticated, false, 'other session revoked');
  assert.strictEqual((await me(cookieA)).authenticated, true, 'current session preserved');
});
