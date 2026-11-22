'use strict';

// Per-installation brand assets.
//
// Shodan, FOFA and Censys index a favicon by hashing it (mmh3 of the base64 of
// the bytes), so one query lists every host serving the same file. The default
// icons ship in a PUBLIC repository: the file in git IS the fingerprint, and on
// 2026-11-22 both reference installs answered /favicon.ico with mmh3
// -2025595950 — the same value as the repo, and as anyone else running it.
//
// So each install derives its own copies at first start: visually identical,
// different bytes, hence a different hash. The copies live in the persistent
// data directory, never in git and never in the image layer, which is what
// keeps them stable across `./easywg update` — a hash that changed on every
// update would be harmless but pointless.
//
// The difference is put where decoders ignore it:
//   SVG  an XML comment before </svg>
//   PNG  a tEXt chunk before IEND (a valid ancillary chunk)
//   ICO  bytes appended after the last image (ICONDIRENTRY carries an explicit
//        offset and size per image, so nothing references the tail)
// The payload is hex of a random length, so neither the bytes nor the file size
// is constant between two installs.

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// The files to individualise, in the order index.html references them.
const BRAND_FILES = [
  { name: 'favicon.svg',          kind: 'svg', contentType: 'image/svg+xml' },
  { name: 'favicon.ico',          kind: 'ico', contentType: 'image/x-icon' },
  { name: 'apple-touch-icon.png', kind: 'png', contentType: 'image/png' },
];

// CRC-32 (PNG uses it per chunk). Implemented here rather than via zlib.crc32,
// which only exists from Node 22.2 — this must not depend on the runtime's
// patch level.
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

// A random hex payload of random length: 16..48 hex chars.
function randomTag(random = crypto.randomBytes) {
  const bytes = 8 + (random(1)[0] % 17);          // 8..24 bytes -> 16..48 hex
  return random(bytes).toString('hex');
}

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

const UNIQUIFY = { svg: uniquifySvg, png: uniquifyPng, ico: uniquifyIco };

function uniquify(kind, buf, tag) {
  const fn = UNIQUIFY[kind];
  if (!fn) throw new Error(`no uniquifier for kind '${kind}'`);
  const out = fn(buf, tag);
  // A "generated" file identical to the default would silently defeat the whole
  // point, so refuse to write one.
  if (out.equals(buf)) throw new Error(`uniquify(${kind}) produced the default bytes`);
  return out;
}

// Creates this install's copies in outDir, once. Files already there are kept
// (that is what makes the hash survive an update); a missing one is generated
// from sourceDir. Returns what happened, per file — the caller reports it.
function ensureBrandAssets({ sourceDir, outDir, random = crypto.randomBytes } = {}) {
  const result = { dir: outDir, generated: [], kept: [], failed: [] };
  fs.mkdirSync(outDir, { recursive: true });

  for (const f of BRAND_FILES) {
    const dst = path.join(outDir, f.name);
    try {
      if (fs.existsSync(dst) && fs.statSync(dst).size > 0) { result.kept.push(f.name); continue; }
      const src = fs.readFileSync(path.join(sourceDir, f.name));
      const out = uniquify(f.kind, src, randomTag(random));
      // Write through a temp file in the same directory: a reader (or a crash)
      // must never see a half-written icon, and must never see one we then
      // decide not to keep.
      const tmp = `${dst}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, out);
      fs.renameSync(tmp, dst);
      result.generated.push(f.name);
    } catch (err) {
      result.failed.push({ name: f.name, error: err.message });
    }
  }
  return result;
}

module.exports = {
  BRAND_FILES, ensureBrandAssets, uniquify,
  uniquifySvg, uniquifyPng, uniquifyIco, randomTag, crc32,
};
