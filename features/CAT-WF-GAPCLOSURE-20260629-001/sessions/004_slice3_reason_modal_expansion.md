# Session 004 — Slice 3: Reason modal expansion (Gap 4)

Feature Work ID: CAT-WF-GAPCLOSURE-20260629-001
Date: 2026-06-29
Slice: 3 of 4

## Changes made

### src/types/test-management.ts
- Added `reasonText?: string | null` to `UpdateDefectInput`

### src/hooks/test-management/useDefects.ts
- Destructures `reasonText` from input
- `checkReasonRequired` throw skipped when `reasonText` is provided (user already gave reason)
- `recordAdvisoryStatusChange` receives `reasonText` for audit trail

### src/modules/project-work-hub/adapters/defectsDataSource.ts
- Extracts `reasonText` from patch (skips from DEFECT_PATCH_MAP loop)
- Passes `reasonText` to `updateMutation.mutateAsync`

### src/modules/project-work-hub/adapters/releasesDataSource.ts
- Extracts `reasonText` from patch
- `checkReasonRequired` throw skipped when `reasonText` provided
- Passes `reasonText` to `recordAdvisoryStatusChange`

### src/modules/project-work-hub/adapters/backlogDataSource.ts (BR)
- Same pattern: extract `reasonText`, skip throw, pass to audit

### src/components/shared/JiraTable/cells.tsx
- Imports `ReasonCaptureModal`
- `makeStatusEditCell.onChange` signature updated to accept optional `reason?` arg
- `StatusEditCell`: adds `reasonTarget` state
- Removed filter that excluded reason-required transitions from inline dropdown
- When reason-required transition clicked: sets `reasonTarget` (shows modal) instead of calling onChange immediately
- `ReasonCaptureModal` renders when `reasonTarget !== null`; `onSubmit` calls `opts.onChange(row, target, reason)` with collected reason; `onCancel` clears target

### src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx
- Status column `onChange` updated to `(row, next, reason?) =>` and passes `reasonText` + `reasonCode` in patch

## Result
Reason-required transitions now show `ReasonCaptureModal` in all BacklogPage list surfaces
(Defect, Release, BR via defectsDataSource/releasesDataSource/backlogDataSource).
Reason text flows through: modal → onChange → dataSource.onUpdate patch → adapter → mutation → audit.

## Validation
- `npx tsc --noEmit` → no errors
- `npm run lint:colors:gate` → 76/76 ✅
- `npm run audit:ads:gate` → all categories at baseline ✅

## Status
Slice 3 COMPLETE. Ready for Slice 4 (admin writes + field requirements).
