#!/usr/bin/env node
// Minimal CDP driver for UX review. Usage:
//   node cdp.mjs <targetId> nav <url> [extraWaitMs]
//   node cdp.mjs <targetId> shot <path> [extraWaitMs]
//   node cdp.mjs <targetId> eval "<expr>" [extraWaitMs]   (evaluates in page, awaitsPromise)
//   node cdp.mjs <targetId> click <x> <y> [clickCount]
//   node cdp.mjs <targetId> type "<text>"
//   node cdp.mjs <targetId> key <Key>
//   node cdp.mjs <targetId> hover <x> <y>
//   node cdp.mjs <targetId> resize <w> <h>
const [, , targetId, cmd, ...rest] = process.argv;
const WS = `ws://127.0.0.1:18800/devtools/page/${targetId}`;
const ws = new WebSocket(WS);
let id = 0;
const pending = new Map();
const events = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
    setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); reject(new Error('CDP timeout ' + method)); } }, 120000);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let resolveLoaded;
const loaded = new Promise((r) => (resolveLoaded = r));
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  } else if (msg.method) {
    events.push(msg.method);
    if (msg.method === 'Page.loadEventFired') resolveLoaded();
  }
});
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', (e) => rej(new Error('ws error')));
});
await send('Page.enable');
await send('Runtime.enable');
await send('DOM.enable');

async function waitLoad(extra = 1500) {
  await Promise.race([loaded, sleep(15000)]);
  await sleep(extra);
}

try {
  if (cmd === 'nav') {
    const url = rest[0];
    const extra = Number(rest[1] ?? 1500);
    await send('Page.navigate', { url });
    await waitLoad(extra);
    console.log(JSON.stringify(await send('Runtime.evaluate', { expression: 'location.href' })).slice(0, 300));
  } else if (cmd === 'shot') {
    const path = rest[0];
    const extra = Number(rest[1] ?? 0);
    if (extra) await sleep(extra);
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const fs = await import('node:fs');
    fs.writeFileSync(path, Buffer.from(data, 'base64'));
    console.log('saved ' + path);
  } else if (cmd === 'eval') {
    const expr = rest[0];
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) console.log('EVAL-EXC: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    else console.log(JSON.stringify(r.result.value ?? null, null, 1));
  } else if (cmd === 'click' || cmd === 'hover') {
    const x = Number(rest[0]), y = Number(rest[1]);
    const count = Number(rest[2] ?? 1);
    if (cmd === 'hover') {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    } else {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      for (let i = 1; i <= count; i++) {
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: i, clickModifiers: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: i, clickModifiers: 1 });
      }
    }
    const extra = Number(rest[3] ?? 600);
    await sleep(extra);
    console.log(cmd + ' done');
  } else if (cmd === 'type') {
    const text = rest[0] ?? '';
    await send('Input.insertText', { text });
    await sleep(200);
    console.log('typed');
  } else if (cmd === 'key') {
    const key = rest[0];
    const map = { Escape: ['Esc', 0x1b], Enter: ['Enter', 0x0d], Tab: ['Tab', 0x09] };
    const [k] = map[key] || [key];
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k === 'Esc' ? 'Escape' : k === 'Enter' ? 'Enter' : k, windowsVirtualKeyCode: map[key]?.[1] });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k === 'Esc' ? 'Escape' : k, windowsVirtualKeyCode: map[key]?.[1] });
    await sleep(300);
    console.log('key ' + key);
  } else if (cmd === 'resize') {
    const w = Number(rest[0]), h = Number(rest[1]);
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await sleep(800);
    console.log(`resized ${w}x${h}`);
  } else if (cmd === 'reset') {
    await send('Emulation.clearDeviceMetricsOverride');
    console.log('emulation cleared');
  } else {
    console.log('unknown cmd');
  }
} finally {
  ws.close();
  process.exit(0);
}
