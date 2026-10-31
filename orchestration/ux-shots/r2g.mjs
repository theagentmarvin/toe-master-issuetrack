#!/usr/bin/env node
// R2 Cleanup: delete my REG-002 artifacts via UI, verify pristine state, check disabled-CTA regression.
import fs from 'node:fs';
const A = process.argv[2];
const ws = new WebSocket(`ws://127.0.0.1:18800/devtools/page/${A}`);
let id = 0; const pending = new Map(); let loadedCb = () => {};
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  if (m.method === 'Page.loadEventFired') loadedCb();
});
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('ws'))); });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const mid = ++id; pending.set(mid, { resolve, reject });
  ws.send(JSON.stringify({ id: mid, method, params }));
  setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); reject(new Error('timeout ' + method)); } }, 90000);
});
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return 'EVAL-EXC: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (path) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(data, 'base64')); console.log('shot ' + path); };
const dir = '/home/marvin/projects/toe-master/orchestration/ux-shots/';
await send('Page.enable'); await send('Runtime.enable');
// auto-accept confirm dialogs
const dialogs = [];
ws.addEventListener('message', ev2 => { const m = JSON.parse(ev2.data); if (m.method === 'Page.javascriptDialogOpening') { dialogs.push(m.params.message); send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
const nav = async (url, w) => { const p = new Promise(r => loadedCb = r); await send('Page.navigate', { url }); await Promise.race([p, sleep(20000)]); await sleep(w); };

await nav('https://issuetrack-v4.web.app/project/REG-002', 5000);
const mine = ['R2 CLUSTER ALPHA', 'R2 CLUSTER BRAVO', 'R2 CLUSTER CHARLIE', 'R2 REMOTE WRITE', 'R2 FRICTION TEST'];
for (let pass = 0; pass < 8; pass++) {
  const done = await ev(`(async()=>{
    const cards=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/R2 (CLUSTER|REMOTE|FRICTION)/.test(e.textContent));
    if(!cards.length) return 'CLEAR';
    const title=cards[0].textContent.trim().slice(0,40);
    const card=cards[0].closest('[class*=card],[class*=row],li,div');
    const del=[...(card.parentElement?.parentElement||card).querySelectorAll('button,a')].find(e=>/DELETE/i.test(e.textContent));
    if(!del) return 'NO DELETE BTN for '+title;
    del.click(); await new Promise(r=>setTimeout(r,600));
    return 'deleted: '+title;
  })()`);
  console.log('CLEANUP:', done);
  if (done === 'CLEAR') break;
  await sleep(800);
}
await sleep(2500);
console.log('DIALOGS SEEN:', JSON.stringify(dialogs.slice(0, 8)));
console.log('REG-002 FINAL:', await ev(`(()=>{const t=document.body.innerText;return JSON.stringify({counts:t.match(/\d+ OPEN \/ \d+ TOTAL/)?.[0], mineLeft:t.match(/R2 (CLUSTER|REMOTE|FRICTION)[^\n]*/g)||[], seeds:['Anchor bolts','Dock leveller'].map(s=>t.includes(s))})})()`));
await shot(dir + 'r2-13-reg002-after-cleanup.png');
await nav('https://issuetrack-v4.web.app/project/REG-001', 5000);
console.log('REG-001 FINAL:', await ev(`(()=>{const t=document.body.innerText;return JSON.stringify({counts:t.match(/\d+ OPEN \/ \d+ TOTAL/)?.[0], mine:t.match(/R2 |UX REVIEW|UX CLUSTER/g)||[], badges:[...document.querySelectorAll('a')].filter(a=>/issue=/.test(a.getAttribute('href')||'')).length})})()`));
// regression: disabled 3D VIEWPORT CTA on bim route
await nav('https://issuetrack-v4.web.app/bim/REG-002', 6000);
console.log('TOPBAR CTA:', await ev(`(()=>{const b=[...document.querySelectorAll('a,button')].find(e=>/3D VIEWPORT|VIEWPORT|REGISTER/i.test(e.textContent));if(!b)return 'none';const s=getComputedStyle(b);return JSON.stringify({t:b.textContent.trim(),tag:b.tagName,href:b.getAttribute('href'),bg:s.backgroundColor,opacity:s.opacity,disabled:!!b.disabled})})()`));
console.log('PINS AFTER CLEANUP:', await ev(`JSON.stringify([...document.querySelectorAll('.it-pin')].map(p=>p.title))`));
console.log('SS DRAFT KEYS:', await ev(`JSON.stringify(Object.keys(sessionStorage).filter(k=>/draft/i.test(k)))`));
await ev(`Object.keys(sessionStorage).filter(k=>/draft/i.test(k)).forEach(k=>sessionStorage.removeItem(k));'ok'`);
ws.close(); process.exit(0);
