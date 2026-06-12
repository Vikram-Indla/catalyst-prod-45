# Catalyst Filters as Reusable Work Views — Implementation Plan & Concept

**Status:** Discovery + concept only. No code changes in this phase.
**Author:** Claude Co-Work (handover for Claude Code)
**Date:** 2026-06-12
**Source inputs:** Catalyst Filters PRD (.docx), deep-research report, handover brief.
**Scope:** Create Kanban from Filter · Create Roadmap from Filter · Create Dashboard from Filter · Copy WhatsApp Summary · What Changed Since Last Visit · Pin Filter to Workspace.

> **Framing:** This is a *refactor and extension* of the existing Catalyst Filters capability into reusable operational views. It is **not** a new module, a new design system, or a new component library. Every recommendation below cites the real file/table it extends.

---

## 0. Guardrails this plan is bound to

These are non-negotiable and were verified against the codebase, not assumed.

1. **Atlaskit (ADS) is the canonical design system.** The repo carries ~50 `@atlaskit/*` packages, `@atlaskit/tokens`, a curated `src/registry/components.registry.ts`, a banned-component list, and an ADS-violation scanner (`scripts/scan-ads-violations.ts`). Radix/shadcn (`@radix-ui/*`, `src/components/ui/*`) and Tailwind utility components are **legacy being phased out**.
2. **No `@radix-ui/*`, no shadcn `ui/` imports, no Tailwind utility components** in anything new. Every interactive element must resolve to an `@atlaskit/*` primitive or an existing canonical Catalyst wrapper. All colour / spacing / typography via `token()` from `@atlaskit/tokens` — never hard-coded hex outside a token fallback.
3. **No new Kanban / Roadmap / Dashboard / Favorites / Audit engine.** Reuse `KanbanBoardShell` / `PragmaticBoard`, the existing roadmap engine, the dashboard widget set + `WidgetShell`, `user_starred_items` / `useFavorites`, and the existing audit trail.
4. **Source filter is the source of truth.** Derived views are **live pointers** (store `filter_id`), never copies of result sets. Permissions **inherit and may only narrow**, never broaden.
5. **Smallest possible schema delta.** Extend `ph_saved_filters`, `boards.filter_id`, `user_viewed_items`, `user_starred_items` before proposing any new table. New tables only where a genuinely new concept exists (derived-view config, filter visit-state).
6. **Clipboard-only WhatsApp.** No WhatsApp API, no auto-send. Plain text from real counts only.
7. **No JQL exposed to business users in the new flows.** Catalyst already ships `JQLEditor.tsx`/`JQLAutocompleteDropdown.tsx` for power users — those stay untouched. All six new flows are guided-picker only.
8. **No code in this phase.** Discovery, concept, mockups. When anything is ambiguous or would require a net-new pattern, stop and confirm with the product owner. Open questions are collected in §11.

---

## 1. Existing asset audit (what already exists)

| Capability area | Existing assets (verified) | Verdict |
|---|---|---|
| **Saved filters / source-of-truth** | `ph_saved_filters` table — `description, jql_query, viewers_config (jsonb), editors_config (jsonb), starred_by_user_ids, owner_id, used_by_board_ids, hub_scope, last_used_at, use_count, health_status` + RLS. Hook: `src/hooks/workhub/useSavedFilters.ts` (`useCopyFilter`, `useUpdateSavedFilter`, `useDeleteSavedFilter`, `useBoardsForProject`, `useToggleFilterBoardLink`, `useToggleFilterSubscription`). | **Reuse as-is.** This is the root object. |
| **Filter kebab menu (entry point)** | `src/components/filters/FilterKebabMenu.tsx` — already renders Edit · Copy filter · Copy link · Subscribe · Share/Make private · Version history · Change owner · **Create board from filter** · link existing boards · Delete (with "used by N boards" dependency warning). Atlaskit tokens, `@atlaskit/button/new`, `modal-dialog`, `select`, `textfield`. | **Extend.** The single insertion point for all six actions. |
| **Filter supporting UI** | `FilterSaveModal`, `FilterResultsPanel`, `FilterVersionHistory`, `FilterTemplateGallery`, `FilterUsageSparkline`, `TransferOwnershipModal`, `BasicFilterBar`. | Reuse for preview / results / history. |
| **Kanban** | `src/components/kanban/` — `KanbanBoardShell.tsx`, `PragmaticBoard.tsx` (Atlaskit pragmatic-drag-and-drop), `KanbanColumn`, `KanbanSwimlane`, `KanbanToolbar`, `WorkItemCard`, `ViewSettingsPanel`, `useKanbanRealtime`, `useBoardUrlState`. Migration `20260522000001_boards_filter_id.sql` → **`boards.filter_id` FK already exists** (ON DELETE SET NULL). Kebab already creates a board from the filter's JQL. | **Extend.** "Create Kanban from Filter" is ~half-wired; needs the guided grouping/visibility step + dynamic refresh contract. |
| **Roadmap / timeline** | `src/components/{product-roadmap, catalyst-roadmap, executive-roadmap, enterprise-roadmap, objective-roadmap, ideas-roadmap, roadmap, roadmaps}/`; pages `PortfolioRoadmap.tsx`, `ProductRoadmapPage.tsx`, `Roadmaps.tsx`. | **Reuse.** Canonical engine to be confirmed (see Open Q-2); bind it to `filter_id`. |
| **Dashboard / widgets** | `src/components/dashboard/` (`MetricCard`, `QualityGauge`, `ReleaseCard`, `CycleCard`, `ActivityFeed`); `src/components/product-dashboard/` (`WidgetShell.tsx`, `widgets/`, `ProductDashboardPage.tsx`, `DashboardWorkflowPath`). | **Reuse.** Seed a dashboard whose widgets accept `sourceFilterId`. |
| **Workspace / home** | `src/components/for-you/` (`ForYouTable`, `ForYouStatsBar`, `ForYouToolbar`, `ForYouHeader`…), `src/components/home/` (`QuickActions`, `ProjectBriefingView`), pages `ForYouPage.tsx` / `ForYouPage.atlaskit.tsx`. | **Reuse.** "Workspace" surface for pinned filters. |
| **Pin / favorites** | `user_starred_items` table (per-user, RLS, upsert) + `src/hooks/useFavorites.ts`, `src/hooks/useStarredItems.ts`. Chat already has a pin/bookmark pattern (`20260608000500_chat_p2a_pin_bookmark.sql`). | **Extend.** Pin = favorites pattern applied to filters/derived views. |
| **Visit / viewed tracking** | `user_viewed_items` table (`user_id, item_id, item_type, last_viewed_at, view_count`, upsert) + `useForYouData.ts`. | **Extend.** Seed for per-(user, filter) visit-state. |
| **Audit / activity / history** | `AuditTrailPage.tsx`, `src/components/dashboard/ActivityFeed.tsx`, `FilterVersionHistory.tsx`, `audit/` dir. | **Reuse.** Source for "What Changed". |
| **Permissions / RLS / roles** | `ph_saved_filters` RLS (own ∪ shared ∪ owner); `viewers_config` / `editors_config` jsonb; `ProtectedRoute`, `RouteRoleGuard`, `RouteRoleGuard`. | **Reuse + extend** `viewers_config` enum for department scope (jsonb — no column change). |
| **State / data layer** | TanStack React Query throughout (`@tanstack/react-query`), Supabase client `src/integrations/supabase/client.ts`, query persistence. | Reuse the existing hook + query-key conventions. |

---

## 2. Reuse / extend / add decision

**Reuse unchanged:** `ph_saved_filters`, `useSavedFilters`, `KanbanBoardShell`/`PragmaticBoard`, roadmap engine, dashboard widgets + `WidgetShell`, `user_starred_items`/`useFavorites`, `AuditTrailPage`/`ActivityFeed`, For-You/Home surface, Atlaskit primitives + tokens.

**Extend (minimal):**

- `FilterKebabMenu.tsx` — add five `menuItem(...)` entries (Kanban, Roadmap, Dashboard, WhatsApp summary, Pin) + a "What changed" affordance. Each opens an Atlaskit `ModalDialog` using the same pattern already in the file.
- `boards` — already has `filter_id`; add `view_config jsonb` (grouping, visible card fields, badges, drag flag) **only if** the board table has no equivalent already (confirm — Open Q-3).
- `viewers_config` jsonb — add `'department'` as a recognised `type` (data-level, no schema migration).

**Add (new, smallest footprint):**

| New object | Why it can't be an extension | Shape |
|---|---|---|
| `filter_derived_views` (roadmap + dashboard) | Roadmaps/dashboards have no `filter_id` column today (only boards do). One generic table avoids two parallel migrations. | `id, source_filter_id (FK), type ('roadmap'|'dashboard'), title, shared_default_config jsonb, local_refinement jsonb, visibility, owner_id, created_at, updated_at`. RLS mirrors `ph_saved_filters`. |
| `filter_visit_state` | Visit state is per-(user, filter/view), distinct from per-item `user_viewed_items`. | `user_id, context_type ('filter'|'derived_view'), context_id, last_reviewed_at, last_snapshot_ref, UNIQUE(user_id, context_type, context_id)`. RLS = self only. Same pattern as `user_viewed_items`. |
| `workspace_pins` *(or extend `user_starred_items`)* | Pin needs ordering + placement + display config that `user_starred_items` lacks. Prefer a thin new table over overloading favorites. | `user_id, target_type ('filter'|'derived_view'), target_id, display_mode, order_hint, created_at`. RLS = self only. |

> If `boards.view_config` already exists, Kanban needs **zero** new tables. Roadmap/Dashboard need the one `filter_derived_views` table. Visit + Pin are one small table each. **Net new tables: 2–3, all following existing RLS patterns.**

---

## 3. Canonical design-system contract (how "looks like Catalyst" is enforced)

- **Menus:** new kebab items reuse the existing `menuItem()` helper inside `FilterKebabMenu.tsx` (hand-rolled portal already in place). Do **not** introduce a second menu system.
- **Modals:** `@atlaskit/modal-dialog` (`ModalDialog/Header/Title/Body/Footer/Transition`) — identical to the existing "Create board" modal.
- **Form controls:** `@atlaskit/textfield`, `@atlaskit/select`, `@atlaskit/toggle`, `@atlaskit/radio`, `@atlaskit/checkbox`, `@atlaskit/datetime-picker`, `@atlaskit/form`.
- **Buttons:** `@atlaskit/button/new` (`appearance="primary"|"subtle"|"danger"`).
- **Badges / chips:** `@atlaskit/lozenge`, `@atlaskit/badge`, `@atlaskit/tag`.
- **Empty / error / loading:** `@atlaskit/empty-state`, `@atlaskit/section-message`, `@atlaskit/spinner`, `@atlaskit/flag` (toasts).
- **Drawers / detail:** `@atlaskit/drawer` + existing `IssueDetailPane`.
- **Tokens only:** `color.text` `#172B4D`, `color.text.subtle` `#44546F`, `color.border` `#DFE1E6`, `color.background.neutral.subtle.hovered` `#F4F5F7`, `elevation.surface.overlay`, `elevation.shadow.overlay`, primary `#0052CC`. (Light + dark must both resolve through `token()`.)
- **Before merge:** run `npm run scan:ads-violations` and `npm run scan:components`; new components register in `components.registry.ts` if canonical; follow the Cascade protocol in `CANONICAL_COMPONENTS.md` for any change to a shared component.

---

## 4. Capability designs

Each capability follows the same skeleton: **Entry → Guided modal (source filter shown read-only, name prefilled) → Preview → Create → Toast + navigate → Live, filter-linked view.**

### 4.1 Create Kanban from Filter

**Entry:** `FilterKebabMenu` → "Create Kanban from filter" (rename/extend existing "Create board"). 
**Modal inputs:** Board name (prefilled `{filter.name} board`), source filter (read-only chip), **Group by** (Process Step ▸ default, Status, Owner, Department, Delivery Platform, Quarter, Priority, Risk), Visibility (Private / Department / Organization), optional toggles (drag & drop, risk badges, overdue badges, owner avatars, due dates). 
**Business logic:**
- Datasource = `source filter result set` (live). Store `boards.filter_id`; never copy issues.
- **Drag enabled only** when grouping maps to a safe editable field the board already mutates (Status / Process Step). Grouping by Owner/Department/Risk/Quarter → board renders **read-only** for drag.
- High-cardinality guard: if the grouping field would produce too many columns (e.g. Owner across dozens of users), block with guidance and suggest a safer grouping.
- Filter changes → board updates (re-runs the filter, no manual rescope).
- Filter deleted/archived → `filter_id` set null (existing FK behaviour); board shows an "unlinked / source filter removed" banner and offers to relink or convert to a standalone board.
**States:** loading (spinner), empty (no results → empty-state with "Adjust filter"), permission-restricted (action hidden if not owner/manager), error (section-message + retry), blank grouping value → "Unassigned/No value" column.
**Acceptance:** AC-K1 board persists with `filter_id`; AC-K2 editing filter criteria updates the board without re-creating; AC-K3 unsafe grouping is read-only; AC-K4 visibility never exceeds source filter.

### 4.2 Create Roadmap from Filter

**Entry:** kebab + filter header. 
**Modal inputs:** Roadmap name, source filter (read-only), **Date mapping** (Start/End, Target Completion, Created-date fallback only if no start), Lane grouping (Department, Owner, Delivery Platform, Quarter, Program, Status), Colour/status grouping, default zoom, Unscheduled behaviour, Visibility. 
**Business logic:**
- Datasource = live filter result. Store `filter_derived_views(type='roadmap')`.
- Start+End → duration bar; single date → milestone/point; **no valid date → "Unscheduled" lane/count, never silently dropped.**
- Reuse existing milestones/dependencies **only if** the chosen roadmap engine already has them — do not build a dependency engine.
- Drag-to-reschedule only if the engine already supports safe inline date edits and the user has edit rights; otherwise read-only.
- Hover summary + click → existing detail drawer.
**States:** missing-dates empty state ("N items have no dates — shown as Unscheduled"); too-many-items → zoom/pagination guidance; loading; permission; error.
**Acceptance:** AC-R1 persists with source filter link; AC-R2 undated items surfaced not dropped; AC-R3 reuses existing timeline engine; AC-R4 no new dependency model.

### 4.3 Create Dashboard from Filter

**Entry:** kebab + filter header. 
**Modal inputs:** Dashboard name, source filter (read-only), **Widget template** (Executive Summary / Delivery Health / Risk & Delay / Ownership / Department View), Visibility, "Pin to workspace on create" toggle. 
**Datasource precedence:** `source filter` → `dashboard-level refinement` → `widget-level refinement` (each may only **narrow**). 
**Business logic:**
- Store `filter_derived_views(type='dashboard')`. Widgets reuse `MetricCard`/`QualityGauge`/`ActivityFeed`/`WidgetShell`, each accepting `sourceFilterId` + optional local refinement.
- Default bundles opinionated (no blank canvas). Confirm available widgets before fixing the default set (Open Q-4).
- Metrics drawn from real results: total / open / closed / overdue / due-this-week / high-risk / no-owner / no-milestone / stale (no update in X days) / by status / by owner / by department / by quarter.
**States:** widget with no data → per-widget empty state (not a broken card); loading skeletons; permission; error.
**Acceptance:** AC-D1 persists + refreshes from filter; AC-D2 reuses existing widgets; AC-D3 refinements only narrow; AC-D4 no new dashboard framework.

### 4.4 Copy WhatsApp Summary

**Entry:** kebab + filter header + inside derived views (reflects current visible scope). 
**Preview modal inputs:** template (Executive update / Team update / Owner follow-up / Meeting recap), length (Full / Short), include counts, include top urgent items, include CTA, language (Arabic/English/bilingual via existing i18n). 
**Business logic:**
- Plain text, generated from **actual filter results only** — never fabricate counts.
- Default scope = current visible scope; "Use source filter only" option.
- Excludes private comments, hidden/restricted fields. If user can see counts but not details → aggregate-only.
- Preview → "Copy" (uses existing clipboard util). No persistence unless audit required (Open Q-5).
**Example output:**
```
Quick update on Q2 Digital Transformation:
Open: 18 · Overdue: 3 · High risk: 2 · Pending: 6 · No update 10+ days: 4
Please update pending and overdue items before the weekly review.
```
**States:** zero counts → "Nothing open right now" friendly message, not an empty dump. 
**Acceptance:** AC-W1 counts match the live view exactly; AC-W2 clipboard only; AC-W3 no restricted data leaks; AC-W4 four templates available.

### 4.5 What Changed Since Last Visit

**Entry:** badge on filter row + banner/side-panel on filter open + signal on workspace pin. 
**Change buckets:** entered view, left view, status changed, owner changed, due-date changed, became overdue, risk escalated, completed, reopened, new comment/update. 
**View:** summary cards (counts per bucket) + grouped change list + "last visit" timestamp + **Mark all as reviewed**. 
**Business logic (the important part):**
- Visit-state is **per-user, per-filter/view** (`filter_visit_state`). Never global.
- Delta = compare current state vs snapshot at `last_reviewed_at`. Reuse audit/changelog; group + collapse noisy repeats (signal first).
- **Opening does not auto-clear** unread — only explicit "Mark reviewed" clears it (avoids false negatives in PMO workflows).
- **Last-viewed updates only after the view loads successfully**, and **previewing from a widget/pin does NOT count as a visit** (recommended simple rule — confirm Open Q-6).
- First visit → empty state: "No previous visit found. Changes will be tracked from now."
- Permission: only show changes for items the user can currently access; items that left visible scope due to access removal → anonymized count ("1 item no longer visible"), never leak identity.
**Acceptance:** AC-C1 per-user/per-filter state; AC-C2 explicit reviewed clears unread; AC-C3 first-visit empty state; AC-C4 no identity leak on access-removed items.

### 4.6 Pin Filter to Workspace

**Entry:** kebab + filter header + derived-view header. 
**Display modes:** Compact card, KPI summary card, List preview, Kanban shortcut, Roadmap shortcut, Dashboard shortcut. 
**Pinned card shows:** filter name, matching count, overdue count, high-risk count, last updated, unread-changes signal, Quick open. 
**Business logic:**
- Pin is **personal** (`workspace_pins`, RLS self-only). Pinning never changes sharing.
- Can point to a raw filter or a specific derived view.
- Reorder / unpin / rename display title / compact↔expanded — all personal preferences stored on the pin.
- If pinned target becomes inaccessible/archived/deleted → pin stays long enough to explain + offers remove/replace; no silent disappearance.
- "Star" stays a Filters-directory affordance; "Pin" is the workspace affordance (distinct).
- Respect permissions: pinned card counts reflect only records the user may access.
**Acceptance:** AC-P1 personal + RLS; AC-P2 pin doesn't alter sharing; AC-P3 unavailable target handled gracefully; AC-P4 reorder persists per user.

---

## 5. Data relationships (summary)

```
ph_saved_filters (SOURCE OF TRUTH)
  ├─ boards.filter_id ............... Kanban (exists; live pointer)
  ├─ filter_derived_views ........... Roadmap + Dashboard (new, type-discriminated, live pointer)
  ├─ workspace_pins ................. personal shortcut (new, self-RLS)
  ├─ filter_visit_state ............. per-user "last reviewed" (new, self-RLS)
  └─ viewers_config / editors_config  permissions (jsonb; add 'department' type — no migration)

Derived views NEVER copy results — they store filter_id + display config only.
Permission resolution at runtime: source filter visibility ∩ record-level access ∩ (optional) narrower derived-view visibility.
```

---

## 6. Permission rules (consolidated)

Create derived views only from filters the user owns or can manage. Pin any filter the user can access. Shared filters convert only with permission. Private filters → private derived views by default. Department filters → department-level views only for department-rights users. Org-wide views → admin/authorized role. If source-filter access is removed, derived-view access is restricted. If results include restricted records, the user sees only allowed records — everywhere, including summaries, widgets, and change feeds.

---

## 7. Edge cases (consolidated)

Zero results · too many results · missing date fields · missing owner fields · deleted/archived records inside the filter · source filter edited after derived view created · source filter deleted (FK set-null + banner) · source filter archived · user loses filter access · user loses access to some records · roadmap with no dates (Unscheduled) · Kanban grouping field all-blank (single "No value" column) · dashboard widget with no data (per-widget empty state) · WhatsApp summary with zero counts · first-time visit · multiple users on a shared filter (per-user visit state) · user pins same filter twice (dedupe / allow distinct derived-view pins) · filter renamed after pin/convert (pins show live name unless display title overridden).

---

## 8. Acceptance criteria (rollup)

A saved filter can create at least one persisted derived view in each mode; derived views stay linked to the live source filter; source-filter criteria changes propagate without manual rescope; local refinements only narrow; pinning creates a personal quick-access object; WhatsApp summary copies safe, accurate, well-formatted text from real counts; "what changed" shows a low-noise, per-user delta based on explicit review state; nothing introduces Radix/Tailwind/new design system; `npm run scan:ads-violations` stays clean.

---

## 9. Implementation notes for Claude Code (sequencing)

1. **Phase 0 — confirm canon (no code):** confirm the canonical roadmap engine (Open Q-2), whether `boards` has a `view_config` (Open Q-3), and the dashboard widget catalogue (Open Q-4). Resolve open questions §11 with product owner.
2. **Phase 1 — kebab actions (frontend-only, reuses modals):** add the five `menuItem()` entries + "What changed" affordance to `FilterKebabMenu.tsx`. Wire to placeholder handlers behind a feature flag.
3. **Phase 2 — Kanban:** extend the existing create-board flow with the guided grouping/visibility/badges step; enforce safe-drag rule; dynamic refresh from `filter_id`.
4. **Phase 3 — schema deltas:** `filter_derived_views`, `filter_visit_state`, `workspace_pins` (+ `viewers_config` department type). One migration, RLS mirroring existing patterns. Generate types (`generate_typescript_types`).
5. **Phase 4 — Roadmap + Dashboard:** bind the existing engines to `filter_derived_views`; widgets accept `sourceFilterId`.
6. **Phase 5 — WhatsApp summary:** pure client formatter over the live result set + preview modal + clipboard.
7. **Phase 6 — What Changed:** `filter_visit_state` + delta computation over existing audit; explicit Mark-reviewed.
8. **Phase 7 — Pin to Workspace:** `workspace_pins` + render on For-You/Home using existing favorite/card patterns.
9. **Every phase:** `npm run scan:ads-violations`, `npm run scan:components`, register new canonical components, follow the Cascade protocol. No `@radix-ui/*` / Tailwind utilities.

---

## 10. Non-goals (restated)

No new design system / component library / separate Filters module. No JQL builder in the new business-user flows. No external WhatsApp integration or auto-send. No new dashboard / roadmap / Kanban engine. No public-link sharing beyond Catalyst's current permission model. No AI recommendations this phase.

---

## 11. Open questions (need product-owner confirmation)

- **Q-1 (visibility):** PRD wants Private / Department / Organization, but `ph_saved_filters` today is Private vs Org only. Confirm department scoping should ride on `viewers_config` jsonb (`{type:'department', deptId}`) with no new column. **(Recommended: yes.)**
- **Q-2 (roadmap canon):** Multiple roadmap modules exist (`product-roadmap`, `catalyst-roadmap`, `executive-roadmap`, `enterprise-roadmap`…). Which is the single canonical engine to bind filters to?
- **Q-3 (board config):** Does `boards` already persist a display/view config (grouping, visible fields, badges)? If yes, Kanban needs **zero** new tables.
- **Q-4 (dashboard widgets):** Confirm the available widget catalogue so default templates only reference shipping widgets.
- **Q-5 (summary audit):** Should "Copy WhatsApp Summary" be audit-logged, or is it ephemeral (no persistence)?
- **Q-6 (visit semantics):** Confirm the recommended rule — a successful full-view load counts as a visit; widget/pin preview does **not**; opening never auto-clears unread (only explicit Mark reviewed).
- **Q-7 (kebab menu pattern):** The existing kebab is a hand-rolled portal dropdown (the ADS scanner generally flags hand-rolled dropdowns). Extend the existing pattern as-is for consistency, or migrate the menu to `@atlaskit/dropdown-menu` + `@atlaskit/menu` as part of this work?

---

*This plan is intentionally opinionated about business logic and deliberately conservative about architecture: behaviour is specified, implementation stays anchored to existing Catalyst structures.*
