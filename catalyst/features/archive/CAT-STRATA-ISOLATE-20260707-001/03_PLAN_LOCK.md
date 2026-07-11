# Plan Lock: STRATA Isolation Strategy

**Feature Work ID:** CAT-STRATA-ISOLATE-20260707-001  
**Status:** Approved  
**Date:** 2026-07-07

## Approved Decisions

1. **Supabase Separation:** Same Supabase project (cyijbdeuehohvhnsywig staging, lmqwtldpfacrrlvdnmld prod)
   - Isolation enforced via RLS policies and `APP_PRODUCT` app logic, not separate URLs
   - Simplifies infrastructure; no separate billing or project management needed

2. **Migration Files:** Copy (not move)
   - 24 STRATA migration files copied to `supabase/strata/migrations/`
   - Original files remain in `supabase/migrations/` on main (branch stability)
   - Both branches can operate independently; version ledger prevents double-apply

3. **Product Track Lifetime:** Eventually Merge Back
   - STRATA is a fast-track experimental version with planned 6-12 month isolation
   - Explicit merge planning begins when STRATA is mature
   - Isolation preserves merge path (surgical changes, reusable patterns)

## Implementation Checklist

### Phase 1: Branch Isolation
- [x] Create `strata-standalone` from `main`
- [ ] Verify branch isolation complete

### Phase 2: Environment Separation
- [ ] Create `.env.example.catalyst` template
- [ ] Create `.env.example.strata` template
- [ ] Create `src/lib/productEnvironmentGuard.ts` (startup guard)
- [ ] Integrate guard into `src/main.tsx` (app startup)
- [ ] Verify guard fails on missing/invalid APP_PRODUCT

### Phase 3: Migration Organization
- [ ] Create `supabase/strata/migrations/` directory
- [ ] Copy 24 STRATA migration files to new folder:
  - 20260705100000_strata_foundation_config_engine.sql
  - 20260705100100_strata_strategy_scorecard.sql
  - 20260705100200_strata_kpi_okr.sql
  - 20260705100300_strata_execution_value.sql
  - 20260705100400_strata_lineage_governance.sql
  - 20260705100500_strata_calc_engine.sql
  - 20260705100600_strata_seed_salam_demo.sql
  - 20260705140000_strata_upload_validation_promote.sql
  - 20260705140100_strata_entity_create_rpcs.sql
  - 20260705190000_strata_authoring_write_paths.sql
  - 20260706093000_strata_fix_is_admin.sql
  - 20260706101000_strata_project_card_manual_unique.sql
  - 20260706120000_strata_jira_sync_clear_flags.sql
  - 20260706190000_strata_execution_reconciliation_schema.sql
  - 20260706191000_strata_execution_reconciliation_rpcs.sql
  - 20260706192000_strata_execution_reconciliation_backfill.sql
  - 20260706200000_strata_dependency_name_column.sql
  - 20260706201000_strata_execution_import_rpc.sql
  - 20260706210000_strata_execution_import_relax_required.sql
  - 20260706220000_strata_execution_import_fix_null_record.sql
  - 20260706230000_strata_theme_play_2tier_hierarchy.sql
  - 20260706230100_strata_strategy_elements_slug_autogen.sql
  - 20260706230500_strata_execution_health_forecast_schema.sql
  - 20260706231000_strata_execution_health_forecast_rpcs.sql
- [ ] Create `scripts/check-product-environment.ts` validation script
- [ ] Update `package.json` with new scripts

### Phase 4: Code Module Verification
- [ ] Verify `src/modules/strata/` is self-contained (no Catalyst Strategy imports)
- [ ] Verify STRATA uses product-aware Supabase client
- [ ] Verify no regressions to Catalyst Strategy module

### Phase 5: Documentation & Governance
- [ ] Create `README_STRATA_ISOLATION.md` (repo root)
  - Branch isolation policy
  - Database isolation policy
  - Environment setup instructions
  - Forbidden actions checklist
  - Merge safety checklist
  - Local dev steps for both products
- [ ] Create Feature Work Folder artifacts (00, 01, 03, 07, 08, 09)
- [ ] (Optional) Add Git hooks for branch warnings

### Phase 6: Testing & Verification
- [ ] Test `npm run dev:catalyst` (APP_PRODUCT=CATALYST)
- [ ] Test `npm run dev:strata` (APP_PRODUCT=STRATA)
- [ ] Test `npm run check:product-env` validation
- [ ] Test missing APP_PRODUCT → startup failure
- [ ] Test STRATA migrations via `npm run db:migrate:strata`
- [ ] Test no regression: Catalyst routes work, Strategy module works
- [ ] Test no broken imports

### Phase 7: Commit & Handover
- [ ] Stage only the files created/modified for isolation
- [ ] Create commit with message referencing CAT-STRATA-ISOLATE-20260707-001
- [ ] Write session log to `catalyst/features/CAT-STRATA-ISOLATE-20260707-001/sessions/001_*`

## Critical Files to Create

| File | Purpose |
|------|---------|
| `.env.example.catalyst` | Catalyst environment template |
| `.env.example.strata` | STRATA environment template |
| `src/lib/productEnvironmentGuard.ts` | Startup validation (required APP_PRODUCT) |
| `scripts/check-product-environment.ts` | Preflight validation script |
| `README_STRATA_ISOLATION.md` | Isolation governance documentation |
| `supabase/strata/migrations/*` | 24 copied STRATA migration files |

## Critical Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add scripts: `dev:catalyst`, `dev:strata`, `db:migrate:catalyst`, `db:migrate:strata`, `check:product-env` |
| `src/main.tsx` | Integrate `productEnvironmentGuard()` at app startup |

## Forbidden Actions

- ❌ Do NOT move (cut) migrations from `supabase/migrations/` — copy only
- ❌ Do NOT modify existing STRATA code or tables
- ❌ Do NOT change Catalyst route registry or features
- ❌ Do NOT alter Strategy module behavior
- ❌ Do NOT delete or rename existing STRATA files
- ❌ Do NOT create separate Supabase projects

## What Stays Unchanged

- ✅ All existing Catalyst code on `main` branch
- ✅ All existing STRATA code (just organized better)
- ✅ STRATA module location (`src/modules/strata/`)
- ✅ Route registry entries
- ✅ Catalyst feature flags
- ✅ Database schema (RLS policies already enforce isolation)

## Verification Commands

```bash
# Verify branch exists
git branch -v | grep strata

# Verify environment guard
npx tsx src/lib/productEnvironmentGuard.ts

# Verify startup on Catalyst
APP_PRODUCT=CATALYST npm run dev

# Verify startup on STRATA
APP_PRODUCT=STRATA npm run dev

# Verify migrations folder
ls -la supabase/strata/migrations/ | wc -l  # Should show 24 files

# Verify no broken imports
npm run lint
```

## Rollback Plan

If needed, this entire feature can be undone:
1. Delete `strata-standalone` branch: `git branch -D strata-standalone`
2. Delete Feature Work Folder: `rm -rf catalyst/features/CAT-STRATA-ISOLATE-20260707-001/`
3. Delete environment templates and guard files
4. Revert `package.json` changes
5. Delete `supabase/strata/` folder
6. App reverts to main branch state

All changes are non-destructive and easily reversible.

## Timeline

- **Implementation:** 2-3 hours
- **Testing:** 1 hour
- **Documentation:** 1 hour
- **Total Effort:** ~4 hours

## Success Metrics

- ✅ `strata-standalone` branch created and functional
- ✅ Both `npm run dev:catalyst` and `npm run dev:strata` work
- ✅ Startup guard prevents wrong APP_PRODUCT values
- ✅ Zero regressions to Catalyst or Strategy module
- ✅ Migration organization clear and documented
- ✅ README_STRATA_ISOLATION.md is comprehensive
- ✅ Feature Work Folder complete per Catalyst contract

---

**Approved by:** Catalyst Engineering  
**Date:** 2026-07-07
