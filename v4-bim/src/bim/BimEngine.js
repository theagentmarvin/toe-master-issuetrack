/* =====================================================================
   IssueTrack — BIM engine (Wave C / Exam 4).
   ---------------------------------------------------------------------
   A plain, framework-free class that owns a That Open `Components`
   instance, one `World`, the `FragmentsManager` (local worker) and the
   `IfcLoader` (local WASM). React drives it through the <BimPage>.

   Everything the exam asks for funnels through this class:
     • raycast selection + property panel        (Exam 4.1)
     • ItemsFinder queries + export/import       (Exam 4.1)
     • colorize with a predefined palette        (Exam 4.2)
     • DataEnhancer + SmartViews components      (Exam 4.3 / 4.4)

   It degrades cleanly: if WebGL is unavailable, `init()` reports an
   error instead of throwing, and the page renders a message.
   ===================================================================== */
import * as OBC from '@thatopen/components'
import * as THREE from 'three'
import { scanModelData, SCAN_CONFIG } from './scan'
import { DataEnhancer } from './DataEnhancer'
import { SmartViews } from './SmartViews'
import { SELECT_COLOR, FOUND_COLOR } from './palette'

const MODEL_NAME = 'sample'

/* Feature-detect WebGL so we can refuse to build the renderer instead of
   crashing (which would leave a broken route / retry loop). */
function webglAvailable() {
  try {
    if (typeof window === 'undefined') return false
    if (!window.WebGLRenderingContext) return false
    const canvas = document.createElement('canvas')
    const ok =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    return Boolean(ok)
  } catch {
    return false
  }
}

export class BimEngine {
  constructor({ container, onStatus, onSelect, onReady } = {}) {
    this.container = container
    this.onStatus = onStatus || (() => {})
    this.onSelect = onSelect || (() => {})
    this.onReady = onReady || (() => {})

    this.components = null
    this.world = null
    this.worlds = null
    this.camera = null
    this.renderer = null
    this.fragments = null
    this.ifcLoader = null
    this.itemsFinder = null
    this.dataEnhancer = null
    this.smartViews = null
    this.model = null

    this._scan = null
    this._disposed = false

    /* Viewport state (reconciled into the 3D view on every change). */
    this._selectionKey = null
    this._finderKeys = new Set()
    this._colorizations = []
  }

  /* ------------------------------------------------------------------
     Setup ORDER matters: components → world → fragments → ifc loader.
     Never builds a renderer when WebGL is missing.
     ------------------------------------------------------------------ */
  async init() {
    if (!webglAvailable()) {
      return { ok: false, error: 'WEBGL UNAVAILABLE — THIS DEVICE / BROWSER CANNOT RUN THE 3D VIEWPORT' }
    }
    if (!this.container) {
      return { ok: false, error: 'VIEWPORT CONTAINER NOT MOUNTED' }
    }

    this.onStatus('INITIALIZING BIM ENGINE…')

    this.components = new OBC.Components()
    this.worlds = this.components.get(OBC.Worlds)
    this.world = this.worlds.create()
    this.world.scene = new OBC.SimpleScene(this.components)
    this.world.scene.setup()
    this.world.scene.three.background = null

    this.renderer = new OBC.SimpleRenderer(this.components, this.container)
    this.camera = new OBC.OrthoPerspectiveCamera(this.components)
    this.world.renderer = this.renderer
    this.world.camera = this.camera

    /* Fragments — worker served locally from /worker/worker.mjs. */
    this.fragments = this.components.get(OBC.FragmentsManager)
    this.fragments.init('/worker/worker.mjs')

    /* IfcLoader — web-ifc WASM served locally from /web-ifc.wasm. */
    this.ifcLoader = this.components.get(OBC.IfcLoader)
    this.ifcLoader.settings.wasm.path = '/'
    this.ifcLoader.settings.wasm.absolute = true
    this.ifcLoader.settings.autoSetWasm = false
    await this.ifcLoader.setup()

    /* React StrictMode (dev) may dispose the engine while the WASM
       setup above is in flight — stop cleanly instead of touching a
       disposed Components instance. */
    if (this._disposed) return { ok: false, error: 'DISPOSED BEFORE SETUP COMPLETED' }

    /* Custom components (registered as singletons). */
    this.itemsFinder = this.components.get(OBC.ItemsFinder)
    this.dataEnhancer = this.components.get(DataEnhancer)
    this.smartViews = this.components.get(SmartViews)

    /* Keep the fragments pipeline in step with the camera + renderer. */
    this.camera.controls.addEventListener('update', () => this.fragments.core.update())

    this.world.onCameraChanged.add((camera) => {
      for (const [, model] of this.fragments.list) {
        model.useCamera(camera.three)
      }
      this.fragments.core.update(true)
    })

    this.fragments.list.onItemSet.add(({ value: model }) => {
      model.useCamera(this.camera.three)
      this.world.scene.three.add(model.object)
      this.fragments.core.update(true)
    })

    /* Raycast selection on canvas click. */
    this._canvas = this.renderer.three.domElement
    this._handleClick = (event) => this._onClick(event)
    this._canvas.addEventListener('click', this._handleClick)

    this.components.init()
    return { ok: true }
  }

  /* ------------------------------------------------------------------
     Load the sample IFC from the public folder.
     ------------------------------------------------------------------ */
  async loadSample() {
    if (this._disposed) return null
    this.onStatus('LOADING IFC MODEL…')
    const response = await fetch('/sample.ifc')
    if (!response.ok) throw new Error('SAMPLE.IFC NOT SERVED — HTTP ' + response.status)
    const buffer = await response.arrayBuffer()

    this.model = await this.ifcLoader.load(new Uint8Array(buffer), true, MODEL_NAME)
    if (this._disposed) return this.model

    /* Frame the model once loaded. */
    try {
      await this.camera.fitToItems()
    } catch {
      await this.camera.controls.setLookAt(24, 20, 24, 0, 0, 2)
    }

    this.onStatus('MODEL READY — CLICK AN ITEM TO INSPECT IT')
    this.onReady()
    return this.model
  }

  /* ------------------------------------------------------------------
     Scan the loaded model once (categories, property sets, properties).
     ------------------------------------------------------------------ */
  async scan() {
    if (this._scan) return this._scan
    if (!this.model) throw new Error('MODEL NOT LOADED')
    const scan = await scanModelData(this.model)
    this._scan = scan
    return scan
  }

  /* Public read-only accessors used by the React panels. */
  get modelId() {
    return this.model ? this.model.modelId : MODEL_NAME
  }

  get colorizations() {
    return this._colorizations.map((c) => ({ ...c }))
  }

  get hasSelection() {
    return Boolean(this._selectionKey)
  }

  /* ------------------------------------------------------------------
     Raycast selection. Returns the selection payload (also emitted via
     the onSelect callback) and re-applies the viewport highlight.
     ------------------------------------------------------------------ */
  async _onClick(event) {
    if (this._disposed || !this.model) return
    const canvas = this._canvas
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    /* The fragments raycaster expects CLIENT-PIXEL coordinates: its
       internal `screenToCast` does `(p.x - rect.left) …` against the
       canvas bounding rect, so it converts pixels → NDC itself. Passing
       a pre-converted NDC vector here sends the ray from a garbage
       screen position and no geometry is ever hit. */
    let hit = null
    try {
      hit = await this.fragments.raycast({
        camera: this.camera.three,
        mouse: new THREE.Vector2(event.clientX, event.clientY),
        dom: canvas,
      })
    } catch (err) {
      // Surface (once) instead of swallowing — selection must never fail
      // silently. A legit miss returns null, not an exception.
      console.warn('[BimEngine] raycast failed', err)
      hit = null
    }

    if (!hit || !hit.fragments) {
      /* Click on empty space → deselect. */
      this._selectionKey = null
      this.onSelect(null)
      await this.applyVisualState()
      return
    }

    await this.resolveSelection(hit.fragments.modelId, hit.localId)
  }

  async resolveSelection(modelId, localId) {
    if (!this.model) return null
    let data = null
    try {
      const rows = await this.model.getItemsData([localId], SCAN_CONFIG)
      data = rows && rows[0] ? rows[0] : null
    } catch {
      data = null
    }
    this._selectionKey = modelId + ':' + localId
    const selection = { modelId, localId, data }
    this.onSelect(selection)
    await this.applyVisualState()
    return selection
  }

  /* ------------------------------------------------------------------
     Run an ItemsFinder query and return a record of modelId -> localId[]. 
     ------------------------------------------------------------------ */
  async runQuery(itemsQueryParams) {
    if (!this.itemsFinder) return []
    const result = await this.itemsFinder.getItems(itemsQueryParams)
    return result
  }

  /* Create a NAMED finder query (stored for export/import). */
  createQuery(name, itemsQueryParams) {
    return this.itemsFinder.create(name, itemsQueryParams)
  }

  removeQuery(name) {
    if (this.itemsFinder.list.has(name)) this.itemsFinder.list.delete(name)
  }

  getQueryNames() {
    return Array.from(this.itemsFinder.list.keys())
  }

  /* Re-run a stored named query (forces a fresh search, bypass cache). */
  async runStoredQuery(name) {
    const query = this.itemsFinder.list.get(name)
    if (!query) return []
    query.cache = false
    return query.test({ force: true })
  }

  /* ------------------------------------------------------------------
     Exam 4.3 — from the SELECTED item, find all items sharing the same
     information, via the custom DataEnhancer component. `prop` may be a
     specific property name or 'AUTO' (best-guess signature).
     ------------------------------------------------------------------ */
  async enhanceSelection({ prop } = {}) {
    if (!this._selectionKey || !this.model) return []
    const localId = Number(this._selectionKey.split(':')[1])
    const scan = await this.scan()
    const source = { modelId: this.modelId, localId }

    let matches
    if (prop && String(prop).toUpperCase() !== 'AUTO') {
      const entry = scan.entries.find((e) => e.localId === localId && e.prop === prop)
      if (!entry) return []
      matches = await this.dataEnhancer.enhance(this.model, source, {
        match: [{ pset: entry.pset, prop: entry.prop, value: entry.value }],
      })
    } else {
      matches = await this.dataEnhancer.enhance(this.model, source)
    }

    return { [this.modelId]: matches }
  }

  exportQueries() {
    return this.itemsFinder.export()
  }

  /* ------------------------------------------------------------------
     Import a serialized query set. `ItemsFinder.import()` keys each
     imported query by its serialized `guid` (which may be a UUID from
     another tool), so we re-key every instance by its own `name` — the
     stored-queries list then shows the SAVED names, not raw ids, and
     each stays runnable via `runStoredQuery(name)`.
     ------------------------------------------------------------------ */
  importQueries(result) {
    const instances = this.itemsFinder.import(result)
    const list = this.itemsFinder.list
    for (const query of instances) {
      const currentKey = list.getKey(query)
      if (!currentKey) continue
      const desired = typeof query.name === 'string' && query.name ? query.name : currentKey
      if (desired !== currentKey) list.replaceKey(currentKey, desired, true)
    }
    return instances
  }

  /* ------------------------------------------------------------------
     Run EVERY stored query and return the union of their results. Used
     by Smart Views APPLY so a multi-query view restores the full set it
     captured, not just the first query. (Union matches the "what is on
     screen" semantics of colourising + querying several criteria.)
     ------------------------------------------------------------------ */
  async runAllStoredQueries() {
    const merged = {}
    for (const [, query] of this.itemsFinder.list) {
      const result = await query.test({ force: true })
      for (const [modelId, ids] of Object.entries(result || {})) {
        if (!merged[modelId]) merged[modelId] = new Set()
        for (const localId of ids) merged[modelId].add(localId)
      }
    }
    return merged
  }

  /* ------------------------------------------------------------------
     Visual state reconciliation.
     Order: palette colourisations → selection (coral) → finder/enhancer
     result (amber on top, so results stay visible even over a palette
     colour). `resetColor(undefined)` clears every colour first.
     ------------------------------------------------------------------ */
  async applyVisualState() {
    if (!this.model) return
    await this.model.resetColor(undefined)

    const buckets = new Map()
    const push = (color, localId) => {
      if (!buckets.has(color)) buckets.set(color, [])
      buckets.get(color).push(localId)
    }

    for (const c of this._colorizations) {
      if (c.modelId && c.modelId !== this.modelId) continue
      push(c.color, c.localId)
    }
    if (this._selectionKey) {
      const localId = Number(this._selectionKey.split(':')[1])
      push(SELECT_COLOR, localId)
    }
    for (const key of this._finderKeys) {
      const localId = Number(key.split(':')[1])
      push(FOUND_COLOR, localId)
    }

    for (const [color, ids] of buckets) {
      await this.model.setColor(ids, new THREE.Color(color))
    }
    await this.fragments.core.update(true)
  }

  /* Replace the palette colourisations (used by the palette + smart views). */
  setColorizations(list) {
    this._colorizations = Array.isArray(list) ? list.map((c) => ({ ...c })) : []
  }

  colorizeSelection(color) {
    if (!this._selectionKey) return
    const localId = Number(this._selectionKey.split(':')[1])
    const modelId = this._selectionKey.split(':')[0]
    this._colorizations = this._colorizations.filter(
      (c) => !(c.localId === localId && (c.modelId || this.modelId) === modelId),
    )
    this._colorizations.push({ modelId, localId, color })
  }

  clearSelectionColor() {
    if (!this._selectionKey) return
    const localId = Number(this._selectionKey.split(':')[1])
    this._colorizations = this._colorizations.filter((c) => c.localId !== localId)
  }

  clearAllColors() {
    this._colorizations = []
  }

  /* Show the finder/enhancer result set. */
  setFinderHighlight(modelIdMap) {
    this._finderKeys = new Set()
    for (const [modelId, ids] of Object.entries(modelIdMap || {})) {
      for (const localId of ids) this._finderKeys.add(modelId + ':' + localId)
    }
  }

  clearFinderHighlight() {
    this._finderKeys = new Set()
  }

  /* Count of the current finder/enhancer result set. */
  finderCount() {
    return this._finderKeys.size
  }

  /* ------------------------------------------------------------------
     Destroy the viewport and every TOC component (no memory leaks when
     React unmounts the route).
     ------------------------------------------------------------------ */
  dispose() {
    this._disposed = true
    try {
      if (this._canvas && this._handleClick) {
        this._canvas.removeEventListener('click', this._handleClick)
      }
    } catch {
      /* ignore */
    }
    try {
      if (this.components) this.components.dispose()
    } catch {
      /* ignore */
    }
    this.components = null
    this.model = null
    this._scan = null
  }
}