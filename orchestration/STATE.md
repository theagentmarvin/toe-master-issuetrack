# IssueTrack — Orchestration State

**Goal:** Complete the 4 TOE master exams with one evolving simple issue-tracker app (see ../EXAM-SPEC.md).

## Environment facts (verified 2026-10-31)

- Firebase CLI authenticated; project `marvin-dev-c4ca4` ("marvin-dev"), web app `bim-web-viewer`. Firestore/Hosting enable to be confirmed before first deploy.
- IFC model: `assets/sample.ifc` (copied from free-field-monorepo test sample, 604 KB).
- TOE platform: logged in in the `openclaw` managed browser profile (auth0 session persists).
- Reference design: `design/reference/chokepoint-watch.jpg` (Ricardo's chosen look: warm paper + coral accents + technical mono type).

## Waves

| Wave | Scope | Agent | Status |
|------|-------|-------|--------|
| 0-UX | Design system from reference image → design/DESIGN.md + tokens.css | webdev-marvin | done |
| A | Exams 1+2: static app + vanilla JS (people page, 9 interactive features) | coder | built + QA PASS; fix round running (f2d627cc) |
| A-gate | qa-marvin checklist review + Firebase deploy + form submission (exams 1+2 together) | qa-marvin | pending |
| B | Exam 3: React + Firestore port | coder | pending |
| C | Exam 4: TOC BIM viewer + ItemsFinder/palette/DataEnhancer/SmartViews | coder | pending |

## Standing preference (this project + future apps)

Default UX styling = "Chokepoint" design system produced in wave 0. Promote to learned skill once it exists.

## Result log

- 0-UX done (webdev-marvin, run ac92a778): "Chokepoint" house style delivered — design/DESIGN.md (palette roles, mono type scale, component recipes, 12 imperative rules), design/tokens.css (CSS vars + .it-* classes, braces verified), design/preview.html (mock render). Palette: paper #FAFAF7 / ink #1B1B19 / coral #F0561E. Files spot-checked on disk.
- Wave A: coder run 08d4ea1a timed out (no completion report), but app/ contains full implementation: index/people/project pages + js/{store,ui,index-page,project-page,people-page}.js, tokens.css copied verbatim, all JS passes node --check, all pages serve 200 on :8611. Evidence comments for exam items present (2.1/2.2 tiles, 2.6 status colors, localStorage bonus). QA gate now; parent running browser smoke test.
- QA gate spawned: qa-marvin run 2b7750fd (deepseek-reasoner), report target orchestration/qa-wave-a.md. Browser smoke test abandoned (screenshot timed out twice; static HTTP checks already green). Local test server left running on :8611.
- QA VERDICT: PASS — 13/13 checklist items, 0 blocking, 6 non-blocking defects (report: orchestration/qa-wave-a.md; store 18/18, browser 43/43 suites by QA). Fix round dispatched to kept coder session (run f2d627cc): import merge non-destructive + import validation, edit-status visibility, 3-digit IDs, dead label, title scale + off-token color. After fix: re-verify, then Firebase deploy (marvin-dev-c4ca4) + combined exam 1+2 form submission.

- FIX ROUND DONE (coder run f2d627cc): all 6 QA defects fixed + verified (node --check clean, 60 store assertions, Chrome CDP pass). Committed 7d37f16.
- DEPLOYED: Firebase Hosting https://marvin-dev-c4ca4.web.app — all 3 pages + assets 200 (cleanUrls 301s resolve).
- Submission form found: https://thatopen.notion.site/3b1e915dff1e80eb9d0bfdd3276f4298 — fields: Community Profile URL, Modules (checkboxes), GitHub Repository URL, Deployed App URL, comments.
- SUBMITTED: exams 1+2 form sent successfully ("Your response has been submitted") with community profile https://people.thatopen.com/u/c7737e77, GitHub https://github.com/theagentmarvin/toe-master-issuetrack, app https://marvin-dev-c4ca4.web.app. Wave A CLOSED.
- Next: Wave B (exam 3, React + Firestore) — needs Firestore enabled on marvin-dev-c4ca4 (confirmed indexes API works).
- Wave B LAUNCHED: coder (MiniMax-M3) building v3-react/ (exam 3 checklist). Firebase web config for the app: projectId marvin-dev-c4ca4, appId 1:500660140991:web:79628996fe65a8ea96ff0a, authDomain marvin-dev-c4ca4.firebaseapp.com (public client config).
- Wave B built: v3-react/ (Vite+React18+Firebase). Coder run caf610fa timed out on delivery (second time), but artifacts verified by parent: npm run build OK (2.17s), vite preview :8722 200, fs-probe: projects 3 docs + people 3 docs (seed + rules work). Committed.
- QA gate for wave B running: qa-marvin run 40e351c2 (deepseek-reasoner) -> orchestration/qa-wave-b.md.
- 10:12 Architect nudge claimed wave-B QA gate run 40e351c2 was killed by 30-min timeout. DIRECT CHECK CONTRADICTS: subagents list shows it RUNNING at 15m56s (currentTool exec), delivery pending; qa-wave-b.md not yet written; no retry spawned (double-gate avoided). vite preview confirmed alive on :8722 (200). Time-boxed scope constraint sent to gate session (queued, run 3134f4dc): reuse :8722, no npm/server churn, write verdict table incrementally, finish with VERDICT line. If it dies before writing the report, retry once, same tier, static-audit scope.
