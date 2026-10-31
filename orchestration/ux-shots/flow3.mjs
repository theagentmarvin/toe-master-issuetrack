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
  if (m.method === "Page.loadEventFired" && typeof loadedResolve === "function") { const f = loadedResolve; loadedResolve = null; f(); }
});
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('ws'))); });
await send('Page.enable'); await send('Runtime.enable');
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (path) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(data, 'base64')); console.log('shot ' + path); };
const dir = '/home/marvin/projects/toe-master/orchestration/ux-shots/';

// A: loading state — screenshot ~1.2s after nav
await send('Page.navigate', { url: 'https://issuetrack-v4.web.app/bim/demo' });
await Promise.race([loadedP, sleep(15000)]);
await sleep(1200);
const loadTxt = await ev(`(()=>{const t=document.body.innerText;return JSON.stringify({snippet:t.match(/LOADING[^\\n]*|MODEL READY[^\\n]*|READY[^\\n]*/g)})})()`);
console.log('LOADING STATE @1.2s:', loadTxt);
await shot(dir + '14-loading-state.png');
await sleep(6000);

// B: no WebGL
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(t, ...a){ if(/webgl/i.test(t)) return null; return orig.call(this, t, ...a); };
` });
await send('Page.navigate', { url: 'https://issuetrack-v4.web.app/bim/demo' });

await new Promise(r => setTimeout(r, 6000));
const noGl = await ev(`(()=>{const t=document.body.innerText;return JSON.stringify({hasWebglMsg:/WEBGL|GPU|NOT SUPPORT|UNSUPPORTED/i.test(t), snippet:t.slice(0,600)})})()`);
console.log('NO-WEBGL:', noGl);
await shot(dir + '15-no-webgl.png');
await send('Page.clearDeviceMetricsOverride').catch(()=>{});
ws.close(); process.exit(0);
