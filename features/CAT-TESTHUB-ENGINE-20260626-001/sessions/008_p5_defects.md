# Session 008 — Phase 5: Defects (model revised → D14) + Phase 4b partial

**Date:** 2026-06-27
**Branch:** main

## Phase 4b (partial)
- Timer: DONE (ExecutionPage useTimer → duration_seconds, proven in Phase 4a run).
- Defect-from-exec: works via DB trigger tm_auto_create_defect_on_failure (→ tm_defects).
- Evidence-attach: NOT built (no upload UI in ExecutionPage; th_execution_attachments table exists). DEFERRED.

## Phase 5 Defects — D1 conflict resolved (D14)
- Probe: DefectsPage (/testhub/defects → src/pages/testhub/DefectsPage.tsx) mounts canonical BacklogPage with useDefectsSource adapter → reads **tm_defects** (NOT ph_issues per D1).
- Evidence D1 doesn't fit: DEMO (tm_projects, key 'DEMO') has 0 ph_issues bugs; the 788 live ph_issues bugs belong to real projects. Execution auto-creates tm_defects (DEF-00001). DefectsPage renders DEF-00001 live (Open, 1 of 1, no crash).
- **D14 (Vikram): REVISE D1 → keep tm_defects** as the testhub defect store. ph_issues deferred to real-project integration.

## Bug fixed
- defectsDataSource DEFECT_STATUSES used UPPERCASE + invalid values (FIXED/VERIFIED/WONT_FIX/DUPLICATE) — real tm_defect_status enum is lowercase [open, in_progress, resolved, closed, reopened]. Status update would 400. FIXED: aligned values to enum + lowercase lookups (resolvedStatusLabel/Appearance).

## Proven live (cyij)
- /testhub/defects: canonical JiraTable shows DEF-00001 "Test Failed: Login with valid credentials" Open, linked to run via source_test_run_id.
- Raise-from-execution chain (Phase 4a): failed run → auto tm_defect → in Defects table ✓ (D1 original slice proof met, on tm_defects).
- Status update: authed PATCH DEF-00001 open→in_progress 200 (enum accepts, release_sync trigger clean).
- tsc clean.

## Open / deferred
- Phase 4b evidence-attach (new build: storage + upload UI + tm_defect_links.attachment_id / th_execution_attachments).
- 4c multi-run "Add Run" (run_number hardcoded 1).
- tm_defect_links manual linking UI (table ready: defect_id/test_run_id/step_result_id/attachment_id).
- Phase 6 Traceability, Phase 7 Admin.

## Test artifacts on cyij
SET-001 (3 cases); CYC-001 (TC-001 failed run + 3 step results + audit row); DEF-00001 (tm_defects, now in_progress, source_test_run_id=run).
