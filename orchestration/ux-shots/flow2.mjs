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
let loadedResolve; const loadedP = new Promise(r => loadedResolve = r);
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  if (m.method === 'Page.loadEventFired') loadedResolve();
});
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('ws'))); });
await send('Page.enable'); await send('Runtime.enable');
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (path) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(data, 'base64')); console.log('shot ' + path); };
const dir = '/home/marvin/projects/toe-master/orchestration/ux-shots/';

await send('Page.navigate', { url: 'https://issuetrack-v4.web.app/bim/demo' });
await Promise.race([loadedP, sleep(15000)]);
await sleep(5000);
const pinIt = (title, x, y) => ev(`(async()=>{
  const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));
  const b=qb(/ASSIGN ISSUE/); if(!b) return 'no button';
  b.click(); await new Promise(r=>setTimeout(r,250));
  const inp=[...document.querySelectorAll('input,textarea')].find(e=>/MIN 5/i.test(e.placeholder||''));
  if(!inp) return 'form gone';
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(inp,${JSON.stringify(title)});
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  qb(/PIN ISSUE/).click(); await new Promise(r=>setTimeout(r,900));
  return 'pinned';
})()`);
// select element near existing pin
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 420, y: 680 });
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 420, y: 680, button: 'left', clickCount: 1, clickModifiers: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 420, y: 680, button: 'left', clickCount: 1, clickModifiers: 1 });
await sleep(1000);
console.log('A:', await pinIt('UX CLUSTER MARKER A'));
await sleep(500);
console.log('B:', await pinIt('UX CLUSTER MARKER B'));
await sleep(1500);
const pins = await ev(`JSON.stringify([...document.querySelectorAll('.it-pin')].map(p=>{const r=p.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y)}}))`);
console.log('PINS:', pins);
await shot(dir + '12-pin-cluster.png');
// narrow viewport
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 900, deviceScaleFactor: 1, mobile: false });
await sleep(1200);
await shot(dir + '13-mobile-480.png');
const mobileInfo = await ev(`JSON.stringify({hOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth, sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, canvasW:document.querySelector('canvas')?.getBoundingClientRect().width})`);
console.log('MOBILE:', mobileInfo);
await send('Emulation.clearDeviceMetricsOverride');
await sleep(800);
// hover state on pin
const hover = await ev(`(async()=>{const p=document.querySelector('.it-pin');if(!p)return 'none';const before=getComputedStyle(p).transform+'|'+getComputedStyle(p).backgroundColor;p.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));p.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}));await new Promise(r=>setTimeout(r,200));return {before, after:getComputedStyle(p).transform+'|'+getComputedStyle(p).backgroundColor, title:p.title, aria:p.getAttribute('aria-label')}})()`);
console.log('HOVER:', JSON.stringify(hover));
ws.close(); process.exit(0);
