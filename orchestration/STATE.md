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
| A | Exams 1+2: static app + vanilla JS (people page, 9 interactive features) | coder | running |
| A-gate | qa-marvin checklist review + Firebase deploy + form submission (exams 1+2 together) | qa-marvin | pending |
| B | Exam 3: React + Firestore port | coder | pending |
| C | Exam 4: TOC BIM viewer + ItemsFinder/palette/DataEnhancer/SmartViews | coder | pending |

## Standing preference (this project + future apps)

Default UX styling = "Chokepoint" design system produced in wave 0. Promote to learned skill once it exists.

## Result log

- 0-UX done (webdev-marvin, run ac92a778): "Chokepoint" house style delivered — design/DESIGN.md (palette roles, mono type scale, component recipes, 12 imperative rules), design/tokens.css (CSS vars + .it-* classes, braces verified), design/preview.html (mock render). Palette: paper #FAFAF7 / ink #1B1B19 / coral #F0561E. Files spot-checked on disk.
