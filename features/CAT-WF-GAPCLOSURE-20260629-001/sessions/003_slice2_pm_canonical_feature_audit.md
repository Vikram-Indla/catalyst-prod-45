# Session 003 — Slice 2: PM canonical read + Feature audit wiring

Feature Work ID: CAT-WF-GAPCLOSURE-20260629-001
Date: 2026-06-29
Slice: 2 of 4

## Changes made

### src/components/product-hub/MilestoneCard.tsx (Gap 3)

- Added `useCanonicalIssueWorkflow('product_milestone')` hook call
- `statusLabel`: uses `canonical.labelForStatus(milestone.status)` when canonical; falls back to raw value
- `statusAppearance`: iterates `canonical.statusGroups` to find category for the resolved label, maps to `CATEGORY_APPEARANCE` (todo→default, in_progress→inprogress, done→success); fallback to `STATUS_APPEARANCE_FALLBACK` map
- Replaced hardcoded `STATUS_APPEARANCE` with `STATUS_APPEARANCE_FALLBACK` (now only used when no canonical version published)
- Lozenge now renders `statusLabel` instead of `milestone.status`

### src/pages/project/FeatureDetailPage.tsx (Gap 7)

- Imported `recordAdvisoryStatusChange` from `@/lib/workflow/canonical/runtime`
- In `handleStatusChange`: captures `fromStatus = feature?.status ?? null` before mutate
- On `onSuccess`: fires `recordAdvisoryStatusChange({ entityKey: 'feature', entityId: featureId, fromStatusRaw: fromStatus, toStatusRaw: newStatus, projectKey: null, sourceSurface: 'feature_detail' })` — non-blocking (`.catch(() => {})`
- `projectKey: null` → advisory path uses default scheme; no project context available in this component without additional DB fetch

### src/components/features/FeaturesKanbanView.tsx (Gap 7)

- Imported `recordAdvisoryStatusChange`
- In `handleDragEnd`: captures `fromStatus` from features array before update
- After successful update + `onRefetch()`: fires `recordAdvisoryStatusChange({ entityKey: 'feature', entityId: featureId, fromStatusRaw: fromStatus, toStatusRaw: newStatus, projectKey: null, sourceSurface: 'kanban_drag' })` — non-blocking

## Validation

- `npx tsc --noEmit` → no errors
- `npm run lint:colors:gate` → 76/76 ✅
- `npm run audit:ads:gate` → all categories at baseline ✅

## Status

Slice 2 COMPLETE. Ready for Slice 3 (reason modal for Defect/Release/BR list surfaces).
