# IssueTrack BIM Module — UX Review (Public Demo)

**Target:** https://issuetrack-v4.web.app — `/bim/demo`, `/bim/:id`, register pages
**Reviewer:** WebdevMarvin (UX validator) · 2026-10-31
**Design baseline:** `design/DESIGN.md` + `tokens.css` ("Chokepoint" house style)
**Method:** scripted CDP walkthrough (own tab), 17 screenshots in `orchestration/ux-shots/`, DOM/computed-style probes, timing polls. No app code changed.

---

## Overall verdict: **BLOCK**

The visual system is largely in-house and the happy path (click element → assign → pin → register) does work end-to-end. But two failures break the promises the module ships on:

1. **The deep link `/bim/:id?issue=<id>` is dead** — tested on both `/bim/demo?issue=…` and `/bim/REG-001?issue=…`; after 14 s the viewer reports `MODEL READY` with `NO ITEM SELECTED`, the issue never focuses. A pin whose whole purpose is "jump me to this defect in the model" goes nowhere.
2. **Local UI state intermittently resets under live sync** — the assign-issue form was observed closing ~5 s after opening with no user action (polled at 1 s intervals: open ×5, then closed), and once the selection silently switched to a different element (`SEL #5105` → `SEL #5665`) while a form was open. On a *shared* demo dataset, any concurrent write can wipe an engineer's in-progress draft. Not every run reproduces (one 15 s idle poll survived), which makes it worse: it's a data-loss race, not a deterministic bug you can route around.

Fix those two plus the pin-cluster blindness (#4) and this becomes SHIP-WITH-FIXES.

---

## Findings

### 1. Deep link `?issue=<id>` never focuses the issue — **blocker**
- **Heuristic:** consistency/faithful promises; house rule 12-adjacent (a shipped affordance must work).
- **Evidence:** `09-deeplink.png`, `09b-deeplink-later.png`, `10-deeplink-register.png`. DOM after load: `{hasIssue:false, sel:null, card:false, noSel:true, status:"MODEL READY"}` on `/bim/demo?issue=BUBVUEG8L7DXXHJTFKEU`; same on `/bim/REG-001?issue=…`.
- **Fix:** on model-ready, resolve `?issue=` → select its element, open its `[ PINNED ISSUE ]` card, fly camera/zoom to the pin, and flash the pin (coral pulse). If the id is unknown, show a house-style inline notice: `ISSUE NOT FOUND — OPEN REGISTER INSTEAD` with a link.

### 2. Assign form / selection wiped by live-sync re-render (draft loss) — **blocker**
- **Heuristic:** protection of user work; error/prevention.
- **Evidence:** 1 s poll after opening the form: `true true true true true false false false` (form closed with zero interaction); separate observation of selection jumping to another element while a draft title was typed. The demo is explicitly "saves to the shared demo data", so remote writes are frequent.
- **Fix:** keep selection/form/draft in state that survives Firestore snapshot emissions (don't key the panel on the sync payload / don't remount on every snapshot); persist the draft title to sessionStorage as a belt-and-braces.

### 3. `MODEL READY` overlay collides with the That Open Engine watermark — **major**
- **Heuristic:** legibility; house rule 10 (texture/overlays must not sit behind or across text) + rule 1 (foreign color in chrome).
- **Evidence:** `02-demo-viewer-idle.png`, `03-element-selected.png`, `05-validation-error.png` — bottom-left of canvas: the green TOE logo overprints "MODEL READY — CLICK AN ITEM TO INSPECT IT"; the word "READY" is unreadable in every shot. The saturated green is also the only non-house hue in the chrome.
- **Fix:** move the status pill to the canvas top-left or give it an opaque `--it-panel` chip with hairline; push the watermark to bottom-right at ≤30% opacity, or request a monochrome/muted watermark variant.

### 4. Co-located pins stack on the exact same pixel; only the newest is reachable — **major**
- **Heuristic:** visibility of system status; clutter control.
- **Evidence:** three pins on element #5105 all render at `{x:465,y:643}` (`12-pin-cluster.png`); DOM shows 3 `.it-pin` at identical rects. The right panel shows a **single** `[ PINNED ISSUE ]` card (latest only) — the other two issues are unreachable from the viewer, and the "3 PINNED" chip contradicts what the panel offers.
- **Fix:** deterministic fan-out offset (e.g. 14 px radial spread) or a cluster badge (`3 ▸`) that expands a mini-list; the panel card should become a list when N>1, newest first, each row clickable.

### 5. No focus management: form opens with focus on `<body>`; Escape does nothing — **major**
- **Heuristic:** focus order / keyboard operability; house rule "focus is always visible" presupposes focus *arrives*.
- **Evidence:** after clicking `★ ASSIGN ISSUE`, `document.activeElement` = `BODY.it-body`. Real `Escape` keypress left the form open (`formOpenAfterEsc:true`). Keyboard users must Tab through dozens of property rows to reach the title field.
- **Fix:** autofocus the title input on open; Escape = cancel (equivalent to CANCEL button); return focus to ASSIGN ISSUE on close. Make `.it-pin` a `<button aria-label="…">` (currently a `<span>` with only a `title` tooltip).

### 6. Right panel column overflows horizontally; values clip — **major**
- **Heuristic:** house rule 6 (dense aligned label:value) / 11; legibility.
- **Evidence:** `03`, `05`, `12` — GUID renders as `1$sXzQ8nj6mA…` truncated *behind the vertical scrollbar* with no ellipsis affordance; a horizontal scrollbar appears at the bottom of the panel column (`05-validation-error.png`, `12-pin-cluster.png`); property rows cut mid-word.
- **Fix:** `overflow-wrap`/`text-overflow:ellipsis` + `title` attr on long values, or a 2-line clamp; set the panel to `min-width:0` in its grid track to kill the inner horizontal scrollbar.

### 7. Disabled "◈ 3D VIEWPORT" top-bar button: white text on 55%-opacity coral — **major**
- **Heuristic:** affordance clarity + a11y contrast; house rule 3 (coral = action; a dead control must not wear action colors).
- **Evidence:** computed style `{bg: rgb(240,86,30), color:#FFF, opacity:0.55, disabled:true}` in every BIM-page shot. It reads as "click me" but does nothing, and the label is indistinguishable from the page you're already on.
- **Fix:** on BIM routes replace it with a ghost link `↩ REGISTER VIEW`, or restyle disabled per tokens (sunk bg, muted text). Never show a half-opacity coral CTA.

### 8. Coral budget exceeded on the selection screen — **minor**
- **House rule 3:** coral = primary action, active state, critical, highlight bar only; "more than a few coral elements → remove some."
- **Evidence:** `03-element-selected.png`: solid-coral selected model face (large area), coral `SEL #5105` chip, coral-filled `NO ACCOUNT REQUIRED` chip (marketing copy wearing a state color), coral nav bar, coral `ASSIGN ISSUE` button, coral `FIND MATCHING ITEMS`, faded-coral dead button #7. Well over 5% of surface.
- **Fix:** `NO ACCOUNT REQUIRED` → `it-chip` info variant; selection face highlight is defensible (active state) but then the pin must differ (see #9).

### 9. Pin is coral-on-coral when it matters most — **minor**
- **Evidence:** `06-pin-created.png` — the pin is placed on the element you just selected, whose face is now solid coral; an 18 px coral square glyph on a coral face nearly vanishes. Pin size (18 px) is also small against the white model at default zoom.
- **Fix:** pin fill = `--it-ink` with coral status dot (status is already encoded in the dot), or add a 1 px white halo ring; bump glyph to ~22 px.

### 10. Property-set wall buries the primary action — **minor (workflow friction)**
- **Evidence:** after selecting an element, `★ ASSIGN ISSUE` sits below ~30 repeated rows like `FLOOR:3" LW CONCRETE ON 2" METAL DECK:213316 —` (`03`); a scroll of the panel is mandatory on every single defect log.
- **Fix:** collapse PROPERTY SETS by default (`[ PROPERTY SETS ] 24 ▸`); pin `[ ASSIGN ISSUE ]` directly under `[ SELECTED ITEM ]` header, above the data.

### 11. "N PINNED" chip lags ~5 s after a successful pin — **minor**
- **Evidence:** after `→ PIN ISSUE` succeeded (card `[ PINNED ISSUE ] BUBVUEG8L7DXXHJTFKEU` present), chip still read `1 PINNED`; became `3 PINNED` only after a later reload/poll. Success feedback is also silent — the failure path has an `ISSUE NOT SAVED — TITLE TOO SHORT` banner, success has nothing.
- **Fix:** optimistic local update of the count; mirror the failure banner with `ISSUE SAVED — PINNED ON #5105 · OPEN IN REGISTER →`.

### 12. Dashed borders in empty states — **polish**
- **Evidence:** `[ SELECTED ITEM ]` "NO ITEM SELECTED — CLICK THE MODEL TO PICK ONE" box and the landing "LOADING REGISTERS…" box use dashed outlines; house spec is 1px solid `--it-hairline`/`--it-sunk` wells (rule 2/7).
- **Fix:** swap to `--it-sunk` well + hairline.

### 13. "→ OPEN IN REGISTER" drops you at the register top, not the issue — **polish**
- **Evidence:** `href="/project/REG-001"` with no issue anchor; the issue row is identifiable there (good: `◈ BIM` chip on the row, `11-register-list.png`) but must be visually hunted.
- **Fix:** link `/project/REG-001?issue=<id>` and scroll+highlight the row (this also gives #1's fix a destination parity).

### 14. Off-palette swatches in the colour tool — **polish**
- **Evidence:** palette contains saturated blue `#3D6087`, purple `#6B5B95`, teal `#2F6E6B`. Data-colouring is arguably outside chrome rules, and the black swatch correctly uses ink `#1B1B19` (no pure `#000` anywhere in visible text — verified by computed-color sweep).
- **Fix:** optional — desaturate the purple to house chroma levels.

### 15. 480 px viewport: layout holds, viewer doesn't — **minor (mobile)**
- **Evidence:** `13-mobile-480.png` — no horizontal overflow (`scrollWidth==clientWidth`), but the full nav sidebar stacks *above* the content, pushing the model below the fold; the model is clipped by the canvas (camera not refit); top bar wraps into a cramped 3-line cluster.
- **Fix:** at ≤640 px collapse the sidebar to a top strip or drawer, and reframe the camera to the canvas aspect on resize.

---

## What passed (keep it)

- **Discoverability (#1 of the brief):** landing has both a `◈ BIM DEMO` nav entry and a `[ BIM VIEWER ]` card with `◆ OPEN BIM DEMO — NO ACCOUNT NEEDED` above the fold (`01-landing.png`). Clear, honest label, no dead-space hunt.
- **Loading & degradation:** `LOADING IFC MODEL…` (`14-loading-state.png`); without WebGL the canvas is replaced by `WEBGL UNAVAILABLE — THIS DEVICE / BROWSER CANNOT RUN THE 3D VIEWPORT` + `THE REST OF ISSUETRACK … KEEPS WORKING` (`15-no-webgl.png`). Best-in-review.
- **Validation error state is textbook house recipe** (`05-validation-error.png`): coral input border, `TITLE TOO SHORT — MIN 5 CHARACTERS` in 10px uppercase coral `.it-error`, secondary `ISSUE NOT SAVED` banner, `it-input it-invalid` classes exactly per tokens.css.
- **Chrome conformance:** IBM Plex Mono everywhere (computed-style verified), warm paper + white panels, 1px hairlines, radius 2–3 px, no drop shadows, uppercase bracketed section headers, tabular numerals; register rows encode status as left bar + text chip (rule 8 ✓); viewer-logged issues carry a `◈ BIM` chip (rule 8: not color-alone ✓).
- **Happy path completes:** element pick → assign → pin → card with GUID/local-id → register row, all without sign-in, as promised.

## Flow friction count (landing → logged + pinned issue)

**6 clicks + 2 deliberate scrolls**, one step needing explanation:
1. `OPEN BIM DEMO` → 2. click model element → 3. **scroll** panel past property wall → 4. `ASSIGN ISSUE` → 5. **click** title field (no autofocus) → 6. type → 7. `PIN ISSUE` → plus **scroll** back up to find the result card. The disabled `◈ 3D VIEWPORT` button in the top bar is unexplained everywhere it appears (#7). Target after fixes: 4 clicks, 0 scrolls.

## Screenshot index (`orchestration/ux-shots/`)

| File | Step |
|---|---|
| `01-landing.png` / `01b-landing-bottom.png` | landing + BIM demo entry |
| `02-demo-viewer-idle.png` | viewer idle, MODEL READY |
| `03-element-selected.png` | element selected (coral face, SEL chip) |
| `04-assign-form.png` | assign-issue form open |
| `05-validation-error.png` | title validation error state |
| `06-pin-created.png` / `07-pin-later.png` | pin created; later frame |
| `08-pin-clicked.png` | pin clicked → pinned-issue card |
| `09-deeplink.png` / `09b-deeplink-later.png` | `/bim/demo?issue=` dead link |
| `10-deeplink-register.png` | `/bim/REG-001?issue=` dead link |
| `11-register-list.png` | register with `◈ BIM` issue chip |
| `12-pin-cluster.png` | 3 pins stacked at one pixel |
| `13-mobile-480.png` | 480 px viewport |
| `14-loading-state.png` | LOADING IFC MODEL… |
| `15-no-webgl.png` | WebGL-unavailable fallback |

## Recommended fix order

1. #1 deep link, #2 sync-state wipe (blockers)
2. #4 pin clustering + multi-issue card, #5 focus/Escape, #3 overlay collision, #6 panel overflow, #7 disabled CTA
3. #8–#11 coral budget, pin contrast, property-wall friction, count lag
4. #12–#15 polish

*Test residue note: the shared demo now contains three review pins on slab #5105 (`UX REVIEW CRACK L2`, `UX CLUSTER MARKER A/B`, register REG-001) — left in place deliberately as they document the findings; purge via the register DELETE controls if the demo is reset.*
