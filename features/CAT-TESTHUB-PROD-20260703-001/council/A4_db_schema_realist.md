# A4 — DB/Schema Realist

Feature: CAT-TESTHUB-PROD-20260703-001 · Advisor: DB/Schema Realist · 2026-07-03
Inputs: discovery 02/03/04, gaps G01/G02/G03/G05/G06/G13; disputed claims re-verified in src/ + supabase/migrations/ this session.
Environment law: **every DDL below targets cyij staging only** (Management API path per memory `staging-ddl-via-management-api`), migration file committed 1:1 with ledger row, prod lmqw untouched. Assert `supabase/.temp/project-ref` before any `--linked` batch.

Verdict: **The plan needs far fewer new tables than the gap shards imply — but it cannot write a single migration until a Phase-0 probe batch closes 14 unknowns.** The migration ledger materially over-states the live schema (03 §9/§10: ~73 migration-created tables absent from types), so "exists in migrations" proves nothing. Probe-first is not hygiene here; it is the difference between a migration and a 42P07/42P01 failure.

Session verifications (claims I checked directly, not trusted from shards):
- `tm_cycle_sets`: **zero** matches in `supabase/migrations/`; only consumers `src/pages/testhub/sets/SetDetailPage.tsx:300,411` via `as any`. Confirmed.
- `tm_requirement_links` (migration `20260121133047:8-23`): **UNIQUE(test_case_id, requirement_type, requirement_id)** and **UNIQUE(test_case_id, requirement_type, external_key)** DO exist in the DDL — TRC-036's "no duplicate guard" is wrong as written; residual risk is only (a) whether the constraint survived on cyij and (b) rows where both requirement_id and external_key are NULL. No `project_id` column — TRC-038 confirmed.
- `useDefects.ts:352-361` inserts `link_type/linked_id/entity_label/link_source` into tm_defect_links — columns absent from types. Confirmed (DAT-010/DEF-003).
- `tm_shared_steps` has migration origins (`20260403185357`, `20260403191537`, `20260411195114`) but is not in types — likely dropped on cyij.
- `20260522000003_add_test_hub_scope_to_saved_filters.sql` adds no slug column — filters slug work is real.

---

## 1. Phase-0 probe batch — MUST run on cyij before ANY migration is written

One SQL session, results recorded in `09_DECISIONS.md`. Exact probes:

```sql
-- P0.1 Ghost-relation existence (DAT-013/023, TRC-048, DAT-012, VER-040)
SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('tm_cycle_sets','plan_test_cycles','tm_requirement_tests','tm_requirements',
  'tm_shared_steps','tm_shared_step_categories','tm_scheduled_runs','tm_plan_milestones',
  'tm_saved_filters','tm_notifications','tm_activity_log','tm_ai_embeddings',
  'tm_test_case_templates','tm_user_presence');

-- P0.2 tm_defect_links live columns (DAT-010)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='tm_defect_links' ORDER BY ordinal_position;

-- P0.3 tm_requirement_links live constraints + orphan/dupe audit (TRC-002/036/038)
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='tm_requirement_links'::regclass;
SELECT count(*) FROM tm_requirement_links l
 LEFT JOIN ph_issues i ON i.id=l.requirement_id
 WHERE l.requirement_id IS NOT NULL AND i.id IS NULL;         -- orphans blocking the FK
SELECT test_case_id, requirement_type, count(*) FROM tm_requirement_links
 WHERE requirement_id IS NULL AND external_key IS NULL
 GROUP BY 1,2 HAVING count(*)>1;                              -- double-NULL dupes

-- P0.4 sprint FK live target (DAT-029)
SELECT conrelid::regclass, confrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conname LIKE '%sprint_id%' AND contype='f';

-- P0.5 FK family split project_id→projects vs tm_projects (DAT-025)
SELECT conrelid::regclass AS tbl, confrelid::regclass AS target
FROM pg_constraint WHERE contype='f' AND confrelid IN
 ('projects'::regclass,'tm_projects'::regclass)
 AND conrelid::regclass::text LIKE 'tm_%';

-- P0.6 RLS zero-policy sweep (DAT-026)
SELECT c.relname FROM pg_class c
WHERE c.relrowsecurity AND c.relname LIKE 'tm_%'
 AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename=c.relname);

-- P0.7 Trigger forensics per core table (DAT-027, VER-012 precondition)
SELECT tgrelid::regclass, tgname, pg_get_triggerdef(oid) FROM pg_trigger
WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE 'tm_%' ORDER BY 1;
-- then one authed INSERT/UPDATE/DELETE write-probe per table the plan builds on
-- (tm_test_cases, tm_cycle_scope, tm_test_runs, tm_step_results, tm_defects, tm_set_cases)

-- P0.8 Live enum values (PLN-008, VER-024, DAT-028)
SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
WHERE t.typname IN ('tm_cycle_status','tm_case_status','tm_execution_status',
 'tm_defect_status','tm_defect_severity','tm_test_plan_status') ORDER BY 1, e.enumsortorder;

-- P0.9 Counter drift audit (DAT-024)
SELECT c.id, c.total_cases, s.n FROM tm_test_cycles c
 JOIN LATERAL (SELECT count(*) n FROM tm_cycle_scope WHERE cycle_id=c.id) s ON true
 WHERE c.total_cases IS DISTINCT FROM s.n;
SELECT ts.id, ts.test_count, x.n FROM tm_test_sets ts
 JOIN LATERAL (SELECT count(*) n FROM tm_set_cases WHERE test_set_id=ts.id) x ON true
 WHERE ts.test_count IS DISTINCT FROM x.n;

-- P0.10 Auto-defect trigger behavior (DAT-045/DEF-008): fail a scratch run, then
SELECT id, auto_created_defect_id FROM tm_test_runs WHERE id='<probe-run>';

-- P0.11 Legacy family row counts before any drop/port (DAT-019/021, DEF-040)
SELECT 'test_data_rows' t, count(*) FROM test_data_rows UNION ALL
SELECT 'test_data_parameters', count(*) FROM test_data_parameters UNION ALL
SELECT 'test_cycle_executions', count(*) FROM test_cycle_executions UNION ALL
SELECT 'th_test_executions', count(*) FROM th_test_executions UNION ALL
SELECT 'defects', count(*) FROM defects UNION ALL
SELECT 'tm_test_set_cases', count(*) FROM tm_test_set_cases UNION ALL
SELECT 'tm_test_plan_cases', count(*) FROM tm_test_plan_cases;

-- P0.12 Audit split-brain writers (DAT-056)
SELECT 'tm_audit_log' t, count(*), max(created_at) FROM tm_audit_log
UNION ALL SELECT 'tm_audit_logs', count(*), max(created_at) FROM tm_audit_logs;

-- P0.13 tm_projects duplicate rows before FK repoint (DAT-025 precondition)
SELECT key, count(*) FROM tm_projects GROUP BY key HAVING count(*)>1;

-- P0.14 RPC existence for the coverage engine (TRC-043)
SELECT proname FROM pg_proc WHERE proname IN
 ('tm_get_traceability_matrix','tm_get_requirement_test_cases','tm_link_requirement',
  'tm_next_entity_key','tm_evaluate_quality_gates');
```

---

## 2. Verified schema-change list

Legend: Exists? = live-on-cyij status per evidence today. RB = rollback. All new tables ship the canonical 4 `tm_user_has_access` RLS policies **in the same migration** (DAT-026 law) and a committed migration file.

### 2.1 New tables

| # | Change | Exists? | Migration needed | Rollback | Risk | Probe gate |
|---|---|---|---|---|---|---|
| N1 | `tm_cycle_sets` (cycle_id FK, test_set_id FK, UNIQUE pair, RLS ×4) — **only if** Plan Lock rejects the better option: expand set membership into `tm_cycle_scope` at add-time (PLN-013 preferred; one membership model, no new table) | NO migration, NO type; cyij UNKNOWN | Decision-gated | DROP TABLE (additive) | LOW if created; MEDIUM if we instead rewrite SetDetailPage — routed surface currently failing silently | P0.1 |
| N2 | `tm_defect_status_history` (defect_id FK, from/to status, actor, at; capture trigger mirroring D-004 `ph_issue_status_history`) — unlocks SLA/aging/MTTR (DEF-026) | Does not exist | YES (P2 phase) | DROP TABLE + trigger; no backfill promised (history-gated like D-004) | LOW — additive, proven pattern | P0.7 (trigger landscape first) |
| N3 | Coverage engine = **VIEW + RPC, not tables** (`v_tm_requirement_coverage` verdict view over tm_requirement_links × tm_test_runs/tm_cycle_scope, 4-state OK/NOK/NOT-RUN/UNCOVERED, params: release/sprint/env/plan/policy) (TRC-004/009/010/011) | RPC `tm_get_traceability_matrix` + `v_tm_traceability_summary` exist but untrusted (broke twice, 03 §8) | YES — CREATE OR REPLACE VIEW/FUNCTION | CREATE OR REPLACE back / DROP | MEDIUM — must become the single engine; TraceabilityPage, TestCoveragePanel, reports #25/26 all repoint | P0.14 + shape probe |
| N4 | `tm_coverage_history` snapshot table (TRC-041) | Does not exist | P3 only | DROP | LOW | none (deferred) |
| N5 | Shared-steps library tables (`tm_shared_steps` etc.) | Migration-created ×3, absent from types → likely dropped | **NO for MVP.** Reuse existing `tm_test_steps.is_shared` + `shared_step_id` self-FK (TD-010 is P2/L); decide recreate-vs-delete after P0.1 | n/a | LOW now; the dead migrations stay as ledger history | P0.1 |
| N6 | `tm_baselines`/`tm_baseline_items` (VER-018), `tm_watchers` (VER-049) | Do not exist | P3 only — keep out of MVP Plan Lock scope | DROP | LOW | none |

### 2.2 FK / column additions

| # | Change | Exists? | Migration | Rollback | Risk |
|---|---|---|---|---|---|
| F1 | `tm_requirement_links.requirement_id` → FK `ph_issues(id)` (nullable; internal types require it via CHECK) + `project_id` FK to tm_projects (backfill from tm_test_cases) + index (TRC-002/038) | Column exists, bare uuid, no project_id — verified | YES, P1. Order: orphan cleanup (P0.3) → ADD COLUMN project_id + backfill UPDATE → ADD CONSTRAINT FKs NOT VALID → VALIDATE | DROP CONSTRAINT / DROP COLUMN | MEDIUM — orphan rows block VALIDATE; run P0.3 counts first |
| F2 | tm_defects ↔ ph_issues bridge: **no FK — keep the locked 4-fold hybrid** (D-005): parent_key text, issue-type union at reporting layer, CreateStoryModal isDefect branch, workflow_status_key advisory. Adding an FK would contradict the locked decision and couple families | Bridge live | **NONE** | n/a | Adding FK = HIGH (rejected). Optional P3 hardening: validation trigger on parent_key existence |
| F3 | `tm_defect_links`: reconcile code vs schema — either ADD `link_type/linked_id/entity_label/link_source` (+ backfill nulls) or rewrite useDefects insert to real columns (DAT-010) | Columns NOT in types; live UNKNOWN | Decision after P0.2. Realist lean: ADD columns (additive, unblocks the auto-link chain and DEF/TRC chains) | DROP COLUMNs | LOW-MEDIUM |
| F4 | `tm_step_results.test_step_id` FK: `ON DELETE CASCADE` → `SET NULL` + denormalized `action_snapshot`/`expected_snapshot` columns (VER-002) — historical results must survive step edits | CASCADE verified in `20260104074712:272` | YES, P1 (part of version-engine slice) | Re-add CASCADE (but data loss from interim deletes is unrecoverable → do this EARLY) | MEDIUM — FK swap needs exact constraint name from cyij, not from ledger |
| F5 | `tm_test_runs` `UNIQUE(cycle_scope_id, run_number)` + next-run_number default (DAT-054) | run_number hardcoded 1 app-side | P2; dedupe existing rows first | DROP CONSTRAINT | MEDIUM — existing duplicate (scope,1) rows must be renumbered before constraint |
| F6 | `tm_test_cases.approved_by/approved_at` (VER-025) | Absent (47-col table verified) | P2, additive | DROP COLUMNs | LOW |
| F7 | Drop `tm_test_cases.release_version_id` (PLN-027) + environment text→FK backfill on tm_test_cycles (PLN-020) | Both split-brains verified | P2 after row-usage probe | Column re-add (data preserved via pre-drop snapshot) | LOW |
| F8 | `tm_projects.ph_project_id` FK + auto-provision trigger (DAT-057) — bridge, not unify | Seed-time id mirroring only | Plan-Lock DECISION (bridge vs unify); bridge is additive | DROP | MEDIUM — touches every tm_* surface's project resolution assumption |

### 2.3 Enum cleanups — the hidden cost item

Postgres **cannot remove enum values in place**. PLN-008 (7→5 `tm_cycle_status`) is not an `ALTER TYPE`; it is: create `tm_cycle_status_v2` → `UPDATE ... SET status = map(status)` (draft→planned, active→in_progress) → `ALTER COLUMN ... TYPE ... USING` → drop old type → recreate `trg_validate_cycle_status_transition` against the new set. Budget it as its own 2-hour slice with a down-script, not a one-liner.

| # | Change | Migration | Rollback | Risk |
|---|---|---|---|---|
| E1 | `tm_cycle_status` 7→5 via type-swap above | YES, P1 | Reverse type-swap (values preserved by map) | MEDIUM — trigger + all status literals app-side must move in the same slice; enum-bridge module per DAT-028 |
| E2 | `tm_case_status` `needs_update`: Plan-Lock DECIDE add-value (easy, `ALTER TYPE ADD VALUE`, **irreversible**) vs drop from UI type (VER-024). Realist lean: drop from UI — enum additions can never be rolled back | Maybe | ADD VALUE has NO rollback | LOW if UI-side |
| E3 | No change to `tm_execution_status`/`tm_defect_severity`/`tm_defect_status`; fix casing app-side via one enum-bridge module per entity (DAT-028); re-probe ExecutionPage uppercase deferral | app-only | n/a | LOW |
| E4 | `tm_requirement_links.requirement_type` CHECK: widen to include `defect`,`incident` (TRC-027) | YES, P2 — DROP + re-ADD CHECK | Restore original CHECK | LOW |

### 2.4 Counter-trigger strategy (DAT-024/014, PLN-049)

Rule for the plan: **one counter = exactly one DB maintainer, or no counter at all — prefer views for anything new.**
1. Cycle counters: keep `trg_sync_cycle_scope_counters` as sole maintainer; delete app-side compensations; backfill drift found by P0.9. Extend `tm_step_results_percolate` to INSERT (DAT-053) in the same slice.
2. Set counts: canonicalize `tm_set_cases`; move `trigger_update_test_set_count` onto it; merge any `tm_test_set_cases` rows (P0.11) then DROP that table + `tm_set_key_sequence` duplicate. RB: pre-merge CTAS snapshot table.
3. Folder `case_count` / plan counters: audit trigger exists (`tm_test_cases_folder_counts`, `trg_tm_update_plan_stats`); verify via P0.9-style diff; if drifted twice, replace reads with `tm_folders_with_counts` view.
4. New coverage numbers: **never denormalized** — view N3 only.
5. Defect keys: replace client MAX-scan with `tm_next_entity_key(project_id,'DEF')` (DAT-009) — app-only, no DDL; normalize key zero-padding inside that RPC (DAT-058, P3).

### 2.5 Slug contract (CLAUDE.md ⛔)

| Surface | Slug/key column | Migration needed? |
|---|---|---|
| Sets `/testhub/:projectKey/sets/:setKey` | `tm_test_sets.set_key` EXISTS (trigger-generated) | **NO DDL** — route + `Routes` builder + `useSetByKey` hook only (fixes DAT-055/PLN-053/TD-001) |
| Filters `/testhub/filters/:slug` | generic `saved_filters` has NO slug (verified `20260522000003`) | YES — additive `slug TEXT UNIQUE` + `generate_slug()` trigger on the SHARED table; coordinate: other modules' filters get slugs too (backfill all rows). RB: DROP COLUMN. Risk MEDIUM (shared table) |
| Plans, defects, cases, cycles | plan_key / defect_key / case_key / cycle_key all EXIST with per-project UNIQUEs | NO DDL — routes/builders/hooks only (PLN-001, DEF-004/042) |
| New tables (N1/N2) | join/history tables, never routed | Exempt — no slug needed |

### 2.6 Types regen + guard (DAT-050)

After the P1 DDL wave on cyij: `generate_typescript_types` → replace `src/integrations/supabase/types.ts` → remove every tm_* `as any` (useTestCycleByKey, useTestPlansG26 blanket casts, SetDetailPage, useDefects) → CI grep failing on `from('tm_` adjacent to `as any`. Regen is **mandatory in the same slice as each DDL batch**, not a cleanup afterthought — otherwise the casts creep back.

---

## 3. Sequencing the Realist insists on

1. **Slice 0 (probe batch §1)** — read-only, no migration files, results → 09_DECISIONS. Blocks everything.
2. **Slice 1 (repair DDL)**: F3 decision, N1 decision, F1, RLS gap fixes from P0.6, FK repoints from P0.5 (after P0.13 dedupe). One migration file per concern, regen types.
3. **Slice 2 (integrity DDL)**: F4 (early — every day of CASCADE is unrecoverable data loss), E1 type-swap, counter canonicalization §2.4.2.
4. **Slice 3 (engine)**: N3 coverage view/RPC; VER version-engine + audit-trigger slices per G02's cross-cutting note.
5. P2/P3 items (N2, F5-F8, E4, N4-N6) enter later Plan Locks only.

Non-negotiables: no `ALTER TYPE ADD VALUE` without a written "irreversible" note in the migration header; no drop of any legacy table before its P0.11 row count is 0 AND importer-grep is clean; every migration additive-first, destructive step in a separate later migration.
