'use strict';
// Build the promotional demo clip (GIF + MP4) from the demo stack.
//
//   ./demo-stack.sh up
//   "<path to>/Google Chrome" --headless=new --remote-debugging-port=9222 \
//       --user-data-dir=/tmp/ewg-promo-profile --hide-scrollbars about:blank &
//   node promo.js                      # writes promo/easy-wg-combo-demo.{gif,mp4}
//   ./demo-stack.sh down
//
// Same captures as capture.js, plus a caption bar and two full-screen cards,
// assembled with per-frame durations so the clip is a dozen frames rather than
// hundreds — a 30-second walkthrough in well under a megabyte.
//
// The data is fictitious (see README.md). Every QR code and URI is blurred in
// the page before the pixels are read, and the run aborts if the blur found
// nothing: a promo clip is the single most-shared artefact a project has.
const fs = require('fs'), path = require('path');
const { execFileSync, execSync } = require('child_process');

const BASE = process.env.DEMO_URL  || 'http://127.0.0.1:18081';
const PASS = process.env.DEMO_PASS || 'demo-pass-123';
const DBG  = process.env.CDP       || 'http://127.0.0.1:9222';
const OUT  = process.env.OUT_DIR   || path.join(__dirname, 'promo');
const FRAMES = path.join(OUT, 'frames');
const W = 1280, H = 800;                 // captured at 2x, written at this size
const GIF_WIDTH = 1000;                  // final clip width
fs.mkdirSync(FRAMES, { recursive: true });

let seq = 0, ws, pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { pending.set(++seq, { res, rej }); ws.send(JSON.stringify({ id: seq, method: m, params: p })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function ev(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed');
  return r.result?.value;
}
// Nav entries are bare text nodes; click the nearest clickable ancestor.
const clickLabel = label => ev(`(() => {
  const leaf = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(label)});
  if (!leaf) return 'not found';
  (leaf.closest('a,button,li,[class*=nav-item],[role=button]') || leaf.parentElement).click();
  return 'ok';
})()`);

const CAPTION = `(text)=>{let b=document.getElementById('__cap');
 if(!b){b=document.createElement('div');b.id='__cap';document.body.appendChild(b);
  b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:18px 28px;'+
   'background:linear-gradient(to top,rgba(10,11,16,.97),rgba(10,11,16,.86));color:#f2f3f7;'+
   'font:600 25px/1.35 -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;'+
   'border-top:3px solid #7c5cff;letter-spacing:.1px';}
 b.textContent=text;}`;
const CARD = `(title,sub,foot)=>{let c=document.getElementById('__card');
 if(!c){c=document.createElement('div');c.id='__card';document.body.appendChild(c);}
 c.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#0a0b10;color:#fff;display:flex;'+
  'flex-direction:column;align-items:center;justify-content:center;text-align:center;'+
  'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;gap:22px';
 c.innerHTML='<div style="font-size:19px;letter-spacing:4px;color:#7c5cff;font-weight:700">'+(foot||'')+'</div>'+
  '<div style="font-size:62px;font-weight:800;letter-spacing:-1px">'+title+'</div>'+
  '<div style="font-size:28px;color:#aeb4c6;max-width:900px;line-height:1.45;font-weight:500">'+sub+'</div>';}`;

const STEPS = [
  ['Dashboard',     'One dashboard: clients, DNS queries, blocked traffic, resources'],
  ['Devices',       'Add a device in one click — QR code, config file, expiry date'],
  ['DNS Profiles',  'Per-device DNS filtering: filtered, unfiltered, or your own'],
  ['AdGuard Home',  'AdGuard Home built in — blocklists and live query statistics'],
  ['WireGuard',     'wg-easy embedded too, when you want the low-level view'],
  ['VLESS+Reality', 'Optional VLESS+Reality (Xray) where WireGuard is blocked'],
  ['Backups',       'Backups, monitoring and notifications are part of the box'],
  ['Settings',      'Three interface modes — from dead simple to full control'],
];
// The Security tab is deliberately absent: on a container it scores "RISKY" for
// want of a real firewall and real TLS, and dressing that up would be a lie.

let n = 0;
const timeline = path.join(FRAMES, 'timeline.txt');
async function frame(hold) {
  await sleep(500);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const f = path.join(FRAMES, String(n).padStart(3, '0') + '.png');
  fs.writeFileSync(f, Buffer.from(data, 'base64'));
  if (process.platform === 'darwin') execFileSync('sips', ['-Z', String(W), f], { stdio: 'ignore' });
  fs.appendFileSync(timeline, `file '${path.basename(f)}'\nduration ${hold}\n`);
  console.log('  frame', n, hold + 's');
  n++;
}

(async () => {
  const target = (await (await fetch(DBG + '/json')).json()).find(t => t.type === 'page');
  if (!target) throw new Error('no page target — is headless Chrome running with --remote-debugging-port?');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => { const m = JSON.parse(e.data); const h = pending.get(m.id); if (h) { pending.delete(m.id); m.error ? h.rej(new Error(m.error.message)) : h.res(m.result); } };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: BASE + '/' }); await sleep(1500);
  // Force English: every selector below matches on a visible label.
  await ev(`(()=>{try{for(const k of Object.keys(localStorage)) if(/lang/i.test(k)) localStorage.setItem(k,'en');}catch(e){}})()`);
  await send('Page.navigate', { url: BASE + '/' }); await sleep(2500);

  if (await ev("!!document.querySelector('#login-screen:not(.hidden)')")) {
    await ev(`(() => { const i = document.querySelector('#login-screen input[type=password]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i, ${JSON.stringify(PASS)});
      i.dispatchEvent(new Event('input',{bubbles:true}));
      const f = i.closest('form'); f ? f.requestSubmit() : document.querySelector('#login-screen button[type=submit]').click(); })()`);
    await sleep(3000);
  }
  if (await ev("!!document.querySelector('#login-screen:not(.hidden)')")) throw new Error('login failed');

  fs.writeFileSync(timeline, '');
  await ev(`window.__cap=${CAPTION};window.__card=${CARD};'ready'`);

  await ev(`window.__card('Easy-WG-Combo','Your own VPN, ad-blocking DNS and admin portal —<br>on a 1 vCPU / 1 GB VPS','SELF-HOSTED')`);
  await frame(3.2);
  await ev(`(()=>{const c=document.getElementById('__card');if(c)c.remove();})()`);

  for (const [nav, caption] of STEPS) {
    const r = await clickLabel(nav);
    if (r !== 'ok') throw new Error(`navigation to "${nav}" failed: ${r}`);
    await sleep(nav === 'AdGuard Home' ? 5000 : 2600);
    await ev(`window.__cap(${JSON.stringify(caption)})`);
    await frame(2.6);
  }

  // A device's config. The WireGuard QR button opens a pop-up window, which a
  // headless browser blocks, so this shows the VLESS modal and the caption
  // claims nothing more than that.
  await clickLabel('Devices'); await sleep(2200);
  const opened = await ev(`(()=>{const b=[...document.querySelectorAll('button[data-action="dev-xray"]')].filter(x=>x.offsetParent!==null);
    if(!b.length)return 'no config button';b[0].click();return 'ok';})()`);
  if (opened !== 'ok') throw new Error('device config modal: ' + opened);
  await sleep(2600);
  const blurred = await ev(`(()=>{const q=document.querySelector('#xray-device-qr'),u=document.querySelector('#xray-device-uri');
    if(q)q.style.setProperty('filter','blur(14px)','important');
    if(u)u.style.setProperty('filter','blur(7px)','important');
    return (q&&u)?'blurred qr+uri':'NOTHING BLURRED — do not publish';})()`);
  console.log('  ', blurred);
  if (blurred.startsWith('NOTHING')) throw new Error(blurred);
  await ev(`window.__cap('Every device gets its own config — a QR code or a URI to import')`);
  await frame(2.8);

  await ev(`(()=>{const b=document.getElementById('__cap');if(b)b.remove();})()`);
  await ev(`window.__card('github.com/r45635/Easy-WG-Combo','Docker · MIT licence · English, French, Chinese<br>Admin portal local-only by default','OPEN SOURCE')`);
  await frame(3.4);
  // concat needs the last file repeated for its duration to be honoured
  fs.appendFileSync(timeline, `file '${String(n - 1).padStart(3, '0')}.png'\n`);
  ws.close();

  const gif = path.join(OUT, 'easy-wg-combo-demo.gif');
  const mp4 = path.join(OUT, 'easy-wg-combo-demo.mp4');
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); }
  catch { console.log(`\n${n} frames in ${FRAMES} — install ffmpeg to assemble them.`); return; }
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', 'timeline.txt',
    '-vf', `scale=${GIF_WIDTH}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192[p];[s1][p]paletteuse=dither=sierra2_4a`,
    '-fps_mode', 'vfr', '-loop', '0', gif], { cwd: FRAMES, stdio: 'ignore' });
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', 'timeline.txt',
    '-vf', `scale=${GIF_WIDTH}:-2:flags=lanczos,format=yuv420p`,
    '-fps_mode', 'vfr', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', mp4], { cwd: FRAMES, stdio: 'ignore' });
  const kb = f => Math.round(fs.statSync(f).size / 1024) + ' KB';
  console.log(`\n${gif}  ${kb(gif)}\n${mp4}  ${kb(mp4)}`);
  console.log('watch it before posting it anywhere');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
