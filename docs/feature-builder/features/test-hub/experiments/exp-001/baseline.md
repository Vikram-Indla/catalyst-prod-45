# Baseline: test-hub / exp-001

**Date:** 2026-06-26
**Time:** 00:42

Record current state BEFORE any changes. This is a research experiment — no code changes.

---

## Files to be Touched

| File | Current state | ADS violations | TS errors |
|---|---|---|---|
| N/A — research only | No code changes | N/A | N/A |

---

## Relevant Data State

```
Routes registered: 14 (FullAppRoutes.tsx)
Page files: 19 (src/pages/testhub/)
Hooks: 18 (src/hooks/test-management/)
Admin pages: 5 (src/pages/admin/test/)
DB schemas: 2 (tm_* active, th_* legacy/dead)
AIO PDF docs: 152 (accessible)
AIO knowledge base: 7 directories (accessible)
Feature workspace docs created by init-feature.sh: 9 files
Experiment files created by start-experiment.sh: 9 files
```

## Current Test Hub Status Summary

| Surface | Current state |
|---|---|
| Sidebar | ✅ TestHubSidebar uses SidebarBase |
| Dashboard | ✅ mounts canonical ProjectDashboardPage mode='test' |
| Filters | ✅ mounts canonical FiltersListPage hubType='test' |
| Admin config | ✅ 5 admin pages exist |
| Repository page | ⚠️ unknown — needs exp-002 audit |
| CaseDrawer | ⚠️ custom file — may be parallel impl |
| Cycles page | ⚠️ unknown |
| ExecutionPage | ⚠️ unknown |
| Sets pages | ⚠️ unknown |
| Traceability | ⚠️ unknown |
| Reports | ⚠️ unknown |
| Board | ⚠️ unknown |
| Dashboard widgets | ⚠️ no test-specific widgets wired yet |
| CATY AI | ⚠️ hook exists, not confirmed in UI |
| Dual schema bug | ❌ dashboard RPCs read th_* = always 0 |

## Baseline ADS Audit

Not run — research experiment, no src/ files touched.

## Baseline TypeScript

Not run — research experiment, no src/ files touched.
