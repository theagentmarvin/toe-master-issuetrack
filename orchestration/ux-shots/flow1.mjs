#!/usr/bin/env node
// One-shot: reload, select element, open form, submit invalid, screenshot, test Escape, then valid pin.
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
let loadedResolve; const loadedP = new Promise(r => loadedResolve = r);
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  if (m.method === 'Page.loadEventFired') loadedResolve();
});
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('ws'))); });
await send('Page.enable'); await send('Runtime.enable');
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (path) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(data, 'base64')); console.log('shot ' + path); };

const dir = '/home/marvin/projects/toe-master/orchestration/ux-shots/';
await send('Page.navigate', { url: 'https://issuetrack-v4.web.app/bim/demo' });
await Promise.race([loadedP, sleep(15000)]);
await sleep(5000); // model load
// click model via canvas coords
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 420, y: 680 });
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 420, y: 680, button: 'left', clickCount: 1, clickModifiers: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 420, y: 680, button: 'left', clickCount: 1, clickModifiers: 1 });
await sleep(1200);
// open form, submit invalid, screenshot immediately — all in page time
const invalidInfo = await ev(`(async()=>{
  const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));
  const b=qb(/ASSIGN ISSUE/); if(!b) return 'no assign button';
  b.click(); await new Promise(r=>setTimeout(r,250));
  const inp=[...document.querySelectorAll('input,textarea')].find(e=>/MIN 5/i.test(e.placeholder||''));
  if(!inp) return 'no title input';
  const proto=inp.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(inp,'abc');
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  qb(/PIN ISSUE/).click();
  await new Promise(r=>setTimeout(r,250));
  const errEl=[...document.querySelectorAll('.it-error,[class*=error]')].map(e=>e.textContent.trim()).filter(Boolean);
  const focused=document.activeElement.tagName+'/'+(document.activeElement.id||document.activeElement.className);
  return {errEl, focused, invalidCls:inp.className, formOpen:document.body.innerText.includes('PIN ISSUE')};
})()`);
console.log('INVALID:', JSON.stringify(invalidInfo, null, 1));
await shot(dir + '05-validation-error.png');
// Escape behavior test
const esc = await ev(`(async()=>{
  document.activeElement.blur();
  const evt=new KeyboardEvent('keydown',{key:'Escape',bubbles:true});
  window.dispatchEvent(evt); document.dispatchEvent(evt);
  await new Promise(r=>setTimeout(r,300));
  return {formOpenAfterEsc:document.body.innerText.includes('PIN ISSUE')};
})()`);
console.log('ESCAPE:', JSON.stringify(esc));
await sleep(4000);
const after = await ev(`({formOpen:document.body.innerText.includes('PIN ISSUE'), sel:document.body.innerText.match(/SEL #[0-9]+/)?.[0]})`);
console.log('AFTER ~6s:', JSON.stringify(after));
// valid pin
const pin = await ev(`(async()=>{
  const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));
  if(!document.body.innerText.includes('PIN ISSUE')){const b=qb(/ASSIGN ISSUE/); if(b){b.click(); await new Promise(r=>setTimeout(r,250));}}
  const inp=[...document.querySelectorAll('input,textarea')].find(e=>/MIN 5/i.test(e.placeholder||''));
  if(!inp) return 'form gone before valid submit';
  const proto=inp.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(inp,'UX REVIEW CRACK L2');
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  qb(/PIN ISSUE/).click();
  await new Promise(r=>setTimeout(r,1500));
  return {pins:document.body.innerText.match(/\\d+ PINNED/)?.[0], toast:[...document.querySelectorAll('[class*=toast],[class*=banner],[class*=saved]')].map(e=>e.textContent.trim()).slice(0,3), url:location.href};
})()`);
console.log('PIN:', JSON.stringify(pin, null, 1));
await shot(dir + '06-pin-created.png');
await sleep(3000);
await shot(dir + '07-pin-later.png');
ws.close(); process.exit(0);
