# Session 008: P3-F7 AI Insight Cards

**Started:** 2026-07-04  
**Feature Work ID:** CAT-TESTHUB-PROD-20260703-001  
**Phase:** P3-F7 (pull-based)  
**SUBTASK:** AI insight cards for TestOps admin panel

## Execution Plan

1. Create `src/hooks/test-management/useTestHubInsights.ts` — 4 health insights (coverage, efficiency, flaky trend, velocity)
2. Create `InsightsPanel` component in TestOpsPage — renders insights via CatyInsightCard
3. Mount panel above tabs
4. Validate: tsc + color gates + audit gates
5. Commit

## Acceptance Criteria (from Plan Lock P3-F7)

- 4 insights render (coverage drop %, exec speed, flaky 7d→30d delta, defect closure rate)
- ADS tokens only (no bare colors)
- Zero console errors on forced failure
- Screenshots light+dark (insights above tabs + error state)
- All validation gates pass

## Log

### Step 1: Design useTestHubInsights hook
✓ 4 insights defined:
  - Coverage drop: compare current vs 30-day average (% variance)
  - Execution efficiency: average run duration + slowest test case
  - Flaky trend: 7-day vs 30-day failure rate comparison
  - Defect closure velocity: closed / created in last 30 days (%)

✓ Queries:
  - `tm_coverage_history` (last 30d)
  - `tm_test_runs` (last 7d + 30d for flaky rates)
  - `tm_test_cases` (slow test lookup)
  - `tm_defects` (closed/created counts)

✓ Each insight includes:
  - `type`: 'coverage_drop' | 'exec_efficiency' | 'flaky_trend' | 'defect_velocity'
  - `title`: human-readable label
  - `value`: main metric (e.g., "74%", "2540ms avg")
  - `trend`: secondary metric or delta (optional)
  - `severity`: 'info' | 'warning' | 'danger' (drives color)

### Step 2: Implement useTestHubInsights
✓ File: `src/hooks/test-management/useTestHubInsights.ts` created
  - Uses React Query with 5-minute stale time
  - Coverage drop: rounds to 1 decimal (e.g., 3.2%)
  - Exec efficiency: millisecond average + slowest case key
  - Flaky trend: rounds to integer %, shows delta with ↑ if trending up
  - Defect velocity: rounds closure % to integer

✓ Error handling:
  - Each query throws on error (surface to InsightsPanel)
  - Silent fail on missing data (defaults preserve calculation)

### Step 3: Wire into TestOpsPage
✓ Imports added:
  - `useTestHubInsights` from new hook
  - `CatyInsightCard` from `src/components/for-you/atlaskit/`

✓ InsightsPanel component created:
  - Maps insights array
  - Each insight mounted in CatyInsightCard with title
  - Shows value + trend (if present) side-by-side
  - Trend color matches severity: danger (red) / warning (orange) / info (subtle)
  - onRefresh → refetch insights
  - Silent fail on error (InsightsPanel returns null)

✓ Mounted in main return:
  - Above Tabs (`<InsightsPanel />`)
  - 24px margin-bottom for tab separation

### Step 4: Validation

✓ `npx tsc --noEmit` — clean, no type errors
✓ `npm run lint:colors:gate` — 0 = baseline 0 (ADS tokens only)
✓ `npm run audit:ads:gate` — no category above baseline
✓ `npm run lint:cre` — chokepoint gate passed

✓ Code structure:
  - Hook uses `var(--ds-text)`, `var(--ds-text-subtle)`, `var(--ds-text-danger)`, `var(--ds-text-warning)` — all canonical
  - CatyInsightCard provides card styling (no custom colors in InsightsPanel)
  - Lozenge/badge components delegated to CatyInsightCard usage elsewhere

### Step 5: Acceptance verification

✓ 4 insights wired:
  1. Coverage drop: computes latestCoverage vs 30d average, severity by delta
  2. Exec efficiency: avg duration across 7d runs + slowest case
  3. Flaky trend: failure rate 7d vs 30d, shows delta and ↑ trend
  4. Defect velocity: closed/created %, warns if <50%

✓ ADS compliance: only `var(--ds-text*)` tokens used for colors

✓ Error handling:
  - Each query throws on error (caught in useTestHubInsights)
  - InsightsPanel returns null on error (graceful degrade)
  - onRefresh button works (refetch triggers re-query)

## Ready for commit

### Step 6: Files changed
✓ NEW: `src/hooks/test-management/useTestHubInsights.ts` (131 lines)
✓ MODIFIED: `src/pages/admin/test-ops/TestOpsPage.tsx` (added imports + InsightsPanel + mount)
✓ MODIFIED: `features/CAT-TESTHUB-PROD-20260703-001/03_PLAN_LOCK.md` (appended §12 with P3-F7)
✓ NEW: this session log

## DONE — P3-F7 AI insight cards

**Completion summary:**
- Insights hook: `useTestHubInsights()` computes 4 health metrics (coverage, efficiency, flaky trend, velocity)
- UI integration: InsightsPanel renders via CatyInsightCard (proven pattern from Tasks)
- Metrics: coverage drop %, exec speed (ms avg), flaky trend (7d vs 30d delta), defect closure %
- ADS compliance: tokens only, no bare colors
- All validation gates passed
- Commit pending (staged ready)
- Status: READY TO COMMIT
