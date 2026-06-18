# Release Operations Rebuild — PLAN & HANDOVER

**Branch:** `release-operations-rebuild-01`
**Started:** 2026-06-18
**Spec source:** `/Users/vikramindla/Downloads/docs/design-handoffs/release-operations/` (18 files) + `02-CLAUDE-CODE-Release-Operations-Implementation-Prompt.md`
**Visual source of truth (open in browser during build):** `01-artifact-source.html`

> Replace the `/release-hub` (`rh_*`) stack with the new **Release Operations** module using ONLY canonical Catalyst assets. Excludes Incident Management. No new design system/token/table-component/pill/modal-shell/sidebar/chart-lib. Production = green. No Ask-Caty pill in global nav.

---

## LOCKED DECISIONS (from Vikram, 2026-06-18)

1. **Replace strategy:** Probe → propose. Inventory before deletion. (DONE — Phase 0 complete.)
2. **Branch:** `release-operations-rebuild-01` (created).
3. **DB writes:** Propose SQL, Vikram applies. Do NOT call `apply_migration` without explicit per-migration confirmation. Additive only, RLS included.
4. **Cadence:** Surface-by-surface. Build one → show → commit → wait for go.
5. **Schema strategy:** **Extend `rh_*` in place.** Add missing columns + new `rh_*`-prefixed tables. Keep existing data/FKs. Tighten RLS.
6. **Roles:** **Map to existing 4 `app_role`s.** No enum change. admin=full · program_manager=release_manager+change_manager+settings · team_lead=approve signoffs/SOP · user=viewer. Per-row approver identity tracked regardless of role.

---

## PHASE 0 — DISCOVERY (DONE)

### Existing release stacks (3 — only #1 is the target)
| Stack | Routes | Sidebar | DB | Action |
|---|---|---|---|---|
| **Release Hub v2.1 (TARGET)** | `/release-hub/*` | `ReleaseHubSidebar` (badge RH) | `rh_*` | rebuild on top of |
| Releases Mgmt (test) | `/releases/*` → redirect to `/release-hub` | `ReleasesManagementSidebar` (RL) | `tm_*`, legacy `releases` | retiring; leave redirects |
| Product releases | product hub | — | `product_releases`/`product_sprints` | **DO NOT TOUCH (regression risk)** |

Also off-limits: legacy `releases`/`release_vehicles` (portfolio) + `tm_release_signoffs` (test mgmt).

### Existing `rh_*` tables (extend these)
`rh_releases`, `rh_changes`, `rh_change_signoffs`, `rh_change_work_items`, `rh_change_status_history`, `rh_freeze_windows`, `rh_production_events`, `rh_change_activity_log`, `rh_release_test_cycle_links`.
- `rh_changes.release_id` is **1:1 today** — handoff needs **many-to-many** → add `rh_change_release_links`.
- RLS today = wide-open `USING(true)` → tighten in this rebuild.

### MISSING (must add as `rh_*` tables/columns)
SOP templates+steps, `rh_release_brs` (release↔business_requests), `rh_release_sprints`, `rh_release_work_items`, `rh_change_release_links`, `rh_release_notes`, `rh_readiness_checks`, `rh_notify_subscribers`. Plus columns on `rh_releases`/`rh_changes` for the richer lifecycle (health, readiness_pct, target_env, release_type, manager/owner/qa/uat ids, change_type, deployment_category, risk, window_start/end, override fields, etc.).

### Canonical components (USE THESE — handoff names were wrong)
| Need | Canonical path | Notes |
|---|---|---|
| Table | `src/components/shared/JiraTable/` (`JiraTable`, `cells.tsx` make*Cell, `editors.tsx` make*EditCell) | registry: `src/canonical/field-registry.ts` (FIELD_ID); row expand via `expandedRowIds`/`onToggleRowExpanded`; no built-in mobile card fallback |
| Status pill | `src/components/catalyst-detail-views/shared/sections/CatalystStatusPill.tsx` (interactive) + `StatusLozenge.tsx` (read-only) + `statusPalette.ts` | `STATUS_BG`: success `#94C748`, inprogress `#8FB8F6`, default `#DDDEE1`, moved `#F3D664`, new `#B8ACF6`, removed `#FD9891`; text `#292A2E`; `toStatusCategory()` from `src/components/ads` |
| Type icon | `src/components/shared/JiraIssueTypeIcon.tsx` | |
| User/approver picker | `src/components/EditableAssignee/EditableAssignee.tsx` + `AssigneeOption` | reuse for approver fields |
| Date | `src/components/shared/CatalystDueDateField/` + `makeDateEditCell` | wraps `@atlaskit/datetime-picker` |
| Description | `src/components/catalyst-detail-views/shared/sections/Description/Description.tsx` (Tiptap, CANONICAL) | NOT legacy `CatalystDescriptionSection` |
| Activity | `src/components/catalyst-detail-views/shared/sections/CatalystActivitySection.tsx` + `catalyst-ds` `ActivityPanel` | reads `ph_comments`+`ph_activity_log` |
| Notifications | `useNotificationsNew` is READ/MARK only | creation is server-side → notify-on-status-change needs **DB trigger or edge function** writing `notifications` rows + Caty chat |
| Modal/Tabs | `@atlaskit/modal-dialog`, `@atlaskit/tabs` directly | |
| Page header | `GlobalPageHeader` (breadcrumb) / `HubPageHeader` (hub) | |
| Sidebar | `SidebarBase.tsx` (`SidebarConfig`/`SidebarSection`/`SidebarMenuItem`) | ReleaseHubSidebar feeds it |

### Reusable existing release-hub assets (don't rebuild from zero)
8 command-center hooks (`src/modules/command-center/hooks/*`: KPIs, ReleaseHealth, Activities (realtime), DefectTrends, QualityGates, TestProgress, TeamPerformance, Milestones); `src/services/release-hub.service.ts` (9 CRUD services); `src/hooks/useReleaseHub.ts` (query-key registry + mutations); existing modals/drawers/badges in `src/components/releasehub/`.

### Roles
`app_role` enum = `admin|program_manager|team_lead|user`. `user_roles` table. Canonical RLS admin check:
```sql
EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)
```
SECURITY DEFINER helper pattern (avoid RLS recursion): see `chat_is_member` in `20260609000100_fix_chat_rls_membership_recursion.sql`.

### Link-target keys
products(id, code) · business_requests(id) · sprints/anchor_sprints(id, code) · ph_issues(issue_key text PK, project_key).

---

## BUILD ORDER (surface-by-surface; each = data hook + empty/loading/error + ADS audit + dark check + scoped commit)

- **Phase 1 — Migrations** (propose SQL, Vikram applies): extend `rh_releases`/`rh_changes` columns; new tables `rh_sop_templates`, `rh_sop_template_steps`, `rh_sop_steps`, `rh_release_brs`, `rh_release_sprints`, `rh_release_work_items`, `rh_change_release_links`, `rh_release_notes`, `rh_readiness_checks`, `rh_notify_subscribers`; indexes (per impl prompt §11); tighten RLS to user_roles pattern + SECURITY DEFINER helpers; generate TS types.
- **Phase 2 — Sidebar + routes:** relabel `ReleaseHubSidebar` → "Release Operations"; sections per handoff (Overview / [Backlog, Release Kanban, Production Events, Calendar] / [Change Records, SOP Templates, Sign-off Queue, Freeze Windows] / Settings footer). Remove Triage + Compare. Wire routes in `FullAppRoutes.tsx`. Keep legacy redirects.
- **Phase 3:** Overview (KPI cards drill-down + **Pending Approvals panel w/ approver face avatars**).
- **Phase 4:** Backlog (Releases JiraTable, all cols/filters/states) + Create Release modal (validation).
- **Phase 5:** Release detail (9-step tracker + tabs: Overview/Scope/Readiness/Changes/Sign-offs/Release Notes/Production Events/Audit + Notify list).
- **Phase 6:** Release Kanban (reuse `src/modules/kanban`).
- **Phase 7:** Change Records list + Create/Map Change modal (Approvers + Notify fields).
- **Phase 8:** Change detail (tracker + tabs incl. **SOP execution table** w/ step lifecycle + evidence + expand).
- **Phase 9:** SOP Templates list + apply-to-change.
- **Phase 10:** Production Events list + detail (auto-gen on prod release completion).
- **Phase 11:** Calendar (release/change/freeze/prod lanes + conflict tint + click→drawer).
- **Phase 12:** Sign-off Queue + approval window.
- **Phase 13:** Freeze Windows list + create + conflict detection.
- **Phase 14:** Settings (release/change types, envs, approval policies, readiness rules, numbering, SOP step types, notification policy).
- **Phase 15:** Lifecycles + scheduling guards (release 9-stage, change 9-stage, SOP step) — enforced in service + RLS/API.
- **Phase 16:** Notify-on-status-change (DB trigger/edge fn → notifications + Caty chat) + change-number→work-item-history label + work-item Release&Change Traceability panel (Project/Product work-item view).
- **Phase 17:** AI advisory surfaces (CATY: risk summary, missing-SOP, notes draft) — advisory only, never auto-approve/execute.
- **Phase 18:** Tests (lifecycle transitions, scheduling guards, permission checks, e2e) + parity report vs `01-artifact-source.html` + acceptance checklist `14`.

## GUARDRAILS (every phase)
ADS `var(--ds-*)` tokens only; 3-colour status guardrail (grey/blue/green), blue only for +Create/links/active-nav, purple only AI; `JiraTable` for all lists; `CatalystStatusPill`/`StatusLozenge` for status; light mode no-regress + dark works; NO Incident Management; stage explicit file paths only (never `git add -A`); `git status` before each commit; don't touch `product_releases`/legacy `releases`.

---

## PROGRESS LOG
- 2026-06-18: Phase 0 discovery DONE. Branch created. Plan written.
- 2026-06-18: Phase 1 migration APPLIED (`20260618120000_release_operations_schema.sql`). 3 SECURITY DEFINER RLS helpers (rh_user_has_role/rh_is_manager/rh_is_approver); ALTER rh_releases(+11)/rh_changes(+11)/rh_freeze_windows(+5)/rh_production_events(+14); 10 new tables (rh_sop_templates, rh_sop_template_steps, rh_sop_steps, rh_release_brs, rh_release_sprints, rh_release_work_items, rh_change_release_links, rh_release_notes, rh_readiness_checks, rh_notify_subscribers); 24 indexes; updated_at triggers; RLS tightened on rh_releases/rh_changes/rh_change_signoffs/rh_freeze_windows/rh_production_events (read-all + manager-write; signoff/SOP approver+owner carve-outs). types.ts regenerated. Security advisors: no new ERROR; helpers clean (search_path set). Verified via execute_sql (10 tables, helpers, policies present).
  - OPEN (Vikram decisions, carried from proposal): (1) release-level sign-offs have no table — rh_change_signoffs is change-only; add item_type/item_id or new rh_signoffs later. (2) rh_release_issues vs new rh_release_work_items coexist — reconcile in hooks. (3) status stays TEXT, lifecycle enforced in service (Phase 15). (4) child/log tables left permissive (not retightened). (5) low-pri: REVOKE anon EXECUTE/SELECT on rh helpers/tables (module-wide).
- 2026-06-18: Phase 2 DONE. Sidebar relabelled → "Release Operations" (badge RO). Sections per handoff §6: Overview / [Releases, Production Events, Calendar] / [Change Records, SOP Templates, Sign-off Queue, Freeze Windows] / Settings footer. Removed Triage + Compare (routes → redirect to /overview). Renamed /release-hub/command-center → /release-hub/overview (legacy redirect kept). New routes: /overview, /calendar, /sop-templates, /settings. Calendar/SOP/Settings → `ReleaseOpsComingSoonPage` placeholder (ads/EmptyState) until Phases 9/11/14. Repointed all 6 hub-entry hrefs (SidebarBase HUB_ITEMS, HubSwitcher, hubs.ts, HomeSidebar, MobileNavigationMenu) + test → /overview. CatalystShell hub default → /overview. tsc: 0 new errors in touched files. ADS audit: PASS. Note: handoff §52 has NO Backlog/Kanban nav items — Releases list = backlog; Kanban = view toggle (Phase 6).
- 2026-06-18: Phase 3 DONE. Overview page (`/release-hub/overview`, CommandCenterPage.tsx) rebuilt ADS-clean (was --cp-* tokens + raw-UUID approver). Title → "Release Operations Overview". 4 KPI drill-down cards (Active Releases / Open Changes / Pending Approvals / Production Events → respective lists). **Pending Approvals panel** (priority §3b): `ads/Avatar` face avatar + approver name + role chip + change number/title + "N waiting" + Review→ action. New enriched hook `usePendingApprovals` (useReleaseHub) = pending rh_change_signoffs + batch profile join (full_name/avatar_url); null approver → "Unassigned" (no lie). Supporting panels: Release Status + Recent Production Events. StatusLozenge for pills. ADS audit PASS; tsc clean. Loading+empty states present.
  - GAP (flagged): error states not rendered per panel — query error currently falls through to empty ("No X"), mildly misleading. Add error+retry per §08 in a polish pass.
- 2026-06-18: Phase 4a DONE. Releases list (`/release-hub/releases`, AllReleasesPage.tsx) rebuilt on canonical `JiraTable` + ADS tokens (was hand-rolled `<table>` + cards + --cp-* = P0 canonical-table violation). Columns: Release (name+version+jira_key), Status (StatusLozenge), Health (pill), Env, Type, Target (planned_release_date∥target_date), Changes count, Updated (relative). New hook `useReleasesList` queries rh_releases directly (richer cols the summary view lacks) + change count via legacy rh_changes.release_id. Search + status filter tabs + loading/empty/error states (reused releasehub EmptyState/ErrorState). Row click → release detail. ADS audit PASS; tsc clean.
  - DEFERRED to 4b: (1) ADS-clean Create Release modal rebuild with richer fields (release_type, target_env, product, managers, planned dates) + validation + extended releaseService.create — currently reuses existing CreateReleaseModal (legacy fields, --cp tokens). (2) Faceted column filters (product/health/env/type) + sort wiring (columns marked sortable but uncontrolled; data pre-sorted updated_at desc). (3) Board view toggle → Phase 6.
  - NEXT: Phase 4b — Create Release modal (ADS, richer fields, validation).
