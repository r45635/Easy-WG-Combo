'use strict';

const { test }  = require('node:test');
const assert    = require('node:assert');
const fs        = require('fs');
const os        = require('os');
const path      = require('path');
const { parseSshConfig, expandSshInclude, isRootLoginRestricted } = require('../lib/sshd-config');

// Builds a throwaway /etc/ssh: { 'sshd_config': '…', 'sshd_config.d/10-x.conf': '…' }
function etcSsh(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ewg-sshd-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return path.join(dir, 'sshd_config');
}

test('first value wins, not the last — sshd ignores a later repeat', () => {
  const cfg = parseSshConfig(etcSsh({
    sshd_config: 'PermitRootLogin prohibit-password\nPermitRootLogin yes\n',
  }));
  assert.strictEqual(cfg.permitrootlogin.value, 'prohibit-password');
});

test('an Include that matches nothing is reported, not silently ignored', () => {
  // This is the signature of the real bug: the container was given
  // /etc/ssh/sshd_config but not /etc/ssh/sshd_config.d, so the Include
  // expanded to nothing and the stock `PermitRootLogin yes` at the bottom of
  // the main file became the answer. The parse must make that visible.
  const cfg = parseSshConfig(etcSsh({
    sshd_config: 'Include /nonexistent-ewg/sshd_config.d/*.conf\nPort 22\nPermitRootLogin yes\n',
  }));
  assert.ok(cfg._includes.some(i => i.matched === 0), 'unmatched include is reported');
  assert.strictEqual(cfg.permitrootlogin.value, 'yes');
});

test('relative Include resolves against the config file directory', () => {
  const main = etcSsh({
    sshd_config: 'Include sshd_config.d/*.conf\nPermitRootLogin yes\n',
    'sshd_config.d/01-hardening.conf': 'PermitRootLogin prohibit-password\nPasswordAuthentication no\n',
  });
  const cfg = parseSshConfig(main);
  assert.strictEqual(cfg.permitrootlogin.value, 'prohibit-password');
  assert.strictEqual(cfg.passwordauthentication.value, 'no');
  assert.match(cfg.permitrootlogin.source, /01-hardening\.conf$/);
});

test('drop-ins are read in lexical order — 01- beats 50-', () => {
  const cfg = parseSshConfig(etcSsh({
    sshd_config: 'Include sshd_config.d/*.conf\n',
    'sshd_config.d/01-hardening.conf': 'PermitRootLogin prohibit-password\n',
    'sshd_config.d/50-cloud-init.conf': 'PermitRootLogin yes\n',
  }));
  assert.strictEqual(cfg.permitrootlogin.value, 'prohibit-password');
});

test('a main-file line ABOVE the Include beats the drop-in (the trap)', () => {
  const cfg = parseSshConfig(etcSsh({
    sshd_config: 'PermitRootLogin yes\nInclude sshd_config.d/*.conf\n',
    'sshd_config.d/01-hardening.conf': 'PermitRootLogin prohibit-password\n',
  }));
  assert.strictEqual(cfg.permitrootlogin.value, 'yes', 'hardening below the Include does nothing');
});

test('Match blocks are conditional and do not set the global value', () => {
  const cfg = parseSshConfig(etcSsh({
    sshd_config: 'Match User deploy\n  PasswordAuthentication yes\nMatch all\nPasswordAuthentication no\n',
  }));
  assert.strictEqual(cfg.passwordauthentication.value, 'no');
});

test('comments, inline comments and "key=value" are handled', () => {
  const cfg = parseSshConfig(etcSsh({
    sshd_config: '# PermitRootLogin yes\nPasswordAuthentication=no\nPort 2222 # moved\n',
  }));
  assert.strictEqual(cfg.permitrootlogin, undefined, 'a commented line sets nothing');
  assert.strictEqual(cfg.passwordauthentication.value, 'no');
  assert.strictEqual(cfg.port.value, '2222');
});

test('an include cycle terminates', () => {
  const main = etcSsh({
    sshd_config: 'Include sshd_config.d/loop.conf\nPasswordAuthentication no\n',
    'sshd_config.d/loop.conf': 'Include ../sshd_config\n',
  });
  const cfg = parseSshConfig(main);
  assert.strictEqual(cfg.passwordauthentication.value, 'no');
});

test('a missing config file yields no values rather than throwing', () => {
  const cfg = parseSshConfig('/nonexistent/sshd_config');
  assert.deepStrictEqual(Object.keys(cfg), []);
});

test('expandSshInclude matches only files, in order', () => {
  const main = etcSsh({
    sshd_config: '',
    'sshd_config.d/b.conf': 'x',
    'sshd_config.d/a.conf': 'x',
    'sshd_config.d/notconf.txt': 'x',
  });
  const dir = path.dirname(main);
  fs.mkdirSync(path.join(dir, 'sshd_config.d', 'adir.conf'), { recursive: true });
  const got = expandSshInclude('sshd_config.d/*.conf', dir).map(f => path.basename(f));
  assert.deepStrictEqual(got, ['a.conf', 'b.conf'], 'sorted, no directory, no .txt');
});

// ── PermitRootLogin's two spellings ──────────────────────────────────────────
// `without-password` is the historical synonym of `prohibit-password`, and it
// is what `sshd -T` prints on Ubuntu 22.04. Rejecting it grades a hardened
// host as wide open.
test('isRootLoginRestricted accepts every value that forbids a root password login', () => {
  for (const v of ['no', 'prohibit-password', 'without-password', 'forced-commands-only']) {
    assert.equal(isRootLoginRestricted(v), true, v);
  }
});

test('isRootLoginRestricted rejects yes, and anything unknown', () => {
  for (const v of ['yes', 'YES', 'maybe', '', null, undefined]) {
    assert.equal(isRootLoginRestricted(v), false, String(v));
  }
});

test('isRootLoginRestricted ignores case and surrounding space', () => {
  assert.equal(isRootLoginRestricted('  Without-Password '), true);
  assert.equal(isRootLoginRestricted('PROHIBIT-PASSWORD'), true);
});
