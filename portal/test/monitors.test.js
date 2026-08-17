'use strict';

const { test } = require('node:test');
const assert   = require('node:assert');
const h        = require('./helpers');

const post  = (body) => h.api('/api/monitors', { method: 'POST', body });
const patch = (id, body) => h.api(`/api/monitors/${id}`, { method: 'PATCH', body });

test('POST monitor targeting reserved/private addresses is blocked (SSRF)', async () => {
  assert.strictEqual((await post({ name: 'meta', type: 'http', target: 'http://169.254.169.254/latest/meta-data' })).status, 400);
  assert.strictEqual((await post({ name: 'caddyadmin', type: 'http', target: 'http://127.0.0.1:2019' })).status, 400);
  assert.strictEqual((await post({ name: 'ssh', type: 'tcp', target: '10.0.0.5:22' })).status, 400);
  assert.strictEqual((await post({ name: 'wg6', type: 'http', target: 'http://[::1]:51821' })).status, 400);
});

test('POST monitor targeting a public host is allowed', async () => {
  assert.notStrictEqual((await post({ name: 'ext', type: 'http', target: 'http://example.com' })).status, 400);
});

test('POST monitor with out-of-bounds interval/timeout or bad type is 400', async () => {
  assert.strictEqual((await post({ name: 'a', type: 'http', target: 'http://example.com', intervalSeconds: 0 })).status, 400);
  assert.strictEqual((await post({ name: 'b', type: 'http', target: 'http://example.com', intervalSeconds: -5 })).status, 400);
  assert.strictEqual((await post({ name: 'c', type: 'http', target: 'http://example.com', timeoutSeconds: 0 })).status, 400);
  assert.strictEqual((await post({ name: 'd', type: 'gopher', target: 'http://example.com' })).status, 400);
});

test('PATCH cannot rewrite target to a private address (bypass hole)', async () => {
  const created = await (await post({ name: 'edit-me', type: 'http', target: 'http://example.com' })).json();
  const id = created.monitor.id;
  assert.strictEqual((await patch(id, { target: 'http://127.0.0.1:2019' })).status, 400);
  assert.strictEqual((await patch(id, { name: 'renamed' })).status, 200); // benign patch still works
});
