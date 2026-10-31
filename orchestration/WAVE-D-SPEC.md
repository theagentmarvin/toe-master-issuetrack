# Wave D — IssueTrack product features (Ricardo request 2026-10-31 13:13)

On top of the submitted v4-bim app (keep ALL exam-4 + prior features intact):

## D1. BIM viewer accessible WITHOUT registration
- A public demo route (e.g. `/bim/demo` or `/demo`) reachable from the landing page with an obvious link ("OPEN BIM DEMO — NO ACCOUNT NEEDED").
- Loads sample.ifc with full tools (selection, ItemsFinder, palette, Data Enhancer, Smart Views) — zero login/registration, zero dependency on user-created data. Firestore reads allowed (public demo register), but first paint must not wait on them; seeded registers already exist with open rules.
- No auth anywhere in the app.

## D2. Click element → assign issue → 3D pin
- From a selected element: "ASSIGN ISSUE" action → compact form (title required >=5 chars, description, status, priority, assignee from people).
- On save: issue persisted inside the register's todos (Firestore `projects/{id}/todos`) WITH a `bimReference` field: {modelId, localId, guid, label, worldPosition{x,y,z}, cameraSnapshot?}.
- Viewer renders a PIN at each issue's element location for that register: clickable (click pin → select item + show issue detail), labeled (title/status on hover or badge), status-colored via house tokens. Implement via TOC Highlighter/box-center or CSS2D overlay — builder's choice, must survive orbit/zoom and dispose correctly on route exit (memory discipline as in BimEngine).
- Issues list (register details page) shows a BIM badge on pinned issues; clicking badge deep-links to /bim/<id>?issue=<todoId> and focuses the pin.
- In demo mode assignment works too (writes to the public demo register; rules are open).

## Constraints
- WRITE TARGET: v4-bim/ only (parent owns firebase.json/deploy). House style mandatory (Chokepoint tokens).
- NO detached/background servers; `timeout N` + kill inside same exec for any smoke test; reuse scripts/cdp-verify.mjs pattern.
- Exam-4 checklist behavior must stay intact (selection, finder export/import, palette, Data Enhancer, Smart Views + persistence).
- Self-verify with real CDP browser: fresh context, /bim/demo → MODEL READY, no login; select element → assign issue → assert pin visible in DOM/canvas overlay AND Firestore doc contains bimReference (REST GET). Report file:line evidence + build summary. End with 'WAVE_D_DONE'.
