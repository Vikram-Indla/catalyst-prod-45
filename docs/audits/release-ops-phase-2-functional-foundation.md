# Release Ops — Phase 2 Functional Foundation

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 2
**Date:** 2026-07-06 · **DB:** staging cyij (`cyijbdeuehohvhnsywig`)
**Migration:** `supabase/migrations/20260706120000_release_ops_phase2_foundation.sql`
**Build:** `tsc` clean · `npm run build` PASS. **No UI built** (data/service foundation only).

## 0. Baseline check (from P0)
Confirmed on origin/main `5eb9197cd` (contains P0 `a03789b7b`): drawers removed, `ReleaseCalendarPage` uses `ads/Modal` (no `ReleasePeekPanel` import), release chip → full-page, breadcrumbs mirror Project module, change detail on UUID route, `rh_changes` had no slug. Baseline matched — no P0 repair needed.

## Major discovery — staging schema was under-applied
Live probe proved the core migrations `20260618120000` / `20260618140001` were **recorded-but-not-executed** on cyij (`cyij-migration-marked-not-executed` landmine): `rh_change_release_links`, `rh_release_signoffs`, `rh_release_brs/sprints/work_items`, `rh_release_notes`, `rh_readiness_checks`, `rh_notify_subscribers` did **not exist**, and the `rh_changes` / `rh_releases` / `rh_freeze_windows` / `rh_production_events` ALTERs never landed. This explained the empty Change list (queries 400'd on missing columns). Phase 2's migration is **idempotent additive** — it reconciles that gap *and* extends, safe on any environment (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / `CREATE OR REPLACE`).

## Functional model delivered
Traceable chain now structurally supported end-to-end:
`Business Request → Release → Product/Project → Sprint → Work Item → Change Record → SOP Template → SOP Execution Step → Assignee → Planned/Actual window → Commit/Evidence → Sign-off → Freeze validation → Emergency Override → Production Event → Incident/Defect → Replay/Audit`.

## Existing repo model reused
- `rh_releases`, `rh_changes`, `rh_sop_templates/template_steps/steps`, `rh_change_signoffs`, `rh_change_work_items`, `rh_freeze_windows`, `rh_production_events`, `incidents`, `tm_defects`, `business_requests`, `anchor_sprints`, `products`, `projects`.
- `catalyst_slugify()` reused for change slug (same pattern as `rh_releases` slug).
- Existing `useReleaseChanges` already did m2m dual-read (now backed by a real table).

## New tables (9)
`rh_change_release_links` (m2m + backfill from legacy release_id), `rh_release_brs`, `rh_release_sprints`, `rh_release_work_items`, `rh_release_signoffs` (scope=release), `rh_emergency_overrides`, `rh_release_notes`, `rh_readiness_checks`, `rh_notify_subscribers`. Plus view `vw_rh_unlinked_production_changes`.

## New fields (by area)
- **rh_releases**: release_type, target_env, product_id, planned_start_date, planned_release_date, release_manager_id, product_owner_id, qa_lead_id, uat_lead_id, health, readiness_pct.
- **rh_changes**: change_type, target_env, deployment_category, window_start/end, change_manager_id, release_manager_id, external_system, is_emergency_override, override_reason, override_approver_id, **slug** (+trigger), planned_start_at, planned_end_at, actual_start_at, actual_end_at, technical_lead_id, qa_owner_id, prod_no_release_justification.
- **rh_sop_templates**: estimated_duration_minutes, risk_applicability, is_active.
- **rh_sop_template_steps**: default_assigned_role, repo_name, repo_url, branch, script_reference, command_text, expected_result, commit_required, evidence_required, default_planned_offset_minutes, default_duration_minutes, rollback_step_flag, predecessor_step_no.
- **rh_sop_steps**: assigned_role, repo_name, repo_url, database_commit, configuration_commit, planned_start_at, planned_end_at, planned_duration_minutes, actual_start_at, actual_end_at, execution_order, is_technical_step, commit_required, evidence_required, notification_status, timer_state, incident_id, defect_id, production_event_id.
- **rh_change_signoffs**: scope, release_id, requested_by, requested_at, due_date, decided_at, dependency_key, depends_on_signoff_id, emergency_override_id.
- **rh_freeze_windows**: target_env, applicability, product_id, status, override_policy, scope, release_id, project_id, start_at, end_at, owner_id, is_active (start_at/end_at seeded from DATE cols).
- **rh_production_events**: event_key, release_id, change_id, product_id, target_env, produced_at, deployment_status, owner_id, release_notes_id, work_items/business_requests/commits/sop_evidence/approvers snapshots, planned/actual start/end, overrun_minutes, executed_by, approved_by, sop_steps/signoffs/incidents/defects/emergency_override snapshots, freeze_result, replay_summary, event_level, is_release_rollup.
- **incidents** & **tm_defects**: source_release_id, source_change_id, source_sop_step_id, source_production_event_id, raised_during_change_execution.

## Release ↔ Change behaviour
`rh_change_release_links` = forward source of truth (unique change_id+release_id, unlink audit via unlinked_at). Legacy `rh_changes.release_id` retained + backfilled into the join. Reads prefer join (`useReleaseChanges`, `useChangeReleases`); writes maintain join (`changeService.create` upserts link on release select). Validated many-to-many both directions.

## Slug behaviour
`rh_changes.slug` NOT NULL UNIQUE; `rh_changes_generate_slug()` BEFORE INSERT trigger prefers `chg_number` → `title` → `chg-<id8>`, dedup-suffixed. Existing 3 rows backfilled (unique). `changeService.getById` resolves **slug or UUID** (UUID-regex branch) so new slug links and legacy UUID deep links both open; change-list row-click now navigates by slug.

## Readiness by area
- **SOP template**: ordered steps, technical commit_required, evidence_required, rollback_step_flag, predecessor — drives later drag/drop + schedule.
- **SOP execution**: per-change steps hold assignee, role, planned/actual window, commits (fe/be/integration/db/config), commit/evidence-required, timer_state, and incident/defect/production_event links.
- **Sign-off**: release-level + change-level, status/approver/role/due/decided/comment, dependency_key + depends_on_signoff_id for later dependency visual, emergency_override_id.
- **Emergency override**: request→approve/reject/revoke, reason mandatory, bypassed_gate + audit_payload retained.
- **Freeze**: env/product/project/release scope, datetime window, override_policy — evaluable + auditable.
- **Incident/Defect lineage**: exact source release/change/SOP-step/production-event + raised-during-execution flag; hubs untouched (additive).
- **Production event**: change-level event + release-rollup marker; planned-vs-actual + full lineage snapshots for replay.
- **BR/Sprint/Work Item scope**: join tables reconstruct release scope for timeline/calendar/replay.

## Required code updates delivered
- `supabase/migrations/20260706120000_release_ops_phase2_foundation.sql` (applied to cyij).
- `src/services/release-hub.service.ts`: `getById` slug-or-UUID; `create` writes m2m link on release select.
- `src/hooks/useReleaseHub.ts`: `useChangeReleases` reverse-m2m hook + `ChangeLinkedRelease` interface.
- `src/pages/releasehub/AllChangesPage.tsx`: row-click navigates by slug.

## Deferred to Phase 3+
Full `types.ts` regen (avoided — would import cyij drift; hooks use `as any` per repo convention), RLS manager/approver hardening on new tables (currently permissive-authenticated), auto-generation of change-level production events, freeze-conflict evaluation service, commit-required enforcement at write time, and ALL UI (Change Cockpit, SOP runbook/drag/timer, For You cards, calendar execution, sign-off dependency visual, incident modal, Production Event Replay page).
