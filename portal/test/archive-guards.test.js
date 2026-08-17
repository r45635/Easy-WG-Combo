'use strict';

const { test } = require('node:test');
const assert   = require('node:assert');
const { execFileSync } = require('node:child_process');
const os   = require('os');
const fs   = require('fs');
const path = require('path');
const { validateTarListing } = require('../lib/archive-guards');

test('validateTarListing accepts a clean listing', () => {
  const clean = [
    'drwxr-xr-x user/group 0 2026-08-16 12:00 portal/',
    '-rw-r--r-- user/group 12 2026-08-16 12:00 portal/data/config.json',
    '-rw-r--r-- user/group 5 2026-08-16 12:00 .env',
  ].join('\n');
  assert.strictEqual(validateTarListing(clean), null);
});

test('validateTarListing rejects symlink, hardlink, absolute path and traversal', () => {
  assert.match(validateTarListing('lrwxrwxrwx user/group 0 2026-08-16 12:00 evil -> /etc/passwd'), /disallowed entry type/);
  assert.match(validateTarListing('hrw-r--r-- user/group 0 2026-08-16 12:00 hard link to /etc/shadow'), /disallowed entry type/);
  assert.match(validateTarListing('-rw-r--r-- user/group 0 2026-08-16 12:00 /etc/cron.d/x'), /absolute path/);
  assert.match(validateTarListing('-rw-r--r-- user/group 0 2026-08-16 12:00 ../../etc/passwd'), /traversal/);
  assert.strictEqual(validateTarListing(''), 'archive is empty or unreadable');
});

test('integration: a real archive with a symlink is rejected, a clean one passes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ewg-tar-'));
  fs.writeFileSync(path.join(dir, 'good.txt'), 'hello');
  const cleanTar = path.join(dir, 'clean.tgz');
  execFileSync('tar', ['-czf', cleanTar, '-C', dir, 'good.txt']);
  const cleanListing = execFileSync('tar', ['-tvzf', cleanTar], { encoding: 'utf8' });
  assert.strictEqual(validateTarListing(cleanListing), null);

  fs.symlinkSync('/etc/passwd', path.join(dir, 'evil-link'));
  const badTar = path.join(dir, 'bad.tgz');
  execFileSync('tar', ['-czf', badTar, '-C', dir, 'evil-link']);
  const badListing = execFileSync('tar', ['-tvzf', badTar], { encoding: 'utf8' });
  assert.match(validateTarListing(badListing), /disallowed entry type/);
});
