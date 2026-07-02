# CAT-HEALTH-ENGINE-20260702-001 — Agent Outputs

> Raw outputs from all parallel agents.
> One section per agent. Append — never delete.

---

## Agent 1 — Canonical Component Discovery

Drawer: `CatalystDrawer.tsx` (wrapper over `@atlaskit/drawer`, used 17+ places). Avatar: `CatalystAvatar.tsx` + `Tooltip.tsx` (combined precedent: `WatchersChip.tsx:155-165`). Status pill: `Lozenge.tsx`/`StatusLozenge.tsx` — risk band already routes through `riskBandAppearance()` in `AttentionItemCard.tsx:20-27` (Critical→removed, High→moved, Medium→inprogress). KPI tile: matches `KpiCell` pattern in `AtAGlanceWidget.tsx:64-162`. `CatyPulseIcon.tsx` — props `size?`, `title?`, uses token `color.icon.accent.magenta` (`#CD519D` fallback), already used by `MicRecordingBar`, `SelectionTranslate`, `ImproveIssueDropdown`. `src/features/health/` directory does not yet exist.

---

## Agent 2 — Canonical Screen Discovery

`BoardManagerPage.tsx:229-345` — flex row, left panel `0 0 38%`/`1 1 100%` toggle, right panel `0 0 62%` renders `BoardInsightsPanel` when `insightsBoard` state truthy. Trigger: `Activity` icon in `BoardRowActions` (row-level menu action), NOT the magenta pulse. Second pattern found: `BoardView.tsx:322-406` (R360) uses a portal (`panelPortalTarget`) with `CatyBoardInsight`, which has its own magenta pulse trigger (line 259) and is a **separate AI-digest system** — card-based board-state summary, different data source, do not merge with rule-based Board Health. Target page paths confirmed to exist: `SprintsPage.tsx:309-346` (CatalystListPageLayout/ProjectPageHeader), `DependenciesPage.tsx:67-78` (DependenciesView), `NativeStoryBacklogPage.tsx:30`, `NativeFeatureBacklogPage.tsx:30`, `ProjectHubTimelinePage.tsx:421-439` (TimelineView/ProjectPageHeader), `FilterBuilder.tsx:42-80` (standalone, no page wrapper).

---

## Agent 3 — UI/UX Critic

Zero hardcoded colors / Tailwind utilities in `BoardInsightsPanel.tsx` or `AttentionItemCard.tsx` — both files use only `var(--ds-*)` tokens. One real defect: `AttentionItemCard.tsx` line ~39-43 sets `borderLeft` color via `var(--ds-text-warning)` for the 'High' risk band — a text-color token misused as a border color; should be an actual border/status token. All other borders correctly use `var(--ds-border)`/`var(--ds-border-focused)`. Assignee rendering (lines 109-116) confirmed plain text + icon glyph, no avatar image/component. Recommendation text (`useBoardInsights.ts` lines 205-216) is genuinely rule-specific — 6 distinct messages by precedence (flagged/at-risk → overdue → unassigned+high-priority → stale7d → due-soon → fallback), not boilerplate.

---

## Agent 4 — Integration Architect

`HealthScope`: discriminated union keyed by `moduleKey` (`'board' | 'backlog' | 'filters' | 'sprint'`, only `'board'` implemented Phase 0), keeps facade signature `(string, HealthScope)` stable as modules are added. `HealthKPI` = `{key, label, value, tone}`. `HealthAttentionItem` = generic shape with a `kind: 'issue'|'day'|'state'|'generic'` discriminator, optional issue-shaped fields, plus a `meta: Record<string, unknown>` escape hatch for Sprint/Timeline's non-issue payloads later — deliberately minimal, no further engineering now. `HealthPanel` calls `useHealthSignals('board', scope)`; board adapter wraps `useBoardInsights` unchanged and reshapes. `AttentionItemCard` keeps its current prop contract for issue fields; risk-band→tone mapping stays card-owned. Confirmed `useBoardInsights` has exactly one external call site (`BoardInsightsPanel.tsx`) — safe to retire in the same slice, same React Query cache key regardless of caller so no double-fetch/cache-collision risk even during a transitional overlap (not needed — recommend direct cutover).

---

## Agent 5 — Data/Safety Guard

| Table | Exists | Columns claimed | RLS readable | Notes |
|---|---|---|---|---|
| ph_issues | YES | all 8 confirmed | YES (authenticated, `wh_issues_select`) | indexed on due_date, jira_updated_at, status_category (+ composite indexes) |
| ph_sprints | **NO** | n/a | n/a | does not exist; sprint data is text-only `sprint_name` on ph_issues — breaks Phase 3 assumption |
| business_requests | YES | 2/2 confirmed | YES (permissive, `USING (true)`, no auth required) | `health_status` stored as green/yellow/red strings — conflicts with earlier DatePulse research naming 7 states (Blocked/Delivered/etc.) — reconcile before Phase 4 |
| ph_issue_dependencies | YES | 3/3 confirmed | UNKNOWN (no RLS policy found in migrations) | not currently queried anywhere, low priority for Phase 0 |

---

## Agent 6 — Implementation Planner

9-step ordered file-edit list, reproduced in `03_PLAN_LOCK.md` "Files to modify". Key confirmations: `AttentionItemCard.tsx` has zero board-specific imports or routing (only an `onOpen` callback) — safe to keep standalone and reused unmodified by later phases, only needs a type-import rename (`AttentionItem` → `HealthAttentionItem`) plus the 3 render fixes (avatar, border token, elevation) in this phase. `useBoardInsights.ts`/`boardInsightsConfig.ts` explicitly left untouched. Recommends direct cutover of `BoardManagerPage.tsx` from `BoardInsightsPanel` to `HealthPanel` in the same slice rather than a dual-mount transition.

---

## Agent 7 — QA/Screenshot Validator

15-item checklist: before/after screenshots for panel-closed, panel-open KPI row, hovered/expanded card, empty state (0 attention items), and assignee avatar swap. DOM probes: computed `border-color` must resolve to the correct token value (not black/hex), computed `background-color` of status pills must be token-derived, computed `box-shadow` must be token-derived not hand-rolled rgba. Functional checks: top-10 cap enforced, KPI tile counts match manual count on a fixture, existing board page (columns/DnD/filters) unaffected, `useHealthSignals` output snapshot-matches direct `useBoardInsights` output on same fixture (zero diff). Color-law grep scoped to `src/features/health/` + `src/components/boards/` must return zero matches. `npm run lint:colors:gate` and `npm run audit:ads:gate` must both pass, no baseline ratchet-up permitted for this slice.

---

## Net effect on original plan

The originally assumed Phase 0 scope ("fix yellow pills / hardcoded colors / boilerplate recommendation text") was wrong on 3 of 4 points — the code is already ADS-token-compliant and the recommendation text is already rule-specific per signal. Real Phase 0 work is narrower: one border-token misuse, missing avatar, and the trigger icon being a plain `Activity` glyph instead of the magenta pulse — plus the architectural extraction (types/adapter/facade/panel) that makes Phases 1-5 adapter-only work. Also surfaced: `ph_sprints` doesn't exist (Phase 3 needs re-scoping later) and `business_requests.health_status` uses green/yellow/red strings, not the 7-state names assumed from the DatePulse research (reconcile before Phase 4). Plan Lock updated to reflect all of this.
