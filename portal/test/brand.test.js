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

// How Shodan/FOFA/Censys index a favicon: murmur3 of the base64 of the bytes.
// The exact hash function does not matter here — only that the BYTES differ,
// which any hash then reflects. sha256 is the stricter check of the two.
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ── the property Vincent asked for ───────────────────────────────────────────

test('two fresh installations get different icon bytes, for every file served', () => {
  const a = brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: tmpdir() });
  const b = brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: tmpdir() });
  assert.deepEqual(a.failed, [], 'install A generated every file');
  assert.deepEqual(b.failed, [], 'install B generated every file');

  for (const f of brand.BRAND_FILES) {
    const ba = fs.readFileSync(path.join(a.dir, f.name));
    const bb = fs.readFileSync(path.join(b.dir, f.name));
    const def = fs.readFileSync(path.join(PUBLIC_DIR, f.name));
    assert.notEqual(sha(ba), sha(bb), `${f.name} differs between two installs`);
    assert.notEqual(sha(ba), sha(def), `${f.name} differs from the public repo's default`);
    assert.notEqual(sha(bb), sha(def), `${f.name} differs from the public repo's default`);
  }
});

test('the generated files are not even the same size (size is a fingerprint too)', () => {
  const sizes = new Set();
  for (let i = 0; i < 6; i++) {
    const r = brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: tmpdir() });
    sizes.add(fs.statSync(path.join(r.dir, 'favicon.ico')).size);
  }
  assert.ok(sizes.size > 1, `six installs produced ${sizes.size} distinct sizes`);
});

// ── stability across updates ─────────────────────────────────────────────────

test('a second run keeps the existing files — an update must not change the hash', () => {
  const dir = tmpdir();
  const first = brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: dir });
  assert.equal(first.generated.length, brand.BRAND_FILES.length);
  const before = brand.BRAND_FILES.map(f => sha(fs.readFileSync(path.join(dir, f.name))));

  const second = brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: dir });
  assert.equal(second.generated.length, 0, 'nothing regenerated');
  assert.equal(second.kept.length, brand.BRAND_FILES.length);
  const after = brand.BRAND_FILES.map(f => sha(fs.readFileSync(path.join(dir, f.name))));
  assert.deepEqual(after, before);
});

test('a missing file is regenerated on its own, so an existing install heals in one restart', () => {
  const dir = tmpdir();
  brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: dir });
  fs.unlinkSync(path.join(dir, 'favicon.ico'));
  const r = brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: dir });
  assert.deepEqual(r.generated, ['favicon.ico']);
  assert.equal(r.kept.length, brand.BRAND_FILES.length - 1);
});

test('a zero-byte file counts as missing, not as kept', () => {
  const dir = tmpdir();
  brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: dir });
  fs.writeFileSync(path.join(dir, 'favicon.svg'), '');
  const r = brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: dir });
  assert.deepEqual(r.generated, ['favicon.svg']);
  assert.ok(fs.statSync(path.join(dir, 'favicon.svg')).size > 0);
});

test('no temp file is left behind', () => {
  const dir = tmpdir();
  brand.ensureBrandAssets({ sourceDir: PUBLIC_DIR, outDir: dir });
  assert.deepEqual(fs.readdirSync(dir).filter(n => n.includes('.tmp-')), []);
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

  // Walk the chunks: each length/type/crc must check out, tEXt must be there,
  // and IEND must still close the file.
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
  // The comment must sit before the close tag, not after it.
  assert.ok(out.indexOf('<!-- f00dcafe -->') < out.lastIndexOf('</svg>'));
});

// ── failures are loud, never a silent fallback ───────────────────────────────

test('a source that is not the expected format fails that file and leaves no output', () => {
  const src = tmpdir();
  const out = tmpdir();
  fs.writeFileSync(path.join(src, 'favicon.svg'), 'this is not an svg');
  fs.writeFileSync(path.join(src, 'favicon.ico'), 'nope');
  fs.writeFileSync(path.join(src, 'apple-touch-icon.png'), 'nope');

  const r = brand.ensureBrandAssets({ sourceDir: src, outDir: out });
  assert.equal(r.generated.length, 0);
  assert.equal(r.failed.length, brand.BRAND_FILES.length, 'every file reported as failed');
  for (const f of r.failed) assert.match(f.error, /not an? (SVG|PNG|ICO)|no closing/);
  assert.deepEqual(fs.readdirSync(out), [], 'nothing written — the route 404s instead');
});

test('a missing source file is reported, not swallowed', () => {
  const r = brand.ensureBrandAssets({ sourceDir: tmpdir(), outDir: tmpdir() });
  assert.equal(r.failed.length, brand.BRAND_FILES.length);
  for (const f of r.failed) assert.match(f.error, /ENOENT/);
});

test('uniquify refuses to return the default bytes', () => {
  // A tag that changes nothing would hand back the fingerprint it exists to
  // remove; the guard must catch it rather than write it.
  const def = fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.ico'));
  assert.throws(() => brand.uniquify('ico', def, ''), /produced the default bytes/);
  assert.throws(() => brand.uniquify('nope', def, 'x'), /no uniquifier/);
});

test('randomTag varies in both length and content', () => {
  const tags = new Set(), lengths = new Set();
  for (let i = 0; i < 40; i++) { const t = brand.randomTag(); tags.add(t); lengths.add(t.length); }
  assert.equal(tags.size, 40, 'no repeats in 40 draws');
  assert.ok(lengths.size > 1, `lengths vary (${lengths.size} distinct)`);
  for (const t of tags) assert.match(t, /^[0-9a-f]{16,48}$/);
});

test('crc32 matches the PNG specification test vector', () => {
  // The IEND chunk is constant: type "IEND", no data, CRC 0xAE426082.
  assert.equal(brand.crc32(Buffer.from('IEND', 'ascii')), 0xae426082);
});
