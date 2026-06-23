# 05 — Schema / API / Permission Discovery

**Date:** 2026-06-23. Source: Supabase MCP (`execute_sql`) against prod `lmqwtldpfacrrlvdnmld` + code grep. **No DDL run, no migration proposed** (per discovery scope).

## Relevant tables found (search: release / sprint / rh_*)

`releases`, `release_versions`, `release_feature_links`, `release_story_links`, `release_snapshots`, `release_test_cycles`, `release_vehicles`, `story_sprints`, `anchor_sprints`, `product_releases`, `product_sprints`, `ph_releases`, `ph_sdlc_releases`, `r360_releases`, `wh_sprint_releases`, and the **`rh_*` Release-Operations family** (`rh_releases`, `rh_changes`, `rh_release_signoffs`, `rh_release_sprints`, `rh_release_work_items`, `rh_release_brs`, `rh_release_issues`, `rh_release_notes`, `rh_freeze_windows`, `rh_production_events`, `rh_readiness_checks`, `rh_sign_off_templates`, `rh_sop_templates`, … 30+ tables), plus `tm_release_*` and `vw_ph_release_progress`, `rh_release_portfolio_v` views.

There are **many parallel release models** in this DB. The live page uses `rh_releases`.

## The three competing models (the core data finding)

| Model | Table | Rows | Status field | Notes |
|---|---|---|---|---|
| **Live (current page)** | `rh_releases` | **1** | 9-stage lifecycle (`draft…completed`, + `cancelled` hidden) | Enterprise Release Operations. Has `health`, `target_env`, `readiness_pct`, signoffs, change mgmt. `target_date` NOT NULL. No `deleted_at` (soft-retire via `status='cancelled'`). |
| **Spec model (named)** | `releases` | **0** (empty) | enum `release_status` = `planned, ready, shipped, planning, development, testing, uat, staging, released, archived` (10 values) | Exists but **schema-divergent** from spec: QA-bloated (`test_cases_*`, `defects_*`, `coverage_percent`, `health_score`, gates). Has `project_id`, `owner_id`, `release_manager_id`, `qa_lead_id`, `start_date`, `release_date`, `actual_release_date`, `deleted_at`. **No `archived` boolean, no `sequence`.** Status enum does NOT match spec's 3-state. |
| **Spec Sprints** | `sprints` | — | — | **TABLE DOES NOT EXIST.** Spec 2 requires it. Only `anchor_sprints` / `product_sprints` exist. |
| **Spec junction** | `story_sprints` | **0** (empty) | — | Exists, empty. PK `(story_id, sprint_id)` per spec. But its FK `sprint_id` would point at a non-existent `sprints` table — needs verification before any use. |
| Jira-style versions | `release_versions` | **0** (empty) | — | Another candidate, also empty. |

### `releases` table columns (actual)

`id, release_vehicle_id, name, target_date, status(release_status), readiness_pct, notes, created_at, updated_at, version, description, start_date, release_date, progress, health(USER-DEFINED), is_blocked, blocked_reason, owner_id, project_id, test_cases_total, test_cases_passed, defects_open, coverage_percent, created_by, release_manager_id, qa_lead_id, actual_release_date, test_cases_executed, test_cases_failed, test_cases_blocked, critical_defects, deleted_at, health_score, blocker_defects, major_defects, minor_defects, test_cases_skipped, stories_with_tests, total_stories, total_gates, passing_gates, scope_creep_percent`.

→ This is a **QA/test-readiness** table, not the clean Jira-version table the spec describes.

### `rh_releases` columns used by the live adapter

`id, name, version, status, health, release_type, target_env, target_date, planned_release_date, readiness_pct, source, jira_key, updated_at, created_at, product_id, release_manager_id`.

## Migrations

- Spec 2 cites `supabase/migrations/20260623120*.sql` (5 files) — **NOT present** in repo.
- Actual release-related migrations present:
  - `20260602100000_rename_fix_versions_to_sprint_release.sql`
  - `20260612100000_product_releases_and_sprints.sql`
  - `20260618120000_release_operations_schema.sql` ← `rh_*` family
  - `20260618130000_release_ops_notify_trigger.sql`
  - `20260618140000_rh_release_signoffs.sql`
  - `20260619130000_rh_release_portfolio_view.sql`
  - `20260619140000_fix_rh_releases_seed_data.sql`

So the **shipped** schema is the `rh_*` Release-Operations one (June 18–19), not the spec's `releases`/`sprints` one.

## RLS

- Not exhaustively dumped this run (discovery only). The live adapter performs raw `supabase.from('rh_releases')` reads + updates/inserts client-side, so it relies entirely on `rh_releases` RLS for gating. **RLS policy text for `rh_releases` / `releases` should be probed before any write-path work** (CLAUDE.md trigger-chain + RLS lessons). Flagged in `07` Q4.

## Generated types

- `src/integrations/supabase/client.ts` is the client; generated types live under `src/integrations/supabase/` (Database types). `releases`, `rh_releases`, `story_sprints` will be in the generated types if regenerated; the adapter casts some inserts `as any` (e.g. `rh_releases` insert), indicating partial type coverage. Confirm before relying on typed columns.

## Hooks / data layer found

- `src/hooks/useReleaseHub.ts` — `useCreateRelease`, `useUpdateRelease` (used by `CreateReleaseModal`).
- `src/hooks/useReleasePortfolio.ts`, `src/lib/releasehub/releaseConfidence.ts`.
- `src/modules/project-work-hub/adapters/releasesDataSource.ts` — `useReleasesSource` (the list page).
- Spec 2's proposed hooks (`useReleases`, `useSprintsForRelease`, `useCreateRelease`, `useUpdateRelease`, `useLinkUnlinkSprints`, `useReorderSprints`, `useCreateSprint`, `useUpdateStoryReleaseSprints`) — only `useCreateRelease`/`useUpdateRelease` exist (and against `rh_releases`, not the spec `releases`). The sprint-linkage hooks do NOT exist.

## Edge functions / RPCs

- Not surveyed in depth this run. `rh_*` notify trigger migration suggests DB-trigger notifications. No release-specific edge function confirmed for the list page (adapter is direct table access). Flag for follow-up if write paths expand.

## Permission model (live)

- Route `/release-hub/releases`: **no guard** (only Suspense). `/release-hub/overview`: `<ModuleGuard moduleCode="releases">`. Inconsistent — see `07` Q4.
- Spec's Jira permission map (`BROWSE_PROJECTS`/`ADMINISTER_PROJECTS`/`EDIT_ISSUES`) is Jira-side; Catalyst equivalent is `ModuleGuard` (org/module) + `user_roles`/`user_product_roles` (role) per CLAUDE.md. No release-specific role gate found in the adapter.

---

# DECISION AREA 1 — Data source of truth

All facts below are from Supabase MCP `execute_sql` on prod `lmqwtldpfacrrlvdnmld` (2026-06-23), generated types at `src/integrations/supabase/types.ts`, migrations under `supabase/migrations/`, and the adapter `src/modules/project-work-hub/adapters/releasesDataSource.ts`. No guessing.

## Model A — `rh_releases`  ← RECOMMENDED

- **Columns (actual, `information_schema.columns`):** `id (uuid, NOT NULL)`, `name (text, NOT NULL)`, `version (text)`, `status (text, NOT NULL)`, `source (text, NOT NULL)`, `jira_key (text)`, `target_date (date, NOT NULL)`, `owner_id (uuid)`, `project_id (uuid)`, `chg_count (int)`, `created_at (timestamptz)`, `updated_at (timestamptz)`, `key (text)`, `description (text)`, `release_type (text)`, `target_env (text)`, `product_id (uuid)`, `planned_start_date (date)`, `planned_release_date (date)`, `release_manager_id (uuid)`, `product_owner_id (uuid)`, `qa_lead_id (uuid)`, `uat_lead_id (uuid)`, `health (text)`, `readiness_pct (int)`.
- **Row count:** 1.
- **Route usage:** YES — the live `/release-hub/releases` (`ReleasesBacklogCanonical.tsx` → `BacklogPage` → `useReleasesSource`). Also `/release-hub/:releaseId` detail, release kanban, work, timeline.
- **API/hook usage:** `useReleasesSource` (list, reads + update/soft-retire/create), `useReleaseHub.ts` (`useCreateRelease`/`useUpdateRelease`), `CreateReleaseModal.tsx`. Generated types: present (`rh_releases` in `types.ts`).
- **RLS (pg_policies):** `rh_releases_sel` SELECT `authenticated USING true`; `rh_releases_ins` INSERT `CHECK rh_is_manager(auth.uid())`; `rh_releases_upd` UPDATE `USING+CHECK rh_is_manager(auth.uid())`; `rh_releases_del` DELETE `USING rh_is_manager(auth.uid())`. Clean, current, manager-gated writes.
- **Jira Releases field support:** name ✅ · description ✅ · start_date ⚠️ (`planned_start_date`, not `start_date`) · release_date ⚠️ (`planned_release_date` / `target_date`) · status unreleased/released/archived ❌ (uses 9-stage `draft…completed` text, adapter `RELEASE_STATUSES`) · sequence ❌ (absent) · archived_at ❌ (absent; soft-retire via `status='cancelled'`) · progress stats ⚠️ (`readiness_pct` only, no done/inProgress/toDo breakdown) · actions ⚠️ (create/update/soft-retire exist; release/unrelease/archive/merge do not).
- **Migration risk:** LOW for Phase 1 (display-only refactor needs no schema change). MEDIUM-HIGH later if Jira status semantics / sequence / archived_at are added.
- **RLS risk:** LOW — policies are current and manager-gated; SELECT open to authenticated.
- **Nature:** **Release-Operations backlog data** (enterprise lifecycle + change-management family `rh_*`), not true Jira Versions data.
- **Recommendation:** **Use as the Phase 1 data source.** It is wired, typed, RLS-clean, and has the display fields. Defer the status-semantics/sequence/archived gaps to a later approved phase.

## Model B — `releases`  ← REJECTED for Phase 1

- **Columns (actual):** QA/test-readiness shape — `id, release_vehicle_id, name, target_date, status (release_status enum), readiness_pct, notes, created_at, updated_at, version, description, start_date, release_date, progress, health, is_blocked, blocked_reason, owner_id, project_id, test_cases_total, test_cases_passed, defects_open, coverage_percent, created_by, release_manager_id, qa_lead_id, actual_release_date, test_cases_executed, test_cases_failed, test_cases_blocked, critical_defects, deleted_at, health_score, blocker_defects, major_defects, minor_defects, test_cases_skipped, stories_with_tests, total_stories, total_gates, passing_gates, scope_creep_percent`.
- **Row count:** 0 (empty).
- **Route usage:** NONE found wired to `/release-hub/releases`.
- **API/hook usage:** Not used by the release-hub list adapter. Generated types: present (`releases:` at `types.ts:32358`).
- **RLS (pg_policies):** SELECT gated by `has_role(... admin/program_manager/team_lead)` OR `release_vehicles`→program/portfolio membership; INSERT `authenticated CHECK true`; **UPDATE `USING true / CHECK true` (any authenticated can update — loose)**; DELETE admin-only; plus 3 `ALL` policies for admin/team_lead/program_manager.
- **Jira Releases field support:** name ✅ · description ✅ · start_date ✅ · release_date ✅ · status unreleased/released/archived ❌ (10-value `release_status` enum: `planned, ready, shipped, planning, development, testing, uat, staging, released, archived`) · sequence ❌ · archived_at ❌ (`deleted_at` only) · progress ⚠️ (`progress` int + QA counters) · actions ❌ (no adapter).
- **Migration risk:** HIGH — empty, QA-bloated, coupled to `release_vehicles`/program/portfolio; adopting it means schema rework + reconciling with the `rh_*` family.
- **RLS risk:** MEDIUM-HIGH — loose UPDATE policy; membership coupling to vehicles.
- **Nature:** QA/test-readiness release tracking, **not** the clean Jira-version table the spec implies.
- **Recommendation:** **Do not use.** Empty, wrong shape, loose RLS, not wired.

## Model C — `release_versions`  ← REJECTED for Phase 1

- **Columns (actual):** `id (uuid, NOT NULL)`, `version (text, NOT NULL)`, `name (text)`, `release_date (date)`, `status (text)`, `created_at (timestamptz, NOT NULL)`. Minimal.
- **Row count:** 0 (empty).
- **Route usage:** NONE on `/release-hub`. Referenced by `useTestCaseRelease.ts`, `useIncidents.ts`, `useIncidentCommandCenter.ts`, `useCommitteeQueue.ts`, `incidentApi.ts` — i.e. an Incident/Test-Management fix-version reference list.
- **API/hook usage:** Incident + Test-Management hooks only. Generated types: present (3 hits).
- **RLS (pg_policies):** SELECT only — `Authenticated users can view release versions USING true`. **No INSERT/UPDATE/DELETE policies → writes blocked by RLS (read-only).**
- **Jira Releases field support:** name ✅ · version ✅ · release_date ✅ · status ⚠️ (free text) · description ❌ · start_date ❌ · sequence ❌ · archived_at ❌ · progress ❌ · actions ❌ (read-only).
- **Migration risk:** N/A for Phase 1 (not wired). Adopting would mean adding columns + write RLS + an adapter.
- **RLS risk:** Writes impossible without new policies.
- **Nature:** Closest in *naming* to "Jira Versions" but owned by the Incident/Test-Management domain, minimal columns, empty, read-only.
- **Recommendation:** **Do not use.** Wrong domain owner, too thin, read-only, not wired.

## Model D — existing release views / hooks / adapters

- Views: `rh_release_portfolio_v`, `rh_release_summary`, `vw_ph_release_progress`, `rh_release_portfolio_v` (read models over the `rh_*` family).
- Hooks: `useReleaseHub.ts`, `useReleasePortfolio.ts`, `releasesDataSource.ts` (`useReleasesSource`), `lib/releasehub/releaseConfidence.ts` — all over `rh_releases`.
- **Recommendation:** these already standardize on `rh_releases`. Reinforces Model A.

## Decision Area 1 — verdict

**`rh_releases` (Model A) is the Phase 1 source of truth.** It is the only release model that is wired to `/release-hub/releases`, typed, RLS-clean (manager-gated writes), and carries the display fields. It is Release-Operations data, not true Jira Versions data; the Jira status-semantics (`unreleased/released/archived`), `sequence`, and `archived_at` are documented gaps deferred to a later, separately-approved schema phase. `releases` and `release_versions` are rejected (empty, wrong domain/shape, loose or read-only RLS, unwired).

