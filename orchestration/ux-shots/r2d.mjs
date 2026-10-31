#!/usr/bin/env node
// R2 Test D: friction recount (landing -> pinned issue on REG-002), regression sweep, 480px with pin.
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
  const click = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, clickModifiers: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, clickModifiers: 1 });
  };
  return { ws, ready, send, ev, nav, shot, click };
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const dir = '/home/marvin/projects/toe-master/orchestration/ux-shots/';
const a = conn(A);
await a.ready; await a.send('Page.enable'); await a.send('Runtime.enable');

// --- Regression 1: landing discoverability ---
await a.nav('https://issuetrack-v4.web.app/', 2500);
const land = await a.ev(`(()=>{const cta=[...document.querySelectorAll('a')].find(x=>/OPEN BIM DEMO/i.test(x.textContent));const r=cta?cta.getBoundingClientRect():null;return JSON.stringify({cta:!!cta,href:cta&&cta.getAttribute('href'),aboveFold:r?r.top<innerHeight:false,y:r&&Math.round(r.y)})})()`);
console.log('LANDING CTA:', land);
await a.shot(dir + 'r2-07-landing.png');

// --- Regression 2: loading state ---
const p2 = new Promise(r => { const h = () => r(); });
await a.send('Page.navigate', { url: 'https://issuetrack-v4.web.app/bim/REG-002' });
await sleep(1400);
const loading = await a.ev(`(document.body.innerText.match(/LOADING[^\\n]*/)||[null])[0]`);
console.log('LOADING @1.4s:', loading);
await a.shot(dir + 'r2-08-loading.png');
await sleep(6000);

// --- Friction recount: real pointer path, count clicks + scrolls ---
// click 1 = CTA (already navigated directly; count it), then:
const fr = [];
// model click
await a.click(420, 590); await sleep(900);
fr.push('click#2 model: ' + await a.ev(`document.body.innerText.match(/SEL #\\d+/)?.[0]||'FAIL'`));
// assign visible without scroll?
fr.push('assign placement: ' + await a.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/ASSIGN ISSUE/.test(e.textContent));const r=b.getBoundingClientRect();return JSON.stringify({y:Math.round(r.y),inViewport:r.top>=0&&r.bottom<=innerHeight})})()`));
await a.click(1006, 269); await sleep(500); // click#3 ASSIGN ISSUE (real coords)
fr.push('form+focus: ' + await a.ev(`JSON.stringify({open:document.body.innerText.includes('PIN ISSUE'),focus:document.activeElement.id||document.activeElement.tagName})`));
// pin button visible without scroll?
fr.push('pinbtn placement: ' + await a.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/PIN ISSUE/.test(e.textContent));const r=b.getBoundingClientRect();return JSON.stringify({y:Math.round(r.y),inViewport:r.top>=0&&r.bottom<=innerHeight})})()`));
// type title (no extra click needed thanks to autofocus)
await a.ev(`(()=>{const inp=document.getElementById('ai-title');Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(inp,'R2 FRICTION TEST');inp.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const pb = await a.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/PIN ISSUE/.test(e.textContent));const r=b.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
await a.click(pb.x, pb.y); await sleep(1200); // click#4 PIN ISSUE
fr.push('result: ' + await a.ev(`JSON.stringify({chip:document.body.innerText.match(/\\d+ PINNED/)?.[0], card:/R2 FRICTION TEST/.test(document.body.innerText), toast:[...document.querySelectorAll('[class*=toast],[class*=banner],[class*=status]')].map(e=>e.textContent.trim()).filter(t=>/SAVED/i.test(t)).slice(0,2)})`));
await a.shot(dir + 'r2-09-after-pin.png');
fr.forEach(f => console.log('FRICTION:', f));

// --- Regression 3: validation error (fresh form) ---
const val = await a.ev(`(async()=>{
  const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));
  qb(/ASSIGN ISSUE/).click(); await new Promise(r=>setTimeout(r,250));
  const inp=document.getElementById('ai-title');
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(inp,'abc');
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  qb(/PIN ISSUE/).click(); await new Promise(r=>setTimeout(r,350));
  inp.scrollIntoView({block:'center'});
  return JSON.stringify({err:[...document.querySelectorAll('.it-error')].map(e=>e.textContent.trim()), ariaInvalid:inp.getAttribute('aria-invalid'), border:getComputedStyle(inp).borderColor});
})()`);
console.log('VALIDATION:', val);
await a.shot(dir + 'r2-10-validation.png');
// cancel closes form + clears draft?
const esc = await a.ev(`(async()=>{
  const before=!!document.getElementById('ai-title');
  const ev2=new KeyboardEvent('keydown',{key:'Escape',bubbles:true});
  (document.getElementById('ai-title')||document.body).dispatchEvent(ev2);
  window.dispatchEvent(ev2);
  await new Promise(r=>setTimeout(r,300));
  const open=!!document.getElementById('ai-title');
  const ss=Object.keys(sessionStorage).filter(k=>/draft/i.test(k));
  if(open){const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));qb(/CANCEL/).click(); await new Promise(r=>setTimeout(r,300));}
  return JSON.stringify({before, afterEsc:open, draftKeysAfterEsc:ss, afterCancel:!!document.getElementById('ai-title'), draftKeysAfterCancel:Object.keys(sessionStorage).filter(k=>/draft/i.test(k))});
})()`);
console.log('ESCAPE/CANCEL:', esc);

// --- Regression 4: WebGL fallback ---
await a.send('Page.addScriptToEvaluateOnNewDocument', { source: `const o=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(/webgl/i.test(t))return null;return o.call(this,t,...a)};` });
await a.nav('https://issuetrack-v4.web.app/bim/REG-002', 5000);
const noGl = await a.ev(`(document.body.innerText.match(/WEBGL UNAVAILABLE[^\\n]*|THE REST OF[^\\n]*/g)||[]).join(' || ')`);
console.log('NO-WEBGL:', noGl);
await a.shot(dir + 'r2-11-no-webgl.png');
await a.send('Page.reload');
await sleep(7000);

// --- 480px with pin visible (deep link focuses) ---
await a.send('Emulation.setDeviceMetricsOverride', { width: 480, height: 900, deviceScaleFactor: 1, mobile: false });
await a.nav('https://issuetrack-v4.web.app/bim/REG-002?issue=2D2AgxR18Go4wmY3mvQN', 9000);
const m480 = await a.ev(`JSON.stringify({sel:document.body.innerText.match(/SEL #\\d+/)?.[0]||null, focusPin:!!document.querySelector('.it-pin-focus'), hOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth, pinRect:(()=>{const p=document.querySelector('.it-pin-focus');if(!p)return null;const r=p.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),inViewport:r.top>=0&&r.bottom<=innerHeight}})()})`);
console.log('MOBILE480:', m480);
await a.shot(dir + 'r2-12-mobile480-pin.png');
await a.send('Emulation.clearDeviceMetricsOverride');
a.ws.close(); process.exit(0);
