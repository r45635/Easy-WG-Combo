/**
 * Screenshot script for Easy-WG-Combo docs.
 * Logs in to the portal, takes screenshots of each tab,
 * and blurs confidential elements (server name, client names, IPs).
 *
 * Usage: node scripts/take-screenshots.mjs [PASSWORD]
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || path.join(__dirname, '..', 'docs', 'screenshots');
const BASE = process.env.PORTAL_URL || 'http://localhost:29080';
const PASS = process.argv[2] || process.env.ADMIN_PASSWORD || 'changeme';

// CSS selectors of elements that contain confidential data to blur
const BLUR_SELECTORS = [
  // Server / client identity
  '#sidebar-server-name',
  '#dashboard-server-name',
  '#security-jail-name',
  '#login-server-name',
  '.client-name',
  '.client-ip',
  // Network addresses
  '#sec-my-ip-val',
  '.log-ip',
  'code.log-ip',
  // Access log: paths only (keep method/status/duration readable)
  '.log-uri',
  '.log-time',
  // Fail2Ban jail log (raw lines with PID, jail name, paths)
  '.jaillog-pre',
  // TLS cert details (domain, issuer, fingerprint)
  '.tls-val',
  // Active sessions: all cells (IP, UA, login time)
  '#sessions-list td',
];

async function blurConfidential(page) {
  await page.addStyleTag({
    content: BLUR_SELECTORS.map(s => `${s} { filter: blur(6px) !important; user-select: none; }`).join('\n'),
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // ── Login ───────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/`);
  await page.fill('#login-password', PASS);
  await page.press('#login-password', 'Enter');
  await page.waitForSelector('.sidebar', { timeout: 10000 });
  await page.waitForTimeout(800); // let stats load

  await blurConfidential(page);

  // ── Dashboard ───────────────────────────────────────────────────────────────
  await page.click('[data-tab="dashboard"]');
  await page.waitForTimeout(1200);
  await blurConfidential(page);
  await page.screenshot({ path: `${OUT}/dashboard.png`, fullPage: false });
  console.log('✓ dashboard.png');

  // ── VPN Clients ─────────────────────────────────────────────────────────────
  await page.click('[data-tab="clients"]');
  await page.waitForTimeout(800);
  await blurConfidential(page);
  await page.screenshot({ path: `${OUT}/clients.png`, fullPage: false });
  console.log('✓ clients.png');

  // ── Security tab ────────────────────────────────────────────────────────────
  await page.click('[data-tab="security"]');
  await page.waitForTimeout(2500); // let all panels load
  await blurConfidential(page);
  // Scroll to top to show status bar + stats + bans panels
  await page.evaluate(() => document.querySelector('.content').scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/security.png`, fullPage: false });
  console.log('✓ security.png');

  // ── Security (mid — TLS / password / sessions) ────────────────────────────
  await page.evaluate(() => {
    const c = document.querySelector('.content');
    const sessions = document.getElementById('sessions-list');
    if (sessions) sessions.scrollIntoView({ block: 'start', inline: 'nearest' });
    else c.scrollTo(0, c.scrollHeight / 2);
  });
  await page.waitForTimeout(300);
  await blurConfidential(page);
  await page.screenshot({ path: `${OUT}/security-sessions.png`, fullPage: false });
  console.log('✓ security-sessions.png');

  // ── Security (scrolled down — logs section) ──────────────────────────────────
  await page.evaluate(() => {
    const c = document.querySelector('.content');
    c.scrollTo(0, c.scrollHeight);
  });
  await page.waitForTimeout(400);
  await blurConfidential(page);
  await page.screenshot({ path: `${OUT}/security-logs.png`, fullPage: false });
  console.log('✓ security-logs.png');

  await browser.close();
  console.log('\nAll screenshots saved to docs/screenshots/');
}

main().catch(err => { console.error(err); process.exit(1); });
