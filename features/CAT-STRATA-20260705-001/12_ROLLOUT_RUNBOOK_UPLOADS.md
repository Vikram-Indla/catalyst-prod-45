# 12 — ROLLOUT RUNBOOK: Upload Validation/Promotion + Entity-Create RPCs

**Feature**: CAT-STRATA-20260705-001 · STRATA backend slice R2
**Status**: AUTHORED, **NOT APPLIED** anywhere (no DB channel in the authoring session; prod out of scope per staging-first directive).
**Target**: STAGING ONLY — project ref `cyijbdeuehohvhnsywig`. Prod (`lmqwtldpfacrrlvdnmld`) is explicitly out of scope.

## Files in this slice

| Version | File | Contents |
|---|---|---|
| `20260705140000` | `supabase/migrations/20260705140000_strata_upload_validation_promote.sql` | `strata_validate_run(uuid)`, `strata_promote_run(uuid)` |
| `20260705140100` | `supabase/migrations/20260705140100_strata_entity_create_rpcs.sql` | `strata_create_kpi`, `strata_create_strategy_element`, `strata_create_okr`, `strata_create_benefit` |

Both are pure `CREATE OR REPLACE FUNCTION` + `COMMENT` — **no DDL on tables, no RLS changes, no data writes**. Rollback = `DROP FUNCTION` (listed below). They depend on all seven `20260705100000`–`20260705100600` STRATA migrations being applied first (they reference `strata_has_role`, `strata_audit_events`, `strata_upload_runs`, `strata_staging_rows`, `strata_validation_results`, `strata_upload_templates`, `strata_kpis`, `strata_periods`, `strata_kpi_actuals`, `strata_lineage_records`, `strata_cycles`, `strata_strategy_elements`, `strata_perspectives`, `strata_okrs`, `strata_benefits`, `strata_portfolios`, `strata_value_categories`).

## Apply procedure (staging)

Per CLAUDE.md "CONCURRENT SESSIONS & DB TARGETING — HARD STOP":

```bash
# 0. From the checkout that owns the staging link (NOT someone else's worktree):
pwd && git branch --show-current

# 1. HARD ASSERT the linked target BEFORE any DDL batch:
cat supabase/.temp/project-ref        # MUST print: cyijbdeuehohvhnsywig
                                      # If it prints lmqwtldpfacrrlvdnmld (prod) → STOP.

# 2. Preconditions: the 7 STRATA base migrations are in the ledger:
supabase db query --linked "SELECT version FROM supabase_migrations.schema_migrations WHERE version LIKE '202607051%' ORDER BY version;"
#    Expect 20260705100000 … 20260705100600 present, and NO 20260705140000/20260705140100 yet.

# 3. Apply (preferred: the CLI push keeps file ↔ ledger 1:1 automatically):
supabase db push --linked
#    (or, if pushing selectively via Management API / db query: execute each file's
#     full contents, then record BOTH versions in supabase_migrations.schema_migrations —
#     never one without the other.)

# 4. Ledger discipline check — files and ledger must match 1:1:
supabase db query --linked "SELECT version FROM supabase_migrations.schema_migrations WHERE version IN ('20260705140000','20260705140100');"
```

**Ledger rules (CLAUDE.md)**: both files are committed before their versions are recorded; version prefixes `20260705140000`/`20260705140100` verified unique against `ls supabase/migrations` (nothing else at `202607051400*`/`202607051401*`). Never record a version whose file is not committed.

## Post-apply smoke probes (SQL, staging)

```sql
-- Functions exist with expected signatures
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc WHERE proname IN ('strata_validate_run','strata_promote_run',
  'strata_create_kpi','strata_create_strategy_element','strata_create_okr','strata_create_benefit');

-- Guard fires for non-role users (run as anon/normal user → expect exception)
SELECT public.strata_validate_run(gen_random_uuid());  -- 'upload run not found' only if role guard passed

-- End-to-end (as a data_steward user, using the seeded Salam template
-- 'kpi-actuals-quarterly' a5a1a000-…-0601 and an approved KPI slug):
-- 1. INSERT strata_upload_runs (template_id, template_version, status='staging', channel='excel');
-- 2. INSERT strata_staging_rows (raw = {"kpi_slug":"…","period":"Q2 FY2026","value":"42"});
-- 3. SELECT strata_validate_run(<run>);   -- expect {status:'completed', row_count_valid:1}
-- 4. SELECT strata_promote_run(<run>);    -- expect {promoted:1, skipped:0}
-- 5. SELECT strata_promote_run(<run>);    -- idempotency: expect {promoted:0, skipped:1}
-- 6. SELECT validation_status FROM strata_kpi_actuals WHERE upload_run_id=<run>; -- 'pending'
-- 7. SELECT * FROM strata_audit_events WHERE entity_id=<run> ORDER BY created_at; -- RPC:validate_run + RPC:promote_run
```

## Rollback

```sql
DROP FUNCTION IF EXISTS public.strata_validate_run(uuid);
DROP FUNCTION IF EXISTS public.strata_promote_run(uuid);
DROP FUNCTION IF EXISTS public.strata_create_kpi(text,text,text,text,text);
DROP FUNCTION IF EXISTS public.strata_create_strategy_element(uuid,text,text,uuid,uuid);
DROP FUNCTION IF EXISTS public.strata_create_okr(text,uuid,uuid,uuid,uuid);
DROP FUNCTION IF EXISTS public.strata_create_benefit(uuid,text,uuid);
DELETE FROM supabase_migrations.schema_migrations WHERE version IN ('20260705140000','20260705140100');
-- then delete/revert the two files in the same commit.
```

## Design decisions locked in the SQL (do not re-litigate in wiring)

1. **Validate**: guard `strata_has_role(ARRAY['data_steward','kpi_owner','strategy_office'])` — same role set as the `strata_runs_insert` RLS policy. Run must be `'staging'`; transitions `staging → validating → completed|failed` (`failed` iff zero valid rows). Prior `strata_validation_results` for the run are deleted on entry (idempotent within the state machine).
2. Checks: template `column_schema` `[{column,label,type,required}]` — required-present (`missing_required`), numeric coercion for `type='number'` (`not_numeric`); for `target_entity='kpi_actual'`: `kpi_slug` → **approved** `strata_kpis` (`kpi_not_found`), `period` name → exactly one `strata_periods` row (`period_not_found`/`period_ambiguous`), open period (`period_closed`, mirrors the seeded `period_open` rule). All are severity `error` with `suggested_fix`; warnings would not reject a row.
3. **Promote**: run must be `'completed'`; inserts only from `validation_status='valid'` staging rows; `entry_method='upload'`, `upload_run_id` + `staging_row_id` back-refs, `validation_status='pending'`, `submitted_by = run.initiated_by` — **attestation stays human** via existing `strata_attest_actual` (SoD CHECK `validated_by <> submitted_by` preserved). Idempotent: skips staging rows that already have an actual; in-run kpi+period duplicates resolved by `ON CONFLICT (kpi_id, period_id, upload_run_id) DO NOTHING`. Every write also gets a `strata_lineage_records` row with template context.
4. **`strata_create_kpi` has NO perspective parameter** — `strata_kpis` (20260705100200 lines 8–40) has no perspective column; perspective lives on `strata_strategy_elements.perspective_id` and scorecard model perspectives. Deliberate deviation from the requested signature rather than inventing a column.
5. **`strata_create_benefit` creates at `lifecycle_stage='identified'`** — the benefits CHECK has no `'draft'`; `identified` is the earliest stage (blueprint §10).
6. Create RPCs are thin: draft-only inserts, role guards mirroring each table's RLS write policy, FK existence checks, audit event per create. **Slugs come from the existing `trg_<table>_slug` triggers** (`strata_generate_slug`, frozen on creation) — the RPCs never set slugs.

## Post-apply wiring TODOs (UI/domain — NOT done in this slice)

**Domain functions** — extend the strata domain layer (follow existing rpc-call conventions in `src/modules/strata/` — check the domain/data folder before adding):

```ts
// src/modules/strata/domain/uploads.ts (or wherever runs/templates fns live)
export async function validateRun(runId: string) {
  const { data, error } = await supabase.rpc('strata_validate_run', { p_run: runId });
  if (error) throw error;
  return data as { run_id: string; status: 'completed' | 'failed'; row_count_valid: number; row_count_rejected: number };
}

export async function promoteRun(runId: string) {
  const { data, error } = await supabase.rpc('strata_promote_run', { p_run: runId });
  if (error) throw error;
  return data as { run_id: string; promoted: number; skipped: number };
}

export async function createKpi(input: { name: string; unit?: string; direction?: string; frequency?: string; entryMethod?: string }) {
  const { data, error } = await supabase.rpc('strata_create_kpi', {
    p_name: input.name, p_unit: input.unit ?? null,
    p_direction: input.direction ?? 'higher_better',
    p_frequency: input.frequency ?? 'quarterly',
    p_entry_method: input.entryMethod ?? 'upload',
  });
  if (error) throw error;
  return data as string; // new kpi id
}
// analogous: createStrategyElement, createOkr, createBenefit
```

**UI wiring** (canonical components only, ADS tokens only, screenshots before commit):

- Upload wizard (run creation flow): after staging rows are inserted and the run is set to `'staging'`, add a **"Validate"** step/button → `validateRun(run.id)` → render `strata_validation_results` grouped by row (severity lozenge via `@atlaskit/lozenge`, `suggested_fix` as helper text). Zero-valid runs surface `error_summary`.
- Run detail surface: when `run.status === 'completed'`, show **"Promote N valid rows"** button → `promoteRun(run.id)` → toast with `{promoted, skipped}`; re-query the run + actuals list. Promote button disabled for any other status (zero-assumption rendering — no fake enablement).
- Actuals appear with `validation_status='pending'` — the existing attestation surface (`strata_attest_actual`) is the follow-up human step; do NOT auto-attest from the wizard.
- Entity-create RPCs back the "New KPI / New element / New OKR / New benefit" modals — replace any direct-table inserts so audit events and guards are uniform.

## Validation evidence (authoring session)

- Version uniqueness: `ls supabase/migrations` shows nothing else at `202607051400*` or `202607051401*`; latest prior versions were `20260705120000` and `20260705130754`.
- `npx tsc -p tsconfig.app.json --noEmit | grep modules/strata` → empty (no TS touched in this slice).
- Schema evidence quotes retained in the session report (07_HANDOVER/09_DECISIONS follow-up if this slice is continued).
