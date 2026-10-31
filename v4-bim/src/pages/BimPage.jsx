/* =====================================================================
   IssueTrack — BIM page (routes "/bim/:projectId" and "/bim/demo").
   ---------------------------------------------------------------------
   A register (project) gets a 3D viewport with the sample model loaded
   through That Open Components, plus the four Exam-4 panels:

     1. Items Finder   — property-set + value query, export/import queries
     2. Colours Palette— colorize the selection with predefined colours
     3. Data Enhancer  — custom component, "find all sharing this info"
     4. Smart Views    — named views (query + colours), APPLY/UPDATE,
                         export/import definitions, Firestore persistence

   Wave D adds:
     • "/bim/demo"  — a PUBLIC demo (no account, no login, first paint
       never waits on Firestore; writes go to the demo register REG-001).
     • ASSIGN ISSUE — pin an issue to a selected element (bimReference).
     • 3D issue pins— one status-coloured pin per pinned issue, clickable,
       surviving orbit/zoom, disposed on route exit.
     • ?issue=      — deep link that selects the element + focuses its pin.

   Everything degrades gracefully: no WebGL → a message, no crash loop.
   ===================================================================== */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAppData } from '../state/AppDataProvider'
import { BimEngine } from '../bim/BimEngine'
import { buildFinderQuery, FINDER_QUERY_KIND } from '../bim/finder'
import ItemsFinderPanel from '../components/ItemsFinderPanel'
import ColorsPalette from '../components/ColorsPalette'
import DataEnhancerPanel from '../components/DataEnhancerPanel'
import SmartViewsPanel from '../components/SmartViewsPanel'
import SelectionPanel from '../components/SelectionPanel'
import AssignIssuePanel from '../components/AssignIssuePanel'
import IssuePins from '../components/IssuePins'
import { statusInfo, priorityInfo } from '../lib/constants'
import { subscribeTodos } from '../services/todosService'
import {
  subscribeSmartViews,
  createSmartView,
  updateSmartView,
  deleteSmartView,
} from '../services/smartViewsService'

/* The public demo register — the ONLY place the demo route writes. */
const DEMO_PROJECT_ID = 'REG-001'

/* Shape the raw scan (Sets/Maps) into plain data for the dropdowns. */
function shapeScan(scan) {
  return {
    categories: Array.from(scan.categories).sort(),
    propertySets: Array.from(scan.propertySets.keys()).sort(),
    propertiesBySet: Object.fromEntries(
      Array.from(scan.propertySets.entries()).map(([name, props]) => [name, Array.from(props).sort()]),
    ),
    allProperties: Array.from(scan.properties).sort(),
  }
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ------------------------------------------------------------------
   Upload validation helpers (QA fix 4). Both import paths refuse junk
   with a friendly, house-style message instead of crashing or silently
   importing garbage.
   ------------------------------------------------------------------ */

/* A serialized ItemsFinder export is { data: SerializedFinderQuery[] }
   (or a bare array). Every entry must carry a string guid + a queries
   array — the exact shape ItemsFinder.export() produces. */
function validateQueriesPayload(parsed) {
  const result = Array.isArray(parsed) ? { data: parsed } : parsed
  if (!result || typeof result !== 'object' || !Array.isArray(result.data)) {
    return { ok: false, error: 'NOT A QUERIES FILE — EXPECTED {"data":[…] OR A BARE ARRAY' }
  }
  for (const entry of result.data) {
    if (!entry || typeof entry.guid !== 'string' || !Array.isArray(entry.queries)) {
      return { ok: false, error: 'MALFORMED QUERY — EACH ENTRY NEEDS guid + queries[]' }
    }
  }
  return { ok: true, result }
}

/* A smart view definition is a JSON object with a name, a finderQuery
   carrying a data array and a colorizations array. */
function validateViewPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'NOT A VIEW FILE — EXPECTED A JSON OBJECT' }
  }
  const valid =
    typeof parsed.name === 'string' &&
    parsed.finderQuery &&
    typeof parsed.finderQuery === 'object' &&
    Array.isArray(parsed.finderQuery.data) &&
    Array.isArray(parsed.colorizations)
  if (!valid) {
    return { ok: false, error: 'MALFORMED VIEW — NEEDS name, finderQuery.data[] AND colorizations[]' }
  }
  return { ok: true }
}

export default function BimPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  /* Wave D — "/bim/demo" is the public, no-account demo. */
  const demoMode = id === 'demo'
  const projectId = demoMode ? DEMO_PROJECT_ID : id
  const focusIssueId = searchParams.get('issue') || ''

  const { projects, people, loading } = useAppData()
  const project = projects.find((item) => item.id === projectId)

  const containerRef = useRef(null)
  const engineRef = useRef(null)
  const issuesRef = useRef([])

  const [status, setStatus] = useState('STARTING BIM VIEWPORT…')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [selection, setSelection] = useState(null)
  const [scan, setScan] = useState(null)
  const [queryNames, setQueryNames] = useState([])
  const [finderCount, setFinderCount] = useState(null)
  const [enhanceCount, setEnhanceCount] = useState(null)
  const [colorizations, setColorizations] = useState([])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ message: '', kind: '' })
  const [views, setViews] = useState([])
  /* Wave D — the register's issues (for the 3D pins) + the pinned issue
     currently shown in the detail strip. */
  const [issues, setIssues] = useState([])
  const [activeIssue, setActiveIssue] = useState(null)

  /* Keep the live issue list reachable from the ?issue= focus effect. */
  useEffect(() => {
    issuesRef.current = issues
  }, [issues])

  /* ------------------------------------------------------------------
     Create + load the BIM engine once per mount. First paint of the
     model never waits on Firestore — this routine only touches the local
     IFC file, the WASM and the worker.
     ------------------------------------------------------------------ */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let alive = true
    const engine = new BimEngine({
      container,
      onStatus: (message) => {
        if (alive) setStatus(message)
      },
      onSelect: (sel) => {
        if (alive) {
          setSelection(sel)
          setEnhanceCount(null)
        }
      },
      onReady: () => {
        if (alive) setReady(true)
      },
    })
    engineRef.current = engine

    ;(async () => {
      try {
        const initResult = await engine.init()
        if (!initResult.ok) {
          if (alive) setError(initResult.error)
          return
        }
        if (!alive) return
        await engine.loadSample()
        const rawScan = await engine.scan()
        if (alive) setScan(shapeScan(rawScan))
      } catch (err) {
        if (alive) setError('MODEL LOAD FAILED — ' + err.message)
      }
    })()

    return () => {
      alive = false
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  /* ------------------------------------------------------------------
     Live issue subscription (Wave D) — feeds the 3D pin overlay. Runs in
     the background; the viewport paints before it ever resolves.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!projectId) return undefined
    return subscribeTodos(
      projectId,
      (incoming) => setIssues(incoming),
      (err) => setFeedback({ message: 'ISSUES READ FAILED — ' + err.message, kind: 'crit' }),
    )
  }, [projectId])

  /* ------------------------------------------------------------------
     ?issue=<todoId> deep link: once the model is ready AND that pinned
     issue has arrived, select its element and focus its pin.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!ready || !focusIssueId) return
    const engine = engineRef.current
    if (!engine) return
    const issue = issuesRef.current.find((item) => item.id === focusIssueId)
    if (!issue || !issue.bimReference || !issue.bimReference.worldPosition) return
    const br = issue.bimReference
    engine.resolveSelection(br.modelId, br.localId).then(() => {
      setActiveIssue(issue)
    })
  }, [ready, focusIssueId])

  /* ------------------------------------------------------------------
     Live smart-views subscription — stored views populate the table the
     moment the project is opened (Exam 4.4).
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!projectId) return undefined
    return subscribeSmartViews(
      projectId,
      (incoming) => setViews(incoming),
      (err) => setFeedback({ message: 'VIEWS READ FAILED — ' + err.message, kind: 'crit' }),
    )
  }, [projectId])

  const report = useCallback((message, kind) => setFeedback({ message, kind }), [])

  /* ==================================================================
     Items Finder (Exam 4.1)
     ================================================================== */
  async function handleFinderFind({ queryName, pset, prop, value }) {
    const engine = engineRef.current
    if (!engine) return
    setBusy(true)
    report('', '')
    try {
      const params = buildFinderQuery({ pset, prop, value })
      if (queryName) {
        const query = engine.createQuery(queryName, [params])
        if (query) query.customData = { kind: FINDER_QUERY_KIND, pset, prop, value }
        setQueryNames(engine.getQueryNames())
      }
      const result = await engine.runQuery([params])
      engine.setFinderHighlight(result)
      await engine.applyVisualState()
      setFinderCount(engine.finderCount())
      setEnhanceCount(null)
      report(
        engine.finderCount() + ' ITEM(S) MATCH',
        engine.finderCount() > 0 ? 'ok' : 'warn',
      )
    } catch (err) {
      report('FIND FAILED — ' + err.message, 'crit')
    } finally {
      setBusy(false)
    }
  }

  async function handleRunStored(name) {
    const engine = engineRef.current
    if (!engine) return
    setBusy(true)
    try {
      const result = await engine.runStoredQuery(name)
      engine.setFinderHighlight(result)
      await engine.applyVisualState()
      setFinderCount(engine.finderCount())
      setEnhanceCount(null)
      report(engine.finderCount() + ' ITEM(S) MATCH', engine.finderCount() > 0 ? 'ok' : 'warn')
    } catch (err) {
      report('FIND FAILED — ' + err.message, 'crit')
    } finally {
      setBusy(false)
    }
  }

  function handleRemoveStored(name) {
    const engine = engineRef.current
    if (!engine) return
    engine.removeQuery(name)
    setQueryNames(engine.getQueryNames())
  }

  function handleExportQueries() {
    const engine = engineRef.current
    if (!engine || engine.getQueryNames().length === 0) {
      report('NO QUERIES TO EXPORT', 'warn')
      return
    }
    downloadJSON(engine.exportQueries(), 'issuetrack-queries.json')
    report('QUERIES EXPORTED', 'ok')
  }

  function handleImportQueries(file) {
    const engine = engineRef.current
    if (!engine) return
    const reader = new FileReader()
    reader.onload = () => {
      let parsed
      try {
        parsed = JSON.parse(reader.result)
      } catch {
        report('IMPORT FAILED — NOT VALID JSON', 'crit')
        return
      }
      const check = validateQueriesPayload(parsed)
      if (!check.ok) {
        report('IMPORT FAILED — ' + check.error, 'crit')
        return
      }
      try {
        engine.importQueries(check.result)
        setQueryNames(engine.getQueryNames())
        report('QUERIES IMPORTED — ' + engine.getQueryNames().length + ' TOTAL', 'ok')
      } catch (err) {
        report('IMPORT FAILED — ' + (err.message || 'INVALID QUERIES'), 'crit')
      }
    }
    reader.readAsText(file)
  }

  /* ==================================================================
     Colours Palette (Exam 4.2)
     ================================================================== */
  async function handleColorize(color) {
    const engine = engineRef.current
    if (!engine || !engine.hasSelection) return
    engine.colorizeSelection(color)
    setColorizations(engine.colorizations)
    await engine.applyVisualState()
    report('ITEM COLOURED', 'ok')
  }

  async function handleClearSelectionColor() {
    const engine = engineRef.current
    if (!engine) return
    engine.clearSelectionColor()
    setColorizations(engine.colorizations)
    await engine.applyVisualState()
  }

  async function handleClearAllColors() {
    const engine = engineRef.current
    if (!engine) return
    engine.clearAllColors()
    setColorizations(engine.colorizations)
    await engine.applyVisualState()
    report('COLOURS RESET', 'warn')
  }

  /* ==================================================================
     Data Enhancer (Exam 4.3)
     ================================================================== */
  async function handleEnhance(prop) {
    const engine = engineRef.current
    if (!engine) return
    setBusy(true)
    report('', '')
    try {
      const result = await engine.enhanceSelection({ prop })
      engine.setFinderHighlight(result)
      await engine.applyVisualState()
      setEnhanceCount(engine.finderCount())
      setFinderCount(null)
      report(engine.finderCount() + ' ITEM(S) SHARE THIS', 'ok')
    } catch (err) {
      report('ENHANCE FAILED — ' + err.message, 'crit')
    } finally {
      setBusy(false)
    }
  }

  /* ==================================================================
     Smart Views (Exam 4.4)
     ================================================================== */
  async function handleCaptureView(name) {
    const engine = engineRef.current
    if (!engine || !projectId) return
    setBusy(true)
    try {
      const def = engine.smartViews.capture({
        name,
        finderQuery: engine.exportQueries(),
        colorizations: engine.colorizations,
      })
      const saved = await createSmartView(projectId, def)
      report('VIEW CAPTURED — ' + saved.name.toUpperCase(), 'ok')
    } catch (err) {
      report('CAPTURE FAILED — ' + err.message, 'crit')
    } finally {
      setBusy(false)
    }
  }

  async function handleApplyView(view) {
    const engine = engineRef.current
    if (!engine) return
    setBusy(true)
    report('', '')
    try {
      if (view.finderQuery && Array.isArray(view.finderQuery.data) && view.finderQuery.data.length) {
        engine.importQueries(view.finderQuery)
        setQueryNames(engine.getQueryNames())
      }
      engine.setColorizations(view.colorizations)
      setColorizations(engine.colorizations)

      /* Re-run the FULL captured query set (not just the first query) so a
         multi-query view restores everything that was on screen when it
         was captured. */
      const names = engine.getQueryNames()
      if (names.length) {
        const found = await engine.runAllStoredQueries()
        engine.setFinderHighlight(found)
        setFinderCount(engine.finderCount())
      }
      await engine.applyVisualState()
      report('VIEW APPLIED — ' + view.name.toUpperCase(), 'ok')
    } catch (err) {
      report('APPLY FAILED — ' + err.message, 'crit')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateView(view) {
    const engine = engineRef.current
    if (!engine || !projectId) return
    setBusy(true)
    try {
      const def = engine.smartViews.capture({
        id: view.id,
        name: view.name,
        createdAt: view.createdAt,
        finderQuery: engine.exportQueries(),
        colorizations: engine.colorizations,
      })
      await updateSmartView(projectId, view.id, def)
      report('VIEW UPDATED — ' + view.name.toUpperCase(), 'ok')
    } catch (err) {
      report('UPDATE FAILED — ' + err.message, 'crit')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteView(view) {
    if (!window.confirm('DELETE VIEW ' + view.name.toUpperCase() + '?')) return
    if (!projectId) return
    try {
      await deleteSmartView(projectId, view.id)
      report('VIEW DELETED', 'warn')
    } catch (err) {
      report('DELETE FAILED — ' + err.message, 'crit')
    }
  }

  function handleExportView(view) {
    const safe = String(view.name || 'view').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
    downloadJSON(view, 'issuetrack-view-' + safe + '.json')
    report('VIEW EXPORTED', 'ok')
  }

  function handleImportView(file) {
    const engine = engineRef.current
    if (!engine || !projectId) return
    const reader = new FileReader()
    reader.onload = async () => {
      let parsed
      try {
        parsed = JSON.parse(reader.result)
      } catch {
        report('IMPORT FAILED — NOT VALID JSON', 'crit')
        return
      }
      const check = validateViewPayload(parsed)
      if (!check.ok) {
        report('IMPORT FAILED — ' + check.error, 'crit')
        return
      }
      try {
        const def = engine.smartViews.import(parsed)
        if (!def) throw new Error('INVALID VIEW')
        await createSmartView(projectId, def)
        report('VIEW IMPORTED — ' + def.name.toUpperCase(), 'ok')
      } catch (err) {
        report('IMPORT FAILED — ' + (err.message || 'INVALID VIEW'), 'crit')
      }
    }
    reader.readAsText(file)
  }

  /* ==================================================================
     Wave D — issue pinning.
     ================================================================== */
  async function handlePinClick(issue) {
    const engine = engineRef.current
    if (engine && issue.bimReference) {
      await engine.resolveSelection(issue.bimReference.modelId, issue.bimReference.localId)
    }
    setActiveIssue(issue)
  }

  function handleAssigned(saved) {
    setActiveIssue(saved)
  }

  const selectedColor = useMemo(() => {
    if (!selection) return null
    const entry = colorizations.find(
      (c) => c.localId === selection.localId && (c.modelId === selection.modelId || !c.modelId),
    )
    return entry ? entry.color : null
  }, [selection, colorizations])

  const pageTitle = demoMode
    ? 'PUBLIC DEMO MODEL'
    : 'BIM — ' + (project ? project.name : 'REGISTER')
  const backTarget = demoMode ? '/' : project ? '/project/' + project.id : '/'
  const backLabel = demoMode ? '← LANDING PAGE' : project ? '← BACK TO ' + project.name.toUpperCase() : '← ALL REGISTERS'

  const activeStatus = activeIssue ? statusInfo(activeIssue.status) : null
  const activePriority = activeIssue ? priorityInfo(activeIssue.priority) : null

  return (
    <>
      <Link className="it-breadcrumb" to={backTarget}>
        {backLabel}
      </Link>

      <div className="it-bim-head">
        <h1 className="it-page-title" style={{ margin: 0 }}>
          {pageTitle}
        </h1>
        {demoMode ? (
          <span className="it-chip it-chip-crit">NO ACCOUNT REQUIRED</span>
        ) : (
          <span className="it-muted-text it-num">{error ? 'OFFLINE' : status}</span>
        )}
      </div>

      {demoMode ? (
        <p className="it-page-sub" style={{ marginBottom: 16 }}>
          A public 3D viewport for the sample IFC model — selection, finder, palette, data
          enhancer and smart views all work with no sign-up. Assigning an issue pins it here
          and saves it to the shared demo data.
        </p>
      ) : null}

      {error ? (
        <div className="it-empty">
          <div className="it-status is-crit" role="alert">
            {error}
          </div>
          <p className="it-page-sub" style={{ marginTop: 12 }}>
            THE REST OF ISSUETRACK (REGISTERS, ISSUES, PEOPLE) KEEPS WORKING WITHOUT THE 3D VIEWPORT.
          </p>
        </div>
      ) : (
        <div className="it-bim-layout">
          <div className="it-bim-viewport-card">
            <div ref={containerRef} className="it-bim-viewport" />
            <IssuePins
              engine={ready ? engineRef.current : null}
              issues={issues}
              focusIssueId={focusIssueId}
              onPinClick={handlePinClick}
            />
            <div className="it-bim-viewport-status">
              <span className="it-chip">{status}</span>
              {ready && selection ? (
                <span className="it-chip it-chip-crit">
                  SEL #{selection.localId}
                </span>
              ) : null}
              {issues.filter((issue) => issue.bimReference && issue.bimReference.worldPosition).length ? (
                <span className="it-chip it-chip-warn">
                  {issues.filter((issue) => issue.bimReference && issue.bimReference.worldPosition).length} PINNED
                </span>
              ) : null}
            </div>
          </div>

          <div className="it-bim-side">
            {feedback.message ? (
              <div className="it-form-actions">
                <span className={'it-status' + (feedback.kind ? ' is-' + feedback.kind : '')} role="status">
                  {feedback.message}
                </span>
              </div>
            ) : null}

            {/* Wave D — pinned-issue detail strip (pin click / deep link). */}
            {activeIssue ? (
              <section className="it-card it-bim-panel" data-testid="pinned-issue">
                <div className="it-card-head">
                  <span className="it-label">[ PINNED ISSUE ]</span>
                  <span className="it-num it-muted-text">{activeIssue.id}</span>
                </div>
                <div className="it-todo-desc" style={{ color: 'var(--it-ink)', fontWeight: 600 }}>
                  {activeIssue.title}
                </div>
                {activeIssue.description ? (
                  <p className="it-todo-desc">{activeIssue.description}</p>
                ) : null}
                <div className="it-todo-chips">
                  {activePriority ? <span className={'it-chip ' + activePriority.chip}>{activePriority.label}</span> : null}
                  {activeStatus ? <span className={'it-chip ' + activeStatus.chip}>{activeStatus.label}</span> : null}
                </div>
                <div className="it-form-actions">
                  <Link className="it-btn" to={'/project/' + projectId}>
                    → OPEN IN REGISTER
                  </Link>
                </div>
              </section>
            ) : null}

            <SelectionPanel selection={selection} />

            {/* Wave D — ASSIGN ISSUE action on the selected element. */}
            <AssignIssuePanel
              projectId={projectId}
              selection={selection}
              people={people}
              onSaved={handleAssigned}
            />

            <ItemsFinderPanel
              propertySets={scan ? scan.propertySets : []}
              propertiesBySet={scan ? scan.propertiesBySet : {}}
              allProperties={scan ? scan.allProperties : []}
              queryNames={queryNames}
              resultCount={finderCount}
              busy={busy}
              onFind={handleFinderFind}
              onRunStored={handleRunStored}
              onRemoveStored={handleRemoveStored}
              onExport={handleExportQueries}
              onImport={handleImportQueries}
            />
            <ColorsPalette
              hasSelection={Boolean(selection)}
              selectedColor={selectedColor}
              colorizations={colorizations}
              onColorize={handleColorize}
              onClearSelection={handleClearSelectionColor}
              onClearAll={handleClearAllColors}
            />
            <DataEnhancerPanel
              selection={selection}
              resultCount={enhanceCount}
              busy={busy}
              onEnhance={handleEnhance}
            />
            <SmartViewsPanel
              views={views}
              currentFinderCount={queryNames.length}
              currentColorCount={colorizations.length}
              busy={busy}
              onCapture={handleCaptureView}
              onApply={handleApplyView}
              onUpdate={handleUpdateView}
              onDelete={handleDeleteView}
              onExport={handleExportView}
              onImport={handleImportView}
            />
          </div>
        </div>
      )}
    </>
  )
}