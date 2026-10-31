# FINAL AUDIT A — Official Exam Requirements (Exams 1 & 2) vs. Submission

**Auditor:** independent (no internal checklist trusted; requirements extracted from official pages via CDP)
**Date:** 2026-10-31, ~15:40–16:00 GMT-3
**Submission:** https://marvin-dev-c4ca4.web.app
**Source:** /home/marvin/projects/toe-master/app/
**Method:** CDP on the managed Chrome (127.0.0.1:18800), own tabs only. Interactions were real
`Input.dispatchMouseEvent` / `Input.insertText` / key events on the live deployed site (no
`dispatchEvent`, no in-page function calls to trigger features). DOM/state readouts and source
reading used only to *observe* results.

VERDICT: **PASS**

---

## 1. Official requirements (verbatim, as read)

### Exam 1 — "Creating Static Websites Challenge"
Source: https://people.thatopen.com/c/creating-static-websites/sections/110877/lessons/370805

> The challenge for this module is really straightforward! Create a new app page for "people", similar to how we did it with the projects page. Inside the page, create a list of users with the information you want and also create a form to add new users. The design must be different than the cards we did in for each project. Feel free to get inspiration from the web!

Submission mechanics (same page):

> This challenge will be submitted along the one from the next (second) module. So, let's wait until you have this and the second module challenges solved to submit them! The information on how to submit the challenges will be found in the Creating Interactive Websites Challenge page 🙂

### Exam 2 — "Creating Interactive Websites Challenge"
Source: https://people.thatopen.com/c/creating-interactive-websites/sections/122584/lessons/412931

> For this module, there is not only one single challenge, but a couple:
>
> 1. Remember about project cards? Well, find the way to set the project icon as the first two letters of the project's name. They should be uppercased using CSS rules.
> 2. Set a random color to the icon background of each project card (tip: you may create an array of 5 or 6 possible colors and then let the function to randomly select one of them).
> 3. Create a simple input validation in which the app doesn't create a project if the name length is less than 5 characters.
> 4. When creating the project based on the form information, give a default date in case user doesn't specify one.
> 5. Allow the user to update the project information from the details page.
> 6. Let the user create ToDos by using the corresponding button. Store the ToDo information inside the projects data.
> 7. While exporting the project information, make sure the ToDos are also exported.
> 8. Update project information if a project imported from JSON already exists.
> 9. Allow the user to specify a status for each ToDo, both when created and when it needs to be updated. Also, change the background color of the ToDo card based on it's current state.

Submission mechanics (same page):

> Easy! The only thing you need to do is deploy your app to the web and share the link in a dedicated form. [...] Once you have the app deployed, you can fill this form 🙂
> (link target on page: https://thatopen.notion.site/3b1e915dff1e80eb9d0bfdd3276f4298?pvs=105)

Requirement count: **1 (exam 1) + 9 (exam 2) + 2 submission mechanics = 12 checkpoints.**

---

## 2. Item-by-item verification

| # | Official requirement | Verdict | Evidence (CDP assertion / file:line) |
|---|---|---|---|
| E1 | New app page for "people", similar to the projects page | PASS | `https://marvin-dev-c4ca4.web.app/people` renders; nav "▸ PEOPLE" on index → real click navigated to `/people` (href `people.html`); same topbar/sidebar frame as index |
| E2 | List of users with the information you want | PASS | `#people-body tr` = 3 seeded rows (Ricardo Marvin / BIM Lead, Ana Fuentes / Site Architect, Tomas Ivanez / QA Inspector), columns Name/Role/Email/Phone/Issues; `app/people.html:52-62` |
| E3 | Form to add new users | PASS | Typed into `#p-name`/`#p-role`/`#p-email`/`#p-phone` + real click on submit → rows 3→4, status "PERSON ADDED — AUDIT PERSON", `localStorage.issuetrack.v1.people` = 4 entries incl. "Audit Person"; `app/js/store.js:391` (createPerson), `app/js/people-page.js:98` |
| E4 | Design different from project cards | PASS | People page is a `<table class="it-dir">` roster (`app/people.html:51`), 0 project cards / no `#project-grid` on the page; "Rows, not cards" (`app/css/app.css:333`). Project index is a tile/card grid |
| 2.1 | Project icon = first two letters of name, **uppercased by CSS** | PASS | tile `textContent` is `"To"/"De"/"Pi"/"Al"/"Br"/"Ch"` (mixed case from `slice(0,2)`, `app/js/ui.js:40`) while `getComputedStyle(tile).textTransform === "uppercase"` for all 7 cards (`app/tokens.css:127-140`, rule at :138) |
| 2.2 | Random color on icon background (array of 5–6, randomly picked) | PASS | `ICON_COLORS` = 6 entries (`app/js/store.js:26-33`), `pickIconColor()` random index (`store.js:251`), applied at create (`store.js:470-471`). 4 registers created via the form got `#ECEBE6`, `#FAFAF7`, `#FAFAF7`, `#FBE7DD` — all from the palette, varying per creation |
| 2.3 | No project created if name < 5 chars | PASS | Typed `"Abcd"` (4) + real submit → card count stayed 3→3, `#f-name-error` visible "NAME TOO SHORT — MIN 5 CHARACTERS", `#form-status` "REGISTER NOT CREATED — NAME TOO SHORT"; guard at `app/js/store.js:454-458` (MIN_NAME_LENGTH at :16, also enforced on import :646) |
| 2.4 | Default date when user leaves it empty | PASS | Created 4 registers with `#f-date` untouched (empty) → stored dates all `2026-10-31` = today (America/Santiago); `store.js:467` (`String(fields.date||"").trim() || todayISO()`, `todayISO` at :241). Also on update `store.js:494` |
| 2.5 | Update project info from the details page | PASS | Real click "✎ EDIT REGISTER INFO" (`#btn-edit`) → form prefilled with current values → typed new name/site → real click submit → heading changed to "Alpha Yard North", status "REGISTER UPDATED — Alpha Yard North", localStorage `REG-004.name` changed, project count unchanged (7); `app/js/project-page.js:76,87,177`, `store.js:480` |
| 2.6 | ToDos created via the button, stored **inside** project data | PASS | Real click "+ NEW ISSUE" (`#btn-new-issue`) opened form; filled title/desc + status → `project.todos` in localStorage = 1 item `ISS-001` with all fields; `data = {people, projects:[{..., todos:[...]}]}` (`app/js/store.js:547` addTodo, nested push at :564) |
| 2.7 | Export includes ToDos | PASS | Real click "↧ EXPORT JSON" → status "EXPORTED 7 REGISTERS · 8 ISSUES · 5636 BYTES"; `#export-preview` JSON parsed: every project has `todos`, `REG-004.todos[0].status = "done"`; browser download event `Browser.downloadWillBegin` + `completed` for `issuetrack-2026-10-31.json` (5761 B). `store.js:605-617` exports `projects` wholesale (todos nested) |
| 2.8 | Import updates a project that already exists | PASS | Pasted `{"projects":[{"id":"REG-004","name":"Imported Rename",...}]}` into `#import-text`, real click "↥ IMPORT FROM TEXT" → status "IMPORT COMPLETE — 0 ADDED · 1 UPDATED", project count stayed 7, exactly one `REG-004` with new name/site, card re-rendered "T-ALP / Imported Rename"; `app/js/store.js:620,655-683` (existing-id branch), `app/js/index-page.js:207+` |
| 2.9 | ToDo status at creation **and** on update; card background follows state | PASS | Status picked in create form (native select, real keys) → stored `"blocked"`, card `data-status="blocked"`, computed background `rgb(251,231,221)`. Then changed status on the card via real select interaction → `"done"`, background became `rgb(228,238,226)`, status line "ISSUE ISS-001 — STATUS NOW DONE"; `store.js:558` (create), `:579` (update), `app/css/app.css:278-296` (4 state backgrounds) |
| S1 | Deployed to web, URL reachable | PASS | `GET /` → 200 (5845 B), `GET /project?id=REG-001` → 200, `GET /people` → 200; no console errors/exceptions on any of the three routes on load |
| S2 | Exams 1+2 submitted together via the dedicated form | PASS (attested) | Exam-1 page states both are submitted together and the exam-2 page links the Notion form (https://thatopen.notion.site/3b1e915dff1e80eb9d0bfdd3276f4298?pvs=105). The submission itself is an external act; per the team it was filed with both URLs. Not independently observable from the deployed app — recorded as teammate attestation, not as a verified artifact |

Verified: **12/12 checkpoints pass** (11 independently reproduced end-to-end in the browser, 1 attested: the form submission act).

---

## 3. Discrepancies: official text vs. internal checklist

1. **Persistence is not an exam requirement.** Official exam 2 only requires JSON export/import. `EXAM-SPEC.md` labels localStorage "a bonus". The app makes localStorage the *primary* store (auto-save on every mutation). This is a superset, not a conflict, but it changes the reviewer's first impression: a fresh browser shows seeded demo data rather than an empty app. No action needed; noted so nobody treats "data survives reload" as a graded item.
2. **Vocabulary remap (projects → registers, ToDos → issues, people → assignees).** Internal and approved, but the grader sees "REGISTER" / "ISSUE" everywhere. The data model keeps the exam's vocabulary (`projects`, `todos`, `people` as JSON keys in the export), which is what a reviewer inspecting the payload will look for. Risk: low, mitigated by the export keys.
3. **Requirement 2.1 says "project icon"; the app also uses the same 2-letter tile on the details header** (`app/js/project-page.js:65`). Extra, harmless.
4. **Requirement 2.6 says "the corresponding button"; the app's button is topbar "+ NEW ISSUE", which reveals the form** rather than opening a modal. Behaviorally identical (click button → fill form → issue is created and stored nested). Not a deviation.
5. **Palette distinctness (quality, not compliance).** Requirement 2.2 only asks for a random color, and 6 palette colors are used, but 4 of the 6 are near-white (#FAFAF7, #F1F0EC, #ECEBE6, #F6E7D2) — two registers created back-to-back can look identical to a human eye even though the stored hex differs. If a reviewer glances at the grid, the "random color" effect is weak. **Recommendation (non-blocking):** widen the palette spread (e.g. one coral, one amber, one moss, one slate, one sand, one navy tint) while keeping the house style.
6. **Internal checklist has no item the official text lacks.** Every official bullet maps 1:1; the internal list adds only delivery mechanics (deploy + form) which the official page also requires. No missing or invented requirement found.

Minor observation: `RESET DEMO DATA` uses a native `confirm()` — that blocked the CDP renderer until the dialog was accepted. Not an exam issue; noted for future automation.

---

## 4. Housekeeping

- Test registers (4), one test issue and one test person were created during the audit **on the live site's localStorage only** (no backend, no shared state).
- `RESET DEMO DATA` was executed and confirmed: back to 3 registers / 3 people / seed issues, matching the shipped demo state.
- All audit tabs were closed; no servers or background processes started.

---

**VERDICT: PASS — 12 of 12 official checkpoints verified (11 reproduced live via CDP, 1 submission act attested).**
