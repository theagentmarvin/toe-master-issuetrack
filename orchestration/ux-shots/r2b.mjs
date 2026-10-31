#!/usr/bin/env node
// R2 Test B: deep link under DELAYED Firestore data (specialist D-1 race).
// Intercepts firestore.googleapis.com responses, holds ~12s, then releases.
import fs from 'node:fs';
const targetId = process.argv[2];
const issueId = process.argv[3] || '2D2AgxR18Go4wmY3mvQN';
const ws = new WebSocket(`ws://127.0.0.1:18800/devtools/page/${targetId}`);
let id = 0; const pending = new Map();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id; pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
    setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); reject(new Error('timeout ' + method)); } }, 120000);
  });
}
let loadedCb = () => {};
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  if (m.method === 'Page.loadEventFired') loadedCb();
  if (m.method === 'Fetch.requestPaused' && m.params?.requestId) {
    const url = m.params.request.url;
    if (/firestore\.googleapis\.com/.test(url)) {
      const wait = Math.max(0, holdUntil - Date.now());
      setTimeout(() => { send('Fetch.continueRequest', { requestId: m.params.requestId }).catch(() => {}); }, wait + Math.random() * 400);
    } else {
      send('Fetch.continueRequest', { requestId: m.params.requestId }).catch(() => {});
    }
  }
});
let holdUntil = 0;
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('ws'))); });
await send('Page.enable'); await send('Runtime.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: '*firestore.googleapis.com*', requestStage: 'Response' }] });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (path) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(data, 'base64')); console.log('shot ' + path); };
const dir = '/home/marvin/projects/toe-master/orchestration/ux-shots/';

holdUntil = Date.now() + 12000;
const t0 = Date.now();
const p = new Promise(r => loadedCb = r);
await send('Page.navigate', { url: `https://issuetrack-v4.web.app/bim/REG-002?issue=${issueId}` });
await Promise.race([p, sleep(20000)]);
for (let s = 4; s <= 24; s += 4) {
  await sleep(s === 4 ? 4000 : 4000);
  const st = await ev(`(()=>{const t=document.body.innerText;return JSON.stringify({t:Math.round(${Date.now() - t0}/1000), ready:/MODEL READY/.test(t), fsSeen:${true}, sel:t.match(/SEL #\\d+/)?.[0]||null, hasIssue:t.includes('R2 CLUSTER CHARLIE'), focusPin:!!document.querySelector('.it-pin-focus')})})()`);
  console.log('T+' + s + 's:', st);
}
await shot(dir + 'r2-06-deeplink-delayed.png');
ws.close(); process.exit(0);
