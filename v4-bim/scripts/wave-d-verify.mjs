/* =====================================================================
   Wave D — end-to-end CDP verification (real Chrome, port 18800).
   ---------------------------------------------------------------------
   Asserts, in order:
     (a) /bim/demo → MODEL READY, no login / password / sign-in anywhere
     (b) real canvas click → ASSIGN ISSUE → fill form → PIN ISSUE →
         Firestore REST GET projects/REG-001/todos contains the new issue
         WITH a bimReference {modelId, localId, guid, label, worldPosition}
     (c) after reload → a pin element is present in the DOM overlay and a
         real click on it selects the element + shows the issue
     (d) Items Finder still matches (sanity: > 0 MATCH)

   Hard-rule compliance: the preview server is spawned as a normal (not
   detached) child and `fuser -k` runs inside this same exec call.
   ===================================================================== */
import { spawn, execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CDP = 'http://127.0.0.1:18800'
const APP = 'http://127.0.0.1:8741'
const FS_TODOS =
  'https://firestore.googleapis.com/v1/projects/marvin-dev-c4ca4/databases/(default)/documents/projects/REG-001/todos'

/* Unique test title so re-runs never collide; the assertion looks it up. */
const TEST_TITLE = 'CDP pin ' + Date.now()

const results = []
function check(label, ok, detail = '') {
  results.push({ label, ok, detail })
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? ' — ' + detail : ''))
}

/* watchdog — never hang */
setTimeout(() => {
  console.log('WATCHDOG TIMEOUT')
  process.exit(2)
}, 180000)

function freePort(port) {
  try {
    execSync('fuser -k ' + port + '/tcp 2>/dev/null || true')
  } catch {}
}

async function fetchT(url, opts = {}, ms = 12000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: ctl.signal })
  } finally {
    clearTimeout(t)
  }
}

async function waitServer() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetchT(APP + '/', {}, 1500)
      if (r.ok) return true
    } catch {}
    await sleep(500)
  }
  return false
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id)
        this.pending.delete(m.id)
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
    const r = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r && r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    }
    return r && r.result ? r.result.value : undefined
  }
  async clickAt(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  }
  async clickSelector(selector) {
    const present = await this.eval(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if(!el) return false; el.scrollIntoView({ block: 'center', inline: 'nearest' }); return true; })()`,
    )
    if (!present) return false
    await sleep(250)
    const box = await this.eval(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if(!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; })()`,
    )
    if (!box) return false
    await this.clickAt(box.x, box.y)
    return true
  }
}

async function newTab(url) {
  const r = await fetchT(CDP + '/json/new?' + encodeURIComponent(url), { method: 'PUT' })
  if (r.ok) return await r.json()
  const list = await (await fetchT(CDP + '/json/list')).json()
  return list.find((t) => t.type === 'page' && t.url.includes('8741')) || list.find((t) => t.type === 'page')
}

async function bodyText(cdp) {
  try {
    return await cdp.eval('document.body ? document.body.innerText : ""')
  } catch {
    return ''
  }
}

async function waitForText(cdp, pred, tries = 100, every = 800) {
  for (let i = 0; i < tries; i++) {
    const t = await bodyText(cdp)
    if (pred(t)) return t
    await sleep(every)
  }
  return bodyText(cdp)
}

/* React-controlled inputs need the native setter + events. */
const SET_VAL_HELPER = `
function setVal(sel, val) {
  const el = document.querySelector(sel);
  if (!el) return 'no-el:' + sel;
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
}`

async function firestoreTodos() {
  const r = await fetchT(FS_TODOS + '?pageSize=300', {}, 15000)
  if (!r.ok) throw new Error('REST ' + r.status)
  const json = await r.json()
  return (json.documents || []).map((doc) => {
    const fields = doc.fields || {}
    const str = (k) => (fields[k] && fields[k].stringValue) || ''
    const num = (k) =>
      fields[k] ? fields[k].integerValue ?? fields[k].doubleValue ?? null : null
    return {
      id: doc.name.split('/').pop(),
      title: str('title'),
      fields,
      num,
    }
  })
}

/* Strip any leftover test issues from previous runs (idempotent). */
async function cleanupPrevious() {
  const docs = await firestoreTodos()
  for (const doc of docs) {
    if (String(doc.title).startsWith('CDP pin ')) {
      await fetchT(FS_TODOS + '/' + encodeURIComponent(doc.id), { method: 'DELETE' })
    }
  }
}

async function main() {
  freePort(8741)
  await cleanupPrevious()

  /* --- start the preview server (normal child, killed at the end) --- */
  const server = spawn('node_modules/.bin/vite', ['preview', '--port', '8741', '--host', '127.0.0.1'], {
    cwd: '/home/marvin/projects/toe-master/v4-bim',
    stdio: 'ignore',
  })

  if (!(await waitServer())) {
    console.log('FAIL: preview server did not start')
    try { server.kill() } catch {}
    freePort(8741)
    process.exit(1)
  }
  console.log('server up on ' + APP)

  /* --- fresh target on the shared Chrome --- */
  const target = await newTab(APP + '/bim/demo')
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = () => rej(new Error('ws error'))
  })
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')

  /* ============ (a) MODEL READY + no auth ============ */
  const initial = await waitForText(
    cdp,
    (t) => t.includes('MODEL READY') || /LOAD FAILED|UNAVAILABLE/.test(t),
    100,
    800,
  )
  const demoReady = initial.includes('MODEL READY')
  check('(a) /bim/demo MODEL READY', demoReady, demoReady ? '' : initial.slice(0, 200))

  const noAuth =
    !/\bLOG\s?IN\b|\bLOGIN\b|\bPASSWORD\b|\bSIGN\s?IN\b|\bSIGN\s?UP\b|\bREGISTRATION\b/i.test(initial)
  check('(a) no login/password/sign-in on demo', noAuth, noAuth ? 'clean' : 'forbidden token found')

  const demoMark = initial.includes('NO ACCOUNT REQUIRED')
  check('(a) public demo marker "NO ACCOUNT REQUIRED"', demoMark)

  /* ---- select an element with a real canvas click ---- */
  const rectExpr = `(() => { const c = document.querySelector('.it-bim-viewport canvas'); if(!c) return null; const r = c.getBoundingClientRect(); return { left:r.left, top:r.top, w:r.width, h:r.height }; })()`
  const rect = await cdp.eval(rectExpr)
  if (!rect || rect.w === 0) {
    check('(b) canvas present', false, JSON.stringify(rect))
    process.exit(1)
  }

  const pts = [
    [0.5, 0.5], [0.4, 0.4], [0.6, 0.55], [0.45, 0.6], [0.5, 0.45],
    [0.6, 0.4], [0.35, 0.5], [0.55, 0.35], [0.4, 0.35], [0.65, 0.5],
  ]
  let selected = false
  for (const [fx, fy] of pts) {
    const x = rect.left + rect.w * fx
    const y = rect.top + rect.h * fy
    await cdp.clickAt(x, y)
    await sleep(1200)
    const hasBtn = await cdp.eval('Boolean(document.getElementById("btn-assign-issue"))')
    if (hasBtn) {
      selected = true
      console.log('selected element at fx,fy=', fx, fy)
      break
    }
  }
  check('(b) element selected via real click', selected)

  /* ---- open the ASSIGN ISSUE form and fill it ---- */
  const opened = await cdp.clickSelector('#btn-assign-issue')
  await sleep(400)
  check('(b) ASSIGN ISSUE action opens the form', await cdp.eval('Boolean(document.getElementById("ai-title"))'))

  await cdp.eval(SET_VAL_HELPER)
  await cdp.eval(`setVal('#ai-title', ${JSON.stringify(TEST_TITLE)})`)
  await cdp.eval(`setVal('#ai-description', 'Wave D CDP verification issue.')`)
  await cdp.eval(`setVal('#ai-status', 'in-progress')`)
  await cdp.eval(`setVal('#ai-priority', 'CRITICAL')`)
  await cdp.eval(`setVal('#ai-assignee', 'PEO-001')`)
  await sleep(300)

  const formValues = await cdp.eval(`(() => ({
    title: document.getElementById('ai-title')?.value,
    status: document.getElementById('ai-status')?.value,
    priority: document.getElementById('ai-priority')?.value,
    assignee: document.getElementById('ai-assignee')?.value,
  }))()`)
  check('(b) form values set', formValues && formValues.title === TEST_TITLE && formValues.priority === 'CRITICAL', JSON.stringify(formValues))

  const clickedSave = await cdp.clickSelector('#ai-save')
  check('(b) PIN ISSUE clicked', clickedSave)

  /* ---- wait for the save to land, then verify against Firestore REST ---- */
  await waitForText(cdp, (t) => t.includes('ISSUE PINNED') || t.includes('SAVE FAILED'), 40, 600)

  let newDoc = null
  for (let i = 0; i < 20; i++) {
    const docs = await firestoreTodos()
    newDoc = docs.find((d) => d.title === TEST_TITLE)
    if (newDoc) break
    await sleep(800)
  }
  check('(b) Firestore REST shows the new issue', Boolean(newDoc), newDoc ? newDoc.id : 'NOT FOUND')

  const br = newDoc && newDoc.fields && newDoc.fields.bimReference && newDoc.fields.bimReference.mapValue
    ? newDoc.fields.bimReference.mapValue.fields
    : null
  const brOk =
    br &&
    (br.localId?.integerValue ?? br.localId?.doubleValue) > 0 &&
    br.modelId?.stringValue &&
    br.label?.stringValue &&
    br.worldPosition?.mapValue
  check('(b) new issue carries a valid bimReference', Boolean(brOk), br ? JSON.stringify(brOk && { modelId: br.modelId.stringValue, localId: br.localId.integerValue ?? br.localId.doubleValue, label: br.label.stringValue }) : 'NO bimReference')

  if (!newDoc) {
    console.log('aborting before reload checks')
    try { ws.close() } catch {}
    try { server.kill() } catch {}
    freePort(8741)
    process.exit(1)
  }
  const newId = newDoc.id

  /* ============ (c) reload → pin present → click selects ============ */
  await cdp.send('Page.navigate', { url: APP + '/bim/demo' })
  const reloaded = await waitForText(cdp, (t) => t.includes('MODEL READY'), 100, 800)
  check('(c) demo reloaded to MODEL READY', reloaded.includes('MODEL READY'))

  /* The pin overlay must contain a pin for the newly created issue. */
  let pinBox = null
  for (let i = 0; i < 60; i++) {
    pinBox = await cdp.eval(`(() => {
      const el = document.querySelector('.it-pin[data-issue-id=${JSON.stringify(newId)}]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      return { x: r.left + r.width/2, y: r.top + r.height/2, title: el.getAttribute('title'), display: getComputedStyle(el).display };
    })()`)
    if (pinBox) break
    await sleep(800)
  }
  check('(c) pin element present in DOM overlay (new issue)', Boolean(pinBox), pinBox ? pinBox.title : 'NOT FOUND / not visible')

  if (pinBox) {
    await cdp.clickAt(pinBox.x, pinBox.y)
    await sleep(1500)
    const after = await cdp.eval(`(() => ({
      pinnedPanel: document.querySelector('[data-testid="pinned-issue"]') ? document.querySelector('[data-testid="pinned-issue"]').innerText : '',
      sel: (document.body.innerText.match(/SEL #\\S*/) || [null])[0],
      localId: (document.body.innerText.match(/Local id\\s*\\n?\\s*(\\d+)/) || [])[1],
    }))()`)
    const pinShowsIssue = (after.pinnedPanel || '').includes(TEST_TITLE) || after.pinnedPanel.includes(TEST_TITLE.toUpperCase())
    check('(c) pin click shows the pinned issue', pinShowsIssue, after.pinnedPanel.slice(0, 80).replace(/\n/g, ' '))
    check('(c) pin click selects the element', Boolean(after.sel || after.localId), after.sel || ('LOCAL ID ' + (after.localId || 'n/a')))
  }

  /* ============ (d) Items Finder still matches ============ */
  await cdp.eval(SET_VAL_HELPER)
  const psetVal = await cdp.eval(`[...document.querySelectorAll('#if-pset option')].find(o=>o.textContent.trim()==='Pset_VDC')?.value ?? null`)
  if (psetVal) {
    await cdp.eval(`setVal('#if-pset', ${JSON.stringify(psetVal)})`)
    await sleep(250)
    const propVal = await cdp.eval(`[...document.querySelectorAll('#if-prop option')].find(o=>o.textContent.trim()==='05-Tipo de Elemento')?.value ?? null`)
    await cdp.eval(`setVal('#if-prop', ${JSON.stringify(propVal)}); setVal('#if-value', 'Fundacion');`)
    await sleep(250)
    await cdp.eval(`(() => { const b=[...document.querySelectorAll('.it-btn')].find(b=>b.textContent.includes('FIND MATCHING')); if(b){b.click();return true;} return false; })()`)
    await sleep(4500)
    const ft = await bodyText(cdp)
    const mm = ft.match(/(\d+)\s*(?:ITEM\(S\))?\s*MATCH/)
    const matchLine = (ft.match(/[^\n]*MATCH[^\n]*/) || ['(n/a)'])[0]
    const count = mm ? Number(mm[1]) : 0
    check('(d) Items Finder matches after Wave D changes', count > 0, matchLine.trim())
  } else {
    check('(d) Items Finder matches after Wave D changes', false, 'Pset_VDC option not found')
  }

  /* ---- teardown ---- */
  try { ws.close() } catch {}
  try { server.kill() } catch {}
  freePort(8741)

  /* ---- summary ---- */
  const failed = results.filter((r) => !r.ok)
  console.log('\n=== WAVE D SUMMARY ===')
  console.log(results.length - failed.length + '/' + results.length + ' assertions passed')
  if (failed.length) {
    console.log('FAILED:')
    failed.forEach((r) => console.log('  - ' + r.label))
    process.exit(1)
  }
  console.log('WAVE_D_CDP_PASS')
  process.exit(0)
}

main().catch((e) => {
  console.error('SCRIPT ERROR', e)
  try { freePort(8741) } catch {}
  process.exit(1)
})