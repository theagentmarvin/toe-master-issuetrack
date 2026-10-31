#!/usr/bin/env node
// R2 Test F2: draft-restore semantics, stepwise with guards.
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
await send('Page.enable'); await send('Runtime.enable');
const p = new Promise(r => loadedCb = r);
await send('Page.navigate', { url: 'https://issuetrack-v4.web.app/bim/REG-002' });
await Promise.race([p, sleep(20000)]); await sleep(7000);
// select element
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 420, y: 590 });
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 420, y: 590, button: 'left', clickCount: 1, clickModifiers: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 420, y: 590, button: 'left', clickCount: 1, clickModifiers: 1 });
await sleep(1000);
console.log('S1 sel:', await ev(`document.body.innerText.match(/SEL #\\d+/)?.[0]||'none'`));
console.log('S2 open+restore:', await ev(`(async()=>{const b=[...document.querySelectorAll('button')].find(e=>/ASSIGN ISSUE/.test(e.textContent));if(!b)return 'no assign';b.click();await new Promise(r=>setTimeout(r,300));const inp=document.getElementById('ai-title');return JSON.stringify({title:inp?inp.value:'NO INPUT',focus:document.activeElement.id,draftKeys:Object.keys(sessionStorage).filter(k=>/draft/i.test(k))})})()`));
console.log('S3 esc:', await ev(`(async()=>{const inp=document.getElementById('ai-title');if(!inp)return 'form already closed';const mk=()=>new KeyboardEvent('keydown',{key:'Escape',bubbles:true});inp.dispatchEvent(mk());window.dispatchEvent(mk());document.dispatchEvent(mk());await new Promise(r=>setTimeout(r,400));return JSON.stringify({formOpen:!!document.getElementById('ai-title'),sel:document.body.innerText.match(/SEL #\\d+/)?.[0]||'CLEARED',assignBtn:!![...document.querySelectorAll('button')].find(e=>/ASSIGN ISSUE/.test(e.textContent)),draftKeys:Object.keys(sessionStorage).filter(k=>/draft/i.test(k))})})()`));
console.log('S4 reopen:', await ev(`(async()=>{const b=[...document.querySelectorAll('button')].find(e=>/ASSIGN ISSUE/.test(e.textContent));if(!b)return 'no assign btn (selection cleared by Escape?)';b.click();await new Promise(r=>setTimeout(r,300));const inp=document.getElementById('ai-title');return JSON.stringify({title:inp?inp.value:'NO INPUT'})})()`));
console.log('S5 cancel:', await ev(`(async()=>{const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));const c=qb(/CANCEL/);if(!c)return 'no cancel';c.click();await new Promise(r=>setTimeout(r,400));return JSON.stringify({formOpen:!!document.getElementById('ai-title'),draftKeys:Object.keys(sessionStorage).filter(k=>/draft/i.test(k))})})()`));
console.log('S6 reopen-after-cancel:', await ev(`(async()=>{const b=[...document.querySelectorAll('button')].find(e=>/ASSIGN ISSUE/.test(e.textContent));if(!b)return 'no assign btn';b.click();await new Promise(r=>setTimeout(r,300));const inp=document.getElementById('ai-title');return JSON.stringify({title:inp?inp.value:'NO INPUT'});})()`));
console.log('S7 final cancel:', await ev(`(async()=>{const c=[...document.querySelectorAll('button')].find(e=>/CANCEL/.test(e.textContent));if(c)c.click();await new Promise(r=>setTimeout(r,300));return JSON.stringify(Object.keys(sessionStorage).filter(k=>/draft/i.test(k)))})()`));
ws.close(); process.exit(0);
