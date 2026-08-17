'use strict';

// Shared test harness. Boots the portal against a throwaway temp state dir with
// seeded fixtures, on an ephemeral port. The env vars MUST be set before
// server.js is require()'d — its path/credential constants capture them at load.
//
// node --test runs each *.test.js file in its own child process, so this module
// (and the single app instance it starts) is isolated per test file.

const os   = require('os');
const fs   = require('fs');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ewg-test-'));

process.env.PORTAL_DATA_DIR     = TMP;
process.env.PORTAL_CADDY_DIR    = TMP;
process.env.PORTAL_FILEDROP_DIR = TMP;
process.env.PORTAL_PORT         = '0';
process.env.PORTAL_HOST         = '127.0.0.1';
process.env.ADMIN_PASSWORD      = process.env.ADMIN_PASSWORD || 'test-pass-123';
process.env.WG_DEFAULT_DNS      = process.env.WG_DEFAULT_DNS || '10.8.0.1';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const BASIC_AUTH     = 'Basic ' + Buffer.from(':' + ADMIN_PASSWORD).toString('base64');

function writeJson(name, obj) {
  fs.writeFileSync(path.join(TMP, name), JSON.stringify(obj, null, 2));
}

// Baseline fixtures (individual tests overwrite as needed).
fs.mkdirSync(path.join(TMP, 'storage'), { recursive: true });
writeJson('portal-config.json',   { serverName: 'test-vps', interfaceMode: 'advanced' });
writeJson('filedrop-shares.json', {});
writeJson('monitors.json',        {});
writeJson('devices.json',         {});
writeJson('proxy-services.json',  {});

const app    = require('../server.js');
const server = app.listen(0);
server.unref();

function base() {
  return `http://127.0.0.1:${server.address().port}`;
}

// HTTP helper. Sends Basic auth by default (accepted by the auth middleware);
// pass { auth: false } for anonymous, or { headers: { Authorization } } to override.
async function api(pathname, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers);
  if (opts.auth === false) delete headers.Authorization;
  else if (!headers.Authorization) headers.Authorization = BASIC_AUTH;
  const init = { method: opts.method || 'GET', headers, redirect: 'manual' };
  if (opts.body !== undefined) init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
  return fetch(base() + pathname, init);
}

function setInterfaceMode(mode) {
  const cfg = JSON.parse(fs.readFileSync(path.join(TMP, 'portal-config.json'), 'utf8'));
  cfg.interfaceMode = mode;
  writeJson('portal-config.json', cfg);
}

module.exports = {
  app, server, base, api, writeJson, setInterfaceMode,
  TMP, DATA_DIR: TMP, ADMIN_PASSWORD, BASIC_AUTH,
};
