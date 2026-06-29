# Session 002 — Slice 1: Role audit + Guard safety

Feature Work ID: CAT-WF-GAPCLOSURE-20260629-001
Date: 2026-06-29
Slice: 1 of 4

## Changes made

### src/lib/workflow/canonical/runtime.ts

1. Added `export const GUARD_EVIDENCE_REGISTRY` — single source of truth for 18 guard types.
   6 real-evidence guards (`blockingSafe: true`), 12 missing-evidence guards (`blockingSafe: false`).
   This is the canonical registry used by admin UI and runtime alike.

2. In `gateTransition()`:
   - `roleDecision` type extended to include `'not_configured'`.
   - After the main role-check block: `if (!blocked && inMatrix && allowedRoles.length === 0) { roleDecision = 'not_configured'; }` — audit rows now explicitly label unroled transitions instead of generic 'allow'.
   - Added `resolvedRoles: actor.roles` to `tooltipBasis` JSONB in the `writeAdvisoryAudit` call — future audit queries can see all roles the user held, not just `actorRole` (first role string).

### src/hooks/workflow-v2/useWorkflowFoundation.ts

1. `EnforcementRow` type: added `id: string`, `workflow_version_id: string | null`. Query updated to fetch these columns.

2. Added `writeAdminAudit()` internal helper — writes to `ph_wf_admin_audit`, non-blocking on failure.

3. Added `useToggleReasonCodeActive()` mutation — flips `ph_wf_reason_codes.is_active`, writes admin audit.

4. Added `checkEnforcementBlockingSafe(versionId)` — async pre-flight: fetches version's guards, checks any `is_blocking=true` guard against `GUARD_EVIDENCE_REGISTRY.blockingSafe`. Returns list of unsafe guard types (empty = safe).

5. Added `useSetEnforcementMode()` mutation — toggles `ph_wf_enforcement_config.mode` between advisory/blocking. Throws if switching to blocking and any unsafe guards exist. Writes admin audit.

### src/pages/admin/workflows/WorkflowVersioningPage.tsx

1. Added imports: `Badge` from `@atlaskit/badge`, `useToggleReasonCodeActive`, `useSetEnforcementMode`, `GUARD_EVIDENCE_REGISTRY`.

2. Replaced local `GUARD_EVIDENCE` const with shim derived from `GUARD_EVIDENCE_REGISTRY` — single source of truth, no manual sync.

3. `TransitionsList`: guard display now shows `<Badge appearance="removed">⚠ Blocking unsafe</Badge>` when `is_blocking=true` AND `!GUARD_EVIDENCE_REGISTRY[guardType]?.blockingSafe`.

4. `ReasonCodesTab`: added Activate/Deactivate toggle button per row + inline error display.

5. `EnforcementTab`: added Set blocking/Set advisory toggle button per row with inline error display (shows pre-flight failure message when blocking would be unsafe).

6. `DECISION_OPTIONS`: added `not_configured` option for audit filter.

## Validation

- `npx tsc --noEmit` → no errors
- `npm run lint:colors:gate` → 76/76 ✅
- `npm run audit:ads:gate` → no category above baseline ✅ (typography dropped 1671→1670, ratcheted down)

## Status

Slice 1 COMPLETE. Ready for Slice 2 (PM canonical read + Feature audit wiring).
