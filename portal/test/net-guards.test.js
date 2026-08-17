'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const g = require('../lib/net-guards');

test('ipInCidr — membership and boundaries', () => {
  assert.ok(g.ipInCidr('10.8.0.1', '10.8.0.0/24'));
  assert.ok(g.ipInCidr('10.8.0.255', '10.8.0.0/24'));
  assert.ok(!g.ipInCidr('10.8.1.0', '10.8.0.0/24'));
  assert.ok(!g.ipInCidr('203.0.113.9', '10.8.0.0/24'));
  assert.ok(g.ipInCidr('1.2.3.4', '0.0.0.0/0'));
  assert.ok(g.ipInCidr('10.8.0.7', '10.8.0.7/32'));
  assert.ok(!g.ipInCidr('10.8.0.8', '10.8.0.7/32'));
});

test('ipInCidr — malformed inputs are false, not throws', () => {
  assert.ok(!g.ipInCidr('', '10.8.0.0/24'));
  assert.ok(!g.ipInCidr('10.8.0.5', 'garbage'));
  assert.ok(!g.ipInCidr('999.1.1.1', '10.8.0.0/24'));
  assert.ok(!g.ipInCidr('10.8.0.5\nevil', '10.8.0.0/24'));
  assert.ok(!g.ipInCidr('::1', '10.8.0.0/24'));
});

test('isLoopback', () => {
  assert.ok(g.isLoopback('127.0.0.1'));
  assert.ok(g.isLoopback('::1'));
  assert.ok(g.isLoopback('::ffff:127.0.0.1'));
  assert.ok(!g.isLoopback('10.8.0.1'));
  assert.ok(!g.isLoopback('203.0.113.9'));
});

test('trustedClientIp strips ::ffff: and prefers req.ip', () => {
  assert.strictEqual(g.trustedClientIp({ ip: '::ffff:10.8.0.5' }), '10.8.0.5');
  assert.strictEqual(g.trustedClientIp({ socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1');
});

test('isVpnOrLocalClient', () => {
  const vpn = '10.8.0.0/24';
  assert.ok(g.isVpnOrLocalClient({ ip: '10.8.0.9' }, vpn));
  assert.ok(g.isVpnOrLocalClient({ ip: '127.0.0.1' }, vpn));
  assert.ok(!g.isVpnOrLocalClient({ ip: '203.0.113.9' }, vpn));
});

test('isReservedIp blocks loopback/private/link-local/CGNAT', () => {
  ['127.0.0.1', '10.0.0.5', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fe80::1', 'fd00::1']
    .forEach(ip => assert.ok(g.isReservedIp(ip), `${ip} should be reserved`));
  ['8.8.8.8', '1.1.1.1', '203.0.113.9'].forEach(ip => assert.ok(!g.isReservedIp(ip), `${ip} should be public`));
});

test('validateMonitor: SSRF, bounds, builtin bypass', () => {
  assert.match(g.validateMonitor({ type: 'http', target: 'http://127.0.0.1:2019' }), /private|reserved/);
  assert.match(g.validateMonitor({ type: 'tcp', target: '10.0.0.5:22' }), /private|reserved/);
  assert.strictEqual(g.validateMonitor({ type: 'http', target: 'http://example.com' }), null);
  assert.match(g.validateMonitor({ type: 'http', target: 'http://example.com', intervalSeconds: 5 }), /interval/);
  assert.match(g.validateMonitor({ type: 'zzz', target: 'x' }), /type must/);
  // built-in local probes are allowed
  assert.strictEqual(g.validateMonitor({ type: 'http', target: 'http://127.0.0.1:8080' }, { isBuiltin: true }), null);
  assert.strictEqual(g.validateMonitor({ type: 'dns', target: 'example.com', resolver: '127.0.0.1' }, { isBuiltin: true }), null);
});
