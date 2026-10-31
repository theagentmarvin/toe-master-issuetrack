# IssueTrack — Wave C (Exam 4): Creating BIM Apps

That Open Company master-challenge, exam 4. The Wave A (vanilla) and Wave B (React +
Firestore) build gets a **BIM edition**: every register (project) opens a 3D viewport that
loads the free-field sample IFC model through That Open Components, with the four required
Exam-4 features.

```
/            → register index          (unchanged from Wave B)
/project/:id → register detail         (unchanged from Wave B, + "OPEN BIM VIEWER")
/bim/:id     → BIM viewer              (NEW — Wave C)
/people      → people directory        (unchanged from Wave B)
```

---

## 1. Run it

```bash
npm install
npm run dev        # http://127.0.0.1:8612
npm run build      # → dist/
npm run preview    # serves dist/ on http://127.0.0.1:8613
```

The BIM route lazy-loads the ~5 MB That Open bundle so the registers / issues / people pages
stay fast.

## 2. Served assets (public/)

| Asset | Purpose |
|---|---|
| `public/sample.ifc` | the free-field test model (604 KB) |
| `public/web-ifc.wasm` (+ `web-ifc-mt.wasm`) | web-ifc WASM, served locally for the `IfcLoader` |
| `public/worker/worker.mjs` | the fragments worker (module worker), served locally for `FragmentsManager` |

The `IfcLoader` is pointed at `/` (absolute) and `FragmentsManager.init('/worker/worker.mjs')`,
so **no runtime fetch from unpkg/jsdelivr is required** — the whole viewer works from the
deployed host.

## 3. Exam 4 checklist → code

| Requirement | Where |
|---|---|
| BIM route per project, model loaded | `src/pages/BimPage.jsx` (route `/bim/:id`), `src/bim/BimEngine.js` (`loadSample`) |
| Raycast selection + property-sets data panel | `src/bim/BimEngine.js` (`_onClick`/`resolveSelection`), `src/components/SelectionPanel.jsx` |
| Items Finder: property set + value → all matching items | `src/components/ItemsFinderPanel.jsx`, `src/bim/finder.js` (`buildFinderQuery`), `src/bim/BimEngine.js` (`runQuery`) |
| Finder export/import via documented serialization | `src/bim/BimEngine.js` (`exportQueries`/`importQueries` → `ItemsFinder.export()`/`import()`), panel DOWNLOAD/UPLOAD buttons |
| Colours Palette on the colorize action | `src/components/ColorsPalette.jsx`, `src/bim/palette.js`, `src/bim/BimEngine.js` (`colorizeSelection`) |
| Data Enhancer (custom component + method) | `src/bim/DataEnhancer.js` (`enhance`), panel `src/components/DataEnhancerPanel.jsx` |
| Smart Views (custom component, serialize definitions) | `src/bim/SmartViews.js`, panel `src/components/SmartViewsPanel.jsx` |
| Smart Views APPLY + UPDATE buttons | `src/components/SmartViewsPanel.jsx` → `src/pages/BimPage.jsx` (`handleApplyView`/`handleUpdateView`) |
| Smart Views export/import DEFINITIONS (not images) | `src/pages/BimPage.jsx` (`handleExportView`/`handleImportView`) |
| Smart Views persisted in Firestore as project data | `src/services/smartViewsService.js` (`projects/{id}/smartViews`), subscribed in `BimPage` |

### Files added for Wave C

```
src/bim/BimEngine.js          viewport engine (TOC setup, raycast, finder, colours)
src/bim/scan.js               one bulk getItemsData() → categories / property sets / entries
src/bim/finder.js             builds the ItemsFinder relationship query
src/bim/DataEnhancer.js       custom component (find same-information items)
src/bim/SmartViews.js         custom component (capture + serialize view definitions)
src/bim/palette.js            predefined house-style colour palette
src/bim/format.js             item-data + regex helpers
src/pages/BimPage.jsx         BIM route + orchestration
src/components/SelectionPanel.jsx
src/components/ItemsFinderPanel.jsx
src/components/ColorsPalette.jsx
src/components/DataEnhancerPanel.jsx
src/components/SmartViewsPanel.jsx
src/services/smartViewsService.js
```

### How the finder query works

`buildFinderQuery` emits the documented ItemsFinder **relational query**:

```
element ──IsDefinedBy──▶ property set ──HasProperties──▶ property
          (any)          Name == psetName             Name == propName
                                                    NominalValue == value
```

`ItemsFinder.export()` / `import()` serialise/deserialise those queries (regexes ⇄ strings),
which is exactly what the DOWNLOAD / UPLOAD buttons exercise.

## 4. House style

`src/styles/tokens.css` is the verbatim Chokepoint token set; `src/styles/app.css` adds the
viewer layout (viewport + side panels) and the predefined colour swatches, all built from the
same tokens.

## 5. Deploy (Firebase Hosting)

`dist/` is the publish folder. `BrowserRouter` needs the SPA rewrite (the parent `firebase.json`
still points at the Wave A folder — point it at `v4-bim/dist` for this build):

```json
{ "hosting": { "public": "v4-bim/dist",
  "rewrites": [{ "source": "**", "destination": "/index.html" }] } }
```

## 6. Known limitations (honest)

* **Firestore rules are fully open** (test mode, no auth) — same as Wave B.
* **The web config ships a redacted API key** — Firestore works, Firebase Auth would not.
* **WebGL required for the viewport**: devices without WebGL see a graceful "webgl unavailable"
  message; registers / issues / people keep working without it.
* **Bundle size**: the BIM chunk is ~5 MB (three + web-ifc + fragments). Lazy-loaded, so it
  only downloads when a register's BIM view is opened.
* The viewer targets a **single sample model** (`/sample.ifc`) per register — the exam scope.

## 7. Exam 1–3 behaviours (kept from Wave B)

All registers / issues / people / Firestore behaviour from Wave B is preserved; the BIM route
is additive.