'use strict';

const { test }      = require('node:test');
const assert        = require('node:assert');
const { spawnSync } = require('node:child_process');
const os   = require('os');
const fs   = require('fs');
const path = require('path');

// Boots server.js as a child process with NO ADMIN_PASSWORD and empty state,
// asserting it fails closed (exit 1) instead of serving with a known default.
test('portal refuses to start without an admin password', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ewg-boot-'));
  const env = { ...process.env };
  delete env.ADMIN_PASSWORD;
  delete env.WG_EASY_PASSWORD;
  delete env.ADGUARD_PASSWORD;
  Object.assign(env, {
    PORTAL_DATA_DIR: dataDir, PORTAL_CADDY_DIR: dataDir,
    PORTAL_FILEDROP_DIR: dataDir, PORTAL_PORT: '0',
  });
  const r = spawnSync(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'), env, timeout: 10000, encoding: 'utf8',
  });
  assert.strictEqual(r.status, 1, `expected exit 1, got status=${r.status} signal=${r.signal}\nstderr: ${r.stderr}`);
  assert.match(r.stderr, /no admin password/i);
});
