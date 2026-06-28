# CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001 — Agent Outputs

> Discovery already executed in Phase 1 of this feature's conversation via a 7-agent
> parallel fan-out (general-purpose agents, read-only, staging-snapshot evidence).
> Summary below; full findings are in the Phase 1 discovery report in conversation history.

---

## Discovery fan-out (7 agents, Phase 1)

1. **Workflow engine schema** — `ph_workflow_*` is the foundation: templates + per-project runtime statuses/type-statuses/transitions + `ph_project_workflow_assignments`. Category CHECK(todo/in_progress/done) live. No versioning/scheme/role/guard. `can_transition` exists but unused by `src/`. Three disjoint engines: `ph_workflow_*` (ph_projects), `wh_*` (projects), `injira_*` (multi-tenant). `fn_apply_workflow_template` destructive.
2. **Dev work-item entities** — Epic/Feature/Story/Sub-task = ONE table `ph_issues`, `issue_type` discriminates. `status` free-text (workflow-driven) + `status_category` CHECK. BR=`business_requests.process_step`; Milestone=`product_milestones.status`; Sprint=`ph_jira_sprints.status` (name+title dup); Task=`tasks.status_id`→task_statuses.
3. **Test Hub + Incident + Release** — `tm_*` enums; `incidents.status` enum; `rh_releases.status` text / `releases.status` enum. Traceability link-table based, mostly FK-less. No enforcement: no auto-defect-on-fail, no coverage gate, cannot block Story/Feature/Release.
4. **Admin pages** — `/admin/workflows` builds statuses+transitions+template-apply (no version/role/guard). `/admin/v2/*` dead. `/admin/test/*` mostly read-only/edit-only. RBAC pages do real writes.
5. **RBAC** — 26 product_roles + 32 action permission keys; matrix inert at runtime (check_permission → super_admin only). Status change unguarded. `transition_approval_*` orphaned. 10 target process roles missing.
6. **UI wiring** — only `CatalystStatusPill→useIssueTypeWorkflow` reads ph_workflow config; everything else hardcoded enums / `board_status_mappings` / `task_statuses`. "Done" computed 3 inconsistent ways (casing drift).
7. **Field-config + versioning gaps + dupes** — `catalyst_field_layouts` exists but inert (forms ignore it). No versioning/scheme/publish/effective-date. 2026-06-28 cleanup dropped ~300 deadwood tables + locked ph_issues vocab.

---

## P0 validation agents (this phase)
- Migration safety scan: 0 DROP TABLE (existing), 0 ALTER TYPE, 0 DROP COLUMN, 0 ALTER TABLE (existing), 0 lmqw, 13 CREATE TABLE IF NOT EXISTS.
- FK/helper target existence (staging snapshot): ph_workflow_templates, ph_projects, profiles, user_roles(app_role), user_product_roles(role_id), product_roles(code), app_role enum — ALL FOUND.
- `npx tsc --noEmit`: EXIT 0, 0 errors (project + canonical files).
- Color gate: canonical TS clean (no hex).
