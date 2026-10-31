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
