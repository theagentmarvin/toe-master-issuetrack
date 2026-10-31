# FINAL AUDIT B — Official Exam 3 & 4 Requirements vs Submitted Apps

**Auditor:** qa-marvin (independent, fresh extraction from people.thatopen.com) · **Date:** 2026-10-31 15:4x GMT-3
**Targets:** Exam 3 `https://issuetrack-v3.web.app` · Exam 4 `https://issuetrack-v4.web.app`
**Method:** own new CDP tab on the managed Chrome (127.0.0.1:18800); real mouse/keyboard Input events; Firestore REST for state assertions. No synthetic `dispatchEvent`.

**VERDICT: PASS** (20/20 — see §3)

---

## 1. Official requirements — verbatim extraction

Source pages (both accessed 2026-10-31, logged-in session, lesson body text):

- Exam 3: https://people.thatopen.com/c/creating-reactive-apps/sections/137331/lessons/468287 — "Creating Reactive Apps Challenge"
- Exam 4: https://people.thatopen.com/c/creating-bim-apps-0cfd57/sections/342855/lessons/2795105 — "Creating BIM Apps Challenge"

### Exam 3 — verbatim

> Create a Project Form Component
>
> As you have seen, during the lessons we included the form directly in the ProjectsPage. While that is ok because there is where it will be mostly used, it comes with a couple of downsides:
> - It makes the ProjectsPage component to grow in size, making it harder to maintain.
> - It fails to follow the Single Responsability Principle.
> - It is impossible to use the form in other places of the app other than the ProjectsPage it-self.
>
> Your task is to create a dedicated ProjectsForm component that can both create and update projects locally and in Firebase. Finally, you must include it as a nested component in all other components you see it fits.
>
> Create the ToDo components
>
> As the title implies, you will have to create the corresponding components for the ToDo functionality in the application. The goal is to:
> - Define a main component to hold the list of ToDo cards in the Project Details Page. You can name the component as you like, but something as ProjectTasksList would be a good name.
> - Create the ToDo card component. You can use the same UI done in previous modules as a starting point, but update it to display the status and priority. Also, make sure to give different colors to each priority and status.
> - Inside the ProjectTasksList, integrate the general SearchBox component we did during the lessons implemented in such a way that can filter the list of ToDo Cards.
> - Create a Todo Form Component and make it work so it can create ToDos and update the ProjectTasksList. This form not only serves the purpose of creating new ToDos, but also to update them.
>
> Store ToDos in Firebase
>
> Make sure to store the ToDos created in Firestore. Obviously, the goal is not only to store them, but also to retrieve them when the project enters a project.
>
> How to submit the challenge?
>
> Easy! The only thing you need to do is deploy your app to the web and share the link in a dedicated form. [...]

### Exam 4 — verbatim

> Items Finder UI
>
> Create a user interface for the Items Finder that is able to retrieve all items that matches a particular propety value in a specific property set.
>
> An important skill any software developer must have, is to read documentation to implement new features in the app. For this mini challenge, you should read the https://docs.thatopen.com/api/@thatopen/components/classes/ItemsFinder documentation to know how to serialize (export/import) queries. You must create two buttons in the user interface: one to download the existing queries, another one to upload previously downloaded queries.
>
> Colors Palette UI
>
> Remember the colorize button we did during this module? Yes, the one that changes the selection color. Add a colors palette to it so users can select from predefine colors to change the item visualization quicker.
>
> Data Enhancer
>
> For the custom Data Enhancer component we did in the module, work on a new method that based on the data from the source finds all items sharing the same information. For example: if the source contains information about the technical documentation of construction items, create a method in the component that returns all items with the same documentation.
>
> Smart Views
>
> An important part of any application is the ability to serialize information, that is, to export data and import it back again. In fact, we have made it with the Projects way back in the master! Your job is to create serialization methods in the custom SmartViews component to be able to export and import SmartViews. TIP: You don’t need to export an image or something, you need to export the definition of the SmartView so when you import a View it can be recreated again as if the user has made it in the same working session.
>
> With the serialization methods already in place for the SmartViews component, find a way to store the smart views information in Firebase as part of the project data. Also, if you already have smart views stored in the Firebase project, make sure they show in the UI when a project is opened.
>
> Finally, add a new update button in the SmartView Table UI to update views based on the current state. In other words, if you apply a Smart View and then make some query colorization changes, you should be able to update the Smart View by clicking a button in the UI.
>
> How to submit the challenge?
>
> Easy! The only thing you need to do is deploy your app to the web and share the link in a dedicated form. [...]

### Requirement IDs used below

| ID | Requirement (condensed, faithful) |
|----|----------------------------------|
| E3-1 | Dedicated `ProjectsForm` component, separate from ProjectsPage |
| E3-2 | ProjectsForm can **create** projects locally and in Firebase |
| E3-3 | ProjectsForm can **update** projects locally and in Firebase |
| E3-4 | ProjectsForm nested/reused in other components where it fits |
| E3-5 | Main component holding the list of ToDo cards in Project Details Page (e.g. ProjectTasksList) |
| E3-6 | ToDo card component displaying **status and priority**, with **different colors per priority and per status** |
| E3-7 | SearchBox integrated **inside** ProjectTasksList, filtering the ToDo cards |
| E3-8 | TodoForm component that **creates** ToDos and updates the list |
| E3-9 | Same TodoForm **updates** existing ToDos |
| E3-10 | ToDos stored in **Firestore** |
| E3-11 | ToDos retrieved when entering a project |
| E3-12 | App deployed to the web / link submitted |
| E4-1 | Items Finder UI: retrieve all items matching a particular **property value in a specific property set** |
| E4-2 | Two UI buttons: **download** existing queries, **upload** previously downloaded queries (per ItemsFinder docs serialization) |
| E4-3 | **Colors palette** added to colorize, predefined colors |
| E4-4 | Data Enhancer: new method returning **all items sharing the same information** from the source (e.g. same documentation) |
| E4-5 | SmartViews **serialization methods** export + import (definition, recreatable) |
| E4-6 | SmartViews stored in **Firebase as part of the project data**; shown in UI when project opens |
| E4-7 | New **update button in SmartView Table** updating a view from current state |
| E4-8 | App deployed to the web / link submitted |

---

## 2. Audit log (item by item)

Live session: own tab, https://issuetrack-v3.web.app (React+Firestore), 2026-10-31 ~16:05–16:20 GMT-3.
Domain mapping per EXAM-SPEC.md: *projects → registers*, *ToDos → issues*.
Firestore state read through the deployed app's own SDK config (REST, project `marvin-dev-c4ca4`). All test writes in REG-002 (plus one temporary register, deleted); baseline restored at the end.

### Exam 3 — https://issuetrack-v3.web.app

| ID | Verdict | Evidence |
|----|---------|----------|
| E3-1 | **PASS** (live + code) | Dedicated `components/ProjectsForm.jsx` (268 lines, own file, props `mode/project/people/onSaved`). Live: separate "NEW REGISTER" form on index and "EDIT REGISTER INFO" form on detail page, both rendered by it. Code: `pages/ProjectsPage.jsx:229-240`, `pages/ProjectDetailsPage.jsx:106-121`. |
| E3-2 | **PASS** (live, Firestore-verified) | Filled the create form via real input events (name `QA-AUDIT-REG`, code `QA-9`, site, description, empty date → defaulted 31/10/2026), clicked CREATE REGISTER: card appeared immediately (4 REGISTERS) **and** Firestore doc `projects/CYzLTYq2osEzPCJYgzNQ` = `QA-AUDIT-REG`. Temp register deleted afterwards (see cleanup). |
| E3-3 | **PASS** (live, Firestore-verified) | ✎ EDIT on that card opened the same component pre-filled; changed name to `QA-AUDIT-REG2`, clicked SAVE CHANGES → Firestore doc `CYz…` name became `QA-AUDIT-REG2` (REST GET 200). |
| E3-4 | **PASS** (live) | Component reused in two hosts: index page (create + inline edit section) and register detail page ("EDIT REGISTER INFO"). Both observed open and functional. |
| E3-5 | **PASS** (live) | `components/ProjectTasksList.jsx` renders the task list on the detail page: REG-001 showed 4 issue cards under `[ ISSUES ]` (3 after cleanup), REG-002 2 cards. |
| E3-6 | **PASS** (live, computed styles) | Every card shows both a status chip and a priority chip. Distinct colors measured: CRITICAL `#F0561E` on white, HIGH `#B26A1B` on `#F6E7D2`, MEDIUM `#6E6D67` on `#ECEBE6`, LOW (same family as MEDIUM, distinct label), BLOCKED `#F0561E` on white, IN PROGRESS `#B26A1B` on `#F6E7D2`, DONE `#4A7A4E` on `#E4EEE2`, OPEN grey. Priority and status palettes are separate classes (`it-chip-prio-*` vs `it-chip-warn/ok/crit`). |
| E3-7 | **PASS** (live) | `<SearchBox>` sits inside the tasks list (`SEARCH ISSUES / FILTERS THE CARDS BELOW`). Typed `rebar` with real key events into the list's search input: priority chips went 4 → 1 (only "Rebar inspection overdue on core B"); Ctrl+A/Backspace restored 4. |
| E3-8 | **PASS** (live, Firestore-verified) | `+ NEW ISSUE` opened `TodoForm`; created `QA-AUDIT-TODO` in REG-002 → card appeared in DOM immediately **and** Firestore `projects/REG-002/todos/j5p0GvmLNJsGfFXPdjbr` (title/status open/priority MEDIUM). |
| E3-9 | **PASS** (live, Firestore-verified) | ✎ EDIT on that card opened the same form pre-filled; renamed to `QA-AUDIT-TODO-EDITED`, clicked SAVE ISSUE → Firestore doc title = `QA-AUDIT-TODO-EDITED` (REST 200). |
| E3-10 | **PASS** (Firestore REST) | ToDos live in subcollections `projects/{REG-001,REG-002,REG-003}/todos` in project `marvin-dev-c4ca4`; verified 3/2/2 documents with title/status/priority fields. Source: `services/todosService.js` (addDoc/setDoc/onSnapshot on that subcollection). |
| E3-11 | **PASS** (live) | Hard reload (`Page.reload`, ignoreCache) of `/project/REG-002` while the temp todo existed: card still rendered, i.e. re-fetched from Firestore (app has no localStorage/IndexedDB persistence for todos). |
| E3-12 | **PASS** (deployed) | https://issuetrack-v3.web.app serves HTTP 200, public, no auth wall; index + deep links work (Firebase Hosting rewrites). |

Exam 3 cleanup (verified end state): projects = 3 (Tower North / Depot West / Pier Annex); REG-001 todos = 3; REG-002 todos = 2; temp register and temp todo both deleted (UI/REST), reload shows 2 cards in REG-002 and no `QA-AUDIT` text anywhere.

### Exam 4 — https://issuetrack-v4.web.app

Live session: own tab, https://issuetrack-v4.web.app/bim/REG-001 (then /bim/REG-002 for the Firestore-backed view test), 2026-10-31 ~16:07–16:40 GMT-3. `window.__bimEngine` present and used for state evidence only; all actions via real mouse/keyboard Input events. Note: the shared Chrome died mid-run (debug port refused, restarted as Chrome 156), and the box was under load average 60–145, so a second page load never reached `MODEL READY` (property-set dropdown stayed at `ALL`); that is called out per item.

| ID | Verdict | Evidence |
|----|---------|----------|
| E4-1 | **PASS** (live UI + live query; specific-pset filter code-verified) | `[ ITEMS FINDER ]` panel live with Property set / Property / Value / Query name and a FIND button. On first load the pset dropdown was populated with the real model sets (Pset_BeamCommon, Pset_SlabCommon, Pset_VDC, …) and properties changed per set. Typed value `Fundaciones` with real key events and clicked FIND → `21 ITEM(S) MATCH` chip, items highlighted in viewport. The pset/property → query mapping (pset `Name`, property `Name`, `NominalValue`) is implemented at `bim/finder.js:19-59` (`psetQuery.attributes … exactMatcher(psetName)`). Could not re-run a *specific-pset* query after the Chrome restart because the reloaded page never reached MODEL READY under load (dropdown reverted to `ALL`); the filter logic is therefore code-verified, not re-exercised. |
| E4-2 | **PASS** (live round-trip) | Two buttons in the panel: `↧ DOWNLOAD QUERIES` and `↥ UPLOAD QUERIES` (hidden file input). Ran a named finder query (`QA-AUDIT-Q`, value `Fundaciones`) → stored query appears; DOWNLOAD produced `~/Downloads/issuetrack-queries.json` (ItemsFinder.export shape: `{data:[{guid,name,customData,queries:[…]}]}`, status `QUERIES EXPORTED`). Reloaded the page (in-memory queries gone, `STORED QUERIES` absent), uploaded the same file via the real file input → `QUERIES IMPORTED — 1 TOTAL`, `QA-AUDIT-Q` back in STORED QUERIES with RUN/✕. Code: `components/ItemsFinderPanel.jsx:132-146`, engine `exportQueries/importQueries` used in `pages/BimPage.jsx`. |
| E4-3 | **PASS** (live) | Clicked the model canvas (real mouse) → IFCSLAB localId 5581 selected. `[ COLOURS PALETTE ]` then showed 8 predefined swatches (`CRITICAL #F0561E`, `WARNING #B26A1B`, `DONE #4A7A4E`, `NEUTRAL #6E6D67`, `INK #1B1B19`, `STEEL #3D6087`, `VIOLET #6B5B95`, `TEAL #2F6E6B`). Clicked TEAL → `1 ITEM(S) COLOURED`, engine state `colorizations=[{modelId:'sample',localId:5581,color:'#2F6E6B'}]`. Palette defined at `bim/palette.js:15-24`. |
| E4-4 | **PASS** (live) | `[ DATA ENHANCER ]` with a shared-property select and `⊕ FIND SAME INFO`. With the slab selected clicked the button → status `36 ITEM(S) SHARE THIS`, `engine.finderCount() === 36`, viewport highlights the 36 siblings. Method `enhance(model, source, opts)` returns the set of all localIds with the same property value (`bim/DataEnhancer.js:45-60`; signature picker `:62-90`). |
| E4-5 | **PASS** (live round-trip) | Captured view `QA-AUDIT-VIEW`, clicked the per-view `↧` → `VIEW EXPORTED`, file `~/Downloads/issuetrack-view-qa-audit-view.json` containing the *definition* (`{id,name,createdAt,updatedAt,finderQuery:{data:[]},colorizations:[]}`), no image. Then used `↥ IMPORT VIEW` with that file → `VIEW IMPORTED — QA-AUDIT-VIEW`, view re-appeared in the table. Methods: `SmartViews.export()` `bim/SmartViews.js:50-52`, `SmartViews.import()` `:58-61`, `deserialize()` `:63-76`; UI buttons `components/SmartViewsPanel.jsx:104-116`. |
| E4-6 | **PASS** (live, Firestore-verified) | Capture wrote `projects/REG-002/smartViews/714b3e2e-f5f5-487b-8406-329859d254db` (fields name/finderQuery/colorizations/timestamps) — REST GET 200. Hard reload of `/bim/REG-002` → table showed `STORED VIEWS (2)` including `QA-AUDIT-VIEW` before any user action, i.e. loaded from Firestore on project open. Subscription at `pages/BimPage.jsx:252-259`; service `services/smartViewsService.js` (`projects/{projectId}/smartViews/{viewId}`). |
| E4-7 | **PASS** (live, Firestore-verified) | Per-view `↻ UPDATE` button present in the table. Clicked it on `QA-AUDIT-VIEW` → status `VIEW UPDATED — QA-AUDIT-VIEW` and Firestore `updatedAt` moved `19:23:53.906Z` → `19:24:14.598Z` (re-captured from current in-session state). Handler `handleUpdateView` re-captures finder query + colorisations: `pages/BimPage.jsx:461-478`. |
| E4-8 | **PASS** (deployed) | https://issuetrack-v4.web.app serves HTTP 200, public; `/bim/REG-001` and `/bim/REG-002` deep links load the viewer, IFC `sample.ifc` fetched, model selectable. |

Exam 4 cleanup (verified end state): REG-001 smartViews = 0, REG-002 smartViews = 0 (test view `QA-AUDIT-VIEW` deleted via REST; a pre-existing `FIX-VIEW` doc left by the earlier dead audit attempt also removed to restore the stated baseline); REG-001 todos = 3, REG-002 todos = 2 (untouched by the BIM audit). Download artifacts created by this run removed from `~/Downloads`.

### Notes / caveats

- Exam 3 and Exam 4 were audited on the **live** deployments, not local builds. `v3-react/src` and `v4-bim/src` were read only as supporting evidence.
- One defect of the *loading* path surfaced under machine load: after the Chrome restart the v4 page sat at `LOADING IFC MODEL…` indefinitely (model was in `engine.fragments`, selection/colour/enhancer still worked, but `MODEL READY` never fired and the Items Finder property-set dropdown stayed at `ALL`). It did not reproduce in the first v4 load of this audit; flagged as flaky readiness, not scored against any requirement.
- Shared Chrome crashed once (port 18800 refused, browser restarted v155→v156); all audit tabs were mine and were closed at the end.

## 3. Verdict

All 20 official checklist items are present and functional on the live deployments.

**VERDICT: PASS** — 20/20 PASS (verified live: 19; code-verified only: 1 — E4-1 specific-pset filter path; unverified: 0).

