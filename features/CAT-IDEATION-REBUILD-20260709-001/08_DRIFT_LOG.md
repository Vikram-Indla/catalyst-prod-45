# DRIFT_LOG

## DRIFT-001 — 2026-07-09 — S3 migration fails against staging (4 schema mismatches)

**What**: Committed S3 migration `20260709160000_idn_seeds_phase1.sql` (commit `b8b865fea`) fails on staging apply: `ERROR 42P01: relation "ph_wf_templates" does not exist`. Live discovery (session 004) found 4 sections authored against assumed — not actual — schema. The handover for S3 explicitly instructed "discover ph_wf_* table shapes first" and "discover notification_trigger_config seed format"; that discovery was skipped.

**Mismatches (staging cyijbdeuehohvhnsywig, probed 2026-07-09)**:
1. `ph_wf_templates` does not exist. Real table: `ph_workflow_templates` (`ph_wf_versions.template_id` FK). Requires NOT NULL `work_item_type`; UNIQUE(name, work_item_type).
2. `notification_trigger_config` does not exist on staging at all — no committed migration creates it (prod-only, outside ledger). Frontend `notificationTriggerService.ts` expects it.
3. `admin_nav_modules` real columns: `module_key, name, description, group_name(NOT NULL), nav_type, sort_order, parent_module, is_active`. Migration used non-existent `key, label, icon_name, requires_auth`.
4. `admin_role_module_permissions.role_code` vocabulary is job-function codes (`super_admin`, `product_owner`, `developer`, …37 codes). Migration used `superadmin/admin/reviewer/approver/user` — none exist; no FK, so rows would insert silently and match no user (D8 intent not expressed by this table).

**Blast radius**: None yet — apply was transactional and rolled back; guard CHECK constraint unchanged; ledger has no row for 20260709160000. Staging is clean.

**Resolution**: RED FLAG raised in session 004; Vikram approved all three recommendations → D10 (conditional notification seed with staging waiver), D11 (real product_roles codes: 7 full / rest view), D12 (nav core/main sort 8; work_item_type 'Idea'). Migration amended in place (same version 20260709160000 — never applied anywhere prior), re-applied to staging, ledger aligned, 12/12 probes green. Amendment commit pending approval.

**Status**: ✅ RESOLVED 2026-07-09 (session 004).

## DRIFT-002 — 2026-07-11 — ADS ratchet regression in StartEvaluationArea

**What:** Commit `9b0f7ee62` added one token violation and one typography violation after the ADS
baseline was captured. The global pre-commit gate correctly blocked a later documentation commit.

**Evidence:** Current audit = tokens 19970 / typography 1367; committed baseline = 19969 / 1366.
Scanning only files changed since the baseline isolated both deltas to
`src/modules/ideation/pages/DetailPage.tsx` in `StartEvaluationArea`.

**Resolution:** Replace the newly introduced spacing with ADS space tokens and remove the uppercase
transformation. The baseline is not changed. See `03_PLAN_LOCK_ADS_GATE_REPAIR.md` and
`sessions/009_ads_gate_repair.md`.

**Status:** ✅ RESOLVED. Target block has zero scanner violations; color and ADS ratchet gates pass
at their committed baselines without a baseline edit.
