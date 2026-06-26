# 04 — EXECUTION LOG

Append-only. One entry per slice/action once execution begins. Newest on top.

Format: date · phase/slice · what changed (files) · validation run · result · commit.

| Date | Phase/Slice | Change (files) | Validation | Result | Commit |
|---|---|---|---|---|---|
| — | pre-Phase-0 | none — Plan Lock gate | — | awaiting GO | — |
| 2026-06-26 | P0 · DB-target verify | (probe) | MCP execute_sql fingerprint cases/cycles/defects=25/3/7; `projects list` cyij=linked | cyij confirmed; migrations via MCP not `db push` | — |
| 2026-06-26 | P0 · D5 reconcile | (probe) | ph_issues 791 bugs/11 proj vs ph_work_items 0 bugs | defect source = ph_issues | — |
| 2026-06-26 | P0 · trigger guard | supabase/migrations/20260626100000_drop_broken_sync_jira_bug_to_defect.sql | apply_migration success; trigger/fn absent on cyij | idempotent guard applied | (uncommitted) |
| 2026-06-26 | P0 · wipe+reseed | features/.../seed/phase0_seed.sql (data via execute_sql) | BEFORE 25c/24s/13f/3cy/7d → AFTER_WIPE 0 (kept proj1/prio4/type4) → AFTER_SEED 6f/10c/28s | clean reseed | (data) |
| 2026-06-26 | P0 · defects route | NO CODE CHANGE — `/testhub/defects` already routed at FullAppRoutes.tsx:674 (→ TestHubDefectsPage, canonical JiraTable). Discovery agent's "route missing" was STALE/WRONG. Verified live: resolves, not a dead link (empty until P5 ph_issues repoint) | — | n/a |
| 2026-06-26 | P0 · BUG fix useTestCases | src/hooks/test-management/useTestCases.ts (drop non-existent `level` + `.eq('archived',false)`) | live: case list errored on every surface, now loads | cases render; fixed all useTestCases consumers | (uncommitted) |
| 2026-06-26 | P0 · UI live proof | (browser) | /testhub/repository renders 6 folders + 10 cases (TC-001..010) live from cyij, 0 console errors; /testhub/defects resolves | Phase 0 slice PROVEN; screenshot captured | — |
| 2026-06-26 | P1a · archived col | migration 20260626110000 (add tm_test_cases.archived) applied cyij + file | column added | enables archive + filter | (uncommitted) |
| 2026-06-26 | P1a · useTestCases | restore `.eq('archived',false)` (default) + `.not('is_latest_version','is',false)` de-dup | live: list 10, 0 archived, no dupes | correctness | (uncommitted) |
| 2026-06-26 | P1a · CaseDrawer folder-trap | edit now preserves existingCase.folder_id (was overwriting with sidebar folder) | code (surgical) | data-integrity fix | (uncommitted) |
| 2026-06-26 | P1a · delete confirm | RepositoryPage: trash → ADS danger ModalDialog (was instant hard-delete) | live: Cancel → count stays 10 | guards accidental delete | (uncommitted) |
| 2026-06-26 | P1a · create proof | (browser) created TC-0001 via drawer → row in cyij (draft, latest) | live | write path PROVEN | — |
