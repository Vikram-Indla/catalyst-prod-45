# Session 004 — S3 staging apply: drift found, fixed, applied ✅

**Date**: 2026-07-09 · **Goal**: Apply S3 migration to staging, verify seeds, implement S5
**Outcome**: First apply FAILED (DRIFT-001, 4 schema mismatches). RED FLAG raised; Vikram decided D10/D11/D12 (all recommendations approved). Migration file amended, re-applied successfully, ledger aligned to 20260709160000, 12/12 verification probes green (notification seeds conditionally skipped per D10). Evidence in 06_VALIDATION_EVIDENCE.md. Amended migration NOT yet committed — commit approval pending. S5 not started (next session).

## Pre-flight
- cwd `catalyst-prod-46`, branch `main`, clean except known TestHub orphans + untracked discovery/feature folders. Stash untouched.
- Supabase MCP token verified staging-scoped: `list_projects` returns ONLY `catalyst-staging` (cyijbdeuehohvhnsywig). Prod invisible. ✅
- Ledger check: `20260709130000` (S1) + `20260709150000` (S2) recorded; `20260709160000` (S3) absent — as expected.

## What happened
`apply_migration(idn_seeds_phase1)` failed: `42P01 relation "ph_wf_templates" does not exist`. Apply is transactional — rollback confirmed (guard CHECK constraint still shows the pre-S3 18-value list; no ledger row inserted). Staging clean.

## Live discovery (evidence)
1. **Workflow templates**: `ph_wf_versions.template_id` → FK `ph_workflow_templates(id)` (NOT `ph_wf_templates`). Shape: `name` NOT NULL, `work_item_type` NOT NULL (values: 'Business Request', 'Epic', 'Story', …, 'risk', 'change_request'), `description`, `is_default`; UNIQUE(name, work_item_type). No CHECK on work_item_type.
2. **notification_trigger_config**: does not exist on staging (only notification_delivery_log / notification_preferences / notifications / user_notification*). No committed migration creates it; `src/services/notificationTriggerService.ts` queries it (upsert onConflict `trigger_key,hub_source,project_id`). Prod-only table, outside ledger.
3. **admin_nav_modules**: real columns `module_key (UNIQUE), name, description, group_name NOT NULL, nav_type (default 'sidebar'), sort_order, parent_module, is_active`. Hub-level precedent: `workhub` = group 'core', nav_type 'main', sort 7. Legacy `ideas` row exists (Product group, sort 403, parent 'product').
4. **admin_role_module_permissions**: `access_level` CHECK ∈ {full, view, hidden}; UNIQUE(role_code, module_key); role_code vocabulary = job-function codes (`super_admin`, `product_owner`, `technical_po`, `pmo`, `delivery_manager`, `project_manager`, `business_analyst`, `developer`, …). Migration's `superadmin/admin/reviewer/approver/user` match nothing (and `superadmin` ≠ `super_admin`).
5. **Frontend alignment**: `useModuleAccess.ts` reads `admin_nav_modules.module_key` + `admin_role_module_permissions(module_key, access_level)` keyed by `product_roles.code` — confirms fixes above are what S4's ModuleGuard actually needs.

Sections already correct in the migration: guard CHECK extension (constraint name `ph_wf_transition_guards_type_chk` verified), scoring models/drivers (UNIQUEs verified), ph_wf_versions/statuses/transitions/roles/guards column lists (all verified), scheme entries UNIQUE(scheme_id, entity_key) verified.

## Decisions requested from Vikram (see RED FLAG in conversation)
- Q1: notification_trigger_config handling (conditional skip vs create table vs defer)
- Q2: role→access mapping for module_key 'ideation'
- Q3: nav row placement (recommend mirror workhub: core/main) + `work_item_type` value (recommend 'Idea')

## Next session
After decisions: amend `20260709160000_idn_seeds_phase1.sql`, re-apply to staging, align ledger version, paste verification to 06_VALIDATION_EVIDENCE.md, commit amendment (explicit staging), then proceed to S5.
