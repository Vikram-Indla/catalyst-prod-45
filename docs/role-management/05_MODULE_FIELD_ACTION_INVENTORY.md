# 05. Complete Module, Field, & Action Inventory

**Status:** Approved  
**Last Updated:** 2026-06-24

This is the definitive list of all modules, entities, and fields in scope for role management.

---

## Active Modules (10)

### 1. Project Hub (`/project-hub`)

**Primary entity:** `ph_issues`  
**Tables:** ph_issues, ph_projects, ph_project_members  
**Key fields:** issue_key, summary, status, assignee, priority, parent_key  
**Hidden fields:** service_now_ref (banned), assessment_feature (banned)  
**Admin-only fields:** raw_json, id, internal_notes  
**Workflows:** project_workflow (todo, in_progress, done)  
**Key actions:**
- CRUD: create, read, update, delete
- BULK: bulk_update, bulk_delete
- EXPORT: export_csv
- COLLABORATION: add_comment, add_watcher, add_attachment
- AI: ask_caty, improve_story

---

### 2. Product Hub (`/product-hub`)

**Primary entity:** `business_requests`  
**Tables:** business_requests, br_request_types, br_request_details  
**Key fields:** br_key, title, request_type, status, assignee, due_date  
**Hidden fields:** None  
**Admin-only fields:** id, raw_json  
**Workflows:** br_workflow (draft, submitted, approved, rejected)  
**Key actions:**
- CRUD: create, read, update, delete
- BULK: bulk_update
- EXPORT: export_csv
- COLLABORATION: add_comment, add_watcher
- AI: ask_caty, improve_story

---

### 3. Release Hub (`/release-hub`)

**Primary entity:** `rh_releases`  
**Tables:** rh_releases, rh_release_items, rh_sign_offs  
**Key fields:** release_key, name, status, scheduled_date  
**Hidden fields:** None  
**Admin-only fields:** id, raw_json  
**Workflows:** release_workflow (draft, planned, in_readiness, ready_for_signoff, approved)  
**Key actions:**
- CRUD: create, read, update
- EXPORT: export_csv
- SPECIAL: sign_off_release, manage_freeze_window

---

### 4. Test Hub (`/testhub`)

**Primary entity:** `plan_test_cases`  
**Tables:** plan_test_cases, plan_test_runs, plan_test_results  
**Key fields:** test_key, name, status, priority, assignee  
**Hidden fields:** None  
**Admin-only fields:** id, raw_json  
**Workflows:** test_workflow (draft, ready, executing, complete)  
**Key actions:**
- CRUD: create, read, update, delete
- EXPORT: export_csv
- SPECIAL: execute_test_cycle, generate_test_report

---

### 5. Task Hub (`/tasks`)

**Primary entity:** `tasks`  
**Tables:** tasks, task_assignments  
**Key fields:** task_key, title, status, assignee, due_date  
**Hidden fields:** None  
**Admin-only fields:** id  
**Workflows:** task_workflow (open, in_progress, complete, archived)  
**Key actions:**
- CRUD: create, read, update, delete
- BULK: bulk_update, bulk_delete
- EXPORT: export_csv

---

### 6. Incident Hub (`/incident-hub`)

**Primary entity:** `ph_issues` (filtered for type = "Production Incident")  
**Read-only in Catalyst:** ✅ (mutations managed in Jira)  
**Key fields:** issue_key, summary, status, severity, assignee  
**Hidden fields:** service_now_ref (banned), assessment_feature (banned)  
**Admin-only fields:** raw_json, id  
**Workflows:** incident_workflow (open, triage, in_progress, resolved) — READ-ONLY  
**Key actions:**
- CRUD: read only (create/update/delete → blocked with "Managed in Jira" overlay)
- COLLABORATION: add_comment (disabled), add_watcher (disabled), add_attachment (disabled)
- NO transitions allowed

---

### 7. Home Hub (`/for-you`)

**Primary entity:** Aggregated feeds (recent, assigned, mentioned, watched)  
**Tables:** ph_issues, business_requests, aggregated views  
**Key fields:** Varies by feed type  
**Hidden fields:** Depends on user permissions in each module  
**Workflows:** None (read-only dashboard)  
**Key actions:**
- Read only (dashboard, no mutations)
- SPECIAL: save_view, create_filter

---

## Dormant Modules (3)

These modules exist in the schema but are not active UI routes. Permissions can be configured for when they are activated.

### 8. Strategy Hub (`/strategy`)

**Status:** Dormant (no active route)  
**Primary entity:** `strategy_items` (future)  
**Key actions:** (future)  

---

### 9. Plan Hub (`/plan`)

**Status:** Dormant (no active route)  
**Primary entity:** `plan_items` (future)  
**Key actions:** (future)  

---

### 10. Wiki Hub (`/wiki`)

**Status:** Dormant (no active route)  
**Primary entity:** `wiki_pages` (future)  
**Key actions:** (future)  

---

## 16 Default Roles (Seeded in roles table)

### System Roles (2, locked)

1. **Admin** (code: `admin`)
   - All modules: can_read, can_create, can_update, can_delete, can_export, can_bulk_update, can_bulk_delete
   - All fields: can_view, can_update, can_clear, can_export
   - All actions: is_allowed = true
   - All transitions: is_allowed = true

2. **User** (code: `user`, default fallback)
   - Home Hub: read only
   - All other modules: no access by default
   - No actions beyond read

### Custom Roles (14)

3. **Program Manager** (code: `program_manager`)
   - Project Hub: can_read, can_create, can_update (no delete)
   - Product Hub: can_read, can_create, can_update
   - Release Hub: can_read, can_update, sign_off_release
   - Test Hub: can_read
   - Home: read

4. **QA Tester** (code: `qa_tester`)
   - Project Hub: can_read, can_create (subtasks only)
   - Test Hub: can_read, can_create, can_update, execute_test_cycle
   - Home: read
   - Hidden: priority field (read-only in Project Hub)

5. **Developer** (code: `developer`)
   - Project Hub: can_read, can_update (self-assigned only in Phase 2)
   - Task Hub: can_read, can_create, can_update
   - Home: read
   - Actions: ask_caty, improve_story

6. **Project Manager** (code: `project_manager`)
   - Project Hub: can_read, can_create, can_update, can_delete
   - Release Hub: can_read, can_update
   - Home: read

7. **Product Manager** (code: `product_manager`)
   - Product Hub: can_read, can_create, can_update, can_delete, can_export
   - Project Hub: can_read
   - Home: read

8. **Guest** (code: `guest`, time-limited)
   - Home Hub: read only
   - Project Hub: read only (3 active modules)
   - All write actions: blocked
   - Expires after 48 hours

9. **Super Admin** (code: `super_admin`)
   - All modules: full access
   - All fields: full access
   - All actions: is_allowed = true
   - Can manage all roles/permissions

10. **Product Owner** (code: `product_owner`)
    - Product Hub: full CRUD + export
    - Project Hub: can_read
    - Home: read

11. **Enterprise Architect** (code: `enterprise_architect`)
    - Project Hub: can_read, can_update
    - Product Hub: can_read, can_update
    - Release Hub: can_read, can_update
    - Home: read

12. **Capacity Planner** (code: `capacity_planner`)
    - All modules: can_read
    - Special views: resource allocation, workload, team bandwidth
    - No write actions

13. **Finance** (code: `finance`)
    - Release Hub: can_read, can_export (budget fields)
    - Product Hub: can_read, can_export
    - Home: read
    - Masked: cost_center (shows placeholder)

14. **PMO** (code: `pmo`)
    - All modules: can_read, can_export
    - No write actions
    - Audit log: can_read (future)
    - No field editing

15. **Analyst** (code: `analyst`)
    - All modules: can_read, can_export
    - No write actions
    - Special: can_generate_ai_summary

16. **Service Owner** (code: `service_owner`)
    - Release Hub: full CRUD
    - All other modules: can_read
    - Actions: sign_off_release, manage_freeze_window

---

## Field Inventory Summary

### Banned Fields (2, never shown to non-admin)

- `assessment_feature` (customfield_10126) — Jira field
- `service_now_ref` — Custom Catalyst field

### Admin-Only Fields (10+)

- `id` (all entities)
- `raw_json` (all entities)
- `internal_notes` (ph_issues, business_requests)
- `jira_sync_status` (all Jira-synced entities)
- `sync_metadata` (all Jira-synced entities)

### Read-Only System Fields (5+)

- `created_at` (all entities)
- `updated_at` (all entities)
- `created_by` (all entities)
- `jira_created_at` (all Jira-synced)
- `jira_updated_at` (all Jira-synced)

### Total Field Count (120+)

- Project Hub: 45 fields
- Product Hub: 32 fields
- Release Hub: 18 fields
- Test Hub: 15 fields
- Task Hub: 12 fields
- Incident Hub: 40 fields (same as Project, filtered)

---

## Action Categories Summary

### CRUD (Auto-inherited from Module Permissions)

- create, read, update, delete

### BULK (Independent)

- bulk_update, bulk_delete

### EXPORT (Independent)

- export_csv, export_excel

### COLLABORATION (Per-module)

- add_comment, add_watcher, add_attachment

### MODULE-SPECIFIC

- sign_off_release (Release Hub)
- manage_freeze_window (Release Hub)
- execute_test_cycle (Test Hub)
- generate_test_report (Test Hub)

### AI (Configurable)

- ask_caty, improve_story, generate_summary

### INCIDENT (All Locked by Policy)

- add_comment (locked)
- add_watcher (locked)
- add_attachment (locked)
- transition_status (locked)

---

**This inventory is definitive. Do not add modules, remove roles, or change field classifications without explicit approval.**
