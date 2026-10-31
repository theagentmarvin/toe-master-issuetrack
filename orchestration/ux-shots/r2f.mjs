#!/usr/bin/env node
// R2 Test F: draft-restore semantics with fresh selection (tab A).
import fs from 'node:fs';
const A = process.argv[2];
const ws = new WebSocket(`ws://127.0.0.1:18800/devtools/page/${A}`);
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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await ready; await send('Page.enable'); await send('Runtime.enable');
const nav = async (url, w) => { const p = new Promise(r => loadedCb = r); await send('Page.navigate', { url }); await Promise.race([p, sleep(20000)]); await sleep(w); };
await nav('https://issuetrack-v4.web.app/bim/REG-002', 7000);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 420, y: 590 });
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 420, y: 590, button: 'left', clickCount: 1, clickModifiers: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 420, y: 590, button: 'left', clickCount: 1, clickModifiers: 1 });
await sleep(1000);
const out = await ev(`(async()=>{
  const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));
  const b=qb(/ASSIGN ISSUE/); if(!b) return 'no assign';
  b.click(); await new Promise(r=>setTimeout(r,300));
  const inp=document.getElementById('ai-title');
  const restored=inp?inp.value:null;
  const desc=document.getElementById('ai-desc')||[...document.querySelectorAll('textarea')][0];
  const r2={restoredTitle:restored, draftKeys:Object.keys(sessionStorage).filter(k=>/draft/i.test(k))};
  // Escape closes and KEEPS draft?
  const evt=(t)=>new KeyboardEvent(t,{key:'Escape',bubbles:true});
  (inp||document.body).dispatchEvent(evt()); window.dispatchEvent(evt());
  await new Promise(r=>setTimeout(r,300));
  r2.formOpenAfterEsc=!!document.getElementById('ai-title');
  r2.draftAfterEsc=Object.keys(sessionStorage).filter(k=>/draft/i.test(k));
  // reopen, then CANCEL — should clear
  qb(/ASSIGN ISSUE/).click(); await new Promise(r=>setTimeout(r,300));
  r2.reopenedTitle=(document.getElementById('ai-title')||{}).value||null;
  qb(/CANCEL/).click(); await new Promise(r=>setTimeout(r,300));
  r2.draftAfterCancel=Object.keys(sessionStorage).filter(k=>/draft/i.test(k));
  qb(/ASSIGN ISSUE/).click(); await new Promise(r=>setTimeout(r,300));
  r2.titleAfterCancelReopen=(document.getElementById('ai-title')||{}).value??'GONE';
  qb(/CANCEL/).click();
  return JSON.stringify(r2,null,1);
})()`);
console.log('DRAFT SEMANTICS:', out);
ws.close(); process.exit(0);
