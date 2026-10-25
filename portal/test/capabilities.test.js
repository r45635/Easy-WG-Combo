'use strict';

const { test } = require('node:test');
const assert   = require('node:assert');
const h        = require('./helpers');

const post = (p, body) => h.api(p, { method: 'POST', body: body || {} });

test('user mode: privileged POSTs are blocked server-side (403)', async () => {
  h.setInterfaceMode('user');
  assert.strictEqual((await post('/api/backup/create')).status, 403);
  assert.strictEqual((await post('/api/monitors', { name: 'x', type: 'http', target: 'http://example.com' })).status, 403);
  assert.strictEqual((await post('/api/notifications/config', {})).status, 403);
  assert.strictEqual((await h.api('/api/fail2ban/logs')).status, 403); // rawLogs
});

test('super_user mode: gateway/apps denied, backups allowed', async () => {
  h.setInterfaceMode('super_user');
  assert.strictEqual((await post('/api/proxy/services', {})).status, 403);        // publicGateway
  assert.strictEqual((await post('/api/apps/uptime-kuma/stop')).status, 403);     // appsLifecycle
  assert.notStrictEqual((await post('/api/backup/create')).status, 403);          // createBackup allowed
});

test('fail2ban unban-all requires advancedSecurity (403 below advanced)', async () => {
  h.setInterfaceMode('super_user');
  assert.strictEqual((await post('/api/fail2ban/unban-all')).status, 403);
  h.setInterfaceMode('advanced');
  assert.notStrictEqual((await post('/api/fail2ban/unban-all')).status, 403);
});

test('mode escalation requires the admin password (no self-escalation)', async () => {
  h.setInterfaceMode('user');
  assert.strictEqual((await post('/api/settings/interface-mode', { interfaceMode: 'advanced' })).status, 401);
  assert.strictEqual((await post('/api/settings/interface-mode', { interfaceMode: 'advanced', confirmPassword: 'nope' })).status, 401);
  assert.strictEqual((await post('/api/settings/interface-mode', { interfaceMode: 'advanced', confirmPassword: h.ADMIN_PASSWORD })).status, 200);
  // downgrade is free
  assert.strictEqual((await post('/api/settings/interface-mode', { interfaceMode: 'user' })).status, 200);
});

// Preview-feature endpoints that were reachable from any mode until 0.5.6:
// File Drop delete/cleanup, the notification test send, and the migration
// tools. Each is now behind the capability its sibling endpoints already use.
test('File Drop delete and cleanup need fileDropPublic', async () => {
  h.setInterfaceMode('super_user');
  assert.strictEqual((await h.api('/api/filedrop/anything', { method: 'DELETE' })).status, 403);
  assert.strictEqual((await post('/api/filedrop/cleanup')).status, 403);
  h.setInterfaceMode('advanced');
  assert.notStrictEqual((await post('/api/filedrop/cleanup')).status, 403);
});

test('the notification test send needs configureNotifications', async () => {
  h.setInterfaceMode('user');
  assert.strictEqual((await post('/api/notifications/test')).status, 403);
  h.setInterfaceMode('super_user');
  assert.notStrictEqual((await post('/api/notifications/test')).status, 403);
});

test('migration tools are Advanced-only', async () => {
  for (const mode of ['user', 'super_user']) {
    h.setInterfaceMode(mode);
    assert.strictEqual((await post('/api/migration/export')).status, 403, `${mode} export`);
    assert.strictEqual((await post('/api/migration/validate')).status, 403, `${mode} validate`);
  }
  h.setInterfaceMode('advanced');
  assert.notStrictEqual((await post('/api/migration/validate')).status, 403);
});
