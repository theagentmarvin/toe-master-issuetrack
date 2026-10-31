#!/usr/bin/env node
// R2 Test A: create pinned issues on SAME element in REG-002 (scratch), report pin geometry + panel + assign-button placement.
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
let loadedCb = () => {};
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  if (m.method === 'Page.loadEventFired') loadedCb();
});
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('ws'))); });
await send('Page.enable'); await send('Runtime.enable');
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (path) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(data, 'base64')); console.log('shot ' + path); };
const dir = '/home/marvin/projects/toe-master/orchestration/ux-shots/';
const nav = async (url, waitMs) => { const p = new Promise(r => loadedCb = r); await send('Page.navigate', { url }); await Promise.race([p, sleep(15000)]); await sleep(waitMs); };

await nav('https://issuetrack-v4.web.app/bim/REG-002', 6000);
// real click on canvas facade
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 420, y: 590 });
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 420, y: 590, button: 'left', clickCount: 1, clickModifiers: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 420, y: 590, button: 'left', clickCount: 1, clickModifiers: 1 });
await sleep(1200);
// where is ASSIGN ISSUE now? is it above the fold?
const placement = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/ASSIGN ISSUE/.test(e.textContent));if(!b)return 'no button';const r=b.getBoundingClientRect();const panelOrder=[...document.querySelectorAll('[class*=panel] , aside, section, div')].filter(e=>/ASSIGN ISSUE|SELECTED ITEM|PROPERTY SETS/.test(e.textContent)&&e.querySelector('[class*=section],h2,h3')).length;return JSON.stringify({rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)},inViewport:r.top>=0&&r.bottom<=innerHeight, sel:document.body.innerText.match(/SEL #\\d+/)?.[0]||null})})()`);
console.log('ASSIGN PLACEMENT:', placement);
await shot(dir + 'r2-02-selected-assign-visible.png');
// pin three issues on this same element
const pin = async (title) => ev(`(async()=>{
  const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));
  const b=qb(/ASSIGN ISSUE/); if(!b) return JSON.stringify({err:'no assign btn'});
  b.click(); await new Promise(r=>setTimeout(r,250));
  const inp=[...document.querySelectorAll('input,textarea')].find(e=>/MIN 5/i.test(e.placeholder||''));
  if(!inp) return JSON.stringify({err:'no input'});
  const focus=()=>document.activeElement.tagName+'#'+(document.activeElement.id||'');
  const focusNow=focus();
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(inp,${JSON.stringify(title)});
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  qb(/PIN ISSUE/).click(); await new Promise(r=>setTimeout(r,1200));
  const t=document.body.innerText;
  return JSON.stringify({focusNow, id:(t.match(/\\[ PINNED ISSUES? \\][\\s\\S]{0,80}/)||[''])[0].replace(/\\n/g,' '), chip:t.match(/\\d+ PINNED/)?.[0]});
})()`);
console.log('PIN1:', await pin('R2 CLUSTER ALPHA'));
await sleep(800);
console.log('PIN2:', await pin('R2 CLUSTER BRAVO'));
await sleep(800);
console.log('PIN3:', await pin('R2 CLUSTER CHARLIE'));
await sleep(2500);
const geom = await ev(`JSON.stringify({pins:[...document.querySelectorAll('.it-pin')].map(p=>{const r=p.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),cls:p.className,title:p.title,aria:p.getAttribute('aria-label'),tag:p.tagName,bg:getComputedStyle(p.querySelector('*')||p).backgroundColor,border:getComputedStyle(p).borderColor,shadow:getComputedStyle(p).boxShadow.slice(0,60)}}), panel:(document.body.innerText.match(/\\[ PINNED ISSUE[\\s\\S]{0,400}/)||[''])[0]})`);
console.log('GEOM:', geom);
await shot(dir + 'r2-03-cluster.png');
ws.close(); process.exit(0);
