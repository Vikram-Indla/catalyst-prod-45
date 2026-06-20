# Admin Module Table Inventory

**Scan Date:** 2026-06-20  
**Source:** Supabase Bootstrap Migration + Recent Migrations  
**Total Tables Found:** 40+ admin-related tables  

---

## Admin Configuration Tables (High Priority Audit)

| Table | Purpose | Status | Row Count Est. | Keep/Deprecate |
|-------|---------|--------|---|---|
| `admin_nav_modules` | Navigation structure for admin module | ✅ ACTIVE | <100 | KEEP |
| `admin_role_module_permissions` | RBAC: role→module→permission mapping | ✅ ACTIVE | <1000 | KEEP |
| `admin_permission_audit` | Audit log for permission changes | ? | <10k | REVIEW |

---

## Hierarchy Management Tables (Phase 0 New)

| Table | Purpose | Status | Action |
|-------|---------|--------|--------|
| `hi_hierarchy_levels` | Work item hierarchy levels (Epic, Story, etc.) | ❓ PARTIAL | AUDIT |
| `hierarchy_configs` | Hierarchy configuration versions | ❓ PARTIAL | AUDIT |

**Note:** These tables may be partially implemented or experimental. Require schema validation.

---

## Jira Integration Tables (WorkHub/Sync)

### Issue Type Mapping (INJIRA prefix)

| Table | Purpose | Status |
|-------|---------|--------|
| `injira_issue_types` | Jira issue types from Jira API | ✅ | 
| `injira_issue_type_schemes` | Jira issue type schemes | ✅ |
| `injira_issue_type_screen_schemes` | Screen configurations per type | ✅ |
| `injira_issue_type_scheme_mappings` | Project→scheme mappings | ✅ |
| `injira_issue_type_screen_scheme_mappings` | Type→screen mappings | ✅ |

### Workflow Management (INJIRA prefix)

| Table | Purpose | Status |
|-------|---------|--------|
| `injira_workflow_schemes` | Jira workflow schemes | ✅ |
| `injira_workflow_scheme_mappings` | Project→workflow mappings | ✅ |

### Roles & Permissions (INJIRA prefix)

| Table | Purpose | Status |
|-------|---------|--------|
| `injira_roles` | Jira role definitions | ✅ |
| `injira_role_assignments` | User→role assignments | ✅ |
| `injira_permission_schemes` | Jira permission schemes | ✅ |
| `injira_permission_grants` | Permission→role grants | ✅ |

### Sync Audit Logs

| Table | Purpose | Status |
|-------|---------|--------|
| `injira_import_audit_log` | Jira import history | ✅ |
| `injira_import_mappings` | Jira issue→Catalyst work item mappings | ✅ |

---

## Feature Flags & Settings (Admin Control)

| Table | Purpose | Status | Priority |
|-------|---------|--------|----------|
| `feature_flags` | Feature toggles | ✅ ACTIVE | KEEP |
| `feature_flag_audit` | Change history | ✅ ACTIVE | KEEP |
| `feature_flag_dependencies` | Feature flag dependencies | ✅ | REVIEW |

---

## Workflow Configuration (Legacy)

| Table | Purpose | Status | Action |
|-------|---------|--------|--------|
| `catalyst_workflow_schemes` | Custom workflow schemes | ❓ | AUDIT |
| `catalyst_workflow_statuses` | Status definitions | ❓ | AUDIT |
| `catalyst_workflow_transitions` | State transition rules | ❓ | AUDIT |

**Note:** May be duplicates of Jira tables. Requires cross-reference audit.

---

## Audit & Logging Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `admin_permission_audit` | Permission changes | ✅ |
| `business_request_audit_logs` | BR-specific audit | ✅ |
| `defect_audit_log` | Defect changes | ✅ |
| `ai_governance_audit_log` | AI feature audit | ✅ |
| `feature_flag_audit` | Flag changes | ✅ |
| `governance_sync_skip_log` | Sync skip reasons | ✅ |
| `data_access_audit` | Data access events | ✅ |
| `dependency_audit_log` | Dependency changes | ✅ |
| `execution_run_audit_logs` | Execution history | ✅ |
| `auth_audit_log` | Auth events | ✅ |
| `ai_assist_audit_events` | AI assist usage | ✅ |

---

## Configuration Tables (Misc)

| Table | Purpose | Status |
|-------|---------|--------|
| `gadget_settings` | Widget/gadget config | ✅ |
| `ai_integration_settings` | AI provider config | ✅ |
| `department_owner_mapping` | Org structure | ✅ |
| `capacity_assignment_types` | Resource types | ✅ |
| `board_status_mappings` | Board→status rules | ✅ |
| `es_strategy_roles` | Strategy role defs | ✅ |

---

## Findings & Risks

### P0 High-Risk Duplications
1. **Workflow tables:** `catalyst_workflow_*` vs `injira_workflow_*` — both exist. Unclear which is active.
2. **Hierarchy tables:** `hi_hierarchy_levels` vs `hierarchy_configs` — unclear relationship.
3. **Issue type mapping:** Multiple levels of indirection (`injira_issue_types` → schemes → screen schemes → mappings).

### P1 Orphan/Unclear Tables
- `gadget_settings` — used by what module? Dashboard? Admin UI?
- `board_status_mappings` — managed by whom? UI or auto-sync?
- `es_strategy_roles` — legacy? Strategy hub is dormant.

### P2 Missing Documentation
- No ERD or relationship map
- No clear "source of truth" for hierarchy/workflow/status
- Audit tables growing unbounded (no retention policy)

---

## Classification (Draft)

| Table | Keep/Deprecate | Rationale |
|-------|---|---|
| `admin_role_module_permissions` | KEEP | Core RBAC |
| `admin_nav_modules` | KEEP | Navigation |
| `injira_*` (all Jira tables) | KEEP | Live integration |
| `feature_flags*` | KEEP | Core feature control |
| `catalyst_workflow_*` | ⚠ AUDIT | May duplicate injira_workflow_* |
| `hi_hierarchy_levels` | ⚠ AUDIT | Partial impl? Phase 0 dependency |
| `hierarchy_configs` | ⚠ AUDIT | Phase 0 dependency |
| Audit tables | REVIEW | No retention policy; growing unbounded |
| `gadget_settings` | ⚠ AUDIT | Usage unclear |
| `es_strategy_roles` | ⚠ AUDIT | Dormant feature? |

---

## Next Steps (Phase -1 Cleanup)

1. **Cross-reference audit:** Grep codebase for each table's usage
2. **Schema validation:** Confirm schema via Supabase introspection query
3. **Row count probe:** `SELECT count(*) FROM <table>` for each table
4. **Deprecation candidates:** Mark unused tables for Phase -1 cleanup
5. **Phase 0 blockers:** Confirm `hi_hierarchy_levels` and `hierarchy_configs` schema before new builds
