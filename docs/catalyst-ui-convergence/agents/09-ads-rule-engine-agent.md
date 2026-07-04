# Agent 09 — Rule Engine / ADS Compliance Audit

**Feature context:** UI-convergence discovery (10-agent swarm). CODE-ONLY audit — no live-browser probes.
**Date:** 2026-07-03
**Auditor:** Agent 09 (Rule Engine / ADS Compliance)

---

## Scope covered

Destination hubs plus the Project Hub baseline, defined as these directory sets (all under repo root `/Users/vikramindla/Documents/GitHub/catalyst-prod-45`):

| Hub | Directories |
|---|---|
| **Release Hub** | `src/pages/release-hub`, `src/pages/releasehub`, `src/pages/release`, `src/pages/releases`, `src/components/release-hub`, `src/components/releasehub`, `src/components/release`, `src/components/releases`, `src/lib/releases`, `src/lib/releasehub`, `src/lib/release-ops`, `src/hooks/releases`, `src/features/all-releases`, `src/features/release-compare`, `src/features/release-calendar` |
| **Test Hub** | `src/pages/testhub`, `src/components/testhub`, `src/lib/testhub`, `src/hooks/testhub`, `src/hooks/test-cases`, `src/hooks/test-cycles`, `src/hooks/test-management`, `src/features/my-test-scope`, `src/components/catalyst-detail-views/test-cycle`, `src/components/catalyst-detail-views/test-case` |
| **Incident Hub** | `src/pages/incidenthub`, `src/components/incidents`, `src/modules/incidents`, `src/components/catalyst-detail-views/incident` |
| **Defect surfaces** | `src/components/releases/defects`, `src/components/catalyst-detail-views/defect`, `src/components/evidence/defect` (plus defect pages inside `src/pages/releases` counted under Release Hub) |
| **Project Hub (baseline)** | `src/pages/project-hub`, `src/components/project-hub`, `src/components/projecthub` |

Rule sources applied: repo `CLAUDE.md` (ADS TOKENS ONLY hard stop, hand-rolled UI ban, JiraTable rule, zero-assumption rendering, slug contract), `scripts/no-hardcoded-colors.cjs`, `design-governance/rules/audit.js`, `scripts/cre-chokepoint-gate.cjs`, TestHub P1-S5 status-vocabulary canon (`src/lib/testhub/enums.ts`).

## Files inspected

- 579 source files in scope (Release 197, TestHub 114, Incident 94, Defect 13, Project Hub 161), scanned via repo scanners + targeted grep.
- Read in full or in part: `scripts/no-hardcoded-colors.cjs`, `src/lib/testhub/enums.ts`, `src/routes/FullAppRoutes.tsx` (guard wiring), `src/components/releases/defects/SeverityBadge.tsx`, `src/pages/testhub/sets/SetDetailPage.tsx` (L425–440), `src/components/project-hub/project-list-utils.tsx`, `src/components/project-hub/wizard/StepDetails.tsx`, `src/pages/project-hub/StoryDetailPage.tsx`, plus grep evidence lines cited below.

## Routes inspected (code-level, from `src/routes/FullAppRoutes.tsx`)

- `/testhub/*` (L670–703): dashboard, my-work, board, repository, cycles, cycle detail/execute, timeline, dependencies, sets, traceability, defects, reports/*, filters/*
- `/incident-hub/*` (L709–753): dashboard, all-incidents, board, filters/*, timeline, dependencies, work, analytics, reports, committee-queue, view/:incidentKey, backlog/:key
- `/release-hub/*` (L756–783): overview, release-kanban, work, filters/*, timeline, production-events, calendar, releases-management(+/:releaseSlug/work), changes/:changeId, sop-templates, settings, `:releaseId` catch-all
- `/project-hub/*` and `/projects/*` (L852–1027): projects, boards, work, backlog, settings, resource-360, dashboards

## Screenshots captured

N/A — code-only audit per mission brief.

---

## Scanner results (repo gates)

| Gate | Result |
|---|---|
| `npm run lint:colors` | ✅ PASS — "No hard-coded colors found" (scanner runs in **fallback-pragmatic mode**: `var(--ds-*, #hex)` and `token('x', '#hex')` fallbacks are *allowed* by the scanner even though CLAUDE.md bans them) |
| `npm run lint:cre` | ✅ PASS — CRE chokepoint gate clean |
| `npm run audit:ads` | ❌ FAIL — 27,222 repo-wide (tokens 25,631 — **known-noisy category**, over-reports var()/token() fallbacks; typography 1,590; spacing 1; fontImports 0). Ratchet gate (`audit:ads:gate`) is the blocking mechanism, not this raw count. |

Interpretation: the committed gates are green because they ratchet against baseline / allow fallback hex. The violations below are what the gates *tolerate* but the CLAUDE.md contract bans, plus categories no scanner covers (Tailwind color utilities, hand-rolled components, status drift, guard gaps).

---

## Per-hub violation counts

Grep methodology: hex = `#[0-9a-fA-F]{3,8}` excluding `ads-scanner:ignore` and comment-leading lines; rgb/hsl = raw `rgb()/rgba()/hsl()` including fallback positions; Tailwind = `(bg|text|border|ring|fill|stroke)-(color)-N` utilities; inline style = `style={{` occurrences (context metric, most are token-based).

| Category | Release Hub | Test Hub | Incident Hub | Defect | Project Hub | Total |
|---|---:|---:|---:|---:|---:|---:|
| Files in scope | 197 | 114 | 94 | 13 | 161 | 579 |
| Bare/fallback hex | 0 | 0 | 1 | 0 | 42 | 43 |
| rgb()/rgba()/hsl() (incl. fallbacks) | 90 | 5 | 48 | 0 | 110 | 253 |
| — of which bare (not var/token fallback) | 2 | 0 | 0 | 0 | 1 (+comments) | 3 |
| Tailwind color utilities ⛔ | **732** | 34 | 76 | **86** | 24 | **952** |
| Raw `<table>` (JiraTable rule) | **13** | 4 | 4 | 1 | 14 | **36** |
| Hand-rolled `role="dialog"` | 1 | 1 | 0 | 0 | 4 | 6 |
| `position: fixed` overlays | 18 | 9 | 1 | 0 | 23 | 51 |
| Local status-color maps | 2 | 2 | 0 | 0 | 2 | 6 |
| Inline `style={{}}` (context) | 1,390 | 702 | 182 | 11 | 2,238 | 4,523 |
| One-off `.css` files | 0 | 0 | 0 | 0 | 2 | 2 |
| Route-guard coverage | ⚠️ 1 of ~20 routes | ❌ **none** | ✅ full `MG` | ❌ inherits | ❌ none | — |

**Findings count:** ~1,290 discrete rule-violation hits across the five hubs (952 Tailwind color + 43 hex + 253 raw color functions + 36 raw tables + 6 hand-rolled dialogs), plus 3 structural findings (guard gaps, status-vocabulary drift, duplicate dead files). Inline-style and position:fixed counts are context metrics, not all violations.

---

## High-risk findings

### A. Status-vocabulary drift (vs TestHub P1-S5 canon)

1. **`src/pages/testhub/sets/SetDetailPage.tsx:433` — HIGH.** Queries `tm_test_cycles` with `.in('status', ['draft', 'planned', 'active', 'in_progress', 'paused'])`. P1-S5 collapsed `tm_cycle_status` 7→4 (`planned|active|completed|archived`); `draft`, `in_progress`, `paused` are no longer valid enum labels. If the column is a Postgres enum, this filter can 400 (`invalid input value for enum`) — a live-bug candidate, and at minimum stale vocabulary the P1-S5 work explicitly banned outside `src/lib/testhub/enums.ts`. The comment above it (L425–429) still documents the old 7-value enum. **Canonical:** import from `src/lib/testhub/enums.ts`; filter `['planned','active']`.
2. **`src/hooks/test-cases/useRequirementLinks.ts:216-218` — HIGH.** Local coverage-status map with Tailwind colors (`bg-yellow-100 text-yellow-700` …) inside a *hook*. **Canonical:** return status keys; render with `@atlaskit/lozenge` / `StatusLozenge` (`src/components/shared/StatusLozenge/`).
3. **`src/features/my-test-scope/utils/helpers.ts:15-18, 41-44, 58-86` — HIGH.** Local risk/status/due-date color helpers, all Tailwind colors (`bg-red-500 text-white`, `bg-green-100 dark:bg-green-900/30`, …). **Canonical:** `StatusLozenge` + ADS tokens.
4. **`src/components/releases/quality-gates/ReadinessHistoryTable.tsx:34` — MED.** Local `STATUS_COLORS` map for release readiness. **Canonical:** shared status utility + Lozenge appearance.
5. **`src/components/project-hub/work-items/inline/InlineEditors.tsx:81` — MED.** Local `STATUS_COLORS: Record<string,string>` map in the baseline hub itself. **Canonical:** `StatusLozenge` category colors.
6. **`src/hooks/test-management/useTestCycles.ts:206,361,661,689,711` — LOW.** Raw DB status literals at write sites (values *are* P1-S5-valid and one is annotated) but they bypass `cycleStatusToDb()` from `enums.ts`, re-opening the drift vector the file's own header bans.

### B. ADS token violations (bare colors the gates tolerate)

7. **`src/pages/project-hub/StoryDetailPage.tsx:148` and `src/pages/project-hub/IssueDetailPage.tsx:140` — HIGH.** Bare hex in inline style: `background: '#FFF5F5', border: '1px solid #FFCDD2'`. **Canonical:** `var(--ds-background-danger)` / `var(--ds-border-danger)`.
8. **`src/components/project-hub/wizard/StepDetails.tsx:220-222` — HIGH.** Priority map mixes tokens with bare hex: `border: '#FECDD3'`, `bg: '#FEFCE8'`, `border: '#FEF08A'`. **Canonical:** `var(--ds-border-danger)`, `var(--ds-background-warning)`, `var(--ds-border-warning)` (or Lozenge).
9. **`src/components/project-hub/project-list-utils.tsx:66,98` — HIGH.** `at_risk: { bg: '#FFF7E6' … }` bare hex; `AVATAR_COLORS` array contains bare `#0369A1` and is itself a banned local color-constant map. **Canonical:** `var(--ds-background-warning)`; `@atlaskit/avatar` owns its colors.
10. **`src/modules/incidents/kanban/components/KanbanCard.tsx:197` — HIGH.** `dark:bg-[#431407]` bare hex in a Tailwind arbitrary value. **Canonical:** `var(--ds-background-danger)` (dark-aware token).
11. **`src/components/project-hub/shared/phStyles.css:8` — MED.** `#E8EDF2` embedded mid-gradient in a `!important` skeleton shimmer. **Canonical:** `var(--ds-surface-sunken)` stops only.
12. **~30 `token('color.x', '#hex')` fallbacks across Project Hub dashboard widgets — MED (systemic).** `QADefectsWidget.tsx:113`, `ItemsByStatusWidget.tsx:260,305,396`, `ProductionIncidentsWidget.tsx:111`, `ReleaseConfidenceWidget.tsx:220`, `DeliveryCompositionWidget.tsx:232`, `ScopeChangeWidget.tsx:253`, `OverdueWidget.tsx:305`, `TimeInStatusWidget.tsx:461,581,647,661,686`, `TimeInStatusFullscreenModal.tsx:493,525`, `ReleaseHealthWidget.tsx:285,371,391`, `OnHoldWidget.tsx:301`, `ActiveSprintsWidget.tsx:89-96`, `GadgetSettingsPanel.tsx:550`, `WidgetGalleryModal.tsx:76`, `TeamMemberHoverCard.tsx:102`. CLAUDE.md bans hex fallbacks; the scanner's fallback-pragmatic mode allows them — that gap *is* the finding. **Canonical:** `token('color.x')` with no second argument.
13. **`src/pages/releases/DefectDetailPage.tsx` — HIGH (worst single file).** 130 Tailwind color-utility hits in one file. **Canonical:** ADS tokens + Lozenge/Badge.
14. **`src/features/all-releases/components/TimelineView.tsx:288,293` — MED.** Bare `rgba(0,0,0,0.3)` textShadow + `text-white` on gradient bars. **Canonical:** `var(--ds-shadow-*)` / token text colors.

### C. Canonical-component violations (hand-rolled UI ban)

15. **`src/components/releases/defects/SeverityBadge.tsx` — HIGH.** Fully hand-rolled badge: local Tailwind color map (`bg-red-600 text-white`, `bg-orange-100 text-orange-800`, …) + hand-built pill span. **Canonical:** `@atlaskit/lozenge` with appearance mapping.
16. **Raw `<table>` where JiraTable is mandated — HIGH (36 sites).** Worst offenders: `src/pages/releasehub/ReleaseComparePage.tsx:88`, `TriageQueuePage.tsx:71`, `src/pages/release/IncidentsListPage.tsx:368`, `IncidentCommandCenter.tsx:379`, `IncidentDashboardPage.tsx:400`, `IncidentsList.tsx:292`, `src/pages/releases/AllReleasesPage.tsx:778`, `src/components/releasehub/ReleaseDrawer.tsx:515`, `src/components/releases/defects/DefectTableView.tsx:41`, `src/components/releases/dashboard/TestExecutionTable.tsx:91`, `src/features/release-compare/components/ComparisonTable.tsx:176`, `src/pages/testhub/cycles/CycleDetailPage.tsx:424`, `src/pages/testhub/sets/SetDetailPage.tsx:600,663`, `src/features/my-test-scope/components/TestsTable.tsx:163`, `src/modules/incidents/analytics/pages/IncidentInsightsPage.tsx:397,703`, `DrilldownDrawer.tsx:143`, `RequiresAttentionTabs.tsx:132`, plus 10 Project Hub files (`ProjectTable.tsx`, `AllWorkTable.tsx`, `WorkItemsTable.tsx`, `AllProjectsTable.tsx`, dashboard widgets). Note `src/components/releases/ReleasesTable.tsx:458` and some widget tables may have approved-parity status — unverified. **Canonical:** `src/components/shared/JiraTable`.
17. **`src/pages/testhub/repository/CaseDrawer.tsx:172` — MED.** Hand-rolled drawer (`role="dialog"` + custom overlay). **Canonical:** `@atlaskit/drawer` / `@atlaskit/modal-dialog`.
18. **Hand-rolled initials avatars — MED (systemic, ~20 files).** `borderRadius:'50%'` + `charAt(0).toUpperCase()` initials circles across `src/pages/releasehub/ReleaseDetailPage.tsx`, `ChangeDetailPage.tsx`, `SopTemplatesPage.tsx`, `ProductionEventsPage.tsx`, `AllReleasesPage.tsx`, `FreezeWindowsPage.tsx`, `AllChangesPage.tsx`, `CommandCenterPage.tsx`, `src/pages/release/IncidentRoomDetail.tsx`, `IncidentDetail.tsx`, `IncidentsDashboard.tsx`, `src/pages/releases/CoverageReportsPage.tsx`, `DefectDetailPage.tsx`, `DefectsPage.tsx`, `src/pages/testhub/cycles/ExecutionPage.tsx`, `repository/RepositoryPage.tsx`, and more. **Canonical (icon contract):** face avatar + name tooltip (`@atlaskit/avatar`).
19. **`src/components/releases/defects/DefectKanbanView.tsx` (27 hits) and `ReportDefectModal.tsx` (25 hits) — HIGH.** Hand-rolled kanban + modal with full Tailwind color palettes. **Canonical:** canonical board components + `@atlaskit/modal-dialog`.
20. **RH parallel style system — MED.** `src/pages/releasehub/*` pages style through a local `RH` constant object (`RH.fontBody`, `RH.fontMono`, `RH.ink1`) + `--cp-*` variables — a parallel mini design system inside one hub (see `ReleaseComparePage.tsx:35,88`, `ReleaseCalendarPage.tsx:95,235,242`). **Canonical:** ADS tokens / typography tokens directly.

### D. Permission / guard rules

21. **TestHub routes have NO module gating — HIGH.** `FullAppRoutes.tsx` L670–703: every `/testhub/*` route renders bare `<S>…</S>`. Incident Hub (L709–753) wraps every route in `MG` (ModuleGate org-availability + ModuleGuard role `operations`). No `testhub` key exists in `MG_ROLE_KEY` (L370–375). **Canonical:** wrap in `MG k="testhub"` and add a role-key mapping.
22. **Release Hub gating is 1-of-~20 — HIGH.** Only `/release-hub/overview` (L757) has `ModuleGuard moduleCode="releases"`; kanban, work, filters, timeline, calendar, releases-management, changes, settings, and the `/:releaseId` catch-all are all unguarded — the guard is trivially bypassable by deep-linking any sibling route. **Canonical:** gate the whole `/release-hub` subtree.
23. **Project Hub (baseline) routes unguarded — MED.** L852–1027 all bare `<S>`. If Project Hub is intentionally the open baseline, TestHub/Release partial-gating should be reconciled *against a written rule*, not left divergent.
24. **`/release-hub/:releaseId` (L783) — LOW.** Legacy id-shaped param survives alongside the slug route (`releases-management/:releaseSlug`). Slug contract bans new `:id` params; verify this one is legacy-redirect only.

### E. Hygiene

25. **Duplicate " 2" files — MED.** `src/components/project-hub/dashboard/widgets/TeamMemberHoverCard 2.tsx`, `src/components/project-hub/dashboard/widget-types 2.ts`, `src/lib/jira-changelog-mapper/mapper 2.ts`, `mapper.test 2.ts` — Finder-style copy artifacts committed to the repo; the hover-card dupe still carries an rgba fallback (L89). Delete.
26. **One-off CSS files in Project Hub — LOW.** `src/pages/project-hub/jira-list/components/ask-caty-input.css` (rainbow border — verify it is ring-fenced to the two allowed AI controls) and `src/components/project-hub/shared/phStyles.css` (`!important` shimmer, contains bare hex per finding 11).

---

## Top 20 worst files (combined color + table violation hits)

| # | File | Hits |
|---:|---|---:|
| 1 | `src/pages/releases/DefectDetailPage.tsx` | 130 |
| 2 | `src/features/all-releases/components/ReleaseCard.tsx` | 47 |
| 3 | `src/features/all-releases/components/EnterpriseTableView.tsx` | 46 |
| 4 | `src/pages/release/IncidentDashboardPage.tsx` | 32 |
| 5 | `src/pages/release/IncidentCommandCenter.tsx` | 28 |
| 6 | `src/pages/releases/CoverageReportsPage.tsx` | 27 |
| 7 | `src/components/releases/defects/DefectKanbanView.tsx` | 27 |
| 8 | `src/components/releases/defects/ReportDefectModal.tsx` | 25 |
| 9 | `src/features/all-releases/components/TimelineView.tsx` | 23 |
| 10 | `src/features/release-compare/components/ComparisonTable.tsx` | 19 |
| 11 | `src/pages/releases/QualityGatesPage.tsx` | 17 |
| 12 | `src/components/projecthub/IssueBreakdownPopover.tsx` | 17 |
| 13 | `src/components/releases/all-releases/ReleasesTableRow.tsx` | 16 |
| 14 | `src/features/release-calendar/components/ReleaseBar.tsx` | 15 |
| 15 | `src/components/releases/quality-gates/ReleaseTestSummaryPanel.tsx` | 15 |
| 16 | `src/features/all-releases/components/StatStrip.tsx` | 14 |
| 17 | `src/components/releases/quality-gates/ReadinessStatusCard.tsx` | 14 |
| 18 | `src/pages/release/IncidentViewPage.tsx` | 13 |
| 19 | `src/components/releases/all-releases/ReleasesTimeline.tsx` | 13 |
| 20 | `src/features/release-calendar/components/CalendarGrid.tsx` | 12 |

17 of 20 are Release Hub / Defect surfaces. Release Hub is the convergence epicenter.

## Evidence references

- Scanner runs: `npm run lint:colors` (pass), `npm run lint:cre` (pass), `npm run audit:ads` (fail 27,222 — tokens category noisy per CLAUDE.md).
- Scanner permissiveness: `scripts/no-hardcoded-colors.cjs` L52–63 (`ALLOWED_PATTERNS`) and L113–140 (`isAllowedUsage`, "fallback-pragmatic mode per prompts 3") — allows the `var(--ds-*, #hex)` / `token('x','#hex')` fallbacks that CLAUDE.md bans.
- Status canon: `src/lib/testhub/enums.ts` L1–40 (P1-S5 / D-PIN-6 header: "Raw status string literals are banned outside this file").
- Guard wiring: `src/routes/FullAppRoutes.tsx` L367–384 (`MG_ROLE_KEY`, `MG`), L651–1027 (route declarations quoted above).
- All file:line greps reproduced in the findings above; scan scripts preserved in session scratchpad (`hubscan.sh`, `detail1-3.sh`, `top20.sh`).

## Confidence level

**High** on: per-hub grep counts, guard-gap findings, status-vocabulary drift (SetDetailPage), scanner-gate behavior, top-20 ranking.
**Medium** on: which raw `<table>`s have prior written Jira-parity approval (e.g. `ReleasesTable.tsx`, TimeInStatus widgets reference parity work in comments); severity of `token()` hex fallbacks (contract says banned, committed scanner says allowed); inline-style totals as a violation proxy.
**Not assessed:** runtime/visual impact (code-only), dark-mode correctness, Storybook-MCP component matches (server unauthenticated in this session).

## Open questions

1. Does `tm_cycle_status` remain a Postgres enum after P1-S5? If yes, `SetDetailPage.tsx:433` is a live 400 on the "add cases to cycle" picker, not just drift — needs a staging probe.
2. Is Project Hub's total lack of route gating intentional baseline policy, or should `project`, `testhub`, and `releases` all get `MG_ROLE_KEY` entries? Vikram decision needed before convergence work standardizes either way.
3. Which of the 36 raw `<table>` sites hold written JiraTable-unsuitability approvals (per CATALYST_CANONICAL_COMPONENTS.md)? Several widget tables cite Jira-parity comments; no approval doc was located in this audit.
4. Should the color scanner's fallback-pragmatic mode be tightened to match CLAUDE.md's "no hex fallback" rule, or should CLAUDE.md be amended to bless fallbacks? Today the gate and the contract disagree — that is how 43 hex hits ride through a green `lint:colors`.
5. The `ask-caty-input.css` rainbow border (`#CD519D` gradient) — is this surface one of the two allowed rainbow controls (`AIIntelligenceButton` / `CatyRainbowCTA`)?
