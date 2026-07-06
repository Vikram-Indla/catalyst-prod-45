# Agent 06 — Chrome MCP Interaction Agent (LIVE UI CLICK-THROUGH)

**Pass type:** LIVE BROWSER (Chrome MCP, real clicks/drags on http://localhost:8080, project BAU, dark mode)
**Date:** 2026-07-03
**Repo:** catalyst-prod-45 @ main (7437425c8)
**Inputs verified live:** Agent 03 (destination inventory) + Agent 07 (component mapping) suspected dead/forked interactions
**Feeds:** Agent 10 (consolidation)

---

## 1. Scope covered

Clicked through 7 convergence-critical interaction clusters on the live app, recording what opens / fails / misbehaves (behavioral truth, not code reading):

1. TestHub Defects row-click detail (suspected `onOpenItem` stub)
2. TestHub Repository vs MyWork vs Board test-case detail (suspected CatalystDetailRouter vs `repository?case=` CaseDrawer fork)
3. TestHub Cycles: Create-cycle modal + cycle row → CycleDetailPage (suspected raw table)
4. Incident Hub global Create modal (suspected shadcn NewIncidentModal fork) + all-incidents row detail
5. Release Hub: releases-management row → detail, changes row, overview interactivity
6. Kanban drag + inline create (release / testhub / incident boards)
7. Legacy `/release/incidents/dashboard` reachability + mock-KPI claim

## 2. Files inspected (live-verified against code)

- `src/modules/project-work-hub/adapters/defectsDataSource.ts` (onOpenItem stub — confirmed live inert)
- `src/pages/testhub/repository/RepositoryPage.tsx` + `CaseDrawer.tsx` (Repository detail = CatalystDetailRouter; `?case=` deep-link dead)
- `src/pages/testhub/cycles/CycleDetailPage.tsx` (raw `<table>` L424 — confirmed 1 raw table live)
- `src/pages/incidenthub/components/NewIncidentModal.tsx` (shadcn create fork — confirmed live)
- `src/components/layout/OperationsSidebar.tsx:22`, `src/components/ja/ItemsDropdown.tsx:48`, `src/components/layout/dropdowns/ItemsDropdown.tsx:72` (legacy `/release/incidents` nav links — grep-confirmed)

## 3. Routes inspected (live)

`/testhub/defects`, `/testhub/repository` (+`?case=<uuid>`), `/testhub/my-work`, `/testhub/board`, `/testhub/cycles`, `/testhub/TESTHUB/cycles/CYC-001`, `/incident-hub/dashboard`, `/incident-hub/all-incidents`, `/incident-hub/board`, `/release-hub/releases-management` (+`/release-1118-june-25-august-24`), `/release-hub/changes`, `/release-hub/overview`, `/release-hub/sign-off-queue`, `/release-hub/release-kanban`, `/release/incidents/dashboard`, `/release/incidents`.

## 4. Screenshots captured (Chrome MCP save_to_disk; host FS copy fails per agents 04/05 — reference by MCP ID)

| ID | Route | What it shows |
|---|---|---|
| ss_6131imzt5 | /testhub/defects | Defect row "Open in side panel" icon = no-op (dead detail) |
| ss_7978s96pt | /testhub/repository | Test-case click → canonical CatalystDetailRouter detail (works) |
| ss_384935enl | /testhub/repository?case=<uuid> | MyWork bounce → bare list, CaseDrawer never opens (dead deep-link + UUID param) |
| ss_1680v6i2a | /testhub/board | **"Couldn't load this board — column tm_test_cases.key does not exist"** (LIVE BUG) |
| ss_6035wgrom | /testhub/TESTHUB/cycles/CYC-001 | CycleDetailPage raw `<table>` scope grid + native-select assignees |
| ss_6188w2krk | /incident-hub/dashboard | NewIncidentModal (shadcn) with SEV-1..4 hand-rolled color buttons |
| ss_2638nl13y | /incident-hub/all-incidents | Row click → canonical CatalystDetailRouter panel (works) |
| ss_2473ypiph | /release-hub/…/release-1118-… | Slug-based ReleaseDetailPage (Jira-parity, no raw table) |
| ss_3079huij0 | /release-hub/sign-off-queue | Review sign-off @atlaskit modal (Approve/Reject) |
| ss_2875smvq6 | /incident-hub/board | Canonical incident kanban with data; drag shows "Move blocked" |
| ss_6251s872c | /release/incidents/dashboard | Legacy incident dashboard reachable + loads (live numbers, not mock literals) |
| ss_3169tsjjn | /release/incidents | Legacy Incident List (shadcn tabs List/Analytics/Insights/Kanban) still live |

## 5. Findings count

- Interactions tested: **7 clusters / 15 discrete interactions**
- Confirmed DEAD: **3** (defect row detail; MyWork/Board `?case=` deep-link; — see table)
- Confirmed LIVE BUG (crash/error): **1** (`/testhub/board` schema error)
- Confirmed FORKED (non-canonical but functional): **2** (incident create modal; test-case detail split)
- SLUG/UUID-contract violation observed live: **1** (`?case=cc000000-...-000000000001` UUID param)
- Claim CORRECTED vs input reports: **1** (legacy incident dashboard mock KPIs — now live-derived, not `3/24/18/4.2h`)

## 6. High-risk findings

### HR-1 — TestHub Board is BROKEN (live crash). `/testhub/board`
KanbanPage mode='test' renders SectionMessage error **"Couldn't load this board — column tm_test_cases.key does not exist"** + Retry. No cards render at all. The board query references `tm_test_cases.key` which does not exist in the schema. This is the same class as the `tm_test_cases.key` gap and blocks card-click AND drag on the test board entirely. Evidence: ss_1680v6i2a. **Not in agent 03/07's findings — new live bug.**

### HR-2 — Defect row detail is fully DEAD. `/testhub/defects`
Confirms `onOpenItem: () => {}` (defectsDataSource.ts:152). Three attempts, three no-ops:
- Title text click → **inline edit field** (not detail).
- Key link (DEF-002) click → row **select only**, URL stays `/testhub/defects`.
- "Open in side panel" hover-icon click → **no panel opens** (`hasDialog:false`, no aside content), repeatable.
`CatalystViewDefect` exists in CatalystDetailRouter:202 but is unreachable from this list. Evidence: ss_6131imzt5.

### HR-3 — Test-case detail is FORKED, and the fork's deep-link is DEAD.
- Repository in-page row click → **canonical CatalystDetailRouter / CatalystViewTestCase** rich detail (tabs Details/Steps/Versions/Requirements, right rail). Works. (ss_7978s96pt)
- MyWork row click → **navigates away** to `/testhub/repository?case=cc000000-0000-0000-0000-000000000001` and the Repository page loads with **NO drawer open** (`hasDialog:false` after 4s). The `?case=` deep-link does not open CaseDrawer. So MyWork's detail path is a **dead bounce**. (ss_384935enl)
- Two problems in one: (a) two different detail experiences depending on entry tab; (b) the MyWork path uses a **raw UUID URL param** — SLUG CONTRACT violation — and doesn't even resolve.

### HR-4 — Incident create canon FORK (confirmed live). `/incident-hub/*` global Create
Global Create opens **"New Incident"** modal = hand-rolled shadcn NewIncidentModal, visually and structurally distinct from CreateStoryModal: only Title + SEV-1/2/3/4 segmented buttons + Description (no work-type dropdown, no ADF editor, no project/assignee). SEV buttons use non-ADS hand-rolled colors probed live (SEV-1 `rgb(241,91,80)` text, SEV-3 selected `rgb(102,157,241)` fill). Writes `incidents` table while the hub's own All-Incidents list reads `ph_issues` (142 BAU-#### items) — split-brain confirmed by the two data sources rendering different key spaces. Evidence: ss_6188w2krk.

### HR-5 — Legacy `/release/incidents/*` stack is LIVE and nav-reachable (confirms Agent 07 overturn).
`/release/incidents/dashboard` and `/release/incidents` both load a complete parallel shadcn incident UI (own sidebar: Incident List / Incident Reports / Committee Queue; own tabs List/Analytics/Insights/Kanban; INC-## keys mapping the same BAU incidents; full "+ Create Incident" page). Grep-confirmed nav links at `OperationsSidebar.tsx:22`, `ja/ItemsDropdown.tsx:48`, `layout/dropdowns/ItemsDropdown.tsx:72`. Retirement needs nav rewires, not just route deletion. Evidence: ss_6251s872c, ss_3169tsjjn.

### HR-6 (CORRECTION, downgrades a P0) — Legacy dashboard mock KPIs are NO LONGER mock.
Agent 03 #3 / Agent 07 D2 claim `/release/incidents/dashboard` renders hardcoded `value: 3 / 24 / 18 / '4.2h'`. **Live it does not** — it shows plausibly real query-derived numbers: 152 TOTAL, 15 TOTAL OPEN, 138 SLA BREACHED, By-Severity 23/53/75/1, By-Priority P3 152, Aging >7d 15, Converted 0. Either the mock literals were already replaced or this page now reads live data. The "renders lies" P0 is **not reproducible live** — reclassify D2 from "P0 zero-assumption violation" to "legacy duplicate to retire." Evidence: ss_6251s872c. (The page is still a delete candidate on duplication grounds, just not on the mock-data grounds.)

## 7. Per-interaction result table

| # | Route | Action | Expected | Actual (live) | Verdict |
|---|---|---|---|---|---|
| 1 | /testhub/defects | Click defect row (title) | open detail | inline-edit field | DEAD (fork: not detail) |
| 1 | /testhub/defects | Click defect key + "Open in side panel" | open CatalystViewDefect | row select only; panel icon no-op | **DEAD** |
| 2a | /testhub/repository | Click test-case row | CatalystDetailRouter | rich canonical detail opens (tabs+rail) | PASS |
| 2b | /testhub/my-work | Click test-case key | detail opens | bounce → `repository?case=<UUID>`, **no drawer** | **DEAD deep-link + UUID violation** |
| 2c | /testhub/board | Load / click card | board + card detail | **board crashes** (`tm_test_cases.key` missing) | **DEAD/BROKEN** |
| 3a | /testhub/cycles | Click "Create cycle" | modal | hand-rolled 2-tab (Details/Cases) modal, native selects | PASS-with-debt |
| 3b | /testhub/cycles | Click cycle row | CycleDetailPage | opens at `/…/cycles/CYC-001`; **raw `<table>`** scope grid + native-select assignees | PASS-with-debt (raw table) |
| 4a | /incident-hub/* | Global "Create" | canonical CreateStoryModal | **shadcn NewIncidentModal** (SEV buttons, writes `incidents`) | **FORK** |
| 4b | /incident-hub/all-incidents | Click incident row | CatalystDetailRouter | canonical detail panel opens (works) | PASS |
| 5a | /release-hub/releases-management | Click release row | detail page | slug ReleaseDetailPage opens (no raw table); ⚠️ narrow 2-line link → pixel-click misses, only DOM `.click()` fired; ⚠️ doubled "Releases/Releases" breadcrumb | PASS-with-friction |
| 5b | /release-hub/changes | Click change row | change detail | **no rows** (empty "No change records yet"); New-change modal opens (native selects) | N/A empty (create PASS) |
| 5c | /release-hub/overview | Click KPI / Review | interactive | Review → sign-off-queue → Review-sign-off @atlaskit modal (Approve/Reject) | PASS (interactive) |
| 6a | /incident-hub/board | Drag card TODO→other col | move | machinery live but every drop shows **"Move blocked"** (FSM/transition guard) | LIVE (guarded) |
| 6b | /incident-hub/board | "+ Create" in column | inline card composer | opens "What needs to be done?" inline create | PASS |
| 6c | /release-hub/release-kanban | Load | board | canonical KanbanPage, **empty** ("Your board is empty") | PASS (no data) |
| 7 | /release/incidents/dashboard | Navigate | mock-KPI dashboard | reachable, loads **live-derived KPIs (not mock)**; whole legacy stack live+nav-linked | LIVE (correction to 03/07) |

## 8. Confirmed dead / forked interactions (evidence)

- **DEAD — defect row detail** (`/testhub/defects` → any row affordance): no detail opens; `onOpenItem` stub live. ss_6131imzt5.
- **DEAD — MyWork/Board test-case detail deep-link** (`?case=<uuid>` never opens CaseDrawer): ss_384935enl.
- **DEAD/BROKEN — TestHub board** (`tm_test_cases.key does not exist` query crash): ss_1680v6i2a.
- **FORK — incident create** (shadcn NewIncidentModal, `incidents` table, non-ADS SEV colors): ss_6188w2krk.
- **FORK — test-case detail** (CatalystDetailRouter in Repository vs dead `?case=` CaseDrawer path from MyWork).
- **LIVE FORK — legacy `/release/incidents/*`** parallel incident generation, nav-reachable: ss_6251s872c, ss_3169tsjjn.

## 9. Open questions

1. `/testhub/board` `tm_test_cases.key` error — is this a stale board-query column ref (should be `id`/display-key) or a missing migration on the dev DB (cyij)? Blocks all test-board interaction; not previously flagged.
2. Incident-board drag "Move blocked" on every drop — is this correct workflow-FSM guarding, or is drag genuinely non-functional? (Synthetic `left_click_drag` may not drive the pointer-sensor dnd; needs a slower press-move-release probe to disambiguate.)
3. Defect P1 slice: wire `/testhub/defects` row → CatalystViewDefect via display key (not the UUID pattern MyWork uses).
4. MyWork/Board test-case detail should converge on Repository's in-place CatalystDetailRouter (D4), and the `?case=<UUID>` deep-link must both resolve AND drop the UUID param (slug contract).
5. Legacy incident dashboard: since it's no longer rendering mock literals, re-confirm whether it reads the same `ph_issues` source as `/incident-hub` before retiring (it shows 152 total vs hub's 142 — key-space/filter differs).

## 10. Confidence level

**HIGH** for: defect dead detail, TestHub board crash, incident create fork, CycleDetailPage raw table, legacy stack live+nav-reachable, release/incident-detail canonical panels (all directly observed + DOM-probed, `hasDialog`/`querySelector('table')`/computed-color checks).
**MEDIUM** for: incident-board drag verdict (synthetic drag limitation — "Move blocked" observed but transition-guard vs broken-dnd not fully disambiguated); release-row-click friction (worked via DOM `.click()`, MCP pixel-click missed the narrow 2-line link).
**Correction logged (HIGH):** legacy `/release/incidents/dashboard` does NOT render the mock `3/24/18/4.2h` KPIs live — agents 03 #3 / 07 D2 P0 is not reproducible; downgrade from "renders lies" to "duplicate-to-retire."
