# QA — Wave B (Exam 3, React + Firebase) — IssueTrack v3-react

VERDICT: PASS

> Scope of this verdict = the six Exam-3 checklist items as framed (ProjectsForm; ProjectTasksList;
> ToDo card status+priority; SearchBox; TodoForm; ToDos in Firestore). All six are implemented and
> wired end-to-end. Seven defects are listed below; none removes a checklist item, but #1/#2 are
> visible races and #3 blocks the Wave-B deploy until fixed.

- Reviewer: qa-marvin (evaluator gate). No file in `v3-react/` was modified.
- Method: full static read of every `src/**` file + CSS, plus `npm run build` (passes, 2.04 s,
  65 modules), plus a read-only Firestore REST probe of the live project (no browser UI session —
  the preview at :8722 refused connections when checked, so interactions are **not dynamically
  verified**).
- Live data confirmed in `marvin-dev-c4ca4`: `projects` = REG-001/002/003, `people` = PEO-001/002/003,
  `projects/REG-001/todos` = ISS-001/002/003 (REST 200, no auth).
- Dev credentials note: `src/lib/firebase.js:13` contains a redacted/placeholder `apiKey`
  (`AIzaSy…oi_g`). Firestore itself does not validate the key while rules are open — the REST probe
  returns 200 with **no** key at all — so the app works today, but only because rules are
  world-readable/writable. See Risk R1.

## Checklist verdicts

| # | Exam-3 item | Verdict | Evidence |
|---|---|---|---|
| 1 | `ProjectsForm`: create AND update, locally + Firebase, nested in ProjectsPage AND project details (SRP fix) | **PASS** | `components/ProjectsForm.jsx:47-116` (one component, `mode`/`project` props; `:101` branches `updateProject`/`createProject`); wired in `pages/ProjectsPage.jsx:215` (create) and `:221-227` (edit), and `pages/ProjectDetailsPage.jsx:106-117` (edit). Writes: `state/AppDataProvider.jsx:96-144` (optimistic local + `services/projectsService.js:63-92` Firestore). Validation `:80` (`MIN_NAME_LENGTH = 5`, `lib/constants.js:7`), default date `:93`. |
| 2a | `ProjectTasksList` holds the ToDo cards on the details page | **PASS** | `components/ProjectTasksList.jsx:38-201`; renders `TodoCard` at `:189-198`; mounted at `pages/ProjectDetailsPage.jsx:127`. |
| 2b | ToDo card shows status AND priority, distinct colors for each | **PASS** | `components/TodoCard.jsx:14-15` resolves both, `:29-30` renders priority + status chips, `:36-41` meta, `:20-23` two-segment colour rail. Constants: `lib/constants.js:31-48` (4 statuses / 4 priorities, each own `token`+`chip`). Card bg follows status `styles/app.css:324-327`; status rail `:335-338`; priority rail `:340-343`; priority chips `:389-412`. Labels differ too, so colour is never the only signal. |
| 2c | `SearchBox` general component, inside `ProjectTasksList`, actually filters the cards | **PASS** | `components/SearchBox.jsx:8-33` (controlled, no owned state, props for label/id/hint → reusable); rendered inside the list at `ProjectTasksList.jsx:156-163`; `query` state `:41`; filter `:23-36` + `:81-84` over title/description/status/priority/assignee; empty-state `:184-186`. |
| 2d | `TodoForm` serves BOTH create and update, list refreshes after each | **PASS** | `components/TodoForm.jsx:40-53` (`editingTodo` switches mode), `:82-89` branches `updateTodo`/`createTodo`; `onSaved` → `ProjectTasksList.jsx:120-128` updates the list immediately, and the live subscription `:59-70` confirms it. |
| 3 | ToDos stored in Firestore AND retrieved when entering a project | **PASS** | `services/todosService.js:60-72` writes `projects/{projectId}/todos`; `:44-51` `onSnapshot` on the same path; subscribed on mount in `ProjectTasksList.jsx:51-71`; page passes `projectId` at `ProjectDetailsPage.jsx:127`. Seed writes the same layout (`services/seed.js:187-196`). Live data verified (3 docs). |

Inherited Wave-A behaviours — all still present:

| Behaviour | Verdict | Evidence |
|---|---|---|
| Tile = first 2 letters, uppercased **via CSS** | PASS | `lib/format.js:30-32` (slice only, no upper), `.it-tile { text-transform: uppercase }` `styles/tokens.css:128-140`; used `ProjectCard.jsx:32-34`, `ProjectDetailsPage.jsx:55-57`. |
| Random house colour per register | PASS | `lib/constants.js:17-24, 57-60`; assigned once at create `ProjectsForm.jsx:96` / `projectsService.js:71`, preserved on update `:87`. |
| Name ≥ 5 chars refused | PASS | `ProjectsForm.jsx:80-84`; also provider `AppDataProvider.jsx:98-100, 123-125`; import `projectsService.js:161-167`. |
| Default date on empty | PASS | `ProjectsForm.jsx:92-93`; service fallback `projectsService.js:69, 85`. |
| People page = directory (rows, not cards) | PASS | `components/PeopleTable.jsx:19-58` real `<table>` vs `ProjectCard` tiles; page `PeoplePage.jsx:91-97`. |
| ToDo card background follows status | PASS | `TodoCard.jsx:18` `data-status`; `app.css:324-327`. |
| Routes `/`, `/project/:id`, `/people`, no auth | PASS | `App.jsx:28-33`; no auth imports anywhere. |

## Defects (numbered; concrete, with fix requirement)

1. **Duplicate ToDo card after create (race).** `components/ProjectTasksList.jsx:120-128` appends
   `{ ...todo, _pending: true }` using the *real* Firestore id returned by `createTodo`. The
   `onSnapshot` at `:59-70` has normally already delivered that same document (local write), so the
   list briefly holds two entries with the same `key` (`:189-191`) → duplicate card + React
   duplicate-key warning until the next snapshot event. Fix: on create, don't append if
   `todos.some(t => t.id === todo.id)`, or replace the optimistic append entirely and trust the
   subscription (it fires immediately).

2. **Same pending-row race for registers.** `state/AppDataProvider.jsx:96-119` inserts a
   `local-<ts>` row, then `:111-113` maps it to the saved row. Meanwhile the snapshot merge
   `:45-50` adds the server row; the two coexist (temp+server, then saved+server) with one `id`,
   producing a duplicated card/menu entry (`pages/ProjectsPage.jsx:191-200`, `components/Layout.jsx:71-77`)
   until the next snapshot. Fix: dedupe by `id` in the merge and drop the temporary row as soon as
   an incoming doc matches the created id (also covers `createdAt` timestamp resolution).

3. **Firebase Hosting is configured for Wave A, not this app — deploy blocker.**
   `firebase.json:3` has `"public": "app"` (the vanilla Wave-A site) and no SPA rewrite; the React
   build lands in `v3-react/dist` (`vite.config.js:build.outDir`). Deploying as-is publishes the
   wrong app, and `BrowserRouter` deep links (`/project/REG-001`, `App.jsx:8,30`) would 404 even if
   the right folder were used. Fix: add a hosting target/site with `public: "v3-react/dist"` and
   `rewrites: [{ "source": "**", "destination": "/index.html" }]`.

4. **Unguarded bulk reads.** `pages/ProjectsPage.jsx:32-49` (`Promise.all` of `fetchTodos`) and
   `pages/PeoplePage.jsx:25-44` have no `try/catch`. One failed/denied subcollection read rejects the
   whole batch: stats stay at 0 and an unhandled promise rejection hits the console with no user
   feedback. Fix: catch per project, keep partial results, and surface an error banner.

5. **Detail-page state chip is always `NEW`.** `ProjectDetailsPage.jsx:45` calls
   `projectState(project)` with no todo count; `lib/constants.js:83-91` reads `project.todos`, which
   is always `undefined` in Wave B (todos live in the subcollection). A register with blocked issues
   still displays `NEW`. Fix: lift the count/status from `ProjectTasksList` (or pass a `todos` prop)
   and feed `projectState(project, todos.length)` — or drop the chip.

6. **Edit form is wiped by live updates.** `ProjectsForm.jsx:62-67` reinitialises values whenever
   `project` changes identity. Because `project` comes from the Firestore-backed context
   (`AppDataProvider.jsx:40-53`), any snapshot (including the app's own write or another tab) resets
   the form while the user is typing. Fix: key the effect on `project.id` (or seed only on mount) and
   reset explicitly when the edit target changes.

7. **No rollback when a register update fails.** `AppDataProvider.jsx:121-144` shows the new values
   locally before `updateProject`; on error it returns `{ok:false}` but never restores the previous
   project. UI then shows "SAVE FAILED" next to fields that *look* saved, and a later snapshot snaps
   them back. Fix: capture the previous row and restore it in `catch` (mirroring the create path at
   `:115-117`).

Non-defect observations: snapshot subscriptions are correctly torn down
(`ProjectTasksList.jsx:70`, `AppDataProvider.jsx:72-75, 87-90`; the `alive` guard prevents a
StrictMode double-subscribe leak); all `.map()` calls have `key` props; `statusInfo`/`priorityInfo`
fall back safely (`constants.js:63-70`), so legacy docs with unknown status/priority cannot crash a
card; no auth means no protected-route gaps.

## Risks / not verified

- **R1 – Firestore rules are fully open.** The app ships no auth and the REST probe reads
  `projects`, `people` and `todos` with no key. Anyone with the project id can read/write/delete.
  Acceptable for the exam demo only; note it in the submission, and do not "fix" the redacted API key
  expecting Auth to work (Firestore ignores it today, but Auth would not).
- **R2 – Not dynamically verified.** The preview server was not reachable (`curl :8722` → 000) at
  review time, so clicks/typing/duplicate-card behaviour were reasoned from code, not observed. The
  build output is current (`dist/` rebuilt during this review).
- **R3 – Deployment not performed.** `firebase.json` targets Wave A and there is no
  `v3-react/.firebaserc`; Wave-B DoD #3/#4 (public URL + submission form) remain open.

VERDICT: PASS
