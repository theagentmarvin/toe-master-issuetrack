/* =====================================================================
   FIX ROUND #1 — deterministic CDP verification (real Chrome, port 18800).
   ---------------------------------------------------------------------
   Two required deterministic tests + a quick regression pass:

   A. DEEP-LINK RACE — load /bim/REG-002?issue=<id> with the issue data
      created ONLY AFTER the model is ready; assert selection + panel +
      camera focus after the data lands (onSnapshot), proving the effect
      re-runs when `issues` populates after `ready`.
   B. SNAPSHOT-RESET — open the ASSIGN ISSUE form, type a draft, then
      make an EXTERNAL Firestore REST write; poll 10 s at 1 s and assert
      the form is STILL open, the selection UNCHANGED and the draft text
      preserved.
   C. REGRESSION — selection, Items Finder (20 match), palette colourise,
      Smart View capture.

   Hard-rule compliance: the preview server is a normal (non-detached)
   child; `fuser -k` runs inside this same exec call.
   ===================================================================== */
import { spawn, execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CDP = 'http://127.0.0.1:18800'
const APP = 'http://127.0.0.1:8741'
const FS = 'https://firestore.googleapis.com/v1/projects/marvin-dev-c4ca4/databases/(default)/documents'

/* Scaffold register (never the pristine REG-001; layout round uses REG-003). */
const REG = 'REG-003'
const FS_TODOS = `${FS}/projects/${REG}/todos`
const FS_VIEWS = `${FS}/projects/${REG}/smartViews`

/* A stable, real element of sample.ifc (localId 5693, IFCSLAB). */
const EL = { modelId: 'sample', localId: '5693', gui: 'test-guid', label: 'Test slab', wp: { x: 18.32, y: 8.47, z: 20.32 } }

const results = []
function check(label, ok, detail = '') {
  results.push({ label, ok, detail })
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? ' — ' + detail : ''))
}

setTimeout(() => { console.log('WATCHDOG TIMEOUT'); process.exit(2) }, 240000)

function freePort(port) {
  try { execSync('fuser -k ' + port + '/tcp 2>/dev/null || true') } catch {}
}

async function fsRest(url, opts = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 15000)
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal })
    const text = await r.text()
    return { status: r.status, body: text ? JSON.parse(text) : null }
  } finally {
    clearTimeout(t)
  }
}

function field(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  }
  return { stringValue: String(v) }
}

function bimReferenceFields({ modelId, localId, gui, label, wp }) {
  return {
    mapValue: {
      fields: {
        modelId: field(modelId),
        localId: field(Number(localId)),
        guid: field(gui),
        label: field(label),
        worldPosition: { mapValue: { fields: { x: field(wp.x), y: field(wp.y), z: field(wp.z) } } },
      },
    },
  }
}

async function fsCreateTodo(register, id, title, extra) {
  const fields = {
    title: field(title),
    description: field(extra.description || ''),
    status: field(extra.status || 'open'),
    priority: field(extra.priority || 'MEDIUM'),
    assigneeId: field(extra.assigneeId || null),
    due: field(''),
    createdAt: field('2026-10-31T00:00:00.000Z'),
    ...extra.fields,
  }
  const url = `${FS}/projects/${register}/todos` + (id ? '?documentId=' + encodeURIComponent(id) : '')
  return fsRest(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fields }) })
}

async function fsDeleteTodo(register, id) {
  return fsRest(`${FS}/projects/${register}/todos/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

async function fsList(url) {
  const r = await fsRest(url + '?pageSize=300')
  return (r.body && r.body.documents) || []
}

/* Cleanup any prior test residue in the scaffold register. */
async function cleanup() {
  const todos = await fsList(FS_TODOS)
  for (const doc of todos) {
    const id = doc.name.split('/').pop()
    const title = doc.fields?.title?.stringValue || ''
    if (title.startsWith('DLFIX-') || title.startsWith('SNAP-') || title.startsWith('FIX-')) {
      await fsDeleteTodo(REG, id)
    }
  }
  const views = await fsList(FS_VIEWS)
  for (const doc of views) await fsRest('https://firestore.googleapis.com/v1/' + doc.name, { method: 'DELETE' })
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
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
  async clickAt(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  }
  async clickSelector(selector) {
    const present = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if(!el) return false; el.scrollIntoView({ block: 'center', inline: 'nearest' }); return true })()`)
    if (!present) return false
    await sleep(250)
    const box = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if(!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 } })()`)
    if (!box) return false
    await this.clickAt(box.x, box.y)
    return true
  }
}

async function newTab(url) {
  const r = await fetch(CDP + '/json/new?' + encodeURIComponent(url), { method: 'PUT' })
  if (r.ok) return await r.json()
  const list = await (await fetch(CDP + '/json/list')).json()
  return list.find((t) => t.type === 'page' && t.url.includes('8741')) || list.find((t) => t.type === 'page')
}

async function connect(url) {
  const target = await newTab(url)
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')) })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  return { cdp, ws }
}

async function bodyText(cdp) {
  try { return await cdp.eval('document.body ? document.body.innerText : ""') } catch { return '' }
}

async function waitFor(cdp, predExpr, tries = 120, every = 700) {
  for (let i = 0; i < tries; i++) {
    const v = await cdp.eval(predExpr)
    if (v) return v
    await sleep(every)
  }
  return cdp.eval(predExpr)
}

const SET_VAL = `function setVal(sel,val){const el=document.querySelector(sel);if(!el)return 'no-el';const p=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return el.value;}`

async function selectElement(cdp) {
  const rect = await cdp.eval(`(() => { const c = document.querySelector('.it-bim-viewport canvas'); if(!c) return null; const r = c.getBoundingClientRect(); return { left:r.left, top:r.top, w:r.width, h:r.height } })()`)
  if (!rect || rect.w === 0) return null
  const pts = [[0.5, 0.5], [0.4, 0.4], [0.6, 0.55], [0.45, 0.6], [0.5, 0.45]]
  for (const [fx, fy] of pts) {
    await cdp.clickAt(rect.left + rect.w * fx, rect.top + rect.h * fy)
    await sleep(1300)
    const key = await cdp.eval('window.__bimEngine && window.__bimEngine._selectionKey')
    if (key) return key
  }
  return null
}

async function main() {
  freePort(8741)
  await cleanup()

  const server = spawn('node_modules/.bin/vite', ['preview', '--port', '8741', '--host', '127.0.0.1'], {
    cwd: '/home/marvin/projects/toe-master/v4-bim', stdio: 'ignore',
  })
  let up = false
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(APP + '/', { signal: AbortSignal.timeout(1500) }); if (r.ok) { up = true; break } } catch {}
    await sleep(500)
  }
  if (!up) { console.log('FAIL: preview server did not start'); try { server.kill() } catch {}; freePort(8741); process.exit(1) }
  console.log('server up:', APP)

  /* ==================================================================
     A. DEEP-LINK RACE (deterministic: issue created only after ready)
     ================================================================== */
  const issueId = 'DLFIX-' + Date.now()
  console.log('\n--- A. DEEP-LINK RACE ---')
  const A = await connect(APP + '/bim/REG-002?issue=' + issueId)
  const ready = await waitFor(A.cdp, `document.body && document.body.innerText.includes('MODEL READY')`, 120, 700)
  check('A. model reached MODEL READY', Boolean(ready))

  /* Simulate "data arrives AFTER model ready": at this instant the issue
     does not exist yet, so nothing can be selected. */
  const selBefore = await A.cdp.eval('window.__bimEngine && window.__bimEngine._selectionKey')
  check('A. issue NOT yet selected before data lands (race precondition)', selBefore == null, 'sel=' + selBefore)

  /* Create the issue now — the live todos subscription must trigger the
     deep-link effect when it lands. */
  const createA = await fsCreateTodo(REG, issueId, 'DLFIX-race issue', {
    fields: { bimReference: bimReferenceFields(EL) },
  })
  check('A. issue created (REST, documentId=' + issueId + ')', createA.status === 200, 'HTTP ' + createA.status)

  const focused = await waitFor(A.cdp, `window.__bimEngine && window.__bimEngine._selectionKey === 'sample:5693'`, 40, 700)
  check('A. element selected after data lands (slow-data race fixed)', Boolean(focused), 'key=' + await A.cdp.eval('window.__bimEngine && window.__bimEngine._selectionKey'))

  const panelTitle = await waitFor(A.cdp, `(() => { const el = document.querySelector('[data-testid="pinned-issue"]'); return el && el.innerText.includes('DLFIX-race issue') })()`, 40, 700)
  check('A. pinned-issue panel shows the issue', Boolean(panelTitle))

  const fly = await A.cdp.eval('window.__bimEngine && window.__bimEngine._lastFlyTarget')
  const flyOk = fly && Math.abs(fly.x - EL.wp.x) < 1 && Math.abs(fly.y - EL.wp.y) < 1 && Math.abs(fly.z - EL.wp.z) < 1
  check('A. camera focus moved to the issue world position', Boolean(flyOk), JSON.stringify(fly))
  A.ws.close()

  /* ==================================================================
     B. SNAPSHOT-RESET / FORM WIPE (external REST write while drafting)
     ================================================================== */
  console.log('\n--- B. SNAPSHOT RESET ---')
  const B = await connect(APP + '/bim/REG-002')
  await waitFor(B.cdp, `document.body && document.body.innerText.includes('MODEL READY')`, 120, 700)

  const selKeyB = await selectElement(B.cdp)
  check('B. element selected via real click', Boolean(selKeyB), 'key=' + selKeyB)

  /* Fix #5 — ASSIGN ISSUE must be visible without scrolling. */
  let assignBox = await B.cdp.eval(`(() => { const el = document.getElementById('btn-assign-issue'); if(!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height } })()`)
  const assignVisible = assignBox && assignBox.top >= 0 && assignBox.top < 900 && assignBox.h > 0
  check('B. ASSIGN ISSUE visible at top of column (no scroll)', Boolean(assignVisible), JSON.stringify(assignBox))

  await B.cdp.clickSelector('#btn-assign-issue')
  await sleep(400)
  const formOpen = await B.cdp.eval('Boolean(document.getElementById("ai-title"))')
  check('B. ASSIGN ISSUE form opened', Boolean(formOpen))

  const draft = 'DRAFT PRESERVED ' + Date.now()
  await B.cdp.eval(SET_VAL)
  await B.cdp.eval(`setVal('#ai-title', ${JSON.stringify(draft)})`)
  await sleep(200)
  const draftSet = await B.cdp.eval('document.getElementById("ai-title")?.value')
  check('B. draft title typed', draftSet === draft, draftSet)

  /* External REST write — triggers the live onSnapshot in the browser. */
  const snapId = 'SNAP-' + Date.now()
  const createB = await fsCreateTodo(REG, snapId, 'SNAP-remote write', {
    fields: { bimReference: bimReferenceFields(EL) }, // co-located pin → structural sidebar change too
  })
  check('B. external REST write performed', createB.status === 200, 'HTTP ' + createB.status)

  /* Poll 10 s @ 1 s — form must stay open, selection unchanged, draft kept. */
  let wiped = ''
  for (let i = 0; i < 10; i++) {
    await sleep(1000)
    const st = await B.cdp.eval(`(() => ({
      open: Boolean(document.getElementById('ai-title')),
      draft: document.getElementById('ai-title') ? document.getElementById('ai-title').value : null,
      sel: window.__bimEngine && window.__bimEngine._selectionKey,
    }))()`)
    if (!st.open || st.draft !== draft || st.sel !== selKeyB) {
      wiped = JSON.stringify(st)
      break
    }
  }
  const stable = await B.cdp.eval(`(() => ({
    open: Boolean(document.getElementById('ai-title')),
    draft: document.getElementById('ai-title') ? document.getElementById('ai-title').value : null,
    sel: window.__bimEngine && window.__bimEngine._selectionKey,
  }))()`)
  check('B. form STILL OPEN after snapshot write', Boolean(stable.open), wiped || ('open, draft=' + stable.draft))
  check('B. selection UNCHANGED after snapshot write', stable.sel === selKeyB, 'sel=' + stable.sel)
  check('B. draft text PRESERVED after snapshot write', stable.draft === draft, 'draft=' + stable.draft)

  /* ==================================================================
     C. REGRESSION — finder, palette, capture
     ================================================================== */
  console.log('\n--- C. REGRESSION ---')
  // close the form first so it doesn't interfere
  await B.cdp.eval(`(() => { const b = [...document.querySelectorAll('.it-btn')].find(x => x.textContent.trim() === 'CANCEL'); if (b) b.click(); return Boolean(b) })()`)
  await sleep(300)

  /* finder 20 MATCH */
  await B.cdp.eval(SET_VAL)
  const pset = await B.cdp.eval(`[...document.querySelectorAll('#if-pset option')].find(o=>o.textContent.trim()==='Pset_VDC')?.value ?? null`)
  if (pset) {
    await B.cdp.eval(`setVal('#if-pset', ${JSON.stringify(pset)})`)
    await sleep(200)
    const prop = await B.cdp.eval(`[...document.querySelectorAll('#if-prop option')].find(o=>o.textContent.trim()==='05-Tipo de Elemento')?.value ?? null`)
    await B.cdp.eval(`setVal('#if-prop', ${JSON.stringify(prop)}); setVal('#if-value', 'Fundacion')`)
    await sleep(200)
    await B.cdp.eval(`(() => { const b=[...document.querySelectorAll('.it-btn')].find(b=>b.textContent.includes('FIND MATCHING')); if(b){b.click();return true;} return false })()`)
    await sleep(4500)
    const t = await bodyText(B.cdp)
    const m = t.match(/(\d+)\s*(?:ITEM\(S\))?\s*MATCH/)
    check('C. Items Finder 20 MATCH', m && Number(m[1]) === 20, ((t.match(/[^\n]*MATCH[^\n]*/) || ['n/a'])[0]).trim())
  } else {
    check('C. Items Finder 20 MATCH', false, 'Pset_VDC missing')
  }

  /* palette colourise */
  await B.cdp.eval(`(() => { const b=document.querySelector('.it-swatch[aria-label="COLOUR ITEM CRITICAL"]'); if(b){b.click();return true;} return false })()`)
  await sleep(1200)
  const coloured = (await bodyText(B.cdp)).includes('ITEM(S) COLOURED')
  check('C. palette colourise (swatch)', coloured)

  /* smart view capture */
  await B.cdp.eval(`setVal('#sv-name', 'FIX-VIEW')`)
  await sleep(150)
  await B.cdp.eval(`(() => { const b=[...document.querySelectorAll('.it-btn')].find(b=>b.textContent.includes('CAPTURE CURRENT VIEW')); if(b){b.click();return true;} return false })()`)
  await sleep(3000)
  const captured = (await bodyText(B.cdp)).includes('VIEW CAPTURED')
  check('C. Smart View capture', captured && (await fsList(FS_VIEWS)).length >= 1)

  B.ws.close()

  /* ==================================================================
     cleanup + summary
     ================================================================== */
  console.log('\n--- CLEANUP ---')
  await cleanup()
  const residueTodos = (await fsList(FS_TODOS)).filter((d) => {
    const t = d.fields?.title?.stringValue || ''
    return t.startsWith('DLFIX-') || t.startsWith('SNAP-') || t.startsWith('FIX-')
  })
  const residueViews = (await fsList(FS_VIEWS)).length
  console.log('residue todos in REG-002:', residueTodos.length, '| views:', residueViews)

  try { server.kill() } catch {}
  freePort(8741)

  const failed = results.filter((r) => !r.ok)
  console.log('\n=== FIX ROUND SUMMARY ===')
  console.log(results.length - failed.length + '/' + results.length + ' assertions passed')
  if (failed.length) {
    failed.forEach((r) => console.log('  FAIL - ' + r.label))
    process.exit(1)
  }
  console.log('FIX_D1_VERIFY_PASS')
  process.exit(0)
}

main().catch((e) => { console.error('SCRIPT ERROR', e); try { freePort(8741) } catch {}; process.exit(1) })