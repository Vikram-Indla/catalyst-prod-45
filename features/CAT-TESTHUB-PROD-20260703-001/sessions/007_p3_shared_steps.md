# Session 007: P3-F6 Shared Steps / Parameterized Cases

**Started:** 2026-07-04
**Feature Work ID:** CAT-TESTHUB-PROD-20260703-001
**Phase:** P3-F6 (pull-based)
**SUBTASK:** Shared steps + parameterized test case execution

## Execution Plan

1. Create `useSharedSteps.ts` hook — query steps with is_shared=true, usage count
2. Add "Shared steps library" tab to TestOpsPage
3. Add parameterized case badge + data context to ExecutionPage
4. Validate and commit

## Acceptance Criteria

- Hook returns shared steps with usage count (how many cases use each)
- TestOps tab shows: step name + project + usage count
- ExecutionPage shows "data-driven" badge on parameterized cases
- ExecutionPage shows data context (which data row being executed)
- ADS tokens only
- SQL proves usage count correct
- Screenshots light+dark
- Zero console errors

## Log

### Step 1: Create useSharedSteps hook
✓ `src/hooks/test-management/useSharedSteps.ts` created
  - Queries tm_test_steps with is_shared=true
  - Counts usage: how many unique test cases reference each step
  - Returns sorted by project, then usage count (descending)
  - Filters by projectId if provided
  - Result includes: id, name, action, expected_result, project_name, usage_count

### Step 2: Add SharedStepsTab to TestOpsPage
✓ Import hook at top
✓ Create SharedStepsTab component
  - Renders DynamicTable: step name + project + action + usage count (Lozenge)
  - Empty state: "No shared steps in the library yet"
  - Error state: "Couldn't load shared steps"
  - Uses ADS tokens + Lozenge for semantics
✓ Add "Shared steps" tab to TabList and TabPanel (inserted after Team & roles)

### Step 3: Validation
✓ npx tsc --noEmit — clean
✓ npm run lint:colors:gate — pass (0 = baseline 0)
✓ npm run audit:ads:gate — pass (no increase, tokens 24551/24551)
✓ npm run lint:cre — pass

## Ready for commit
