# CAT-WF-GAPCLOSURE-20260629-001 — Canonical Discovery

## Gap 1 — User→role_group lookup

### What exists
- `getActorContext()` in `runtime.ts:214-228` — fetches `user_product_roles` JOIN `product_roles` via real Supabase query
- Returns `actor.roles: string[]` (role codes from `product_roles.code`)
- Matching: `actor.roles.some(r => allowedRoles.includes(r)) || actor.isAssignee || actor.isSuperAdmin` (line 328)
- Role codes in `product_roles`: `super_admin`, `product_manager`, `product_owner`, `enterprise_architect`, `project_manager`, `developer`, `qa_tester`
- `ph_wf_transition_roles` columns: transition_id, role_group, allow_assignee, allow_reporter, allow_super_admin_bypass, bypass_requires_reason
- Auth: `useAuth()` re-exported from `src/lib/auth.tsx:343` — user.id is the UUID

### Actual gap
- Audit (`ph_wf_audit`) does NOT currently record `resolved_roles` vs `required_roles`
- `role_not_configured` case (no transition_roles rows) uses generic `role_decision: 'allow'` in advisory — no explicit `not_configured` audit value
- Minor: audit schema may not have dedicated role columns — uses existing JSON fields

### Plan gap
- Wire `resolved_roles` + `required_roles` into `ph_wf_audit` (use existing `guard_results` JSONB or `meta` field)
- Explicit `role_not_configured` audit when no transition_roles seeded
- No new infrastructure needed; `getActorContext()` already reads real data

---

## Gap 2 — Blocking guards with no evidence source

### What exists
- `GUARD_EVIDENCE` object in `WorkflowVersioningPage.tsx:134-145` (has `sourceExists: boolean`)
- 6 guards with real evaluators: assignee_required, acceptance_criteria_present, reason_required, test_coverage, child_completion, no_open_blocker_critical
- 11 guards returning `passed: null`: qa_signoff, uat_signoff, approval, brd_attached, release_readiness, deployment_window, deployment_evidence, smoke_evidence, rca, figma_attached, required_field, comment_required
- No `GUARD_EVIDENCE_REGISTRY` in runtime.ts
- Admin page: `⛔` emoji shown next to `is_blocking=true` guards in Transitions tab — but no blocking-safety warning

### Actual gap
- Runtime does NOT check evidence availability before evaluating blocking guards
- Admin has no "unsafe to enable blocking" warning banner
- Enforcement toggle does not exist in UI at all (EnforcementTab is read-only)

### Plan gap
- Add `GUARD_EVIDENCE_REGISTRY` map in runtime.ts (move/copy from admin page)
- Runtime: in blocking mode, if guard has no evidence, treat as `passed: null` with advisory override (never hard-block from absent evidence)
- Admin: add warning chip "⚠ Blocking unsafe: no evidence source" next to affected guards
- Enforcement toggle: add UI toggle in EnforcementTab with pre-flight safety check

---

## Gap 3 — Canonical read surfaces

### What exists
- Incident detail: `CatalystViewIncident.tsx` → `CatalystStatusPill` → `useCanonicalIssueWorkflow` ✅ CANONICAL
- Sub-task detail: `CatalystViewSubtask.tsx` → `CatalystStatusPill` → `useCanonicalIssueWorkflow` ✅ CANONICAL
- Product Milestone: `MilestoneCard.tsx` shows raw `milestone.status` with hardcoded appearance map — NO canonical lookup

### Actual gap
- Product Milestone MilestoneCard: hardcoded STATUS_APPEARANCE map, raw status string in Lozenge
- List surfaces (IncidentListTable, sub-task lists) may show raw values — need to verify but detail views are covered

### Plan gap
- MilestoneCard: replace hardcoded appearance map with canonical lookup from `useCanonicalIssueWorkflow('Product Milestone')`
- Add fallback: if no canonical mapping, show raw value with "(legacy)" suffix

---

## Gap 4 — Reason modal expansion

### What exists
- `ReasonCaptureModal` at `src/components/catalyst-detail-views/shared/workflow/ReasonCaptureModal.tsx`
- Props: entityType, itemKey?, itemTitle?, fromStatus, toStatus, versionLabel?, transitionType?, onSubmit(reason), onCancel()
- Used ONLY by `CatalystStatusPill` (line 604)
- Defect: `useDefects.ts` calls `checkReasonRequired` — if required, throws error toast (no modal)
- Release: `releasesDataSource.ts` same pattern
- BR: `backlogDataSource.ts` same pattern

### Actual gap
- Defect/Release/BR list surfaces get an error throw when reason is required — no way for user to provide reason
- Only Story detail (via CatalystStatusPill) opens a modal

### Plan gap
- Defect list: intercept `checkReasonRequired` result, show modal, retry mutation with reasonText
- Release list: same pattern
- BR backlog: same pattern
- Pattern: add `reasonModalState` in the relevant table/list component, open modal, on submit pass reasonCode+reasonText to the mutation

---

## Gap 5 — Admin write actions

### What exists
- Versions tab: "Create draft" button (line 276) → `useCreateDraftVersion()` mutation ✅
- All other tabs: read-only
- EnforcementTab: displays rows, no edit/toggle buttons

### Actual gap
- Cannot toggle enforcement mode from UI
- Cannot activate/deactivate reason codes from UI
- Cannot clone published version to draft from UI (can only create blank draft)

### Plan gap
- EnforcementTab: add toggle button per row (advisory↔blocking) with safety pre-flight
- ReasonCodesTab: add active/inactive toggle button per row
- Versions tab: add "Clone to draft" button next to published versions
- All mutations write ph_wf_admin_audit

---

## Gap 6 — ph_wf_admin_audit + ph_wf_field_requirements

### ph_wf_admin_audit schema
Columns: id, action (text), target_kind (text), target_ids (uuid[]), actor (uuid FK profiles), diff_json (jsonb), at (timestamptz)

### ph_wf_field_requirements schema  
Columns: id, version_id, scope (on_enter_status|on_transition), status_key, transition_id, field_key, requirement (required|visible|hidden), created_at, updated_at

### Actual gap
- Neither table is read or written from src/
- gateTransition() does NOT evaluate field_requirements
- Admin has no field requirements view

### Plan gap
- ph_wf_admin_audit: write on enforcement toggle, reason code toggle, version clone
- ph_wf_field_requirements: 
  - Seed 1 real requirement on staging (Story: assignee required on_transition to done)
  - Add evaluation in gateTransition() — query field_requirements for version, check entity row fields
  - Admin: add field requirements display in Transitions tab

---

## Gap 7 — Feature/Incident/PM live audit proof

### Feature
- `FeatureDetailPage.tsx:212-216`: direct Supabase update, BYPASSES `recordAdvisoryStatusChange`
- `FeaturesKanbanView.tsx:45-50`: drag-drop also bypasses
- Gap: Feature status changes never write ph_wf_audit

### Incident
- `useUpdateIncident` (line 210): calls `recordAdvisoryStatusChange` ✅ WIRED
- `IncidentStatusDropdown` exists and routes through hook
- Gap: no live staging incidents → 0 audit rows, but wiring is correct

### Product Milestone
- `productMilestoneService.updateMilestone` (line 131): calls `recordAdvisoryStatusChange` ✅ WIRED
- Gap: no live staging milestones → 0 audit rows (just created MilestoneManager fix)

### Plan gap
- Feature: add `recordAdvisoryStatusChange` call to FeatureDetailPage.tsx status update mutation
- Incident: use staging to create test incident, perform status change, verify audit row
- PM: use new MilestoneManager UI to create test milestone, perform status change, verify
