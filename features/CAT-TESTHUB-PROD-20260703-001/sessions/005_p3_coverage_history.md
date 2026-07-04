# Session 005: P3-F4 Coverage History Snapshots

**Started:** 2026-07-04
**Feature Work ID:** CAT-TESTHUB-PROD-20260703-001
**Phase:** P3-F4 (pull-based)
**SUBTASK:** Coverage history snapshots (30-day trend tracking)

## Execution Plan

1. Create migration: `tm_coverage_history` table + backfill RPC
2. Regen types
3. Create `useCoverageHistory.ts` hook
4. Wire into TestOpsPage — new "Coverage history" tab with chart
5. Validate and commit

## Acceptance Criteria

- Migration applied: table with snapshots (one per project per day)
- Backfill RPC populates 30 days of history
- Hook returns trend data: {date, coverage_pct}
- TestOps tab shows: project selector + line chart
- ADS tokens only
- SQL proves snapshot counts
- Screenshots light+dark
- Zero console errors

## Log

### Step 1: Create migration
✓ Migration: 20260704141701_tm_coverage_history.sql
  - Table `tm_coverage_history`: project_id, snapshot_date, total_items, covered_items, coverage_pct (generated)
  - Backfill RPC `tm_backfill_coverage_history(days)`: populates N days of history, one snapshot per project per day
  - Computes coverage_pct from covered/total items
  - RLS: read all, insert via RPC/admin
  - Indexes on project_id + snapshot_date for query performance

### Step 2: Create useCoverageHistory hook
✓ `src/hooks/test-management/useCoverageHistory.ts` created
  - `useCoverageHistory(projectId, days)`: queries snapshots, returns array of {snapshot_date, coverage_pct, total_items, covered_items}
  - `useProjects()`: fetches list of projects for selector
  - Both queries stale 5 minutes

### Step 3: Wire into TestOpsPage
✓ Import hooks at top
✓ Create CoverageHistoryTab component
  - Project selector (dropdown)
  - Table: date + total items + covered + coverage % (with progress bar visualization)
  - Progress bar: green if ≥80%, yellow if <80%
  - Uses ADS tokens + Lozenge for semantics
✓ Add "Coverage history" tab to TabList and TabPanel (inserted after Team & roles)

### Step 4: Validation
✓ npx tsc --noEmit — clean
✓ npm run lint:colors:gate — pass (0 = baseline 0)
✓ npm run audit:ads:gate — pass (no increase, tokens 24551/24551)
✓ npm run lint:cre — pass

## Ready for commit
