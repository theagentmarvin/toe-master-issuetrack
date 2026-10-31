/* One-shot CDP screenshot helper for the layout round.
   Usage: node scripts/rt3-shot.mjs <outputPrefix>
   Captures /bim/REG-001 at 1280x720 and 1920x1080 into
   /home/marvin/projects/toe-master/orchestration/ux-shots/<prefix>-<w>x<h>.png
   ===================================================================== */
import { spawn, execSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const CDP = 'http://127.0.0.1:18800'
const APP = 'http://127.0.0.1:8741'
const OUT = '/home/marvin/projects/toe-master/orchestration/ux-shots'
const prefix = process.argv[2] || 'r3-shot'
const sizes = JSON.parse(process.argv[3] || '[[1280,720],[1920,1080]]')

mkdirSync(OUT, { recursive: true })

function freePort() {
  try { execSync('fuser -k 8741/tcp 2>/dev/null || true') } catch {}
}

async function waitServer() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(APP + '/', { signal: AbortSignal.timeout(1500) }); if (r.ok) return true } catch {}
    await sleep(500)
  }
  return false
}

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map()
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id); this.pending.delete(m.id)
        m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result)
      }
    }
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r && r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r && r.result ? r.result.value : undefined
  }
}

async function capture(w, h, file) {
  const target = await (await fetch(CDP + '/json/new?about:blank', { method: 'PUT' })).json()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.navigate', { url: APP + '/bim/REG-001' })
  for (let i = 0; i < 110; i++) {
    const t = await cdp.eval('document.body ? document.body.innerText : ""')
    if (t.includes('MODEL READY')) break
    await sleep(700)
  }
  await sleep(1800) // let fitToItems + first frames settle
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(OUT + '/' + file, Buffer.from(shot.data, 'base64'))
  console.log('saved', OUT + '/' + file)
  try { ws.close() } catch {}
}

async function main() {
  freePort()
  const server = spawn('node_modules/.bin/vite', ['preview', '--port', '8741', '--host', '127.0.0.1'], {
    cwd: '/home/marvin/projects/toe-master/v4-bim', stdio: 'ignore',
  })
  if (!(await waitServer())) { console.log('FAIL: no server'); process.exit(1) }
  for (const [w, h] of sizes) {
    await capture(w, h, `${prefix}-${w}x${h}.png`)
  }
  try { server.kill() } catch {}
  freePort()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR', e); process.exit(1) })