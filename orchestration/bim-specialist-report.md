# Wave D — Independent BIM Specialist Report

**App under test:** `https://issuetrack-v4.web.app` (LIVE production build, public, no auth)
**Wave:** D — public BIM demo (D1) + click→assign→3D pin (D2), spec `orchestration/WAVE-D-SPEC.md`
**Reviewer:** independent BIM specialist evaluator (judge only — no fixes applied to app code or deploy)
**Date:** 2026-10-31
**Method:** managed Chrome over CDP `127.0.0.1:18800`; real input via `Input.dispatchMouseEvent` (mouseMoved/Pressed/Released) at client-pixel coords — no synthetic `dispatchEvent`, no `element.click()` for raycast selection; DOM/state read via `Runtime.evaluate`; persistence verified by Firestore REST (project `marvin-dev-c4ca4`). Harness: `/home/marvin/projects/qa-agent/qa-wave-d/` (`lib.mjs`, `phase1..phase8`), screenshots in `qa-wave-d/screenshots/`.

**VERDICT: FAIL** — 1 functional defect (medium), 1 usability defect (low). D1 fully passes; D2 passes on the happy path but one mandated deep-link behaviour breaks under a slow-data race and fails silently.

---

## Per-item results

| # | Test item | Result | Evidence |
|---|---|---|---|
| 1 | Landing CTA + no login/registration anywhere | **PASS** | CTA `◈ OPEN BIM DEMO — NO ACCOUNT NEEDED`, `href=/bim/demo`, rect x=863.36 y=256.41 w=315.64 h=35.39, class `it-demo-cta-btn`; real click → `MODEL READY`. Auth scan on `/` and `/bim/demo`: 0 password inputs, 0 auth-like forms, 0 `auth0|login|signin|accounts.` links, 0 `identitytoolkit|securetoken` requests; demo chip `NO ACCOUNT REQUIRED`. `01-landing.png`, `02-demo-ready.png`, `19-auth-scan-demo.png` |
| 2 | Cold load — first paint independent of Firestore | **PASS** | Fresh tab, every `**/firestore.googleapis.com/**` request held 12 s: `LOADING IFC MODEL…` @1506 ms, `MODEL READY` @**4173 ms**, first Firestore response @**12918 ms**; canvas 580×560; no console/page errors. (Register sidebar stayed empty until data arrived — correct, not a defect.) `03-cold-load-firestore-delay.png` |
| 3 | Click element → selection → ASSIGN ISSUE → validation → save | **PASS** | Click (529,532) in canvas rect x239 y251.8125 w580 h560 → `IFCSLAB` localId **5693**, GUID `1$sXzQ8nj6mAikFhdcv6RS`, `Floor:3" LW Concrete on 2" Metal Deck:213702`, chip `SEL #5693`. Title `BIM` → `TITLE TOO SHORT — MIN 5 CHARACTERS`, `aria-invalid=true`, status `ISSUE NOT SAVED — TITLE TOO SHORT`, form stayed open, todo count unchanged 3→3. Valid save → todo **`9i16mxy6NDObpPUfhhkK`**, `createdAt 2026-10-31T16:50:23.734Z`, status `in-progress`, priority `HIGH`, assignee `PEO-001`. `04..07` |
| 4 | Pin at element world position; survives orbit/zoom; restores on reload | **PASS** | Stored `bimReference = {modelId sample, localId 5693, guid 1$sXzQ…v6RS, label …, worldPosition {x 18.32076, y 8.4709, z 20.32}}` (REST GET). Pin `left 324.967px / top 291.05px` vs independent projection through active PerspectiveCamera (pos 35.964, 28.806, 41.442) = 324.96…/291.05… → Δ ≈ 0.0002 / 0.0005 px. After drag-orbit and wheel-zoom pin stayed welded to the plate. After full page reload: same coords, `1 PINNED`, selection correctly null, Δ 0. `08..10`, `12` |
| 5 | Pin click selects element + shows issue detail | **PASS** | Real click on pin → `engine._selectionKey = sample:5693`, `[ SELECTED ITEM ]` panel with `IFCSLAB / 5693 / 1$sXz…v6RS`, `[ PINNED ISSUE ]` panel with title, `HIGH`, `IN PROGRESS`, `→ OPEN IN REGISTER`. `11-pin-clicked.png` |
| 6 | Project-details BIM badge + `?issue=` deep link focus (normal **and** slow-data) | **FAIL (partial)** | Badge: only the pinned card shows `◈ BIM` with `href=/bim/REG-001?issue=9i16mxy6NDObpPUfhhkK` (+ `title="Pinned in the 3D viewport"`); seed cards show none — **PASS**. Real click → `/bim/REG-001?issue=…`, chip `SEL #5693`, pin class `it-pin it-pin-focus`, pinned panel rendered — **PASS (fast path)**. With Firestore delayed 12 s: model ready @3448 ms, first FS @12665 ms; after 15 s of settle the pin renders with focus class but chip is `null` and panel reads `NO ITEM SELECTED — CLICK THE MODEL TO PICK ONE` — **FAIL**. `13-project-badge.png`, `14-deep-link-fast.png`, `15-deep-link-firestore-delayed.png` |
| 7 | Regression sanity — selection, ItemsFinder, palette, Smart Views | **PASS** | Selection inspect OK (`IFCSLAB 5665`, 18 props incl. `05-Tipo de Elemento`). Finder `Pset_VDC` / `05-Tipo de Elemento` / `Fundacion` → status `20 ITEM(S) MATCH`, chip `20 MATCH`, engine count 20. Palette swatch `COLOUR ITEM CRITICAL` → `1 ITEM(S) COLOURED`, colorization `{modelId sample, localId 5665, #F0561E}`. Smart View `QA-BIM-TEST VIEW` → `VIEW CAPTURED`, persisted doc `271a811e-…` with `finderQuery`, `colorizations`, timestamps, listed in UI. `16..18` |
| 8 | Cleanup + pristine state | **PASS** | REST DELETE todo `9i16mxy6NDObpPUfhhkK` → 200; DELETE smart view `271a811e-…` → 200; re-GET deleted todo → **404**. Final GET `projects/REG-001/todos` = exactly `ISS-001`, `ISS-002`, `ISS-003` (no `bimReference` on any); `smartViews` = 0 docs. Live `/bim/demo` after cleanup: `MODEL READY`, **0 pins**, 3 registers (`P-001 TOWER NORTH`, `P-002 DEPOT WEST`, `P-003 PIER ANNEX`). `/project/REG-001`: 3 cards, **0 badges**. `20-final-pristine-demo.png`, `21-project-after-cleanup.png` |

---

## Defects

### D-1 (MEDIUM, functional) — `?issue=` deep link drops the element selection when issue data arrives after the model is ready
**Where:** `v4-bim/src/pages/BimPage.jsx:217-228` — the deep-link effect lists deps `[ready, focusIssueId]` but reads `issuesRef.current`; when the todo arrives *after* `ready` flips true (slow Firestore), the effect never re-runs. Pins still render (separate subscription), so the page looks half-successful.

**Impact:** On a slow connection the badge/deep link silently renders a focused pin with **no** element selected and an empty detail panel. No error message, no retry. This is exactly the race the builder only covered with a fast local unit test; D2's "…and focuses the pin" is not met in that condition.

**Repro (observed on production):**
1. Seed/keep one todo with `bimReference {modelId, localId, worldPosition}` (test used `9i16mxy6NDObpPUfhhkK`).
2. Open `/bim/REG-001?issue=<todoId>` in a fresh tab with Firestore responses delayed ~12 s (devtools throttling or route-hold).
3. Wait for `MODEL READY` (~3.4 s), then wait for the pin to appear after data lands (~12.7 s) plus 15 s settle.
4. Expected: chip `SEL #<localId>` + `[ SELECTED ITEM ]` panel + pin focus. Actual: 1 pin with `it-pin-focus`, chip `null`, `[ SELECTED ITEM ] NO ITEM SELECTED — CLICK THE MODEL TO PICK ONE`.

**Suggested direction (not applied — judge only):** make the effect depend on the issue set (e.g. `[ready, focusIssueId, issues]`) or re-check `issuesRef` from the subscription callback; guard so the resolve runs once per id.

### D-2 (LOW, usability) — ASSIGN ISSUE action is far below the fold after selection
With a 929 px viewport, after selecting an element the `#btn-assign-issue` control sits at y≈3435 px, outside the viewport with no scroll cue, scroll-to action, or sticky placement. A user who selects an element does not see that assigning is possible; the test only reached it via `scrollIntoView`. Repro: `/bim/demo` → click a slab → look for the assign action without scrolling. (`04-selected-element.png` shows the state above the fold.)

*Not defects (checked and dismissed):* Playwright `page.screenshot` font-wait timeout during evidence capture was a harness issue (CDP `Page.captureScreenshot` worked); the transient `ERR_CONNECTION_REFUSED` on one reload was local Chrome flakiness (retried, 3/3 later reloads clean); empty register list during the 12 s Firestore hold is expected first-paint independence, not a bug.

---

## Cleanup confirmation

- Deleted: `projects/REG-001/todos/9i16mxy6NDObpPUfhhkK` (`BIM-TEST pin check`) — HTTP 200, subsequent GET 404.
- Deleted: `projects/REG-001/smartViews/271a811e-5e43-49d9-a8e4-d210a4c14a8e` (`QA-BIM-TEST VIEW`) — HTTP 200.
- Final REST GET: 3 todos (`ISS-001` "Facade panel gap over 18 mm at level 3", `ISS-002` "Rebar inspection overdue on core B", `ISS-003` "Pour schedule drift on level 4"), 0 smart views, no `bimReference` on any seed doc.
- Live UI re-checked after deletion: `/bim/demo` 0 pins, `MODEL READY`; `/project/REG-001` 3 cards, 0 BIM badges. Demo left pristine.
- Only read-only DOM/runtime inspection was performed on app source; no app code, config, or deployment was modified.

---

## Evidence index
`qa-wave-d/screenshots/01-landing.png` … `21-project-after-cleanup.png`; payloads `created-todo-json.json`, `created-view-json.json`, `smartview-capture.json`; scripts `phase1.mjs` … `phase8-cleanup.mjs`.

VERDICT: FAIL
DEFECTS: 2 (1 medium functional, 1 low usability)

---

## Round 2 — re-verification of the fix round (same reviewer, independent)

**Build under test:** `https://issuetrack-v4.web.app`, bundle `index-Bp67uzNc.js` (confirmed in served `index.html`).
**Scope:** original 8-item plan re-run, focused on the two round-1 defects, plus a quick regression pass. **Test hygiene:** all writable artifacts were created in the **REG-002** scratch register (issue on its own pin + `/bim/REG-002?issue=…`), then deleted; REG-001 was touched read-only this round.

### Per-item results (round 2)

| # | Test item | Result | Evidence |
|---|---|---|---|
| 1 | Landing CTA + no login | **PASS** | Hero CTA `◈ OPEN BIM DEMO — NO ACCOUNT NEEDED` still present, class `it-demo-cta-btn`, rect x=863.4 y=256.4 w=315.6 h=35.4, in viewport (header nav `◈ BIM DEMO` also present). Real click → `/bim/demo`, `MODEL READY` in **2916 ms**; 0 password inputs, 0 auth-text hits, 0 `identitytoolkit/securetoken/auth0` resource loads; chip `NO ACCOUNT REQUIRED`. `r2-19-landing-cta.png`, `r2-01-demo-ready.png` |
| 2 | Cold load with Firestore delayed 12 s | **PASS** | Canvas at **742 ms**, `MODEL READY` at **2917 ms**, first Firestore response at **12445 ms** (`beforeData: true`); registers list empty until data lands (expected); no errors. `r2-20-cold-load.png` |
| 3 | Selection → ASSIGN ISSUE (visibility fix) → validation → save | **PASS** | On `/bim/REG-002`: selected `IFCSLAB` localId **5665**, GUID `1$sXzQ8nj6mAikFhdcv6Qd`, chip `SEL #5665`, 56 property rows. **`#btn-assign-issue` rect top 268.8 / bottom 301.8 / left 853 / w 307 at scrollY=0, `inViewport: true`, hit-test returns `BUTTON#btn-assign-issue`** — matches the builder's 268/301 measurement; no scrolling was performed before this assertion. Title `BIM` → `TITLE TOO SHORT — MIN 5 CHARACTERS`, `aria-invalid=true`, `ISSUE NOT SAVED — TITLE TOO SHORT`, form stayed open, REG-002 count unchanged 2→2. Valid save → todo **`fZs6beEc34WQofF9w0nw`** `BIM-R2 pin check`, `in-progress`, `HIGH`, `PEO-002`, `bimReference {modelId sample, localId 5665, guid 1$sXz…Qd, worldPosition x 10.58704 y 8.4709 z 20.32}`. `r2-03-assign-visible.png`, `r2-04-pinned.png` |
| 4 | Pin anchor accuracy + orbit/zoom tracking + reload persistence | **PASS** | Anchor computed from `__bimEngine.projectWorldToNDC` vs `style.left/top` + host rect: Δ **0.000 / 0.000 px**. Orbit (camera 35.96,28.81,41.44 → −0.22,−38.54,23.37) moved the pin 252.19→325.56 px left; wheel zoom moved it to 359.83 px, inside canvas. After reload: 1 pin restored at `left 252.189px / top 250.089px`, Δ 0, selection null (correct). `r2-05b-pin-tracking.png`, `r2-06b-reload.png`, `r2-16-reg2-pristine.png` |
| 5 | Pin click → selection + issue detail | **PASS** | Real click on pin → `selKey sample:5665`, chip `SEL #5665`, `[ SELECTED ITEM ]` IFCSLAB/5665/GUID, `[ PINNED ISSUE ]` with title, `↖ FOCUS`, `HIGH`, `IN PROGRESS`, `→ OPEN IN REGISTER`. `r2-07-pin-click.png` |
| 6 | BIM badge + `?issue=` deep link — **fast and slow-data races** | **PASS (both variants)** | Badge: only the pinned card shows `◈ BIM` → `href=/bim/REG-002?issue=fZs6beEc34WQofF9w0nw` (`title="Pinned in the 3D viewport"`); real click lands on that URL, chip `SEL #5665`, pinned panel, `it-pin it-pin-focus`, `__bimEngine._lastFlyTarget = {10.58704, 8.4709, 20.32}`, camera settled at **17.59 / 14.47 / 27.32** = world + (7,6,7) offset — camera actually flew. Fresh-tab deep link identical. **Slow path** (Firestore held 12 s): ready @3628 ms, first FS @12578 ms, pre-data state has no selection/pin (expected), then after data arrives chip `SEL #5665`, pinned panel, focus class, `flyTarget` set, camera mid-flight 23.14/18.26/31.63 settling to 17.59/14.47/27.32. Round-1 defect **D-1 is fixed**; effect now deps on `issues` and calls `flyToWorldPosition`. `r2-08-project-badge.png`, `r2-09-badge-deep-link.png`, `r2-10-deep-link-fast.png`, `r2-11-deep-link-slow.png` |
| 7 | Regression sanity — selection, ItemsFinder, palette, Smart Views | **PASS** | Selection inspect 56 rows. Finder `Pset_VDC` / `05-Tipo de Elemento` / `Fundacion` → `20 ITEM(S) MATCH`, chip `20 MATCH`. Palette `COLOUR ITEM CRITICAL` → `ITEM COLOURED`, `1 ITEM(S) COLOURED`, 1 colorization. Smart View `QA-R2 VIEW` → `VIEW CAPTURED`, persisted doc `1433ba68-…` with 1 colorization. `r2-13-finder-20.png`, `r2-14-palette.png`, `r2-15-smartview.png` |
| 8 | Cleanup / both registers pristine | **PASS** | Deleted `projects/REG-002/todos/fZs6beEc34WQofF9w0nw` (200, re-GET **404**) and `projects/REG-002/smartViews/1433ba68-85ad-4a58-a034-cc6b4a513551` (200, re-GET **404**). Final GET: **REG-001 = ISS-001/ISS-002/ISS-003, 0 smart views**; **REG-002 = ISS-004/ISS-005, 0 smart views**, no `bimReference` on any seed doc. UI after cleanup: `/bim/REG-002` 0 pins + 0 stored views, `/project/REG-002` 2 cards + 0 badges, `/bim/demo` 0 pins. `r2-16-reg2-pristine.png`, `r2-17-reg2-project-pristine.png`, `r2-18-demo-pristine.png` |

### Defect status

| ID | Round-1 defect | Status |
|---|---|---|
| D-1 | `?issue=` deep link lost the selection when issue data arrived after `MODEL READY` (medium) | **FIXED** — verified in fast, badge-navigation, and 12 s-delayed paths (selection + panel + camera fly). Effect now `[ready, focusIssueId, issues]` with once-per-id guard (`BimPage.jsx:231-245`) |
| D-2 | ASSIGN ISSUE below the fold (low) | **FIXED** — visible at top of right column, top 268.8 / bottom 301.8, hit-testable at scrollY=0 |

**New defects found in round 2: none.** No console errors, no read failures, no regression in selection/finder/palette/smart-view persistence. Harness notes (not app defects): controls below the fold in the tool column (finder/palette/smart-view buttons) still need `scrollIntoView` for CDP clicks — same as round 1; one drag attempt showed no camera change until the pointer sequence was repeated, attributed to the harness, since the repeat moved both camera and pin.

**Round-2 test hygiene:** all artifacts confined to REG-002 and deleted; REG-001 read-only; stale round-1 deep-link tabs (whose todo no longer exists) were closed; local builder dev-server tabs on ports 8741/8733/8128 were left untouched. No app code, config, or deployment modified by the reviewer.

VERDICT: PASS
DEFECTS: 0 open (2 round-1 defects verified fixed; 0 new)
