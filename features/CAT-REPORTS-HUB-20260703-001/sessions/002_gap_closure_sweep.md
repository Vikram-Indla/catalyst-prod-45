# Session 002 — Gap closure sweep (2026-07-03)

**Instruction:** Vikram: "complete all known gaps" (07_HANDOVER.md Known gaps 1–6). Full autonomy per D-003 pattern; automated gates per slice.

**Start state:** main @ 42d24a797. Dark-mode check (gap 0) already closed by 42d24a797/de2f8a2aa. Dirty files under features/CAT-WORKFLOW-STUDIO-* belong to concurrent session — untouched.

## Slices

### S2.1 — G4 insight cards + G6 d3 removal
- ReportInsightCard + counts-only aggregates mounted on 5 remaining bodies: ProjectTestingStatusBody, ProductStatusBody, TesterPerformanceBody, TeamPerformanceBody, GovernanceBody (pattern: SprintTestingStatusBody).
- d3: sole consumer was dormant, unrouted `src/modules-dormant/wiki/WikiKnowledgeGraphPage.tsx` (wiki routes removed; file unreferenced — verified via grep). File deleted (git history = archive); `d3` + `@types/d3` dropped from package.json; `bun install` ran (lockfile already free of d3).
- Gates: tsc clean.

### S2.2 — G3 tm_ai_usage_log restore (staging cyij)
- Recreated from original DDL (20260104074712) + RLS (20260104074944), with service-role insert path for edge fn (function inserts without user_id).
- Committed migration file mirrors staging apply.

### S2.3 — G1 status-history DDL (D-004 unlock) + CUT reports
- `ph_issue_status_history` + AFTER UPDATE/INSERT trigger on ph_issues (covers all 6 client mutation paths found in discovery: useCatalystIssueMutations, IssueContentView, useKanbanMutations, useUpdateIssueField, workItemRepo, +future).
- tm_defects.resolved_at auto-stamp trigger on closure transitions.
- 4 reports wired: incident-mttr, defect-closure-trend, approval-age, points-burndown (count-based per PHASE0 blessing; honest empty states until history accrues — zero-assumption law).

### S2.4 — G5 people identity resolution + G2 seed
- ph-side assignee: display-name → profiles match at query time (jira_display_name/full_name), avatar when matched, initials fallback otherwise. No fake defaults.
- tm_* demo seed on cyij, REVAMP-DEMO-20260703 tag.

## Evidence
- Gates at both commits: tsc clean · lint:colors:gate 0 · audit:ads:gate at baseline (tokens 27316, typography 1658, spacing 1) · CRE gate pass.
- Trigger smoke test: transactional status flip on BAU-5923 captured 1 history row, fully rolled back (0 residue, status unchanged).
- Seed verify (cyij): tm_test_cases 41→71, runs 13→53, RVCYC-003 scope 44, story links 38, defects 14 (4 dated closures via trigger), plans 2, approvals 3.
- Live screenshots (dark mode, 2026-07-03, in transcript): defect-closure-trend (13/9/4 + weekly chart + Caty chip), approval-age (1 pending/2 decided/2.5 avg/5 oldest + lozenge table), incident report (MTTR em-dash "capture from 2026-07-03", assignee avatars), team-performance (9 testers, avatars, insight), points-burndown honest empty state on itemless sprint.
- Ledger: 20260703280000 / 290000 / 300000 rows reconciled 1:1 with committed files.

## Commits
- e7cfe1e0b — S2.1 insight cards ×5 + d3 removal
- 4f31d7594 — S2.2–S2.4 DDL + 4 CUT reports + people identity
- (final) — docs + seed placeholder migration

## Post-review fix ("fix", same session)
Points Burndown dead-ended: picker built from ph_jira_sprints defaulted to archived duplicate sprint ("…06 Jul 26-2") that zero issues reference → "Nothing in this sprint". Three stacked causes fixed:
1. Picker now derives options from ph_issues.sprint_release (scope truth) with item counts, ordered by sprint recency.
2. PostgREST max_rows=1000 silently truncated the 2381-row sprint_release fetch (undercounted every sprint, 104 vs 209) → paginated fetchAllSprintReleaseRows with .range() batches.
3. catalyst-rq-cache (PersistQueryClientProvider, 15-min staleTime) kept serving the truncated result across reloads — cache cleared to verify; entry expires naturally for users.
Verified live: 209 scope / 197 done / 12 remaining = DB truth; honest "No timeline to plot" (sprint lacks start_date).

## "go" sweep (same session)
1. **Truncation class sweep:** shared `fetchAllPages` helper; paginated every growth-unbounded reports query past the server max_rows=1000 cap — useSprintTestingStatus (stories/QA Bugs/incidents), useProjectTestingStatus + useGovernance (per-project stories), useDefectsIncidents (QA Bug volume 791, closest to cap), useIncidentReport (rows + project options), useIncidentMttr (history grows forever). Bounded queries (.in(keys), epic children) left alone.
2. **Release-signoff chain seeded** (REVAMP-DEMO-20260703): release_vehicles → releases (slug senaei-bau-2026-07-seed) → 3 tm_release_signoffs (approve/pending/reject). ApprovalAgeBody lozenge map extended for signoff decision vocab (approve/reject vs approved/rejected). Verified live: 6 rows, 2 pending / 4 decided.
3. **Senaei BAU dedup:** stale 748f80ae (16 TC-00xx cases + 1 key_sequence, zero other refs) merged into canonical 84f91caf; stale project row deleted. One "Senaei BAU" remains; canonical = 60 cases.
4. Ledger: my 310000 collided with concurrent session's sprint_insight_cache → renamed to 20260703330000, ledger row updated. (Version collision check BEFORE naming — learned again.)

## "go" #2 — light-mode evidence + app-wide truncation scan
- **Reload-into-light** (theme toggle persists to DB; localStorage 'catalyst-theme' alone is overridden): defect-closure-trend, approval-age, points-burndown, sprint-testing-status all render clean in light — tokens resolve, charts readable, lozenges correct. Dark restored after.
- **Regression pass on paginated hooks:** sprint-testing-status live on Refactor-Senaei 3.0 — 3 stories / 193 QA bugs / 12 incidents (full QA-bug count only correct WITH pagination); points-burndown 209/197/12 unchanged.
- **App-wide truncation scan (agent):** reports tree clean; four unbounded sites remain OUTSIDE this feature — kanban product/BR board (no limit, worst), PersonalizedQueryProcessor + useProjectBriefing week narratives, useWeekSummary my/team closed. Out of scope here → spawned background task chip "Fix max_rows truncation outside reports tree" with file:line details. Kanban issue boards already .limit(2000); backlog health already paginates.

## "go" #3 — picker parity + exports on new bodies
- SprintTestingStatusBody picker now scope-derived (same fix as burndown: sprint_release truth + item counts + recency order), status lozenge preserved via ph_jira_sprints enrichment. Verified live: "(209 items)" + COMPLETED lozenge, report data intact.
- ReportExportMenu (CSV/PDF) added to the 3 new bodies: defect-closure-trend (weekly rows), approval-age (full rows table), points-burndown (daily series; disabled when no timeline). Verified live on approval-age.
- Truncation-fix chip for kanban/home surfaces started by Vikram in separate session — those files untouched here.

## "Fix everything bending" pass
- Approval Age JiraTable clipped its Age column past the canvas (fixed widths summed 48/100 + flex) → widths rebalanced to 38 total, label "Age (d)"; no horizontal scroll, verified live.
- Points Burndown sprint picker truncated count labels at 20rem → 26rem (parity with sprint body); full label verified.
- Defect closure trend line chart drew false continuity across empty weeks → weeks zero-filled between first and last activity (line at 0 is truth; a skipped week is a lie).
