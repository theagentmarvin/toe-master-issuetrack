# IssueTrack — TOE Master Exam Project Spec

**Mission:** Complete the four That Open Company master challenge exams by evolving ONE simple app: an issue-registration tracker (same core functionality as Autodesk Data Management issues, deliberately simpler — this is a learning project, no over-engineering).

## Framing (approved by Ricardo 2026-10-31)

The course's vocabulary maps to our domain:
- **projects** → issue registers (one per construction project)
- **ToDos** → issues (title, description, status, priority, assignee)
- **people** → assignees (name, role, email, avatar)

Implement the **literal exam features** — those are what gets graded — but brand the UI as "IssueTrack" and use issue terminology where it doesn't conflict with the checklist. Keep the code simple, readable, and vanilla at each stage (no frameworks before the exam asks for them).

## Exam roster & URLs

1. Static: https://people.thatopen.com/c/creating-static-websites/sections/110877/lessons/370805
2. Interactive: https://people.thatopen.com/c/creating-interactive-websites/sections/122584/lessons/412931
3. Reactive: https://people.thatopen.com/c/creating-reactive-apps/sections/137331/lessons/468287
4. BIM: https://people.thatopen.com/c/creating-bim-apps-0cfd57/sections/342855/lessons/2795105

## Submission rules

- Exams 1+2 are submitted TOGETHER via the dedicated form linked on the exam-2 page.
- Exams 3 and 4: deploy + same form, individually.
- Each submission = deployed public URL. Firebase Hosting is the recommended route.
- Don't wait for review before starting the next wave.

## Wave A — Exams 1+2 (static + vanilla JS)

### Exam 1 checklist (static "people" page)
- [ ] New app page for "people" (assignees), similar in spirit to the projects page.
- [ ] List of users with chosen info fields.
- [ ] Form to add new users.
- [ ] Design MUST differ from the project cards (user-directory style, not cards).

### Exam 2 checklist (vanilla JS interactivity, 9 items)
- [ ] 1. Project card icon = first two letters of project name, uppercased via CSS (`text-transform`).
- [ ] 2. Random icon background color per card (array of 5–6 colors, function picks one).
- [ ] 3. Validation: refuse to create project if name length < 5 chars.
- [ ] 4. Default date applied on create when user leaves date empty.
- [ ] 5. Update project info from the details page.
- [ ] 6. Create ToDos (issues) via a button; ToDo data stored INSIDE the projects data structure.
- [ ] 7. JSON export of projects includes ToDos.
- [ ] 8. Importing JSON for an already-existing project UPDATES it (no duplicate).
- [ ] 9. ToDo status settable at creation and updatable; ToDo card background color reflects status.

### Wave A technical constraints
- Plain HTML/CSS/JS only. No build step, no framework, no backend.
- Data persisted in-memory (+ localStorage allowed as a bonus, but export/import JSON is the required persistence story).
- Pages: index (projects list), project details, people. Simple client-side routing or multi-page is fine — keep it dumb.
- Location: `app/` in this repo.

## Wave B — Exam 3 (React + Firebase)

- [ ] `ProjectsForm` component: create AND update projects, locally and in Firebase; nested wherever it fits (fixes ProjectsPage SRP).
- [ ] `ProjectTasksList` component: holds ToDo cards on details page.
- [ ] ToDo card component: shows status AND priority, distinct colors for each.
- [ ] `SearchBox` integrated in `ProjectTasksList`, filters ToDo cards.
- [ ] `TodoForm` component: creates + updates ToDos, refreshes the list.
- [ ] ToDos stored in Firestore, retrieved when entering a project.
- Firebase project: `marvin-dev-c4ca4` (web app `bim-web-viewer`); confirm/create Firestore + Hosting before deploying.

## Wave C — Exam 4 (That Open Components / BIM)

- [ ] Items Finder UI: query items by property-set + value; export/import serialized queries (read ItemsFinder docs); download + upload query buttons.
- [ ] Colors Palette UI on the colorize button (predefined colors).
- [ ] Data Enhancer: method returning all items sharing the source's data value (e.g. same documentation).
- [ ] Smart Views: export/import view DEFINITIONS (not images); store in Firebase inside project data; show stored views when project opens; update-button re-captures current state.
- IFC model: `assets/sample.ifc` (the free-field test model, 604 KB).

## Definition of Done (per wave)

1. Every checklist item above demonstrably works in the built app.
2. App builds/serves cleanly (`python3 -m http.server` for wave A; `npm run dev`/build for B/C).
3. Deployed to Firebase Hosting, public URL reachable.
4. Submission form filled with the URL (via browser, logged-in profile).
