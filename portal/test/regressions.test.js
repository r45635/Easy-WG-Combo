'use strict';

const { test } = require('node:test');
const assert   = require('node:assert');
const h        = require('./helpers');

// server.js:3431 used an undefined `caddyUp` in the score array while the
// services object referenced `caddyR.ok`. Every POST /api/migration/validate
// therefore threw ReferenceError -> Express 5 forwarded it as a 500.
test('POST /api/migration/validate does not 500 (caddyUp ReferenceError)', async () => {
  const res = await h.api('/api/migration/validate', { method: 'POST', body: {} });
  assert.notStrictEqual(res.status, 500, 'should not be a 500 ReferenceError');
  const body = await res.json();
  assert.ok(body && typeof body.score === 'number', 'returns a numeric score');
  assert.strictEqual(body.maxScore, 3);
});

test('app is exported and reachable without auto-listening', async () => {
  assert.strictEqual(typeof h.app.listen, 'function');
  const res = await h.api('/api/me');
  assert.strictEqual(res.status, 200);
});
