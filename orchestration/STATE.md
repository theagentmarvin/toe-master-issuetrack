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
- Wave B QA gate settled (run 40e351c2 died at 30m AFTER delivering its report via announce): VERDICT PASS, 6/6 checklist items, 7 defects (report on disk: qa-wave-b.md).
- Fix round dispatched to kept coder session (run 52ebb0e6): defects 1,2,4,5,6,7 (races, unguarded reads, state chip, form wipe, rollback). Defect 3 (deploy blocker) handled by parent: created hosting site issuetrack-v3 (https://issuetrack-v3.web.app); firebase.json now multi-target: v2=app/ on marvin-dev-c4ca4 (EXAMS 1+2 SUBMISSION URL — never overwrite), v3=v3-react/dist + SPA rewrite on issuetrack-v3.
- Deploy sequence after fix round lands: npm run build in v3-react -> firebase deploy --only hosting:v3 -> live-verify deep link /project/REG-001 -> submit exam 3 form.
- WAVE B CLOSED: late timeout notice for QA run 40e351c2 is moot (report already delivered pre-death). Fix round verified landed (DEFECT comments, dedupeById, previousRow rollbacks, catch guards); rebuilt; deployed to a DEDICATED site https://issuetrack-v3.web.app (deep links /project/REG-001, /people verified 200; exam1+2 site marvin-dev-c4ca4.web.app untouched). Exam 3 form submitted & confirmed ("Your response has been submitted") — module 3 checked, same GitHub repo, v3 URL.
- Submissions so far: exams 1+2 (combined, marvin-dev-c4ca4.web.app) + exam 3 (issuetrack-v3.web.app). Remaining: exam 4 (Wave C, BIM).
- Wave C LAUNCHED: coder (MiniMax-M3) run 3f18e8c9 building v4-bim/ (fork of v3-react + @thatopen/components viewer; ItemsFinder UI + query export/import, Colors Palette, Data Enhancer, Smart Views with definition serialization + Firestore persistence + update button). IFC asset in public/, no detached servers allowed. On completion: QA gate (reuse-any-server rule) -> deploy v4 site -> submit exam 4 -> mission complete.
- 10:45 Architect MONITOR FLAG: Wave C was launched on T1 MiniMax-M3 (3f18e8c9), but Boss escalation rule (AGENTS.md, 10:16) mandates T2 for exam 4 / BIM-domain work. ACTIONED: cancelled 3f18e8c9 (~3 min sunk, npm-install stage only) and relaunched on T2 qwen-token-plan/deepseek-v4-pro-0813 as run 61918884 (session 25fbe9f2), same full exam-4 brief + resume guidance (inspect partial v4-bim/, keep or restart cleanly). Wave C remains the only live child.
- 10:50 Parent prep while T2 build runs: hosting site issuetrack-v4 created (https://issuetrack-v4.web.app); firebase.json now declares all three sites (v2 submission marvin-dev-c4ca4 untouched, v3 issuetrack-v3, v4 issuetrack-v4 with SPA rewrites). Builder forbidden from touching firebase.json (parent owns deploy config).
- Wave C BUILT + DEPLOYED (T2 run 61918884, WAVE_C_DONE): v4-bim/ = v3 fork + lazy /bim/:id route (BimEngine on @thatopen/components 3.6, raycast selection + data panel, ItemsFinder property-set/value query with export/import buttons via documented QueriesManager serialization, ColorsPalette, custom DataEnhancer component with same-data method, custom SmartViews component: capture/export/import DEFINITIONS + table with APPLY/UPDATE + Firestore persistence projects/{id}/smartViews subscribed on open). Sample.ifc/web-ifc.wasm/fragments worker all self-hosted (public/), no CDN deps. Committed (with .gitignore for node_modules/dist). Deployed: https://issuetrack-v4.web.app — /, sample.ifc (604040B), web-ifc.wasm (application/wasm), worker/worker.mjs, /bim/REG-001 SPA fallback all verified 200.
- QA gate for Wave C launching: qa-marvin (deepseek-reasoner), scoped to finish inside 30m — static audit vs exam-4 checklist + curl/live checks against the deployed URL; ONE optional browser-tool WebGL smoke at /bim/REG-001; forbidden: starting/restarting servers. Then: exam 4 form submission (module 4 only) -> mission complete.
