'use strict';

const { test } = require('node:test');
const assert   = require('node:assert');
const h        = require('./helpers');
const I        = h.app._internals;

test('normalizeTargetUrl rejects control/brace chars, normalizes valid URLs', () => {
  assert.strictEqual(I.normalizeTargetUrl('http://127.0.0.1:8080/x\nrespond 200'), null);
  assert.strictEqual(I.normalizeTargetUrl('http://x\tb'), null);
  assert.strictEqual(I.normalizeTargetUrl('http://a.com/#}\nevil.com{'), null);
  assert.strictEqual(I.normalizeTargetUrl('ftp://a.com'), null);
  assert.strictEqual(I.normalizeTargetUrl('http://example.com'), 'http://example.com/');
});

test('isValidDomain / isValidIpOrCidr reject injection characters', () => {
  assert.ok(!I.isValidDomain('a.com\n  respond 500'));
  assert.ok(!I.isValidDomain('a.com {'));
  assert.ok(I.isValidDomain('app.example.com'));
  assert.ok(!I.isValidIpOrCidr('1.2.3.4\nevil'));
  assert.ok(!I.isValidIpOrCidr('1.2.3.4 {'));
  assert.ok(I.isValidIpOrCidr('10.0.0.0/24'));
});

test('generateCaddyServices throws on an injected field rather than emitting it', () => {
  const bad = { s1: { id: 's1', domain: 'a.com', target: 'http://127.0.0.1:1\n}\nevil.com {', enabled: true, exposure: 'public' } };
  assert.throws(() => I.generateCaddyServices(bad), /Unsafe character/);
  const good = { s1: { id: 's1', domain: 'a.com', target: 'http://127.0.0.1:3000', enabled: true, exposure: 'public',
                       ipAllowlist: ['1.2.3.4', '10.0.0.0/24'] } };
  const out = I.generateCaddyServices(good);
  assert.match(out, /reverse_proxy http:\/\/127\.0\.0\.1:3000/);
  assert.match(out, /remote_ip 1\.2\.3\.4/);
});

test('PR4: generateMainCaddyfile binds loopback in Xray local-only mode', () => {
  const prev = { CADDY_HTTPS_PORT: process.env.CADDY_HTTPS_PORT, PUBLIC_HTTPS_ENABLED: process.env.PUBLIC_HTTPS_ENABLED };
  try {
    process.env.CADDY_HTTPS_PORT = '8443';
    process.env.PUBLIC_HTTPS_ENABLED = 'no';
    const local = I.generateMainCaddyfile('vpn.example.com', 'a@b.com', true);
    assert.match(local, /127\.0\.0\.1:8443 \{/);
    assert.match(local, /tls internal/);
    process.env.PUBLIC_HTTPS_ENABLED = 'yes';
    const pub = I.generateMainCaddyfile('vpn.example.com', 'a@b.com', true);
    assert.match(pub, /vpn\.example\.com:8443 \{/);
    assert.doesNotMatch(pub, /127\.0\.0\.1:8443/);
  } finally {
    process.env.CADDY_HTTPS_PORT = prev.CADDY_HTTPS_PORT;
    process.env.PUBLIC_HTTPS_ENABLED = prev.PUBLIC_HTTPS_ENABLED;
  }
});
