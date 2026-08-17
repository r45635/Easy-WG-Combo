'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const h      = require('./helpers');

const STORAGE = path.join(h.DATA_DIR, 'storage');

// Mirror server.js hashFilePassword() so we can seed a password-protected share.
function hashFilePassword(pass) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pass, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function seed(shares) {
  h.writeJson('filedrop-shares.json', shares);
}
function putBlob(name, content) {
  fs.writeFileSync(path.join(STORAGE, name), content);
}

const FUTURE = new Date(Date.now() + 864e5).toISOString();
const PAST   = new Date(Date.now() - 864e5).toISOString();

before(() => {
  putBlob('blob-pub',  'public-content');
  putBlob('blob-vpn',  'vpn-content');
  putBlob('blob-pwd',  'secret-content');
  putBlob('blob-exp',  'x');
  putBlob('blob-max',  'x');
  putBlob('blob-legacy', 'legacy-content');
  seed({
    tok_pub:    { status: 'active', mode: 'public',   storedName: 'blob-pub',    originalName: 'pub.txt',    downloads: 0, expiresAt: FUTURE },
    tok_vpn:    { status: 'active', mode: 'vpn_only',  storedName: 'blob-vpn',    originalName: 'vpn.txt',    downloads: 0, expiresAt: FUTURE },
    tok_pwd:    { status: 'active', mode: 'public',   storedName: 'blob-pwd',    originalName: 'pwd.txt',    downloads: 0, expiresAt: FUTURE, passwordProtected: true, passwordHash: hashFilePassword('s3cret') },
    tok_exp:    { status: 'active', mode: 'public',   storedName: 'blob-exp',    originalName: 'exp.txt',    downloads: 0, expiresAt: PAST },
    tok_max:    { status: 'active', mode: 'public',   storedName: 'blob-max',    originalName: 'max.txt',    downloads: 3, maxDownloads: 3 },
    tok_legacy: { status: 'active',                    storedName: 'blob-legacy', originalName: 'legacy.txt', downloads: 0 },
  });
});

function dl(token, { xff, method = 'GET', body, query = '' } = {}) {
  const headers = {};
  if (xff) headers['X-Forwarded-For'] = xff;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return h.api(`/files/${token}${query}`, { method, headers, body, auth: false });
}

test('public share + valid token → 200 and content', async () => {
  const res = await dl('tok_pub');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(await res.text(), 'public-content');
});

test('vpn_only + source inside VPN subnet (XFF 10.8.0.5) → 200', async () => {
  const res = await dl('tok_vpn', { xff: '10.8.0.5' });
  assert.strictEqual(res.status, 200);
});

test('vpn_only + public source (XFF 203.0.113.9) → 403', async () => {
  const res = await dl('tok_vpn', { xff: '203.0.113.9' });
  assert.strictEqual(res.status, 403);
});

test('vpn_only + loopback (no XFF = SSH-tunnel admin) → 200', async () => {
  const res = await dl('tok_vpn');
  assert.strictEqual(res.status, 200);
});

test('expired share → 410', async () => {
  const res = await dl('tok_exp');
  assert.strictEqual(res.status, 410);
});

test('exhausted download count → 410', async () => {
  const res = await dl('tok_max');
  assert.strictEqual(res.status, 410);
});

test('password share: ?pw= query string is NOT honored → 401', async () => {
  const res = await dl('tok_pwd', { query: '?pw=s3cret' });
  assert.strictEqual(res.status, 401);
});

test('password share: correct password in POST body → 200', async () => {
  const res = await dl('tok_pwd', { method: 'POST', body: { password: 's3cret' } });
  assert.strictEqual(res.status, 200);
});

test('password share: wrong password in POST body → 401', async () => {
  const res = await dl('tok_pwd', { method: 'POST', body: { password: 'nope' } });
  assert.strictEqual(res.status, 401);
});

test('legacy share without mode is treated as public (public source → 200)', async () => {
  const res = await dl('tok_legacy', { xff: '203.0.113.9' });
  assert.strictEqual(res.status, 200);
});
