'use strict';

const { test } = require('node:test');
const assert   = require('node:assert');
const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const crypto   = require('crypto');
const brand    = require('../lib/brand');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ewg-brand-'));
}

// How Shodan/FOFA/Censys index a response: a hash of the bytes (mmh3 of the
// base64, for a favicon). The hash function does not matter here — only that
// the BYTES differ, which any hash then reflects. sha256 is the stricter check.
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

function derive(dir = tmpdir(), opts = {}) {
  return brand.deriveAssets({ sourceDir: PUBLIC_DIR, dataDir: dir, ...opts });
}

// ── the property this exists for ─────────────────────────────────────────────

test('two fresh installations serve different bytes, for every static response', () => {
  const a = derive(), b = derive();
  assert.deepEqual(a.failed, [], 'install A derived everything');
  assert.deepEqual(b.failed, [], 'install B derived everything');

  for (const spec of brand.ASSETS) {
    const ba  = a.assets[spec.name].body;
    const bb  = b.assets[spec.name].body;
    const def = fs.readFileSync(path.join(PUBLIC_DIR, spec.name));
    assert.notEqual(sha(ba), sha(bb), `${spec.name} differs between two installs`);
    assert.notEqual(sha(ba), sha(def), `${spec.name} differs from the public repo's copy`);
    assert.notEqual(sha(bb), sha(def), `${spec.name} differs from the public repo's copy`);
  }
});

test('the login page is covered, not just the icons — a body hash grouped the hosts too', () => {
  const names = brand.ASSETS.map(a => a.name);
  assert.ok(names.includes('index.html'), 'index.html is individualised');
  const r = derive();
  const served = r.assets['index.html'].body;
  const def = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'));
  assert.notEqual(served.length, def.length, 'the body length moved too');
  assert.ok(brand.ASSETS.find(a => a.name === 'index.html').routes.includes('/'),
    "'/' serves the derived page, not the bundled one");
});

test('the responses are not even the same size (size is a fingerprint too)', () => {
  const sizes = new Set();
  for (let i = 0; i < 6; i++) sizes.add(derive().assets['favicon.ico'].body.length);
  assert.ok(sizes.size > 1, `six installs produced ${sizes.size} distinct sizes`);
});

// ── stability, and the 0.6.7 flaw this design fixes ──────────────────────────

test('the same install derives byte-identical responses again — an update must not move the hash', () => {
  const dir = tmpdir();
  const first = derive(dir);
  assert.equal(first.seedCreated, true, 'the seed was created on first start');

  const second = derive(dir);
  assert.equal(second.seedCreated, false, 'the existing seed was reused');
  for (const spec of brand.ASSETS) {
    assert.equal(sha(second.assets[spec.name].body), sha(first.assets[spec.name].body),
      `${spec.name} is unchanged`);
  }
});

test('a changed source file DOES propagate — 0.6.7 kept generated files and would have served the old icon forever', () => {
  const dir = tmpdir();
  const src = tmpdir();
  for (const spec of brand.ASSETS) {
    fs.copyFileSync(path.join(PUBLIC_DIR, spec.name), path.join(src, spec.name));
  }
  const before = brand.deriveAssets({ sourceDir: src, dataDir: dir });

  // A new release ships a different index.html and a different logo.
  const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(src, 'index.html'), html.replace('</html>', '<p>new release</p></html>'));
  const svg = fs.readFileSync(path.join(src, 'favicon.svg'), 'utf8');
  fs.writeFileSync(path.join(src, 'favicon.svg'), svg.replace('</svg>', '<rect/></svg>'));

  const after = brand.deriveAssets({ sourceDir: src, dataDir: dir });
  assert.ok(after.assets['index.html'].body.includes('new release'), 'the new page is served');
  assert.ok(after.assets['favicon.svg'].body.includes('<rect/>'), 'the new logo is served');
  // Untouched sources keep their bytes: the seed, not the files, is what persists.
  assert.equal(sha(after.assets['favicon.ico'].body), sha(before.assets['favicon.ico'].body));
});

// ── the seed ─────────────────────────────────────────────────────────────────

test('the seed is created once, kept, and never world-readable', () => {
  const dir = tmpdir();
  const a = brand.loadOrCreateSeed(dir);
  assert.match(a.seed, /^[0-9a-f]{32}$/);
  assert.equal(a.created, true);

  const b = brand.loadOrCreateSeed(dir);
  assert.equal(b.seed, a.seed);
  assert.equal(b.created, false);

  const mode = fs.statSync(path.join(dir, brand.SEED_FILE)).mode & 0o777;
  assert.equal(mode & 0o077, 0, `mode ${mode.toString(8)} grants nothing to group/other`);
});

test('an empty or malformed seed file is replaced, never trusted', () => {
  for (const bad of ['', '   \n', 'not-hex', 'abc']) {
    const dir = tmpdir();
    fs.writeFileSync(path.join(dir, brand.SEED_FILE), bad);
    const r = brand.loadOrCreateSeed(dir);
    assert.equal(r.created, true, `rejected ${JSON.stringify(bad)}`);
    assert.match(r.seed, /^[0-9a-f]{32}$/);
  }
});

test('two seeds never collide, and no temp file is left behind', () => {
  const seeds = new Set();
  for (let i = 0; i < 20; i++) {
    const dir = tmpdir();
    seeds.add(brand.loadOrCreateSeed(dir).seed);
    assert.deepEqual(fs.readdirSync(dir).filter(n => n.includes('.tmp-')), []);
  }
  assert.equal(seeds.size, 20);
});

test('payloadFor is deterministic, per-file, and of varying length', () => {
  const seed = 'a'.repeat(32);
  assert.equal(brand.payloadFor(seed, 'favicon.ico'), brand.payloadFor(seed, 'favicon.ico'));
  assert.notEqual(brand.payloadFor(seed, 'favicon.ico'), brand.payloadFor(seed, 'favicon.svg'));
  assert.notEqual(brand.payloadFor(seed, 'favicon.ico'), brand.payloadFor('b'.repeat(32), 'favicon.ico'));
  assert.throws(() => brand.payloadFor('', 'favicon.ico'), /empty seed/);

  const lengths = new Set();
  for (let i = 0; i < 60; i++) lengths.add(brand.payloadFor(crypto.randomBytes(16).toString('hex'), 'x').length);
  assert.ok(lengths.size > 1, `lengths vary (${lengths.size} distinct)`);
  for (const l of lengths) assert.ok(l >= 16 && l <= 48, `length ${l} within 16..48`);
});

// ── the files stay valid for a decoder ───────────────────────────────────────

test('the ICO keeps its header and every image stays reachable and byte-identical', () => {
  const def = fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.ico'));
  const out = brand.uniquifyIco(def, 'deadbeefcafe');

  assert.equal(out.readUInt16LE(0), 0, 'reserved stays 0');
  assert.equal(out.readUInt16LE(2), 1, 'type stays 1 (icon)');
  const count = out.readUInt16LE(4);
  assert.equal(count, def.readUInt16LE(4), 'image count unchanged');
  assert.ok(count >= 1);

  for (let i = 0; i < count; i++) {
    const e = 6 + i * 16;
    const size = out.readUInt32LE(e + 8);
    const off  = out.readUInt32LE(e + 12);
    assert.equal(off, def.readUInt32LE(e + 12), `image ${i} offset unchanged`);
    assert.equal(size, def.readUInt32LE(e + 8), `image ${i} size unchanged`);
    assert.ok(off + size <= def.length, `image ${i} lies entirely before the appended tail`);
    assert.ok(out.subarray(off, off + size).equals(def.subarray(off, off + size)),
      `image ${i} bytes unchanged`);
  }
  assert.ok(out.length > def.length);
});

test('the PNG gains one valid tEXt chunk and keeps IEND last', () => {
  const def = fs.readFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  const out = brand.uniquifyPng(def, 'abc123');

  const types = [];
  let pos = 8;
  while (pos + 8 <= out.length) {
    const len  = out.readUInt32BE(pos);
    const type = out.toString('ascii', pos + 4, pos + 8);
    const crc  = out.readUInt32BE(pos + 8 + len);
    assert.equal(crc, brand.crc32(out.subarray(pos + 4, pos + 8 + len)), `${type} CRC is valid`);
    types.push(type);
    pos += 12 + len;
  }
  assert.equal(pos, out.length, 'chunks cover the file exactly, nothing trailing');
  assert.equal(types[0], 'IHDR');
  assert.equal(types[types.length - 1], 'IEND');
  assert.equal(types.filter(t => t === 'tEXt').length, 1);
  assert.equal(types.filter(t => t === 'IEND').length, 1);
});

test('the SVG keeps its root element and the comment goes inside it', () => {
  const def = fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.svg'));
  const out = brand.uniquifySvg(def, 'f00dcafe').toString('utf8');
  assert.ok(out.trimEnd().endsWith('</svg>'), 'still ends with </svg>');
  assert.equal(out.match(/<svg/g).length, def.toString('utf8').match(/<svg/g).length);
  assert.ok(out.includes('<!-- f00dcafe -->'));
  assert.ok(out.indexOf('<!-- f00dcafe -->') < out.lastIndexOf('</svg>'));
});

test('the HTML keeps its structure and the comment sits inside </html>', () => {
  const def = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'));
  const out = brand.uniquifyHtml(def, 'cafe1234').toString('utf8');
  assert.ok(out.trimEnd().endsWith('</html>'), 'still ends with </html>');
  assert.ok(out.includes('<!-- cafe1234 -->'));
  assert.ok(out.indexOf('<!-- cafe1234 -->') < out.lastIndexOf('</html>'));
  // Everything the page needs is untouched.
  assert.ok(out.includes('<title>'));
  assert.equal(out.match(/<\/html>/g).length, def.toString('utf8').match(/<\/html>/g).length);
});

// ── the operator's own title ─────────────────────────────────────────────────

test('PORTAL_TITLE replaces the title, and cannot break out of the tag', () => {
  const def = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'));
  const out = brand.uniquifyHtml(def, 'tag', { title: 'Maison <script>x</script> & co' }).toString('utf8');
  assert.ok(out.includes('<title>Maison &lt;script&gt;x&lt;/script&gt; &amp; co</title>'));
  assert.ok(!out.includes('<title>Easy-WG-Combo</title>'), 'the shared title is gone');
  assert.equal(out.match(/<script>x<\/script>/g), null, 'nothing was injected as markup');
  assert.equal(out.match(/<title>/g).length, 1, 'still exactly one title element');
});

test('no PORTAL_TITLE keeps the title the image ships', () => {
  const def = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'));
  for (const title of [undefined, '']) {
    const out = brand.uniquifyHtml(def, 'tag', { title }).toString('utf8');
    assert.ok(out.includes('<title>Easy-WG-Combo</title>'));
  }
});

test('escapeHtmlText handles the three characters that matter', () => {
  assert.equal(brand.escapeHtmlText('a & b < c > d'), 'a &amp; b &lt; c &gt; d');
});

// ── failures are loud, never a silent fallback ───────────────────────────────

test('a source that is not the expected format fails that file, and icons get no body', () => {
  const src = tmpdir();
  for (const spec of brand.ASSETS) fs.writeFileSync(path.join(src, spec.name), 'not the right format');

  const r = brand.deriveAssets({ sourceDir: src, dataDir: tmpdir() });
  assert.equal(r.failed.length, brand.ASSETS.length, 'every file reported as failed');
  for (const f of r.failed) assert.match(f.error, /not an? (SVG|PNG|ICO|HTML document)/);

  // Icons: no body at all, so the route 404s rather than serve the public copy.
  for (const name of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) {
    assert.equal(r.assets[name], undefined, `${name} has no body`);
  }
  // The UI: served as shipped, because an unreachable portal is worse.
  assert.ok(r.assets['index.html'], 'index.html still has a body');
  assert.equal(r.assets['index.html'].isDefault, true, 'and it is flagged as the default');
});

test('a missing source file is reported, not swallowed', () => {
  const r = brand.deriveAssets({ sourceDir: tmpdir(), dataDir: tmpdir() });
  assert.equal(r.failed.length, brand.ASSETS.length);
  for (const f of r.failed) assert.match(f.error, /ENOENT/);
  assert.deepEqual(Object.keys(r.assets), [], 'nothing is served from a source that is not there');
});

test('each asset declares what happens when it fails', () => {
  for (const spec of brand.ASSETS) {
    assert.ok(['none', 'source'].includes(spec.fallback), `${spec.name} declares a fallback`);
  }
  // The icons must never fall back; the UI must.
  assert.equal(brand.ASSETS.find(a => a.name === 'favicon.ico').fallback, 'none');
  assert.equal(brand.ASSETS.find(a => a.name === 'index.html').fallback, 'source');
});

test('uniquify refuses to return the default bytes', () => {
  const def = fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.ico'));
  assert.throws(() => brand.uniquify('ico', def, ''), /produced the default bytes/);
  assert.throws(() => brand.uniquify('nope', def, 'x'), /no uniquifier/);
});

// ── the 0.6.7 leftovers ──────────────────────────────────────────────────────

test('the files 0.6.7 wrote on disk are removed, and the seed is not', () => {
  const dir = tmpdir();
  for (const name of brand.LEGACY_FILES) fs.writeFileSync(path.join(dir, name), 'old generated file');
  brand.loadOrCreateSeed(dir);

  const removed = brand.removeLegacyFiles(dir);
  assert.deepEqual(removed.sort(), [...brand.LEGACY_FILES].sort());
  for (const name of brand.LEGACY_FILES) assert.ok(!fs.existsSync(path.join(dir, name)));
  assert.ok(fs.existsSync(path.join(dir, brand.SEED_FILE)), 'the seed survives');

  assert.deepEqual(brand.removeLegacyFiles(dir), [], 'a second pass removes nothing');
});

test('crc32 matches the PNG specification test vector', () => {
  assert.equal(brand.crc32(Buffer.from('IEND', 'ascii')), 0xae426082);
});
