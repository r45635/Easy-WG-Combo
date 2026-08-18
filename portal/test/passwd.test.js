'use strict';

const { test }      = require('node:test');
const assert        = require('node:assert');
const { spawnSync } = require('node:child_process');
const os   = require('os');
const fs   = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');

// Build an isolated instance dir with stubbed `docker` and `compose.sh`, then run
// the real `easywg passwd` with the password piped on stdin.
function runPasswd({ envExtra = '', newPw = 'brand-new-strong-1234' }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ewg-passwd-'));
  fs.copyFileSync(path.join(REPO, 'easywg'), path.join(dir, 'easywg'));
  fs.chmodSync(path.join(dir, 'easywg'), 0o755);
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docker-compose.yml'),
    'services:\n  wg-easy:\n    image: ghcr.io/wg-easy/wg-easy:14@sha256:deadbeef\n');
  fs.writeFileSync(path.join(dir, 'compose.sh'), '#!/bin/sh\nexit 0\n');
  fs.chmodSync(path.join(dir, 'compose.sh'), 0o755);
  fs.writeFileSync(path.join(dir, '.env'), `ADMIN_PASSWORD=old-pass-abcd12\n${envExtra}`);
  fs.writeFileSync(path.join(dir, '.env.secrets'), "export PASSWORD_HASH='OLDHASH'\n");

  // Stub `docker`: wgpw prints a marker hash; ps prints nothing (portal "not running").
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'ewg-bin-'));
  fs.writeFileSync(path.join(bin, 'docker'),
    '#!/bin/sh\ncase "$1" in\n  run) echo "PASSWORD_HASH=\'NEWHASH\'";;\n  *) exit 0;;\nesac\n');
  fs.chmodSync(path.join(bin, 'docker'), 0o755);

  const r = spawnSync('./easywg', ['passwd'], {
    cwd: dir, input: `${newPw}\n${newPw}\n`, encoding: 'utf8', timeout: 15000,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
  return {
    status: r.status, stdout: r.stdout || '', stderr: r.stderr || '',
    env: fs.readFileSync(path.join(dir, '.env'), 'utf8'),
    secrets: fs.readFileSync(path.join(dir, '.env.secrets'), 'utf8'),
  };
}

test('easywg passwd: WG_EASY_PASSWORD absent → hash regenerated, ADGUARD pinned', () => {
  const r = runPasswd({});
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.env, /^ADMIN_PASSWORD=brand-new-strong-1234$/m);
  assert.match(r.secrets, /PASSWORD_HASH='NEWHASH'/, 'hash regenerated when wg-easy follows admin');
  assert.match(r.env, /^ADGUARD_PASSWORD=old-pass-abcd12$/m, 'AdGuard pinned to the old value');
});

test('easywg passwd: WG_EASY_PASSWORD set → PASSWORD_HASH left unchanged', () => {
  const r = runPasswd({ envExtra: 'WG_EASY_PASSWORD=independent-wg-pass\n' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.env, /^ADMIN_PASSWORD=brand-new-strong-1234$/m);
  assert.match(r.secrets, /PASSWORD_HASH='OLDHASH'/, 'independent wg-easy hash must NOT be clobbered');
});

test('easywg passwd: rejects a "$" and leaves .env untouched', () => {
  const r = runPasswd({ newPw: 'has$dollar-1234' });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /\$/);
  assert.match(r.env, /^ADMIN_PASSWORD=old-pass-abcd12$/m, '.env unchanged on rejection');
});
