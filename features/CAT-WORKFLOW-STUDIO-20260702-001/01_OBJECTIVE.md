# Objective

Replace the fragmented, split-brain workflow administration (WorkflowAdminPage + WorkflowVersioningPage + project-settings WorkflowTab + MapStatusesPage) with ONE full-width Workflow Studio at /admin/workflows, writing exclusively to the canonical versioned ph_wf_* engine (draft → publish → runtime-enforced).

Deliverables (user's 6 asks + 2 constraints):
1. Workflows per work item type — Studio home rail grouped by entity, draft/publish per entity_key.
2. Custom work item types (main + subtask) — ph_work_item_types registry + Types manager tab.
3. Work item hierarchy up to 10 levels — ph_hierarchy_levels (rank 0-9) + ph_hierarchy_parent_rules, config-driven.
4. Transition editing — diagram-first editor + property panel (type, requires_reason, reason codes, roles, guards).
5. AI workflow generation per type — ai-generate-workflow edge fn → draft only, human publishes.
6. Status CRUD — full CRUD incl. safe delete w/ reassignment; publish-time remap safety.
7. Single location for every workflow-bearing entity (story/epic/feature/subtask/defect/incident/release/BR/milestone/task; sprint read-only date-derived).
8. Non-negotiables: ADS typography tokens; full page width (AtlaskitPageShell flush) — NO narrow content.

Done = P0-P4 acceptance criteria in 03_PLAN_LOCK.md § Verification, screenshot-signed per slice.
