# IssueTrack — Wave B (Exam 3): Creating Reactive Apps

React 18 + Vite + Firebase (Firestore) port of the IssueTrack issue-register tracker.
Same product as the Wave A vanilla build, rebuilt as a **reactive** app: every write goes
to Firestore and comes back through a live `onSnapshot` subscription.

---

## 1. Run it

```bash
npm install
npm run dev        # http://127.0.0.1:8612
npm run build      # → dist/
npm run preview    # serves dist/ on http://127.0.0.1:8613
```

Firestore round-trip check (uses the real project, creates and deletes a temporary register):

```bash
npx esbuild scripts/verify-firestore.mjs --bundle --platform=node --format=esm \
  --outfile=.verify-bundle.mjs --external:firebase --external:firebase/*
node .verify-bundle.mjs
```

## 2. Routes

| Route | Page | Content |
|---|---|---|
| `/` | `pages/ProjectsPage.jsx` | register tiles, `<ProjectsForm>` (create + update), JSON export/import |
| `/project/:id` | `pages/ProjectDetailsPage.jsx` | register header, `<ProjectsForm>` (update), `<ProjectTasksList>` |
| `/people` | `pages/PeoplePage.jsx` | assignee directory + `<PersonForm>` |

`BrowserRouter` → Firebase Hosting needs the SPA rewrite (see §6).

## 3. Firestore layout

```
projects/{projectId}                  name, code, site, description, date,
                                       leadId, color, status
projects/{projectId}/todos/{todoId}   id, title, description, status, priority,
                                       createdAt (+ assigneeId, due)
people/{personId}                     name, role, email, phone
```

* `src/services/seed.js` writes the demo data (3 registers, 7 issues, 3 assignees) the first
  time the app talks to an empty collection.
* `src/services/projectsService.js` — registers: live feed, create, update, delete, export, import.
* `src/services/todosService.js` — issues: live feed per register, create, update, delete.
* `src/services/peopleService.js` — assignees: live feed, create, update, delete.

## 4. Exam 3 checklist → code

| Requirement | Where |
|---|---|
| `ProjectsForm` creates AND updates, locally + in Firebase | `src/components/ProjectsForm.jsx` (form), `src/state/AppDataProvider.jsx` (`createProjectLocal` / `updateProjectLocal` — local state first, Firestore second) |
| Nested inside the projects page | `src/pages/ProjectsPage.jsx` → `<ProjectsForm mode="create" />` and `mode="edit"` (same component) |
| Nested inside the details page | `src/pages/ProjectDetailsPage.jsx` → `<ProjectsForm mode="edit" project={project} />` |
| `ProjectTasksList` holds the ToDo cards | `src/components/ProjectTasksList.jsx` |
| ToDo card shows status AND priority, distinct colours | `src/components/TodoCard.jsx` + `src/styles/app.css` (`.it-todo-rail` status/priority segments, `.it-chip-prio-*`) |
| `SearchBox` integrated in the list, live filtering | `src/components/SearchBox.jsx`, used in `ProjectTasksList.jsx` |
| `TodoForm` creates AND updates, refreshes the list | `src/components/TodoForm.jsx` → `services/todosService.js` → `handleSaved()` in `ProjectTasksList.jsx` |
| ToDos in Firestore, retrieved when entering a project | `subscribeTodos()` via `onSnapshot` on `projects/{id}/todos` (`ProjectTasksList.jsx`) |

Wave A behaviours kept: first-two-letters tile uppercased by CSS, random house icon colour,
name validation ≥ 5 chars, default date = today, status-driven card colours, JSON export with
the nested issues, JSON import that updates an existing register instead of duplicating it.

## 5. Design

House style "Chokepoint" — `src/styles/tokens.css` is a verbatim copy of
`../../design/tokens.css`; `src/styles/app.css` only builds on those tokens.

## 6. Deploy (Firebase Hosting)

`dist/` is the publish folder and the app uses `BrowserRouter`, so hosting needs:

```json
{ "hosting": { "public": "v3-react/dist",
  "rewrites": [{ "source": "**", "destination": "/index.html" }] } }
```

(The root `firebase.json` is owned by the parent — it still points at the Wave A `app/` folder.)

## 7. Known limitations (accepted for the exam demo)

* **Firestore rules are fully open** (test mode, no auth): anyone who knows the project id can
  read/write the demo data. Fine for a demo, not for production.
* **The web config ships a redacted API key** (`src/lib/firebase.js`). Firestore does not use the
  key for rule evaluation, so the app works; Firebase **Auth** would not work with that value.
* No authentication, no state-management library (React `useState`/`useEffect` + one context).
