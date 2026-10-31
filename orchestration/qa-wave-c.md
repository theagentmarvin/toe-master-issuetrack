# QA — Wave C (Exam 4, "Creating BIM Apps") — IssueTrack v4-bim

VERDICT: PASS

> Scope = the four Exam-4 checklist items in `EXAM-SPEC.md` (Wave C, lines 63–69) plus the IFC asset
> requirement. All four are implemented and wired end-to-end; the sample model is the required 604 KB
> free-field file. **Seven defects** are listed below — none removes a checklist item; #1 is silent data
> corruption of timestamps, #3 makes APPLY restore the wrong query in a multi-query session, #5 is a
> path deviation that a literal asset check would flag.

- Reviewer: qa-marvin (evaluator gate). **No file in `v4-bim/` was modified.**
- Method: full static read of every Wave-C source file (`src/bim/*`, the four panels, `smartViewsService`,
  `BimPage`), cross-checked against the installed `node_modules/@thatopen/*` + `web-ifc` sources (the
  authoritative API), plus read-only HTTP + Firestore REST assertions against the deployed site.
  **No browser session and no WebGL run** were performed (server start/restart forbidden by scope), so
  in-viewport rendering, raycast hits and Firestore *writes* are statically verified only.
- Deployed artifact parity: every byte the site serves matches `v4-bim/dist` exactly (sizes below), and
  `dist/` is newer than `src/`, so the audited source is what is live on `issuetrack-v4`.
- Stack: `@thatopen/components` 3.6.0, `@thatopen/fragments` 3.6.0, `web-ifc` 0.0.78, three 0.187.0,
  firebase 10.14.1, React 18 + Vite 6. `Components.release` reports `2.4.3` (library constant, irrelevant).

## Live assertions (all green)

| URL | Result |
|---|---|
| `https://issuetrack-v4.web.app/` | 200 `text/html` 1002 B |
| `https://issuetrack-v4.web.app/bim/REG-001` | 200 `text/html` 1002 B (SPA rewrite works) |
| `https://issuetrack-v4.web.app/sample.ifc` | 200 `text/plain` **604 040 B** — header `FILE_NAME('STRUCTURAL_VDC.ifc'…)` |
| `https://issuetrack-v4.web.app/web-ifc.wasm` | 200 `application/wasm` 1 595 268 B |
| `https://issuetrack-v4.web.app/worker/worker.mjs` | 200 `text/javascript` 1 306 151 B |
| `https://issuetrack-v4.web.app/assets/BimPage-DDCS91LP.js` | 200 5 103 091 B (= local dist) |
| `https://issuetrack-v4.web.app/assets/index-Dr-JAche.js` | 200 537 368 B (= local dist) |
| Firestore `GET …/projects` (anonymous) | 200, REG-001 present → project data readable |
| Firestore `GET …/projects/REG-001/smartViews` | 200, **empty** — no view has been stored yet |

**No CDN dependency at runtime.** `BimEngine` pins the fragments worker to `/worker/worker.mjs`
(`BimEngine.js:99`) and web-ifc to `/` with `absolute = true` + `autoSetWasm = false`
(`:103-105`). The three `unpkg.com` strings inside the chunk come from TOC defaults
(`FragmentsManager.getWorker()`, `IfcLoader.autoSetWasm()`) and are unreachable from this app.
web-ifc joins `path + 'web-ifc.wasm'` (`web-ifc-api.js:71450-71452`), so `'/'` yields `/web-ifc.wasm`
— verified 200.

## Checklist verdicts

| # | Exam-4 item | Verdict | Evidence |
|---|---|---|---|
| 1 | Items Finder UI: query items by property-set + value; export/import serialized queries; download + upload query buttons | **PASS** | UI: `components/ItemsFinderPanel.jsx:61-75` (pset select), `:77-91` (property select), `:93-104` (value), `:118-121` FIND; `:134` DOWNLOAD QUERIES, `:136-143` UPLOAD QUERIES (hidden file input). Query is the documented `element ─IsDefinedBy→ pset ─HasProperties→ property(Name/NominalValue)` relation chain — `bim/finder.js:20-62`, exact shape of `ItemsQueryParams` (`fragments/dist/index.d.ts:3904`); validated against the worker's `getItemsByQuery`/`getItemsByRelation` (`fragments/dist/Worker/worker.mjs:36904-36988`) and `checkAttribute` (`:36766-36790`). Execution: `BimEngine.js:246-250` `itemsFinder.getItems([params])` (array is required — `components/dist/index.mjs:11784` maps over queries); named queries `:253-255` via `ItemsFinder.create`; stored re-run `:266-273` `query.test({force:true})`. Serialization is the library's own `ItemsFinder.export()/import()` (`BimEngine.js:298-304`; impl `index.mjs:11883-11911`) behind the two buttons, wired at `BimPage.jsx:196-220`. Results are highlighted (`BimEngine.setFinderHighlight` + `applyVisualState` → `model.setColor`). Sample data supports it: `Pset_VDC`'s `00-Nivel Constructivo = 'Fundaciones'` is a string attribute, so the UI's `FUNDACION` example matches (case-insensitive substring). |
| 2 | Colors Palette UI on the colorize button (predefined colors) | **PASS** | `components/ColorsPalette.jsx:30-42` renders 8 fixed swatches from `bim/palette.js:16-25` (coral/amber/moss/grey/ink/steel/violet/teal — no free picker); click → `onColorize(entry.color)` → `BimPage.jsx:227-244` → `BimEngine.colorizeSelection` (`:346-354`) stored as `{modelId, localId, color}` and applied with `model.setColor(ids, THREE.Color)` (`applyVisualState`, `:312-342`). Clear-selection / reset-all are present (`ColorsPalette.jsx:47-60`). Swatches are disabled until something is selected (`:38`). |
| 3 | Data Enhancer: method returning all items sharing the source's data value | **PASS** | Custom component `bim/DataEnhancer.js` (`class DataEnhancer extends OBC.Component`, uuid `8de71a3c-…b7d2`, registered in `components`): `enhance(model, source, opts)` at `:45-60` returns a `Set` of **every** localId whose (pset, prop, value) equals the source's, with `sameValue` (`:112-120`) tolerant of string/number/boolean; `_pickSignature` (`:71-105`) picks the source's "shared documentation" value (VDC property order, then non-generic pset props, then ObjectType/Tag). Wired: `BimPage.jsx:256-277` → `BimEngine.enhanceSelection` (`:278-296`) → highlighted via the same finder channel; panel `DataEnhancerPanel.jsx:64-80` offers AUTO or an explicit property picked from the selection's `HasProperties`. Model scan that backs it uses the documented `getItemsData` config (`bim/scan.js:19-27`; API `fragments/dist/index.d.ts:1806-1825`, `getItemsIdsWithGeometry` `:1687`). |
| 4 | Smart Views: export/import view DEFINITIONS (not images); store in Firebase inside project data; show stored views when project opens; update-button re-captures current state | **PASS** (with defects 1–3) | Definitions only: `bim/SmartViews.js:34-70` — `{id, name, createdAt, updatedAt, finderQuery: ItemsFinder.export(), colorizations[]}`; `export()`/`import()` are pure JSON clones, no canvas/PNG anywhere. File export/import: `BimPage.jsx:357-386` (download JSON per view / `↥ IMPORT VIEW` `SmartViewsPanel.jsx:106-113`). Firebase inside project data: `services/smartViewsService.js:23,60-68` → `projects/{projectId}/smartViews/{viewId}`, subscribed live on page mount (`BimPage.jsx:126-136`), so stored views populate the table when the project opens (`SmartViewsPanel.jsx:74-104`). UPDATE per row (`SmartViewsPanel.jsx:86-91`) re-captures **current** finder queries + colourisations then `updateSmartView` (`BimPage.jsx:325-345`, service `:88-96`). |
| A | IFC model `assets/sample.ifc` (free-field test model, 604 KB) | **PASS** (path note) | `public/sample.ifc` = **604 040 B** (604 KB), served at `/sample.ifc` 200 `text/plain`; `STATE.md` records it as the copy of the free-field-monorepo test sample; header `STRUCTURAL_VDC.ifc` with the `Pset_VDC` Spanish property sets used by the panels. Deviation: the literal path `/assets/sample.ifc` returns the SPA fallback (200 `text/html` 1002 B) — see defect 5. |

Supporting structure: `/bim/:id` route is lazy-loaded (`src/App.jsx:20,41-43`) and appears as a separate
deployed chunk `BimPage-DDCS91LP.js`; entry points to the viewer exist on the register grid
(`ProjectCard`) and details page; all four panel labels are present in the deployed chunk
(`ITEMS FINDER`, `COLOURS PALETTE`, `DATA ENHANCER`, `SMART VIEWS`, `DOWNLOAD/UPLOAD QUERIES`,
`IMPORT VIEW`, `STORED VIEWS`).

## Defects

1. **`serverTimestamp()` is destroyed before it reaches Firestore.**
   `services/smartViewsService.js:32-34` `sanitize()` runs `JSON.parse(JSON.stringify(def))`; at `:71-76`
   and `:89` the `createdAt`/`updatedAt` sentinels are inside the object being sanitized. A
   `ServerTimestampFieldValueImpl` stringifies to `{"_methodName":"serverTimestamp"}` (verified by running
   the installed SDK), so the app writes a literal **map** field instead of a server timestamp, and every
   read returns `{_methodName:'serverTimestamp'}`. Fix: sanitize the definition first, then attach
   `createdAt: serverTimestamp()` / `updatedAt: serverTimestamp()` to the object passed to
   `setDoc`/`updateDoc`.

2. **Query import loses query names.** `ItemsFinder.import()` keys each imported query by its
   `guid` (`components/dist/index.mjs:11883-11892` → `create(value.guid, [])`), while
   `BimEngine.getQueryNames()` returns the map keys. After an upload the STORED QUERIES list shows raw
   UUIDs instead of the names saved in the file (RUN still works). Fix: after import, re-key each
   instance by `query.name` (or have the panel render `list.get(key).name`).

3. **A captured Smart View stores *all* finder queries and APPLY re-runs only the first.**
   `BimPage.jsx:278-295` captures `engine.exportQueries()` (the whole finder list) and
   `:297-322` applies `names[0]`. In a session with several saved queries a view can restore a different
   result set than the one that was on screen when it was captured. Fix: capture the *active* query name
   (or only that query) and apply it explicitly; also consider capturing camera state, since a "view"
   currently means query + colours only.

4. **No validation of uploaded query files.** `BimPage.jsx:206-219` accepts any JSON, and non-array
   `data` or junk entries surface only as `IMPORT FAILED — …`. Fix: require `Array.isArray(data)` and
   `typeof entry.guid === 'string'` before calling `importQueries`.

5. **Asset path deviation.** The model is at `/sample.ifc`, not `/assets/sample.ifc` (that URL returns
   the SPA index). Fix: also publish it as `public/assets/sample.ifc` and fetch that path, so the
   checklist path resolves.

6. **Finder value search only matches string attributes.** `checkAttribute`
   (`fragments/dist/Worker/worker.mjs:36766-36790`) applies a `RegExp` value only when
   `typeof val === 'string'`, so numeric/boolean properties (`Span`, `Slope`, `IsExternal`…) can never be
   found by value — an API limitation the UI does not disclose. Fix: hint "text values only" or add a
   numeric path using `value` as a number.

7. **Palette has no separate "colorize" trigger.** Swatches themselves are the actions
   (`ColorsPalette.jsx:30-42`); the tutorial pattern is colourise-button → palette. Functional
   equivalent, cosmetic deviation only.

## Risks / not dynamically verified

- **WebGL runtime**: raycast selection, `model.setColor` application, camera framing and the wasm/worker
  boot were verified only by API-signature matching, not by running the viewport. All calls used
  (`fragments.init(url)`, `IfcLoader.setup()`, `model.getItemsData`, `model.setColor/resetColor`,
  `fragments.raycast({camera, mouse, dom})` → `{localId, fragments}`) exist in 3.6.0 typings.
- **Firestore write rules**: anonymous reads of `projects/**` (200) and of
  `projects/REG-001/smartViews` (200, empty) work; whether anonymous *writes* to that subcollection are
  allowed by the project's rules could not be tested without writing (v3 already relies on anonymous
  writes to `projects/{id}/todos`, so this is very likely fine). No stored view exists live yet, so
  "views appear on open" is proven by code path, not by data.
- **`/bim/REG-001` deep link** returns the SPA shell correctly; client-side project lookup depends on the
  REG-001 document that is present in Firestore.

## Recommendation

Ship Exam 4 as **PASS** (4/4 items + asset). Before submitting, the cheap wins are defect 1 (one-line
ordering fix in `smartViewsService`) and defect 5 (copy the asset to `assets/`); defect 2 is worth fixing
because the exported/imported query names are part of what the examiner will click through.
