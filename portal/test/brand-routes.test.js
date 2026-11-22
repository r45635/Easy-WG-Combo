'use strict';

// The generation itself is covered by brand.test.js. What matters here is what
// the running portal actually answers on the wire: the generated file, not the
// default bundled in the image, and without a login — an unauthenticated GET is
// exactly how a scanner collects a favicon hash.

const { test } = require('node:test');
const assert   = require('node:assert');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const h        = require('./helpers');
const brand    = require('../lib/brand');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

test('the portal generated its own icons into the data directory at startup', () => {
  for (const f of brand.BRAND_FILES) {
    const p = path.join(h.DATA_DIR, 'brand', f.name);
    assert.ok(fs.existsSync(p), `${f.name} exists in the data dir`);
    assert.ok(fs.statSync(p).size > 0, `${f.name} is not empty`);
  }
});

for (const f of brand.BRAND_FILES) {
  test(`GET /${f.name} serves this install's file, not the public default, with no auth`, async () => {
    const res = await fetch(h.base() + '/' + f.name);   // deliberately anonymous
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', new RegExp(f.kind === 'svg' ? 'svg' : f.kind));

    const served  = Buffer.from(await res.arrayBuffer());
    const mine    = fs.readFileSync(path.join(h.DATA_DIR, 'brand', f.name));
    const theDefault = fs.readFileSync(path.join(PUBLIC_DIR, f.name));

    assert.equal(sha(served), sha(mine), 'served the generated copy');
    assert.notEqual(sha(served), sha(theDefault), 'NOT the file that ships in the public repo');
  });
}

test('a deleted icon answers 404 rather than falling back to the fingerprintable default', async () => {
  const p = path.join(h.DATA_DIR, 'brand', 'favicon.ico');
  const saved = fs.readFileSync(p);
  fs.unlinkSync(p);
  try {
    const res = await fetch(h.base() + '/favicon.ico');
    assert.equal(res.status, 404);
    const body = Buffer.from(await res.arrayBuffer());
    assert.notEqual(sha(body), sha(fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.ico'))));
  } finally {
    fs.writeFileSync(p, saved);
  }
});
