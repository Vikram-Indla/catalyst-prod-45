# 06 — Validation Evidence

## Build slice: Project Testing Status (first real-data report) — 2026-06-28
Route: `/testhub/reports/project-status` · src: ProjectTestingStatusPage.tsx + useProjectTestingStatus.ts.

### Gates (raw)
- `npx tsc --noEmit` → **0 errors**.
- `npm run lint:colors:gate` → **703 = baseline 703, no new hard-coded colors**.
- New files color scan → clean.

### Live render (Senaei BAU, real cyij data)
- Story coverage **3.6%** (14/394) — AT RISK lozenge. Matches proven query.
- Executions 14: 8 passed / 3 failed / 1 blocked / 2 pending.
- Defects 707 QA bugs + 3 test-linked (hybrid D-005); 116 production incidents.
- Governance flags **3** → JiraTable: BAU-6018/6075/6003, delivery 'IN QA', test FAILED (RVTC-007/003/013). Proves B5 G-M1 on real UI.
- Uncovered stories: 380 real stories rendered.
- Factual insight (B6): "Coverage 3.6% (14/394). Coverage is far too low to assess release readiness. 3 story(ies) marked Done have a failing test…".

### Method
Chrome MCP navigate + screenshot at localhost:8080. Light mode confirmed. Dark-mode reload-check = pending (ADS tokens used throughout; expected safe).
