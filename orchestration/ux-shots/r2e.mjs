#!/usr/bin/env node
// R2 Test E: clean 480px deep-link test (tab B), draft-restore-after-Escape check (tab A).
import fs from 'node:fs';
const A = process.argv[2], B = process.argv[3];
function conn(targetId) {
  const ws = new WebSocket(`ws://127.0.0.1:18800/devtools/page/${targetId}`);
  let id = 0; const pending = new Map(); let loadedCb = () => {};
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
    if (m.method === 'Page.loadEventFired') loadedCb();
  });
  const ready = new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('ws'))); });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id; pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
    setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); reject(new Error('timeout ' + method)); } }, 90000);
  });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const nav = async (url, waitMs) => { const p = new Promise(r => loadedCb = r); await send('Page.navigate', { url }); await Promise.race([p, new Promise(r => setTimeout(r, 20000))]); await new Promise(r => setTimeout(r, waitMs)); };
  const shot = async (path) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(data, 'base64')); console.log('shot ' + path); };
  return { ws, ready, send, ev, nav, shot };
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const dir = '/home/marvin/projects/toe-master/orchestration/ux-shots/';
const a = conn(A), b = conn(B);
await a.ready; await b.ready;
await a.send('Page.enable'); await a.send('Runtime.enable');
await b.send('Page.enable'); await b.send('Runtime.enable');

// B: 480px deep link with pin
await b.send('Emulation.setDeviceMetricsOverride', { width: 480, height: 900, deviceScaleFactor: 1, mobile: false });
await b.nav('https://issuetrack-v4.web.app/bim/REG-002?issue=2D2AgxR18Go4wmY3mvQN', 10000);
console.log('MOBILE480:', await b.ev(`(()=>{const t=document.body.innerText;const p=document.querySelector('.it-pin-focus');const r=p?p.getBoundingClientRect():null;return JSON.stringify({ready:/MODEL READY/.test(t), webglFail:/WEBGL UNAVAILABLE/.test(t), sel:t.match(/SEL #\\d+/)?.[0]||null, hasCharlie:t.includes('R2 CLUSTER CHARLIE'), focusPin:!!p, pinInViewport:r?(r.top>=0&&r.bottom<=innerHeight):null, hOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})})()`));
await b.shot(dir + 'r2-12-mobile480-pin.png');
await b.send('Emulation.clearDeviceMetricsOverride');

// A: draft restore semantics — after Escape closed form with "abc" draft, reopen: is draft restored?
const draft = await a.ev(`(async()=>{
  const before=Object.entries(sessionStorage).filter(([k])=>/draft/i.test(k));
  const b=[...document.querySelectorAll('button')].find(e=>/ASSIGN ISSUE/.test(e.textContent));
  if(!b) return JSON.stringify({err:'no assign btn — need selection', before});
  b.click(); await new Promise(r=>setTimeout(r,300));
  const inp=document.getElementById('ai-title');
  const restored=inp?inp.value:null;
  // now CANCEL explicitly
  const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));
  qb(/CANCEL/).click(); await new Promise(r=>setTimeout(r,300));
  const afterCancel=Object.entries(sessionStorage).filter(([k])=>/draft/i.test(k));
  // reopen again — should be empty now
  qb(/ASSIGN ISSUE/).click(); await new Promise(r=>setTimeout(r,300));
  const inp2=document.getElementById('ai-title');
  const restored2=inp2?inp2.value:null;
  qb(/CANCEL/).click();
  return JSON.stringify({draftKeysBefore:before.map(x=>x[0]+'='+x[1].slice(0,50)), restoredAfterEsc:restored, afterCancel:afterCancel.map(x=>x[0]+'='+x[1].slice(0,50)), restoredAfterCancelReopen:restored2});
})()`);
console.log('DRAFT SEMANTICS:', draft);
a.ws.close(); b.ws.close(); process.exit(0);
