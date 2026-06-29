# CAT-WF-GAPCLOSURE-20260629-001 — PLAN LOCK

**Status: AWAITING REVIEW — do not implement until approved**

Feature Work ID: CAT-WF-GAPCLOSURE-20260629-001
Date: 2026-06-29
Author: Claude Code Session 001

---

## Objective

Close 7 known workflow module gaps. No new entities. Staging only.

---

## Non-scope

- No new entity types
- No enum widening
- No table drops or field removal
- No production changes
- No full workflow designer (admin only gets safe CRUD)
- No blocking enforcement activation (toggle stays advisory unless Vikram explicitly enables)

---

## 2-Hour Timebox Rule

Each slice ≤ 2 hours. Stop + rebaseline if overrun. 4 slices total.

---

## Execution Slices

### Slice 1 — Role audit + Guard safety (Gaps 1, 2) ~2h

**Gap 1 — Role audit improvement**

Files to modify:
- `src/lib/workflow/canonical/runtime.ts`

Changes:
1. `getActorContext()`: confirm existing real role fetch is correct (no change needed to fetch logic)
2. `gateTransition()`: when evaluating transition roles, record `resolved_roles` and `required_roles` into `guardResults` or `meta` JSONB in the audit write
3. Add explicit `role_not_configured` audit value when no `ph_wf_transition_roles` rows exist for a transition in advisory mode
4. `recordAdvisoryStatusChange()`: pass through resolved role groups where caller provides them

Audit fields added (in existing `guard_results` JSONB):
```json
{
  "role_decision": "allow|deny|not_configured",
  "resolved_roles": ["developer", "qa_tester"],
  "required_roles": ["qa_tester"],
  "role_match": true
}
```

**Gap 2 — Guard safety registry**

Files to modify:
- `src/lib/workflow/canonical/runtime.ts`
- `src/pages/admin/workflows/WorkflowVersioningPage.tsx`

Changes in runtime.ts:
1. Add `GUARD_EVIDENCE_REGISTRY` constant (guards with real evaluators vs null-pass)
2. In `evaluateGuardsReal()`: when a guard has no evidence AND `is_blocking=true`, record as `missing_evidence_source` in audit — NEVER hard-block from absent evidence (treat as advisory for that guard)
3. Export `GUARD_EVIDENCE_REGISTRY` for admin consumption

Changes in WorkflowVersioningPage.tsx:
1. Import `GUARD_EVIDENCE_REGISTRY` from runtime
2. In Transitions tab: next to guards with `is_blocking=true` AND no evidence source, show `<Badge appearance="removed">⚠ Blocking unsafe</Badge>` chip
3. In EnforcementTab: add toggle button (advisory↔blocking) per row with pre-flight:
   - Check: are all blocking guards for this entity/version either evidence-backed or `is_blocking=false`?
   - If unsafe: show inline validation error, block toggle
   - If safe: update `ph_wf_enforcement_config.mode`, write `ph_wf_admin_audit`

---

### Slice 2 — Canonical read + Feature audit wiring (Gaps 3, 7) ~2h

**Gap 3 — PM canonical read**

Files to modify:
- `src/components/product-hub/MilestoneCard.tsx`

Changes:
1. Add `useCanonicalIssueWorkflow('Product Milestone')` call (or inline canonical lookup from hook)
2. Replace hardcoded `STATUS_APPEARANCE` map with canonical label + appearance from workflow version
3. Fallback: if no canonical mapping found, render `{status} (legacy)` with default appearance

**Gap 7 — Feature audit wiring**

Files to modify:
- `src/pages/project/FeatureDetailPage.tsx`
- Possibly `src/components/features/FeaturesKanbanView.tsx`

Changes:
1. In FeatureDetailPage status update mutation: add `checkReasonRequired` preflight + `recordAdvisoryStatusChange` call after mutation succeeds (same pattern as Release/BR)
2. In FeaturesKanbanView drag-drop: add `recordAdvisoryStatusChange` call after drop mutation succeeds
3. Then: create 1 staging Feature item, perform status transition, verify `ph_wf_audit` row exists

---

### Slice 3 — Reason modal expansion (Gap 4) ~2h

**Surfaces to wire**

Files to modify:
- `src/hooks/test-management/useDefects.ts` (or calling component)
- `src/modules/project-work-hub/adapters/releasesDataSource.ts` (or calling component)
- `src/modules/project-work-hub/adapters/backlogDataSource.ts` (or calling component)
- Defect list/table component
- Release list/table component
- BR backlog component

**Pattern for each surface**:

```ts
// In the component that renders the status dropdown:
const [reasonModalTarget, setReasonModalTarget] = useState<ReasonModalTarget | null>(null);

// When status change triggered:
const preflight = await checkReasonRequired(entityKey, projectKey, fromStatus, toStatus);
if (preflight.reasonRequired) {
  setReasonModalTarget({ entityKey, entityId, itemKey, fromStatus, toStatus });
  return; // wait for modal
}
// else proceed normally

// Modal onSubmit:
async function handleReasonSubmit(reasonCode, reasonText) {
  setReasonModalTarget(null);
  await updateStatus({ reasonCode, reasonText });
}
```

**Minimum requirement**: at least Defect list wired (Release and BR if time permits)

**Audit**: after reason submission, `recordAdvisoryStatusChange` called with `reasonCode` + `reasonText` — these already pass through to audit

---

### Slice 4 — Admin writes + field requirements (Gaps 5, 6) ~2h

**Gap 5 — Admin safe actions**

Files to modify:
- `src/pages/admin/workflows/WorkflowVersioningPage.tsx`
- New mutation hook: `useWorkflowAdminActions.ts`

Actions to add:
1. EnforcementTab: toggle button (already planned in Slice 1 above — combine)
2. ReasonCodesTab: active/inactive toggle per row → `UPDATE ph_wf_reason_codes SET is_active=!is_active`
3. Versions tab: "Clone to draft" button next to published versions → copy statuses + transitions from published → new draft row

**Gap 6 — Admin audit + field requirements**

ph_wf_admin_audit writes:
- Every admin mutation (enforcement toggle, reason code toggle, version clone) calls:
  ```ts
  supabase.from('ph_wf_admin_audit').insert({
    action: 'enforcement_toggled|reason_code_toggled|version_cloned',
    target_kind: 'entity_version|reason_code|workflow_version',
    target_ids: [targetId],
    actor: userId,
    diff_json: { before, after }
  })
  ```

ph_wf_field_requirements:
1. Seed 1 requirement on staging via SQL:
   ```sql
   INSERT INTO ph_wf_field_requirements (version_id, scope, transition_id, field_key, requirement)
   SELECT v.id, 'on_transition', t.id, 'assignee_account_id', 'required'
   FROM ph_wf_versions v
   JOIN ph_wf_version_transitions t ON t.version_id = v.id
   WHERE v.entity_key = 'story' AND t.to_status_key = 'done'
   LIMIT 1;
   ```
2. Add `evaluateFieldRequirements()` call in `gateTransition()`:
   - Query `ph_wf_field_requirements` for (version_id, transition_id)
   - For each required field: check `issueRow[fieldKey]` is non-null
   - Return `{passed: bool, missingFields: string[]}`
3. Admin: add "Field Requirements" subsection in Transitions tab

---

## Files to Modify (complete list)

| File | Gaps | Type |
|---|---|---|
| `src/lib/workflow/canonical/runtime.ts` | 1, 2, 6 | modify |
| `src/pages/admin/workflows/WorkflowVersioningPage.tsx` | 2, 5, 6 | modify |
| `src/components/product-hub/MilestoneCard.tsx` | 3 | modify |
| `src/pages/project/FeatureDetailPage.tsx` | 7 | modify |
| `src/components/features/FeaturesKanbanView.tsx` | 7 | modify |
| Defect list component (TBD exact) | 4 | modify |
| Release list component (TBD exact) | 4 | modify |
| BR backlog component (TBD exact) | 4 | modify |

---

## Files Forbidden

- Any production migration
- `supabase/migrations/*.sql` (additive only, confirmed no destructive ops)
- `src/routes/FullAppRoutes.tsx` (no new routes needed)
- Any auth middleware

---

## Validation Commands

```bash
npx tsc --noEmit
npm run build
npm run lint:colors:gate
npm run audit:ads:gate
```

---

## Stop Conditions

- Any gate failure → fix before proceeding
- Any Story BAU blocking regression → revert immediately
- Any production DB access → hard stop
- Any enum widening → hard stop

---

## Screenshot Checklist

After each slice:
- [ ] Admin page shows guard safety warning
- [ ] Admin enforcement toggle has pre-flight validation
- [ ] MilestoneCard shows canonical label (or raw if no mapping)
- [ ] Defect status change with reason-required → modal appears
- [ ] Feature status change creates ph_wf_audit row
- [ ] Admin audit tab shows at least 1 admin action

---

## Safety Evidence Required Before Commit

Per each slice:
- TypeScript clean
- Build clean
- Color gates clean
- Story BAU blocking still operational (verify audit row from existing BAU story)
- No destructive SQL

---

## PLAN LOCK STATUS: AWAITING VIKRAM APPROVAL

Do not begin Slice 1 until this Plan Lock is approved.
