/* One-shot CDP verification for the v4-bim selection fix. */
import { spawn, execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CDP = 'http://127.0.0.1:18800'
const APP = 'http://127.0.0.1:8733'
const log = (...a) => console.log(...a)

// watchdog — never hang
setTimeout(() => { log('WATCHDOG TIMEOUT'); process.exit(2) }, 150000)

function freePort() {
  try { execSync('fuser -k 8733/tcp 2>/dev/null || true') } catch {}
}

async function fetchT(url, opts = {}, ms = 8000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try { return await fetch(url, { ...opts, signal: ctl.signal }) } finally { clearTimeout(t) }
}

async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetchT(APP + '/', {}, 1500); if (r.ok) return true } catch {}
    await sleep(500)
  }
  return false
}

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map()
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result) } } }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r && r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r && r.result ? r.result.value : undefined }
}

async function newTab(url) {
  try {
    const r = await fetchT(CDP + '/json/new?' + encodeURIComponent(url), { method: 'PUT' })
    return await r.json()
  } catch {
    const r = await fetchT(CDP + '/json/list')
    const list = await r.json()
    return list.find(t => t.type === 'page' && t.url.includes('8733')) || list.find(t => t.type === 'page')
  }
}

async function main() {
  freePort()
  const server = spawn('npx', ['vite', 'preview', '--port', '8733', '--host', '127.0.0.1'], { cwd: '/home/marvin/projects/toe-master/v4-bim', stdio: 'ignore', detached: true })
  server.unref()

  if (!(await waitServer())) { log('FAIL: server did not start'); process.exit(1) }
  log('server up')

  const target = await newTab(APP + '/bim/REG-001')
  log('target:', target.id || target.webSocketDebuggerUrl)
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')

  let ready = false, errTxt = ''
  for (let i = 0; i < 120; i++) {
    try { const t = await cdp.eval('document.body ? document.body.innerText : ""'); if (t && t.includes('MODEL READY')) { ready = true; break } if (/LOAD FAILED|UNAVAILABLE/.test(t)) { errTxt = t.slice(0, 300); break } } catch (e) {}
    await sleep(1000)
  }
  if (!ready) { log('FAIL: model not ready. err:', errTxt || '(timeout)'); process.exit(1) }
  log('MODEL READY')

  const rect = await cdp.eval(`(() => { const c = document.querySelector('.it-bim-viewport canvas'); if(!c) return null; const r = c.getBoundingClientRect(); return { left:r.left, top:r.top, w:r.width, h:r.height }; })()`)
  log('canvas rect:', JSON.stringify(rect))
  if (!rect || rect.w === 0) { log('FAIL: no canvas'); process.exit(1) }

  const pts = [[0.5,0.5],[0.4,0.4],[0.6,0.55],[0.45,0.6],[0.5,0.45]]
  let selected = false, selLine = ''
  for (const [fx, fy] of pts) {
    const x = rect.left + rect.w * fx, y = rect.top + rect.h * fy
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    await sleep(1500)
    const t = await cdp.eval('document.body ? document.body.innerText : ""')
    selLine = (t.match(/SEL #\S*/) || [])[0] || ''
    const localId = (t.match(/Local id\s*\n?\s*(\d+)/) || [])[1]
    if (selLine || localId) { selected = true; log('selected at fx,fy=', fx, fy, '->', selLine || ('LOCAL ID ' + localId)); break }
  }
  if (!selected) { log('FAIL: no selection after clicks'); process.exit(1) }
  log('SELECTION OK')

  // finder
  const helper = `function setVal(sel,val){const el=document.querySelector(sel);if(!el)return 'no-el';const p=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return el.value;}`
  await cdp.eval(helper)
  const psetVal = await cdp.eval(`[...document.querySelectorAll('#if-pset option')].find(o=>o.textContent.trim()==='Pset_VDC')?.value ?? null`)
  log('psetVal:', JSON.stringify(psetVal), ' | propVal:')
  await cdp.eval(`setVal('#if-pset', ${JSON.stringify(psetVal)})`)
  await sleep(200)
  const propVal = await cdp.eval(`[...document.querySelectorAll('#if-prop option')].find(o=>o.textContent.trim()==='05-Tipo de Elemento')?.value ?? null`)
  log('propVal:', JSON.stringify(propVal))
  await cdp.eval(`setVal('#if-prop', ${JSON.stringify(propVal)}); setVal('#if-value', 'Fundacion');`)
  await sleep(200)
  await cdp.eval(`(() => { const b=[...document.querySelectorAll('.it-btn')].find(b=>b.textContent.includes('FIND MATCHING')); if(b){b.click();return true;} return false; })()`)
  await sleep(4000)
  const ft = await cdp.eval('document.body.innerText')
  const m = ft.match(/(\d+)\s*MATCH/)
  log('FINDER match line:', JSON.stringify((ft.match(/[^\n]*MATCH[^\n]*/) || ['(n/a)'])[0]))
  if (m && Number(m[1]) > 0) {
    log('FINDER OK:', m[1], 'MATCH')
  } else {
    log('FINDER 0 MATCH')
  }

  try { ws.close() } catch {}
  freePort()
  log('DONE')
  process.exit(0)
}

main().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1) })