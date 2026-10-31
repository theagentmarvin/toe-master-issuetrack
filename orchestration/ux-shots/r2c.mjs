#!/usr/bin/env node
// R2 Test C: live-sync form wipe. Tab A holds an open assign form with a draft; Tab B performs remote writes.
const A = process.argv[2], B = process.argv[3];
function conn(targetId) {
  const ws = new WebSocket(`ws://127.0.0.1:18800/devtools/page/${targetId}`);
  let id = 0; const pending = new Map();
  let loadedCb = () => {};
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
  return { ws, ready, send, ev, nav };
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const a = conn(A), b = conn(B);
await a.ready; await b.ready;
await a.send('Page.enable'); await a.send('Runtime.enable');
await b.send('Page.enable'); await b.send('Runtime.enable');

// Tab A: select element + open form + type draft
await a.nav('https://issuetrack-v4.web.app/bim/REG-002', 6000);
await a.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 420, y: 590 });
await a.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 420, y: 590, button: 'left', clickCount: 1, clickModifiers: 1 });
await a.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 420, y: 590, button: 'left', clickCount: 1, clickModifiers: 1 });
await sleep(1000);
const setup = await a.ev(`(async()=>{
  const b=[...document.querySelectorAll('button')].find(e=>/ASSIGN ISSUE/.test(e.textContent));
  b.click(); await new Promise(r=>setTimeout(r,250));
  const inp=document.getElementById('ai-title')||[...document.querySelectorAll('input')].find(e=>/MIN 5/i.test(e.placeholder||''));
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(inp,'R2 DRAFT SURVIVES');
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  await new Promise(r=>setTimeout(r,300));
  return JSON.stringify({sel:document.body.innerText.match(/SEL #\\d+/)?.[0], ssKeys:Object.keys(sessionStorage), ssVals:Object.entries(sessionStorage).map(([k,v])=>k+'='+v.slice(0,60))});
})()`);
console.log('A SETUP:', setup);

// Tab B: remote write helper (create then delete a scratch issue via UI)
const remoteWrite = async (label) => b.ev(`(async()=>{
  const qb=(re)=>[...document.querySelectorAll('button')].find(e=>re.test(e.textContent));
  const b=qb(/ASSIGN ISSUE/); if(!b) return 'B: no selection/form';
  b.click(); await new Promise(r=>setTimeout(r,250));
  const inp=document.getElementById('ai-title');
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(inp,'R2 REMOTE WRITE ${label}');
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  qb(/PIN ISSUE/).click(); await new Promise(r=>setTimeout(r,1000));
  return 'B: wrote ${label}';
})()`);
// ensure tab B has a selection
await b.nav('https://issuetrack-v4.web.app/bim/REG-002', 6000);
await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 320, y: 500 });
await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 320, y: 500, button: 'left', clickCount: 1, clickModifiers: 1 });
await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 320, y: 500, button: 'left', clickCount: 1, clickModifiers: 1 });
await sleep(1000);
console.log('B PRE:', await b.ev(`document.body.innerText.match(/SEL #\\d+/)?.[0]||'none'`));

const marks = [];
for (let s = 1; s <= 18; s++) {
  await sleep(1000);
  if (s === 5 || s === 11) console.log('  WRITE:', await remoteWrite('W' + s));
  const st = await a.ev(`(()=>{const t=document.body.innerText;const inp=document.getElementById('ai-title');return JSON.stringify({f:t.includes('PIN ISSUE'),v:inp?inp.value:null,sel:t.match(/SEL #\\d+/)?.[0]||null})})()`);
  marks.push(s + ':' + st);
}
console.log('A POLLS:'); marks.forEach(m => console.log(' ', m));
console.log('A FINAL SS:', await a.ev(`JSON.stringify(Object.entries(sessionStorage).map(([k,v])=>k+'='+v.slice(0,80)))`));
a.ws.close(); b.ws.close(); process.exit(0);
