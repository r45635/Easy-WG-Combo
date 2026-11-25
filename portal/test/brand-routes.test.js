'use strict';

// The derivation itself is covered by brand.test.js. What matters here is what
// the running portal actually answers on the wire: its own bytes, not the ones
// bundled in the image, and without a login — an unauthenticated GET is exactly
// how a scanner collects a favicon or body hash.

const { test } = require('node:test');
const assert   = require('node:assert');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const h        = require('./helpers');
const brand    = require('../lib/brand');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const shipped = (name) => fs.readFileSync(path.join(PUBLIC_DIR, name));

test('the portal created its seed in the data directory at startup', () => {
  const p = path.join(h.DATA_DIR, 'brand', brand.SEED_FILE);
  assert.ok(fs.existsSync(p), 'the seed exists');
  assert.match(fs.readFileSync(p, 'utf8').trim(), /^[0-9a-f]{32,}$/);
});

test('nothing else is written — the responses are derived, not cached on disk', () => {
  const entries = fs.readdirSync(path.join(h.DATA_DIR, 'brand'));
  assert.deepEqual(entries, [brand.SEED_FILE], `found ${entries.join(', ')}`);
});

for (const spec of brand.ASSETS) {
  for (const route of spec.routes) {
    test(`GET ${route} serves this install's bytes, not the public ones, with no auth`, async () => {
      const res = await fetch(h.base() + route);   // deliberately anonymous
      assert.equal(res.status, 200, `${route} answers`);

      const served = Buffer.from(await res.arrayBuffer());
      assert.notEqual(sha(served), sha(shipped(spec.name)),
        `${route} is NOT the file that ships in the public repo`);
      assert.ok(served.length > 0);
    });
  }
}

test('/ and /index.html serve the same derived page', async () => {
  const a = Buffer.from(await (await fetch(h.base() + '/')).arrayBuffer());
  const b = Buffer.from(await (await fetch(h.base() + '/index.html')).arrayBuffer());
  assert.equal(sha(a), sha(b));
});

test('the login page is still a working page, only its bytes moved', async () => {
  const body = await (await fetch(h.base() + '/')).text();
  const def  = shipped('index.html').toString('utf8');
  assert.ok(body.includes('<title>'), 'has a title');
  assert.ok(body.trimEnd().endsWith('</html>'), 'closes properly');
  // Same length to within the inserted comment: nothing of the UI was dropped.
  assert.ok(body.length > def.length, 'the page grew by the comment, nothing was removed');
  assert.ok(body.length < def.length + 200, `grew by ${body.length - def.length} bytes only`);
});

test('express.static cannot hand out the bundled index.html behind our back', async () => {
  // index:false plus the explicit routes. A scanner asking for the directory
  // index must not get the file that is identical on every install.
  for (const route of ['/', '/index.html']) {
    const served = Buffer.from(await (await fetch(h.base() + route)).arrayBuffer());
    assert.notEqual(sha(served), sha(shipped('index.html')), route);
  }
});

test('the framework no longer announces itself', async () => {
  const res = await fetch(h.base() + '/');
  assert.equal(res.headers.get('x-powered-by'), null, 'no X-Powered-By header');
});

test('an unknown path gets our own 404, not the framework default', async () => {
  const res = await fetch(h.base() + '/does-not-exist-' + Date.now());
  assert.equal(res.status, 404);
  const body = await res.text();
  assert.ok(!/Cannot GET/.test(body), `Express's own page would say "Cannot GET": ${body.slice(0, 80)}`);
  assert.ok(!/<pre>|<html/i.test(body), 'no HTML scaffolding to fingerprint');
  assert.equal(body, 'Not found');
});

test('an unknown /api path still answers JSON, so clients keep working', async () => {
  const res = await fetch(h.base() + '/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') || '', /json/);
  assert.deepEqual(await res.json(), { error: 'Not found' });
});

test('the 404 body does not echo the path back', async () => {
  // Express's default does, which both reflects input and names the framework.
  const res = await fetch(h.base() + '/needle-abc123');
  assert.ok(!(await res.text()).includes('needle-abc123'));
});
