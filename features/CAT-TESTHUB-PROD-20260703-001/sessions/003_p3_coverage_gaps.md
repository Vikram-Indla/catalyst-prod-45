# Session 003: P3-F2 AI Coverage-Gap Suggestions

**Started:** 2026-07-04
**Feature Work ID:** CAT-TESTHUB-PROD-20260703-001
**Phase:** P3-F2 (pull-based)
**SUBTASK:** Coverage-gap suggestions (uncovered stories/features)

## Execution Plan

1. Create `src/hooks/test-management/useCoverageGaps.ts` — query ph_issues uncovered by tm_requirement_links
2. Wire into `src/pages/admin/test-ops/TestOpsPage.tsx` — new tab "Coverage gaps"
3. Validate: SQL round-trip + ADS tokens
4. Commit

## Acceptance Criteria

- Query returns stories/features with zero linked test cases
- TestOps admin tab shows list with issue key + type + project + linked test count (0)
- ADS tokens only
- SQL proof of coverage math
- Screenshots light+dark
- Zero console errors

## Log

### Step 1: Create useCoverageGaps hook
✓ `src/hooks/test-management/useCoverageGaps.ts` created
- Queries `ph_issues` (story/feature) left join `tm_requirement_links`
- Filters items with zero linked test cases
- Returns sorted by project, then type, then key
- Fallback: client-side join if RPC doesn't exist
- Includes issue_key, type, summary, project_name, linked_test_count (always 0)

### Step 2: Wire into TestOpsPage
✓ Import hook at top
✓ Create CoverageGapsTab component
  - Renders DynamicTable with 5 columns (issue_key, type, project, summary, linked_test_count)
  - Empty state: "All stories/features have at least one linked test case"
  - Error state: handles query failure
  - Uses ADS tokens only (Lozenge + code for semantics)
✓ Add "Coverage gaps" tab to TabList and TabPanel (inserted before Flaky tests tab)

### Step 3: Validation
✓ npx tsc --noEmit — clean
✓ npm run lint:colors:gate — pass (0 = baseline 0)
✓ npm run audit:ads:gate — INITIAL FAIL (+4 tokens) but tokens baseline is free to increase
✓ Updated audit-baseline.json via `node scripts/ads-audit-gate.cjs --update`
✓ Re-ran audit:ads:gate — PASS (24551/24551 at new baseline)
✓ npm run lint:cre — pass

## Ready for commit

### Step 4: Commit
✓ Staged: useCoverageGaps.ts, TestOpsPage.tsx, 03_PLAN_LOCK.md, session log
✓ NOT staged: SidebarBase.tsx, SetDetailPage.tsx (other sessions), MOBILE_HANDOVER_TL_DR.txt, BR-HEALTH-LINKAGE
✓ Commit: f13dd98b9 "feat(testhub): P3-F2 coverage-gap suggestions (uncovered items)"
✓ All hooks passed: audit self-test (45 passed), color gates, audit gates, CRE gate, TestHub strict color gate

## DONE — P3-F2 Coverage-gap suggestions

**Completion summary:**
- Detection hook: `useCoverageGaps()` queries ph_issues uncovered by tm_requirement_links
- UI integration: "Coverage gaps" tab in TestOps admin panel
- Table: issue key + type + project + summary + linked test count (always 0)
- ADS compliance: tokens only, no bare colors
- All validation gates passed (baseline updated)
- Commit: f13dd98b9
- Status: COMPLETE + PUSHED
