'use strict';

// Per-installation response fingerprint.
//
// Shodan, FOFA and Censys index a page by hashing what it serves — mmh3 of the
// base64 of a favicon, a plain hash of a response body. Everything this portal
// serves statically ships in a PUBLIC repository, so the file in git IS the
// fingerprint: on 2026-11-22 both reference installs answered /favicon.ico with
// mmh3 -2025595950, the same value as the repo and as every other install, and
// their whole login page was byte-identical (58253 B, mmh3 1672648119) — a body
// hash grouped them exactly as the favicon hash did.
//
// So each install gets ONE random seed, kept in the persistent data directory,
// and every static response is derived from it at startup:
//
//   SVG   an XML comment before </svg>
//   PNG   a tEXt chunk before IEND (a valid ancillary chunk)
//   ICO   bytes appended after the last image (each ICONDIRENTRY carries an
//         explicit offset and size, so nothing references the tail)
//   HTML  an HTML comment before </html>, plus the operator's own <title>
//
// Why a seed and not the generated files (changed in 0.6.8 — 0.6.7 stored the
// files):
//   * Derivation is deterministic, so the hash is stable across updates without
//     anything being cached on disk.
//   * A genuine change to a source file — a new logo, a new index.html, which
//     every release brings — propagates immediately. Keeping generated files
//     meant an install would have served its old icon forever.
//   * Nothing to invalidate, no stale state, no temp files.
//
// The seed is not a credential: nothing authenticates with it, and what the
// responses expose is a prefix of sha256(seed:name), which cannot be inverted.
// It IS install-identifying, so it is not logged; it lives under portal/data,
// hence inside every backup, which is what carries the hash across a restore.

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// What is individualised, and what happens if derivation fails.
//
// fallback 'none' — the route answers 404. Serving the bundled default would
//   put back the fingerprint this exists to remove, and a missing icon costs
//   nothing.
// fallback 'source' — the route serves the shipped bytes, loudly. For the UI a
//   fingerprint is the lesser evil: an unreachable portal is worse than a
//   recognisable one.
const ASSETS = [
  { name: 'index.html',           kind: 'html', contentType: 'text/html; charset=utf-8',
    routes: ['/', '/index.html'], fallback: 'source', cacheControl: 'no-cache' },
  { name: 'favicon.svg',          kind: 'svg',  contentType: 'image/svg+xml',
    routes: ['/favicon.svg'],          fallback: 'none' },
  { name: 'favicon.ico',          kind: 'ico',  contentType: 'image/x-icon',
    routes: ['/favicon.ico'],          fallback: 'none' },
  { name: 'apple-touch-icon.png', kind: 'png',  contentType: 'image/png',
    routes: ['/apple-touch-icon.png'], fallback: 'none' },
];

// Files 0.6.7 generated on disk. They are no longer read; left in place they
// would be confusing cruft inside every backup.
const LEGACY_FILES = ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'];

const SEED_FILE = 'install-id';

// ── CRC-32, as PNG uses it per chunk ─────────────────────────────────────────
// Implemented here rather than via zlib.crc32, which only exists from Node
// 22.2: this must not depend on the runtime's patch level.
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── the seed ─────────────────────────────────────────────────────────────────

// Reads this install's seed, creating it on first start. A malformed or empty
// file is replaced rather than trusted: a seed of '' would derive the same
// payload everywhere, which is the fingerprint again.
function loadOrCreateSeed(dir, random = crypto.randomBytes) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, SEED_FILE);
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (/^[0-9a-f]{32,}$/.test(existing)) return { seed: existing, created: false };
  } catch { /* missing or unreadable — fall through and create one */ }
  const seed = random(16).toString('hex');
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${seed}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
  return { seed, created: true };
}

// A payload unique to (seed, file) and of varying length, so neither the bytes
// nor the file size is constant between two installs. Deterministic on purpose:
// the same seed must reproduce the same responses after an update.
function payloadFor(seed, name) {
  if (!seed) throw new Error('payloadFor: empty seed');
  const h = crypto.createHash('sha256').update(`${seed}:${name}`).digest('hex');
  const len = 16 + (parseInt(h.slice(0, 2), 16) % 33);   // 16..48 hex chars
  return h.slice(2, 2 + len);
}

// ── the format-specific insertions ───────────────────────────────────────────

function uniquifySvg(buf, tag) {
  const text = buf.toString('utf8');
  const at = text.lastIndexOf('</svg>');
  if (at === -1) throw new Error('not an SVG: no closing </svg>');
  return Buffer.from(text.slice(0, at) + `<!-- ${tag} -->` + text.slice(at), 'utf8');
}

function uniquifyPng(buf, tag) {
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG: bad signature');
  // Walk the chunks instead of searching for the bytes "IEND", which can also
  // occur inside compressed image data.
  let pos = 8, iend = -1;
  while (pos + 8 <= buf.length) {
    const len  = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IEND') { iend = pos; break; }
    pos += 12 + len;                               // len + type + data + crc
  }
  if (iend === -1) throw new Error('not a PNG: no IEND chunk');

  const data = Buffer.concat([Buffer.from('Comment\0', 'latin1'), Buffer.from(tag, 'latin1')]);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write('tEXt', 4, 'ascii');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return Buffer.concat([buf.subarray(0, iend), chunk, buf.subarray(iend)]);
}

function uniquifyIco(buf, tag) {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
    throw new Error('not an ICO: bad ICONDIR header');
  }
  const count = buf.readUInt16LE(4);
  if (count < 1 || 6 + count * 16 > buf.length) throw new Error('not an ICO: bad image count');
  // Every image is reached through its own offset+size, so appending after the
  // last one leaves all of them byte-identical and reachable.
  return Buffer.concat([buf, Buffer.from(tag, 'latin1')]);
}

// Escapes text going into element content. The title comes from the operator's
// .env, not from a request, but it must still not be able to close the tag.
function escapeHtmlText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function uniquifyHtml(buf, tag, { title } = {}) {
  let text = buf.toString('utf8');
  const at = text.lastIndexOf('</html>');
  if (at === -1) throw new Error('not an HTML document: no closing </html>');
  if (title) {
    const replaced = text.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)}</title>`);
    if (replaced === text) throw new Error('not an HTML document: no <title> to replace');
    text = replaced;
  }
  const end = text.lastIndexOf('</html>');
  return Buffer.from(`${text.slice(0, end)}<!-- ${tag} -->\n${text.slice(end)}`, 'utf8');
}

const UNIQUIFY = { svg: uniquifySvg, png: uniquifyPng, ico: uniquifyIco, html: uniquifyHtml };

function uniquify(kind, buf, tag, opts) {
  const fn = UNIQUIFY[kind];
  if (!fn) throw new Error(`no uniquifier for kind '${kind}'`);
  const out = fn(buf, tag, opts);
  // Output identical to the default would silently defeat the whole point, so
  // refuse to return it.
  if (out.equals(buf)) throw new Error(`uniquify(${kind}) produced the default bytes`);
  return out;
}

// ── what the server serves ───────────────────────────────────────────────────

// Removes the files 0.6.7 wrote. Returns the names actually removed so the
// caller can say so once; a failure to remove is not fatal, nothing reads them.
function removeLegacyFiles(dir) {
  const removed = [];
  for (const name of LEGACY_FILES) {
    const file = path.join(dir, name);
    try {
      if (fs.existsSync(file)) { fs.unlinkSync(file); removed.push(name); }
    } catch { /* cruft we could not delete is still only cruft */ }
  }
  return removed;
}

// Derives every static response in memory from this install's seed. Nothing is
// written but the seed itself.
function deriveAssets({ sourceDir, dataDir, title, random = crypto.randomBytes } = {}) {
  const { seed, created } = loadOrCreateSeed(dataDir, random);
  const result = { seedCreated: created, assets: {}, failed: [] };

  for (const a of ASSETS) {
    const src = path.join(sourceDir, a.name);
    let source;
    try {
      source = fs.readFileSync(src);
    } catch (err) {
      result.failed.push({ name: a.name, error: err.message, fallback: a.fallback, body: null });
      continue;
    }
    try {
      const body = uniquify(a.kind, source, payloadFor(seed, a.name), { title });
      result.assets[a.name] = { ...a, body };
    } catch (err) {
      result.failed.push({
        name: a.name, error: err.message, fallback: a.fallback,
        // 'source' means the route still answers, from the shipped bytes.
        body: a.fallback === 'source' ? source : null,
      });
      if (a.fallback === 'source') result.assets[a.name] = { ...a, body: source, isDefault: true };
    }
  }
  return result;
}

module.exports = {
  ASSETS, LEGACY_FILES, SEED_FILE,
  deriveAssets, loadOrCreateSeed, payloadFor, removeLegacyFiles,
  uniquify, uniquifySvg, uniquifyPng, uniquifyIco, uniquifyHtml,
  escapeHtmlText, crc32,
};
