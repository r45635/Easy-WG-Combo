'use strict';
// Regenerate the documentation screenshots from the demo stack.
//
//   ./demo-stack.sh up
//   "<path to>/Google Chrome" --headless=new --remote-debugging-port=9222 \
//       --user-data-dir=/tmp/ewg-shots-profile --hide-scrollbars about:blank &
//   node capture.js
//   ./demo-stack.sh down
//
// Headless Chrome driven over the DevTools protocol, rather than a desktop
// screenshot: no window chrome, no mouse cursor, no browser extension drawing
// over the page — and the same frame every time. Captured at deviceScaleFactor
// 2 and downscaled, which renders text more sharply than a 1x grab.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = process.env.DEMO_URL  || 'http://127.0.0.1:18081';
const PASS = process.env.DEMO_PASS || 'demo-pass-123';
const DBG  = process.env.CDP       || 'http://127.0.0.1:9222';
const OUT  = process.env.OUT_DIR   || __dirname;
fs.mkdirSync(OUT, { recursive: true });

// Secrets are blurred in the page before the pixels are read, so the PNG never
// contains them — these are throwaway demo keys, but a screenshot that shows a
// VLESS URI teaches the wrong habit, and one that shows a real one is a leak.
const BLUR_KEY = `(() => {
  const keys = [...document.querySelectorAll('*')]
    .filter(e => e.children.length === 0 && /^[A-Za-z0-9_-]{40,50}$/.test(e.textContent.trim()));
  keys.forEach(e => e.style.setProperty('filter','blur(7px)','important'));
  return keys.length ? 'blurred ' + keys.length + ' key(s)' : 'NO KEY FOUND — check the page before committing';
})()`;

const VIEWS = [
  { name: 'dashboard',      nav: 'Dashboard',     after: 3000 },
  { name: 'settings',       nav: 'Settings' },
  { name: 'clients',        nav: 'Devices' },
  { name: 'wireguard-view', nav: 'WireGuard',     w: 1440, h: 900, after: 4000 },
  { name: 'adguard-view',   nav: 'AdGuard Home',  w: 1440, h: 900, after: 5000 },
  { name: 'xray-tab',       nav: 'VLESS+Reality', after: 3000, js: BLUR_KEY },
  { name: 'xray-modal',     nav: 'Devices',       after: 2500, js: `(() => {
      const b = [...document.querySelectorAll('button[title="VLESS URI"]')].filter(x => x.offsetParent !== null);
      if (!b.length) return 'no VLESS button';
      b[0].click();
      return new Promise(r => setTimeout(() => {
        const qr = document.querySelector('#xray-device-qr');
        const uri = document.querySelector('#xray-device-uri');
        if (qr)  qr.style.setProperty('filter','blur(14px)','important');
        if (uri) uri.style.setProperty('filter','blur(7px)','important');
        r('blurred qr=' + !!qr + ' uri=' + !!uri);
      }, 2500));
    })()` },
];

let seq = 0, ws, pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  pending.set(++seq, { res, rej });
  ws.send(JSON.stringify({ id: seq, method, params }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed');
  return r.result?.value;
}

// The sidebar entries are plain text nodes, so match on the label and click the
// nearest clickable ancestor.
const clickLabel = label => evaluate(`(() => {
  const leaf = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(label)});
  if (!leaf) return 'not found';
  (leaf.closest('a,button,li,[class*=nav-item],[role=button]') || leaf.parentElement).click();
  return 'ok';
})()`);

async function capture(name, w, h) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false });
  await sleep(700);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(OUT, name + '.png');
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  if (process.platform === 'darwin') execFileSync('sips', ['-Z', String(w), file], { stdio: 'ignore' });
  console.log('  wrote', path.basename(file), w + 'x' + h);
}

(async () => {
  const target = (await (await fetch(DBG + '/json')).json()).find(t => t.type === 'page');
  if (!target) throw new Error('no page target — is headless Chrome running with --remote-debugging-port?');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    const h = pending.get(m.id);
    if (h) { pending.delete(m.id); m.error ? h.rej(new Error(m.error.message)) : h.res(m.result); }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: BASE + '/' });
  await sleep(2500);

  if (await evaluate("!!document.querySelector('#login-screen:not(.hidden)')")) {
    await evaluate(`(() => {
      const i = document.querySelector('#login-screen input[type=password]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(PASS)});
      i.dispatchEvent(new Event('input', { bubbles: true }));
      const f = i.closest('form');
      f ? f.requestSubmit() : document.querySelector('#login-screen button[type=submit]').click();
    })()`);
    await sleep(3000);
  }
  if (await evaluate("!!document.querySelector('#login-screen:not(.hidden)')")) throw new Error('login failed');

  for (const v of VIEWS) {
    console.log(v.name);
    if (v.nav) {
      const r = await clickLabel(v.nav);
      if (r !== 'ok') throw new Error(`navigation to "${v.nav}" failed: ${r}`);
    }
    await sleep(v.after || 2000);
    if (v.js) console.log('  ', await evaluate(v.js));
    await sleep(1200);
    await capture(v.name, v.w || 1280, v.h || 800);
  }
  ws.close();
  console.log('\ndone — check every image for names, hostnames, IPs and QR codes before committing');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
