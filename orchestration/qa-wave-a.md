VERDICT: PASS

# QA Gate — Wave A (Exams 1+2)

**Reviewer:** qa-marvin  
**Date:** 2026-10-31  
**Artifact:** `/home/marvin/projects/toe-master/app/`  
**Spec:** `/home/marvin/projects/toe-master/EXAM-SPEC.md` — Wave A (Exam 1: 4 bullets, Exam 2: 9 items)  
**Design system:** `/home/marvin/projects/toe-master/design/DESIGN.md` + `design/tokens.css`

## Method / evidence

- Line-by-line review of all 3 HTML pages, 5 JS files, `app.css`, and `tokens.css`.
- Static: `node --check` on all 5 JS files; HTML script/stylesheet reference check; `diff -u design/tokens.css app/tokens.css`; search for frameworks/build artifacts.
- Store tests: 18/18 assertions (creation validation, date default, nesting, export, import update/idempotency, people).
- Browser tests: headless Chromium via CDP against a real `python3 -m http.server 8611 --bind 127.0.0.1`, fresh `localStorage`, 43/43 assertions; no uncaught JS exceptions or console errors across the three pages.
- Run-state note: at review start nothing was listening on `127.0.0.1:8611` (`curl` returned `000`). I started a fresh static server in `app/` and verified all pages/assets return `200`. This is a deployment/run-state note, not an app defect — the host must actually serve `app/`.

## Checklist — 13 items

| # | Checklist item | Verdict | Evidence and why it satisfies the requirement |
|---|---|---|---|
| 1 | **Exam 1.1** New people page, similar in spirit to the projects page | **PASS** | `app/people.html:1-97` is a full page using the same topbar/sidebar/main shell, and `app/index.html:24-25` + `app/project.html:24-25` link to it. Browser loaded `people.html` and rendered its stats/form/directory. |
| 2 | **Exam 1.2** List of users with chosen info fields | **PASS** | `app/people.html:49-59` defines a `<table class="it-dir">` with Name / Role / Email / Phone / Issues; `app/js/people-page.js:47-74` renders one `<tr>` per person and computes the issue count via `store.personIssueCount`. Browser saw 3 seeded rows with all five columns. |
| 3 | **Exam 1.3** Form to add new users | **PASS** | `app/people.html:63-95` contains the form (`p-name`, `p-role`, `p-email`, `p-phone`); `app/js/people-page.js:85-124` validates and calls `store.createPerson`; `app/js/store.js:324-341` appends the person and saves. Browser test added "QA Person": 3 → 4 rows and confirmation shown. |
| 4 | **Exam 1.4** People design MUST differ from project cards | **PASS** | The directory is a table (`app/people.html:49`, CSS `app/css/app.css:335-380`), with flat outline avatars (`.it-avatar`, `app/css/app.css:366-378`) and no random fills. Project cards are `.it-grid` + `.it-card` + random `.it-tile` (`app/index.html:49`, `app/index.html` card markup in `app/js/index-page.js:57-80`, tile CSS `app/tokens.css:128-143`). Browser on people page: 0 `.it-project-card`, 0 `.it-tile`, 3 `.it-avatar` with `background: rgb(255,255,255)` — visually and structurally different. |
| 5 | **Exam 2.1** Project icon = first two letters, uppercased via CSS | **PASS** | `app/js/ui.js:39-40` returns the raw first two characters (`slice(0, 2)`, deliberately no `toUpperCase`); `app/js/index-page.js:71-73` puts that raw value in `.it-tile`; `app/tokens.css:138` applies `text-transform: uppercase`. Browser: DOM text was `"To"`, `"De"`, `"Pi"`, while computed `text-transform` was `"uppercase"` — uppercasing is CSS, not JS. |
| 6 | **Exam 2.2** Random icon background from an array of 5–6 colors | **PASS** | `app/js/store.js:25-32` defines exactly 6 palette colors; `app/js/store.js:245-247` picks one with `Math.random`; `app/js/store.js:403` assigns it on project creation; `app/js/index-page.js:72` applies it as the tile background. Browser created a card whose color (`#FBE7DD`) was in `IssueTrackStore.ICON_COLORS`; seeded cards also came from the palette. |
| 7 | **Exam 2.3** Refuse to create project if name < 5 chars + feedback | **PASS** | `app/js/index-page.js:124-127` trims the name, checks `store.MIN_NAME_LENGTH`, shows the inline error, sets the crit status banner, focuses, and returns before creation. `app/js/store.js:389-392` independently rejects names < 5. Browser test with `"abcd"`: project count 3 → 3, error text `"NAME TOO SHORT — MIN 5 CHARACTERS"`, input got `it-invalid` + `aria-invalid="true"`, banner `"REGISTER NOT CREATED — NAME TOO SHORT"`. |
| 8 | **Exam 2.4** Default date applied on create only when the user leaves it empty | **PASS** | `app/js/store.js:400` uses `String(fields.date || "").trim() || todayISO()`, so only an empty/blank value falls back. Browser: empty date created `2026-10-31` (also stored in `localStorage`); explicit `2026-01-02` was preserved. |
| 9 | **Exam 2.5** Update project info from the details page | **PASS** | `app/project.html:39-78` provides the edit form; `app/js/project-page.js:177-208` submits it to `store.updateProject`; `app/js/store.js:413-431` applies name/code/site/description/date/lead and saves. Browser: clicked edit, changed name + site, submitted; detail title and `localStorage` both showed the new values. |
| 10 | **Exam 2.6** Create ToDos via a button, stored INSIDE the project object | **PASS** | `app/project.html:16` is the `+ NEW ISSUE` button; `:83-124` is the hidden issue form; `app/js/project-page.js:254-270` calls `store.addTodo`; `app/js/store.js:480-498` pushes the new object into `project.todos` (the same project object held in `data.projects`). Browser: `project.html?id=REG-001` went 4 → 5 issues, and `localStorage` showed the new todo inside `projects[0].todos`; there is no top-level todo collection in the export. |
| 11 | **Exam 2.7** JSON export includes nested ToDos | **PASS** | `app/js/store.js:538-549` exports `projects: clone(data.projects)`; each project object already owns `todos`, so they are nested in the output. `app/js/index-page.js:179-203` downloads the file and fills `#export-preview`. Browser: export preview parsed successfully and contained 7 nested todos across the seeded projects. |
| 12 | **Exam 2.8** Import JSON with an existing project id UPDATES, no duplicate | **PASS** | `app/js/store.js:553-600` normalizes incoming projects, looks up `getProject(normalized.id)`, and when found merges by id (`:572-596`) instead of pushing; new ids are appended at `:599`. Browser imported an export with a renamed `REG-001`, a changed todo, and an added todo: project count stayed 4 → 4, name/todos updated, status banner read `0 ADDED · 4 UPDATED`. Re-importing the same payload was idempotent (no duplicate project/todo). **Edge-case caveats are defect #1 below; the core requirement passes.** |
| 13 | **Exam 2.9** ToDo status settable at creation AND updatable; card background reflects status | **PASS** | `app/project.html:97-98` provides the status select at creation; `app/js/store.js:491` stores the valid chosen status (fallback `open`); `app/js/project-page.js:280-291` + `app/js/store.js:512` update it later. `app/css/app.css:278-296` maps `data-status` to four distinct backgrounds/left bars. Browser: created a `blocked` issue → card background `rgb(251, 231, 221)` + `BLOCKED` chip; changed it to `done` → background `rgb(228, 238, 226)` + `DONE` chip. |

## Technical constraints / static checks

| Constraint | Verdict | Evidence |
|---|---|---|
| Plain HTML/CSS/JS only; no framework | **PASS** | Only local `tokens.css`, `css/app.css`, and `js/*.js` are referenced (`app/index.html:126-128`, `app/project.html:128-130`, `app/people.html:99-101`). No package/framework imports; no external script URLs. |
| No build step, no backend | **PASS** | No `package.json`/`node_modules`/bundler in `app/`; all pages work from `python3 -m http.server 8611` (200). |
| `tokens.css` used, not a divergent style | **PASS** | `diff -u design/tokens.css app/tokens.css` is empty (byte-identical). `app/css/app.css` contains 130 `var(--it-*)` references and the pages use `.it-*` components. Minor scale/palette deviations are listed as defect #6. |
| Data in memory + localStorage bonus | **PASS** | `app/js/store.js:16` defines `issuetrack.v1`; `load()`/`save()` at `:194-222` persist every mutation. Browser confirmed project/todo/person data survived reloads. Export/import JSON is also implemented as required. |
| Three pages / simple routing | **PASS** | `index.html` (projects), `project.html?id=...` (details), `people.html` (directory). `project.html` uses `URLSearchParams` at `app/js/project-page.js:9-11`. |
| Static syntax | **PASS** | `node --check` passed on all 5 files: `store.js`, `ui.js`, `index-page.js`, `project-page.js`, `people-page.js`. |
| HTML references exist / pages serve | **PASS** | Every `src`/`href` target exists on disk; `index.html`, `project.html`, `people.html`, `tokens.css`, `css/app.css`, and `js/*.js` returned 200 from the local server. No browser console errors/exceptions. |
| Design-system adherence | **PASS (minor deviations)** | Mono-first type, warm paper/ink/coral palette, hairline panels, uppercase labels, bracketed section headers, 2–3px radii, status chips + left bars, no drop-shadow hierarchy. Deviations: 22px page titles vs DESIGN.md 28–32px Display, and one non-token sand color in the JS palette (defect #6). |

## Concrete defects (non-blocking)

**Blocking defects: 0.** All 13 checklist items are PASS. The items below are robustness/UX/style issues; #1 and #2 should be fixed before accepting untrusted JSON, and #3–#5 before final polish.

1. **Import merge is destructive for partial payloads and never reconciles deleted todos (medium; Exam 2.8 edge case).**  
   `app/js/store.js:274` fills a missing `color` with a fresh random color; `app/js/store.js:591-596` unconditionally assigns `site`, `description`, `leadId`, and `status`; `app/js/store.js:572-587` only upserts todos by id and never removes todos absent from the import. Verified: importing `{projects:[{id:"REG-001",name:"Partial Rename"}]}` changed `site` to `""`, `description` to `""`, `leadId` to `null`, and color from `#FBE7DD` to `#F1F0EC`, while keeping 3 todos; importing an export where `REG-001.todos` was `[]` left the existing 3 todos in place. **Fix:** merge only keys present in the incoming object; preserve `color`/`leadId`/`site`/`description`/`status` when absent; for full-snapshot imports, replace or reconcile `project.todos` (delete ids missing from the payload) or add an explicit `mode:"merge"|"replace"` option. Keep the existing update-by-id/no-duplicate behavior.

2. **Import bypasses the 2.3 creation rule and trusts raw color values (medium/low; consistency + injection surface).**  
   `app/js/store.js:265-290` neither trims nor validates `name`/`color`; `app/js/store.js:481-515` pushes or updates imported projects without the `MIN_NAME_LENGTH` check. Verified: `{projects:[{id:"REG-BAD",name:"ab"}]}` created a project with a 2-character name. `color` is interpolated into a style attribute at `app/js/index-page.js:72` and `app/js/project-page.js:65`; `esc()` prevents quote breakout but does not validate the CSS value. **Fix:** trim imported fields; skip/reject imported projects with `name.length < MIN_NAME_LENGTH` (and report the count); accept `color` only if it is in `ICON_COLORS` or matches a strict hex-color regex, otherwise use `pickIconColor()`.

3. **Edit success message is rendered inside the form that is immediately hidden (low).**  
   `app/project.html:77` places `#edit-status` inside `#edit-form` (`:40`); `app/js/project-page.js:203` sets `editForm.hidden = true`, then `:206` sets the success status. The user never sees `"REGISTER UPDATED"`. **Fix:** move `#edit-status` outside the form (page-level banner) or show it in a container that remains visible; do not hide the container holding the message.

4. **Generated IDs have inconsistent zero-padding (low).**  
   `app/js/store.js:230-232` pads only to 2 digits; `app/js/store.js:253-263` uses that for every new id. Verified new project `REG-04` and new todo `ISS-04` alongside seeded `REG-001`/`ISS-001`. No collision was observed, but the id format is inconsistent in the UI and export. **Fix:** pad to 3 digits or derive the width from existing ids; use the same width for projects, todos, and people.

5. **"EXPORT PREVIEW" label is a dead control (low).**  
   `app/index.html:121-122` uses `<label for="export-preview">` pointing at a `<pre>`; a `<pre>` is not a labelable element, so clicking the label does nothing. The preview only becomes visible after clicking Export (`app/js/index-page.js:193`). **Fix:** use `<details><summary>▸ EXPORT PREVIEW</summary>…</details>` or a `<button>` that toggles `hidden`; reserve `<label for>` for actual form controls (the import-textarea label is fine).

6. **Minor design-system deviations (low; style only).**  
   `app/css/app.css:33-34` and `:216-218` set page/detail titles to `22px`, while `design/DESIGN.md` defines the Display role as `28–32px` for page titles. `app/js/store.js:31` adds `#E9E6DC` ("sand") to the six icon colors, but that hex is not a token in `design/tokens.css`. **Fix:** use `--it-fs-display` (30px) or a 28–32px value for page titles; add an `--it-sand` token to `tokens.css` (then reference it) or replace the sixth color with an existing token. All other styling follows the token vocabulary.

VERDICT: PASS — 0 blocking defects; 6 non-blocking defects.
