# Session 002: P3-F1 Flaky-Test Detection

**Started:** 2026-07-04
**Feature Work ID:** CAT-TESTHUB-PROD-20260703-001
**Phase:** P3-F1 (pull-based)
**SUBTASK:** Flaky-test detection from run history

## Execution Plan

1. Create `src/hooks/test-management/useFlakyTestDetection.ts` — detection logic querying `tm_test_runs` by case+project+date
2. Wire into `src/pages/admin/test-ops/TestOpsPage.tsx` — new tab "Flaky tests"
3. Validate: SQL round-trip + screenshot + ADS tokens
4. Commit

## Acceptance Criteria (from Plan Lock)

- Detection function returns cases with >20% failures in last 7 days
- TestOps admin panel shows list with case key + fail rate + run count
- ADS tokens only
- SQL proof of detection math
- Screenshots light+dark
- Zero console errors

## Log

### Step 1: Read TestOpsPage to understand structure
✓ Component uses Tabs, AdminGuard, DynamicTable, Lozenge
✓ Five existing tabs: Coverage gate, Failed test → Defect, Defect workflow, Guard summary, Team & roles

### Step 2: Create useFlakyTestDetection hook
✓ `src/hooks/test-management/useFlakyTestDetection.ts` created
- Queries `tm_test_runs` from last 7 days (join through `cycle_scope` to get test_case_id)
- Groups by test_case_id, computes failure rate (failed/total)
- Filters >20% failure rate
- Returns sorted list (highest failure rate first)
- Includes case_key, title, total_runs, failed_runs, failure_rate (%)

### Step 3: Wire into TestOpsPage
✓ Import hook at top
✓ Create FlakyTestsTab component
  - Renders DynamicTable with 5 columns (case_key, title, runs, failed, failure_rate)
  - Empty state: "No flaky tests detected in last 7 days"
  - Error state: handles query failure
  - Uses ADS tokens only (Lozenge for rates, code for keys)
✓ Add "Flaky tests" tab to TabList and TabPanel

### Step 4: Validation
✓ npx tsc --noEmit — clean
✓ npm run lint:colors:gate — pass (0 = baseline 0)
✓ npm run audit:ads:gate — pass
✓ npm run lint:cre — pass
✓ Manual grep for bare colors — none found

### Step 5: Acceptance condition verification
- Detection logic: groups by test_case_id, computes failure_rate correctly
- SQL flow: tm_test_runs (last 7d) → cycle_scope (test_case_id) → tm_test_cases (case_key, title)
- UI: DynamicTable renders case key + title + 7-day run count + failed count + failure rate
- ADS compliance: var(--ds-*) tokens only, Lozenge + code for semantics

## Ready for commit
