# Release Ops — Phase 2 Data Lineage Matrix

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 2 · 2026-07-06

Every deployment object is traceable — no isolated records. Relationship map below.

## Relationship map

| From | Relationship | To | Mechanism |
|---|---|---|---|
| Business Request | many-to-many | Release | `rh_release_brs` (release_id, business_request_id) |
| Release | many-to-many | Sprint | `rh_release_sprints` (release_id, sprint_id→anchor_sprints, project_id) |
| Release | many-to-many | Work Item | `rh_release_work_items` (release_id, work_item_key, inclusion_source) |
| Sprint | contains | Work Item | existing sprint→work-item model (ph_issues.sprint_id / anchor_sprints) |
| Change | **many-to-many** | Release | `rh_change_release_links` (forward truth) + legacy `rh_changes.release_id` |
| Change | 1→many | SOP Execution Step | `rh_sop_steps.change_id` |
| SOP Template | 1→many | SOP Template Step | `rh_sop_template_steps.template_id` |
| SOP Template | applied to | Change | `rh_sop_steps.template_id` (instance) |
| SOP Execution Step | assigned to | User | `rh_sop_steps.owner_id` + `assigned_role` |
| SOP Execution Step | → | Incident | `rh_sop_steps.incident_id` |
| SOP Execution Step | → | Defect | `rh_sop_steps.defect_id` |
| SOP Execution Step | → | Production Event | `rh_sop_steps.production_event_id` |
| Sign-off (change) | belongs to | Change | `rh_change_signoffs.change_id` (scope='change') |
| Sign-off (release) | belongs to | Release | `rh_release_signoffs.release_id` (scope='release') |
| Sign-off | depends on | Sign-off | `depends_on_signoff_id` + `dependency_key` |
| Emergency Override | scopes | Release/Change/Sign-off/Freeze | `rh_emergency_overrides` (scope, release_id, change_id, signoff_id, bypassed_gate) |
| Freeze Window | scopes | env/product/project/release | `rh_freeze_windows` (scope, target_env, product_id, project_id, release_id) |
| Incident | source | Release/Change/SOP-step/Production-event | `incidents.source_*` + `raised_during_change_execution` |
| Defect | source | Release/Change/SOP-step/Production-event | `tm_defects.source_*` + `raised_during_change_execution` |
| Production Event | ties | Release + Change | `rh_production_events.release_id, change_id` |
| Production Event | change-level → rollup | Release history | `event_level`, `is_release_rollup` |
| Production Event | snapshots | WI/BR/commits/SOP/signoffs/incidents/defects/override/freeze | JSONB `*_snapshot` + `freeze_result` + `replay_summary` |

## Reconstruction guarantees
- **Release scope**: `rh_release_brs` ∪ `rh_release_sprints` ∪ `rh_release_work_items` ∪ `rh_change_release_links` → answers "what shipped, which BRs/sprints/work items/changes."
- **Change scope**: `useChangeReleases` (join + legacy) → all releases a change deploys to; `rh_sop_steps` → runbook; signoffs/override/freeze → gates.
- **Production history**: change-level events roll up to release; snapshots make replay immune to later record changes.
- **Unlinked production change**: `vw_rh_unlinked_production_changes` classifies production changes with no release link and surfaces `has_justification`.

## No-orphan rules enforced by model
- Incident/Defect raised during execution links to change + SOP step even when release is unknown (release-only linkage is not required).
- Production event references both release and change (either nullable, but change-level always has change_id).
- Sign-offs exist at both release and change scope; neither is orphaned.
- m2m link removal (`unlinked_at`) never deletes the change or release (ON DELETE CASCADE only on hard row delete of a parent).
