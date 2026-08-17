'use strict';

const { test } = require('node:test');
const assert   = require('node:assert');
const { makeGuardedLookup } = require('../lib/net-guards');
const h = require('./helpers');

// Deterministic fake DNS — no external resolution.
function fakeLookup(map) {
  return (hostname, options, cb) => {
    if (typeof options === 'function') { cb = options; options = {}; }
    const ip = map[hostname];
    if (!ip) return cb(new Error('ENOTFOUND'));
    const family = ip.includes(':') ? 6 : 4;
    if (options && options.all) return cb(null, [{ address: ip, family }]);
    return cb(null, ip, family);
  };
}
const resolve = (gl, host, opts = {}) =>
  new Promise(res => gl(host, opts, (err, address) => res({ err, address })));

const MAP = {
  'lo.example':        '127.0.0.1',
  'rfc1918.example':   '10.1.2.3',
  'meta.example':      '169.254.169.254',
  'cgnat.example':     '100.64.0.1',
  'v6lo.example':      '::1',
  'v6ll.example':      'fe80::1',
  'v6ula.example':     'fd00::1',
  'public.example':    '93.184.216.34',
  'public6.example':   '2606:2800:220:1:248:1893:25c8:1946',
};
const gl = makeGuardedLookup(fakeLookup(MAP));

test('guardedLookup blocks hostnames resolving to reserved addresses', async () => {
  for (const host of ['lo.example', 'rfc1918.example', 'meta.example', 'cgnat.example', 'v6lo.example', 'v6ll.example', 'v6ula.example']) {
    const { err } = await resolve(gl, host);
    assert.ok(err, `${host} (${MAP[host]}) should be blocked`);
    assert.match(err.message, /private\/reserved/);
  }
});

test('guardedLookup allows hostnames resolving to public addresses', async () => {
  const v4 = await resolve(gl, 'public.example');
  assert.ok(!v4.err); assert.strictEqual(v4.address, '93.184.216.34');
  const v6 = await resolve(gl, 'public6.example');
  assert.ok(!v6.err);
});

test('guardedLookup checks every answer when options.all is set', async () => {
  const { err } = await resolve(gl, 'meta.example', { all: true });
  assert.ok(err, 'all:true reserved answer blocked');
  const okAll = await resolve(gl, 'public.example', { all: true });
  assert.ok(!okAll.err && Array.isArray(okAll.address));
});

// The probes must fail closed when the (guarded) lookup blocks — no network I/O
// happens because resolution errors before any socket connects.
test('HTTP/TCP/TLS probes fail closed on a blocked hostname', async () => {
  const I = h.app._internals;
  const blocking = makeGuardedLookup(fakeLookup({ 'blocked.test': '127.0.0.1' }));
  const httpR = await I.checkHttp('http://blocked.test/', 2000, 200, blocking);
  assert.strictEqual(httpR.ok, false);
  const tcpR = await I.checkTcp('blocked.test', 80, 2000, blocking);
  assert.strictEqual(tcpR.ok, false);
  const tlsR = await I.checkTlsDaysLeft('blocked.test', 443, blocking);
  assert.strictEqual(tlsR.ok, false);
});

test('monitorLookup uses the guard for user monitors and the default for built-ins', () => {
  const I = h.app._internals;
  assert.strictEqual(I.monitorLookup({ builtin: true }), undefined);
  assert.strictEqual(I.monitorLookup({}), I.guardedLookup);
});
