/* =====================================================================
   IssueTrack — BIM page (route "/bim/:projectId") — Wave C / Exam 4.
   ---------------------------------------------------------------------
   A register (project) gets a 3D viewport with the sample model loaded
   through That Open Components, plus the four Exam-4 panels:

     1. Items Finder   — property-set + value query, export/import queries
     2. Colours Palette— colorize the selection with predefined colours
     3. Data Enhancer  — custom component, "find all sharing this info"
     4. Smart Views    — named views (query + colours), APPLY/UPDATE,
                         export/import definitions, Firestore persistence

   Everything degrades gracefully: no WebGL → a message, no crash loop.
   ===================================================================== */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../state/AppDataProvider'
import { BimEngine } from '../bim/BimEngine'
import { buildFinderQuery, FINDER_QUERY_KIND } from '../bim/finder'
import ItemsFinderPanel from '../components/ItemsFinderPanel'
import ColorsPalette from '../components/ColorsPalette'
import DataEnhancerPanel from '../components/DataEnhancerPanel'
import SmartViewsPanel from '../components/SmartViewsPanel'
import SelectionPanel from '../components/SelectionPanel'
import {
  subscribeSmartViews,
  createSmartView,
  updateSmartView,
  deleteSmartView,
} from '../services/smartViewsService'

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

export default function BimPage() {
  const { id } = useParams()
  const { projects, loading } = useAppData()
  const project = projects.find((item) => item.id === id)

  const containerRef = useRef(null)
  const engineRef = useRef(null)

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

  /* ------------------------------------------------------------------
     Create + load the BIM engine once per mount.
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
     Live smart-views subscription — stored views populate the table the
     moment the project is opened (Exam 4.4).
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!id) return undefined
    return subscribeSmartViews(
      id,
      (incoming) => setViews(incoming),
      (err) => setFeedback({ message: 'VIEWS READ FAILED — ' + err.message, kind: 'crit' }),
    )
  }, [id])

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
      try {
        const parsed = JSON.parse(reader.result)
        const result = Array.isArray(parsed) ? { data: parsed } : parsed
        engine.importQueries(result)
        setQueryNames(engine.getQueryNames())
        report('QUERIES IMPORTED — ' + engine.getQueryNames().length + ' TOTAL', 'ok')
      } catch (err) {
        report('IMPORT FAILED — ' + (err.message || 'INVALID JSON'), 'crit')
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
    if (!engine || !id) return
    setBusy(true)
    try {
      const def = engine.smartViews.capture({
        name,
        finderQuery: engine.exportQueries(),
        colorizations: engine.colorizations,
      })
      const saved = await createSmartView(id, def)
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

      const names = engine.getQueryNames()
      if (names.length) {
        const found = await engine.runStoredQuery(names[0])
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
    if (!engine || !id) return
    setBusy(true)
    try {
      const def = engine.smartViews.capture({
        id: view.id,
        name: view.name,
        createdAt: view.createdAt,
        finderQuery: engine.exportQueries(),
        colorizations: engine.colorizations,
      })
      await updateSmartView(id, view.id, def)
      report('VIEW UPDATED — ' + view.name.toUpperCase(), 'ok')
    } catch (err) {
      report('UPDATE FAILED — ' + err.message, 'crit')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteView(view) {
    if (!window.confirm('DELETE VIEW ' + view.name.toUpperCase() + '?')) return
    if (!id) return
    try {
      await deleteSmartView(id, view.id)
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
    if (!engine || !id) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result)
        const def = engine.smartViews.import(parsed)
        if (!def) throw new Error('INVALID VIEW')
        await createSmartView(id, def)
        report('VIEW IMPORTED — ' + def.name.toUpperCase(), 'ok')
      } catch (err) {
        report('IMPORT FAILED — ' + (err.message || 'INVALID JSON'), 'crit')
      }
    }
    reader.readAsText(file)
  }

  const selectedColor = useMemo(() => {
    if (!selection) return null
    const entry = colorizations.find(
      (c) => c.localId === selection.localId && (c.modelId === selection.modelId || !c.modelId),
    )
    return entry ? entry.color : null
  }, [selection, colorizations])

  return (
    <>
      <Link className="it-breadcrumb" to={project ? '/project/' + project.id : '/'}>
        ← {project ? 'BACK TO ' + project.name.toUpperCase() : 'ALL REGISTERS'}
      </Link>

      <div className="it-bim-head">
        <h1 className="it-page-title" style={{ margin: 0 }}>
          BIM — {project ? project.name : 'REGISTER'}
        </h1>
        <span className="it-muted-text it-num">{error ? 'OFFLINE' : status}</span>
      </div>

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
            <div className="it-bim-viewport-status">
              <span className="it-chip">{status}</span>
              {ready && selection ? (
                <span className="it-chip it-chip-crit">
                  SEL #{selection.localId}
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

            <SelectionPanel selection={selection} />
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