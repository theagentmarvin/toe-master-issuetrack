#!/usr/bin/env node
import fs from 'node:fs';
const targetId = process.argv[2];
const ws = new WebSocket(`ws://127.0.0.1:18800/devtools/page/${targetId}`);
let id = 0; const pending = new Map();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id; pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
    setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); reject(new Error('timeout ' + method)); } }, 60000);
  });
}
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('ws'))); });
await send('Page.enable'); await send('Runtime.enable');
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (path) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(data, 'base64')); console.log('shot ' + path); };
const dir = '/home/marvin/projects/toe-master/orchestration/ux-shots/';
const out = await ev(`(async()=>{
  const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));
  let b=qb(/ASSIGN ISSUE/);
  if(!b){ // select element first
    return 'no assign button — need selection';
  }
  b.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,300));
  b.click(); await new Promise(r=>setTimeout(r,300));
  const inp=[...document.querySelectorAll('input,textarea')].find(e=>/MIN 5/i.test(e.placeholder||''));
  if(!inp) return 'no input';
  inp.scrollIntoView({block:'center'});
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(inp,'abc');
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  qb(/PIN ISSUE/).click();
  await new Promise(r=>setTimeout(r,350));
  inp.scrollIntoView({block:'center'});
  const err=[...document.querySelectorAll('.it-error')].map(e=>e.textContent.trim());
  return JSON.stringify({err, cls:inp.className, border:getComputedStyle(inp).borderColor, errColor:document.querySelector('.it-error')?getComputedStyle(document.querySelector('.it-error')).color:null});
})()`);
console.log(out);
await shot(dir + '05-validation-error.png');
ws.close(); process.exit(0);
