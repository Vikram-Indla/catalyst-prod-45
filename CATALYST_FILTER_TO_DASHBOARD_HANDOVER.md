# Handover — Feature 3: Create Dashboard from Filter

**For:** Claude Code. **Author:** Claude Co-Work (discovery + design). **Date:** 2026-06-12.
**Branch:** create `feature/filter-to-dashboard` off `main`.
**Pattern:** mirror the filter→Kanban / filter→Roadmap verticals — reuse the renderer, compute from the filter via a pure adapter.

Re-read `CLAUDE.md` (Ways of Working, ADS guardrails, RLS lessons, git rules). **§3 is the most important section.**

---

## 1. Context & status

Feature 1 (Kanban) built + flag-gated; Feature 2 (Roadmap) in handover. **This is Feature 3: Create Dashboard from Filter.** Remaining after: WhatsApp Summary, What Changed Since Last Visit, Pin to Workspace.

The prod RLS helper `public.user_can_see_filter(p_filter_id uuid, p_uid uuid)` is **live** (project `lmqwtldpfacrrlvdnmld`) — reuse it. If Feature 2 created `filter_derived_views`, this feature **extends** it (type discriminator), it does not create a parallel table.

---

## 2. Non-negotiable rules

1. **Atlaskit-only for NEW code** — `@atlaskit/*` / existing canonical wrappers; no `@radix-ui/*`, shadcn `ui/`, or new Tailwind; icons only from `@/lib/atlaskit-icons` + `WorkItemTypeIcon`; tokens + 4/8/16/24/32 grid. (Reusing an existing widget that has Tailwind inside is fine — lesson #11 — just don't ADD Tailwind.)
2. **Reuse-first** — forking a canonical component is banned; parameterise.
3. **Source filter is truth** — dashboard is a live pointer (`source_filter_id`), never a copy; permissions inherit and only narrow.
4. **Zero-assumption (P0)** — counts from REAL filter results only; no fabrication; unknown owner = "Unassigned".
5. **Smallest schema delta** — extend `filter_derived_views`; RLS via SECURITY DEFINER helper, `p_`-qualified params.
6. **Every pixel has a reason. No AI** — metrics are computed, not generated.
7. **Vertical, not horizontal** — create → view → access → states behind a flag; TDD; small steps; stop-and-confirm. When in doubt, ask JK.

---

## 3. Hard-won lessons from Features 1–2 — DO NOT REPEAT

| # | Pitfall | Rule for Dashboard |
|---|---|---|
| 1 | `boards.project_id` FKs to the **legacy `projects`** table, not `ph_projects`. Passing a ph_projects id → FK violation → **silent fail, no row created**. | Before INSERT into ANY table, check the FK target of every `*_id` column (`pg_constraint`). Associate via a text key or the correct table. Never assume `*_id → ph_projects`. |
| 2 | `create_board` has **two overloads**; partial named-arg RPC calls fail to resolve in PostgREST. | Check `pg_proc` for overloads before any RPC. Pass enough args to disambiguate, or write to the table directly. |
| 3 | `created_by` is NOT NULL but the RPC relied on `auth.uid()` (empty in some contexts) → silent failure. | Pass the user id **explicitly** from `supabase.auth.getUser()` for any NOT-NULL owner column. |
| 4 | The create mutation's catch only `console.error`'d → user saw a spinner then nothing. | **Always surface errors in the UI** (red text / `@atlaskit/flag`). Never swallow. |
| 5 | The view defaulted its active entity to `list[0]` → risk of opening the **wrong** dashboard. | Select the entity from the `:id` **route param**, not a list default. Verify by navigating to a brand-new id. |
| 6 | The filter kebab is **intentionally** a self-rolled portal: `@atlaskit/dropdown-menu` (via `@atlaskit/popup`) breaks inside `JiraTable`'s `overflow:hidden`. | Do NOT "restore" `@atlaskit/dropdown-menu`. **Add** the Dashboard item to the existing hand-rolled `menuItem(...)` menu. |
| 7 | Vite env flags need a full dev-server restart; owner-only gating hid the action. | Document the restart. Show the create action broadly (not owner-only) unless JK says otherwise. |
| 8 | ADS-scan-clean was necessary but **not sufficient** — create bug, routing, column mapping were invisible to it. | Run `tsc --noEmit` + `vitest` + the **live app** every step. |
| 9 | RLS needs SECURITY DEFINER helpers, `p_`-qualified params; apply to prod only with approval + 2-user isolation test. | Reuse `user_can_see_filter`. Seed → member sees / stranger denied → clean up. |
| 10 | A stale `.git/index.lock` blocked commits; `git add -A` is banned. | Stage explicit paths; `git status` before commit; `git -C <repo>`. |
| 11 | `MetricCard` and some dashboard widgets use **Tailwind colour classes internally** (predate the ADS lockdown). | **Reuse them as-is** (don't rewrite). Do NOT add Tailwind in new code. If the scanner flags a file you only imported, that's the existing component, not your code. |

---

## 4. Feature spec

From the filter ⋯ kebab → **Create Dashboard from filter**. Guided modal: name + widget template. On create, a persisted dashboard is bound to the source filter (live pointer). Opening it renders KPI cards + simple breakdowns computed from the filter's current result set. Re-reads the filter on each load. Access follows the filter.

**Datasource precedence (PRD):** source filter → dashboard-level refinement → widget-level refinement (each may only narrow). **v1: source filter only**; refinements are a documented follow-up.

---

## 5. Confirmed reuse targets

| Need | Reuse | Notes |
|---|---|---|
| KPI card | `MetricCard` (`@/components/dashboard`) | props `label, value, trend?, icon, iconVariant`; icons from `@/lib/atlaskit-icons`; Tailwind inside — reuse as-is (lesson #11). |
| Widget container | `WidgetShell` (`product-dashboard/WidgetShell`) | `title` + `children` with loading/empty affordances. |
| Gauge / activity | `QualityGauge`, `ActivityFeed`, `CycleCard`, `ReleaseCard` | use as-is. |
| Dashboard page shell | `ProductDashboardPage` (`product-dashboard`) | route `/product-hub/:key/dashboard`. Reuse layout; **do not** reuse its `business_requests` widget queries — compute from the filter. |
| Issue source | `useJqlResults(filter.jql_query)` | `{ items: JqlResultRow[], totalCount }`, cap `JQL_RESULTS_LIMIT` (100). |
| Metrics aggregator (NEW) | `filterDashboardSource.ts` → `jqlRowsToDashboardMetrics(rows)` | pure: total/open/closed/overdue/due-this-week/high-risk/no-owner/by-status/by-owner. Mirror `jqlRowToBoardIssue`. |
| Charts (if needed) | `recharts` (already a dep) | by-status/by-owner bars; keep v1 minimal. |
| Kebab entry | `FilterKebabMenu.tsx` (hand-rolled menu) | add `menuItem('Create Dashboard from filter', …)`. |
| Dedup | `useExistingBoardForFilter` | mirror as `useExistingDashboardForFilter`. |
| Container table | `filter_derived_views` (type='dashboard') | reuse Feature 2's table; config in `shared_default_config` jsonb. |
| Access RLS | `user_can_see_filter` (live) | same clause on the container SELECT policy. |
| Flag | `ENABLE_FILTER_TO_DASHBOARD` (ADD, default off) | mirror `ENABLE_FILTER_TO_KANBAN`; `VITE_ENABLE_FILTER_TO_DASHBOARD=true` to test. |

Reference implementations: `src/components/kanban/adapters/filterBoardSource.ts` (pure adapter), `src/hooks/workhub/useCreateKanbanFromFilter.ts` (create-service + the FK / explicit-user-id fixes), `src/components/filters/FilterKebabMenu.tsx` (hand-rolled menu + guided modal + dedup + error surfacing).

---

## 6. Design decisions & forks

- **Reuse renderers, compute metrics from the filter.** `jqlRowsToDashboardMetrics(rows)` (pure) → feed `MetricCard`/`WidgetShell`/`ActivityFeed`. Do NOT reuse the product-hub widgets' `business_requests` queries.
- **v1 = one opinionated bundle (Executive Summary):** Total, Open, Overdue, High-risk, Due-this-week, No-owner + By-status + By-owner. Confirm (Q-D1).
- **Metrics from real results only** (zero-assumption): overdue = has due_date AND past AND not done; no-owner = null assignee counted as "Unassigned". Never fabricate.
- **v1 source-filter only** (no refinements yet).
- **Access = filter access.** No separate people-management.
- **No AI.**

---

## 7. Data model

Reuse `filter_derived_views`: a dashboard row = `{ id, source_filter_id (FK ph_saved_filters), type:'dashboard', title, shared_default_config jsonb, visibility, owner_id, timestamps }`. RLS mirrors `ph_saved_filters` + the `user_can_see_filter` clause. If Feature 2 hasn't landed the table yet, create it (same spec) and **check every FK target before insert** (lesson #1). The legacy `dashboard_widgets` table is NOT a filter-backed container — don't repurpose it.

Migration as a FILE; apply via Supabase MCP only after JK approves; run a 2-user isolation test.

---

## 8. Build steps (vertical — TDD, flag-gated)

1. **Discovery read (no code)** — dashboard widgets, `WidgetShell`, `ProductDashboardPage`, the dashboard route, and whether `filter_derived_views` exists (FK targets!). Confirm Q-D1..Q-D4 with JK. Don't build past Step 1 until answered.
2. **Flag** — `ENABLE_FILTER_TO_DASHBOARD` + test.
3. **Schema** — reuse/extend `filter_derived_views`; RLS via `user_can_see_filter`. Apply after approval; 2-user test.
4. **`useExistingDashboardForFilter`** dedup hook (+ TDD).
5. **`filterDashboardSource`** — pure `jqlRowsToDashboardMetrics` (+ TDD: counts, overdue, no-owner→Unassigned, by-status/by-owner, zero-assumption) + thin `useFilterDashboard(jql)` over `useJqlResults`.
6. **Dashboard view** — route/page loads the derived view, runs the filter, computes metrics, renders cards + breakdown via `ProductDashboardPage` layout. Select entity from `:id` route param (lesson #5).
7. **Kebab UI** — `Create Dashboard from filter` in the hand-rolled menu + guided modal (name, template) + dedup ("Open Dashboard") + nav + error surfacing.
8. **NFR + states** — per-widget empty (no data → empty state, not a broken card), error, loading skeletons, `<1s`.
9. **Close-out** — ADS STRICT-clean (your files); `tsc --noEmit`; `vitest`; run the LIVE app (create → open the RIGHT dashboard → real counts); map to AC-D1..D4; explicit-path commit.

---

## 9. Acceptance criteria

- **AC-D1** — filter creates a persisted dashboard linked to the filter (live), opens to the CORRECT dashboard after navigation.
- **AC-D2** — every metric computed from the live filter result set; counts match; nothing fabricated.
- **AC-D3** — reuses existing widgets/`WidgetShell` (no new dashboard framework).
- **AC-D4** — visibility never exceeds the source filter (RLS via `user_can_see_filter`); 2-user isolation test passes.
- Plus: ADS STRICT-clean on your files; `tsc` clean; new Vitest green; create flow surfaces errors in the UI.

---

## 10. Verification & git discipline

- After every file: `node design-governance/rules/audit.js <path>` → `AUDIT PASSED`.
- Before commit: `npx tsc --noEmit` clean; `npx vitest run <new tests>` green.
- **Run the app each step** — static checks miss runtime bugs.
- Stage **explicit paths only** — never `git add -A`. `git status` before commit. `git -C <repo>`.

---

## 11. Open questions for JK (resolve before/at Step 1)

- **Q-D1** — default widget bundle for v1? *(Rec: Executive Summary — total/open/overdue/high-risk/due-this-week/no-owner + by-status + by-owner.)*
- **Q-D2** — charts: reuse recharts or simple token-styled bars? *(Rec: simple bars first.)*
- **Q-D3** — container: reuse `filter_derived_views` (type='dashboard')? *(Rec: yes.)*
- **Q-D4** — landing route for a project-hub filter-dashboard (mirror boards/roadmaps)?

Do not build past Step 1 until Q-D1/Q-D3 are answered — they change the aggregator and the schema.
