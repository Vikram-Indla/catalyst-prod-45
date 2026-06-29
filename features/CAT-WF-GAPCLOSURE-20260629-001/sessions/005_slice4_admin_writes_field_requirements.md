# Session 005 — Slice 4: Admin writes + field requirements (Gaps 5, 6)

Feature Work ID: CAT-WF-GAPCLOSURE-20260629-001
Date: 2026-06-29
Slice: 4 of 4

## Changes made

### src/hooks/workflow-v2/useWorkflowFoundation.ts
- Added `useWfFieldRequirements(versionId)` — reads ph_wf_field_requirements for a version
- Added `useCloneVersionToDraft()` — clones published version's statuses + transitions to new draft,
  writes ph_wf_admin_audit row via `writeAdminAudit('version_cloned', ...)`

### src/lib/workflow/canonical/runtime.ts
- Added `evaluateFieldRequirements({ versionId, transitionId, issueRow })` — queries
  ph_wf_field_requirements for on_transition + required fields, returns missingFields[]
- Called in `gateTransition()` after guard evaluation; adds `field_required:<field_key>` to
  missingGuard when fields absent; advisory/non-blocking on DB error
- `fieldReqs` included in audit JSONB `evaluation.fieldRequirements`

### src/pages/admin/workflows/WorkflowVersioningPage.tsx
- Imports `useCloneVersionToDraft`, `useWfFieldRequirements`
- VersionsTab: "Clone to draft" button visible on published versions only
- Added `FieldRequirementsSection({ versionId })` component — shows ph_wf_field_requirements table
  below TransitionsList in Transitions view

## Staging seed
Seeded 1 field requirement on cyij staging:
- version_id: story v1 (430a8502-...)
- transition: → done (0b68e4da-...)
- field_key: assignee_account_id, requirement: required

## Validation
- `npx tsc --noEmit` → no errors
- `npm run lint:colors:gate` → 74 ≤ 76 (ratcheted to 74)
- `npm run audit:ads:gate` → tokens 27593/27593, typography 1669/1669 (ratcheted)

## Status
Slice 4 COMPLETE. All 7 gaps closed. CAT-WF-GAPCLOSURE-20260629-001 DONE.
