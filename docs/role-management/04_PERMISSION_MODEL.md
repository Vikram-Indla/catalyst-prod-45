# 04. Permission Model — Rules & Dependencies

**Status:** Approved  
**Last Updated:** 2026-06-24

This document defines the complete permission model and all dependency rules.

---

## Module Permissions (7 per module)

```
can_read           — view module, list items, access module routes
can_create         — create new items
can_update         — edit existing items
can_delete         — delete items permanently
can_export         — export items to CSV/Excel
can_bulk_update    — bulk edit (independent of can_update)
can_bulk_delete    — bulk delete (independent of can_delete)
```

### Module Permission Dependencies

**Rule 1:** If `can_read = false`, all other module permissions are forced `false`.
```
If can_read = false:
  - can_create = false (forced)
  - can_update = false (forced)
  - can_delete = false (forced)
  - can_export = false (forced)
  - can_bulk_update = false (forced)
  - can_bulk_delete = false (forced)
```

**Rule 2:** `can_bulk_delete` is independent from `can_delete`.
```
can_delete = true  & can_bulk_delete = false  ✅ valid (single delete allowed, bulk not)
can_delete = false & can_bulk_delete = true   ❌ invalid (bulk without single makes no sense)
```

**Rule 3:** `can_export` requires `can_read = true`.
```
If can_read = false:
  - can_export = false (forced)

If can_export = true:
  - can_read MUST = true (export requires ability to read)
```

**Rule 4:** Enforce `can_read = true` before allowing any write.
```
If can_create = true OR can_update = true OR can_delete = true:
  THEN can_read MUST = true
```

---

## Field Classification (System Nature)

Field classification is **separate from role permissions**. Classification describes the system nature of the field.

```
normal              — regular editable field
system              — internal system field (id, created_at, updated_at)
admin_only          — admin-only technical field
banned              — never show to non-admin (assessment_feature, service_now_ref)
read_only_system    — cannot be edited by any role
derived             — calculated/read-only field
deprecated          — exists but should not be used
```

**Key distinction:** A field's **classification** is fixed. A role's **permissions** on a field vary.

Example: `assessment_feature` field has classification = `banned` (fixed). Every role's permission on it is `can_view = false` (permission).

---

## Role Field Permissions (5 per field per role)

```
can_view    — render field in UI, include in queries, allow reads
can_update  — edit field value
can_clear   — set field to null
can_export  — include in CSV/Excel exports
is_masked   — show placeholder instead of actual value (Phase 2+)
```

### Field Permission Dependencies

**Rule 1:** If `can_view = false`, all other field permissions are forced `false`.
```
If can_view = false:
  - can_update = false (forced)
  - can_clear = false (forced)
  - can_export = false (forced)
  - is_masked = false (forced, no mask if hidden)
```

**Rule 2:** `can_update` and `can_clear` are independent.
```
can_update = true  & can_clear = false  ✅ valid (can edit but not null)
can_update = false & can_clear = true   ✅ valid (can only null, not edit)
```

**Rule 3:** Export respects both field and module permissions.
```
If field.can_export = false OR module.can_export = false:
  THEN field excluded from export
```

**Rule 4:** Banned fields are locked.
```
If field.classification = 'banned':
  - All field permissions locked (no toggles in UI)
  - All role field permissions = false (not editable by admin)
  - Tooltip: "Banned field — locked by policy"
```

**Rule 5:** Admin-only fields are hidden from non-admin UI.
```
If field.classification = 'admin_only':
  - Non-admin UI shows lock icon + "Admin only" lozenge
  - Toggle disabled for non-admin roles (admin can view, cannot change)
```

**Rule 6:** Read-only system fields cannot be edited by any role.
```
If field.classification = 'read_only_system':
  - All roles: can_view = true (optional), can_update = false (always)
  - Non-editable across the board
```

---

## Action Permissions (1 per action per role)

```
is_allowed  — role can perform this action
```

### Action Categories

Actions are grouped by **category**, not individually.

```
CRUD                  — inherited from module permissions (read-only in UI)
BULK                  — bulk_update, bulk_delete
EXPORT                — export_csv, export_excel
COLLABORATION         — add_comment, add_watcher, add_attachment
MODULE_SPECIFIC       — release_sign_off, test_execute, etc.
AI                    — ask_caty, improve_story, generate_summary
INCIDENT              — incident mutation actions (all locked by policy)
```

### Action Permission Rules

**Rule 1:** CRUD actions are inherited from module permissions.
```
If module.can_create = true:
  action.create is_allowed = true (cannot override)
If module.can_create = false:
  action.create is_allowed = false (cannot override)
```

**Rule 2:** BULK actions are independent from CRUD.
```
can_update = true  & bulk_update = false  ✅ valid (edit one, not bulk)
can_delete = true  & bulk_delete = false  ✅ valid (delete one, not bulk)
```

**Rule 3:** INCIDENT actions are locked.
```
incident.add_comment      is_allowed = false (always, locked by policy)
incident.add_watcher      is_allowed = false (always, locked by policy)
incident.add_attachment   is_allowed = false (always, locked by policy)
incident.transition       is_allowed = false (always, locked by policy)

Incident Hub mutations are managed in Jira only.
```

**Rule 4:** AI actions can be disabled per role.
```
ask_caty              is_allowed = true/false (configurable per role)
improve_story         is_allowed = true/false (configurable per role)
generate_summary      is_allowed = true/false (configurable per role)
```

---

## Transition Permissions (Workflow Status Changes)

```
is_allowed  — role can perform this status transition
```

### Transition Format

```
workflow_key, from_status, to_status → is_allowed: boolean
```

Example: `project_workflow`, `todo` → `in_progress` → `is_allowed = true`

### Transition Rules

**Rule 1:** Transitions are per-workflow, per-role.
```
Role A can transition Story: todo → in_progress
Role A cannot transition Epic: todo → in_progress
(each workflow has its own transition rules)
```

**Rule 2:** Blocked transitions show lock icon + disabled dropdown.
```
If transition is_allowed = false:
  - Status dropdown entry shows lock icon
  - Tooltip: "This transition is not available for your role"
  - Cannot select/submit
```

**Rule 3:** Incident Hub transitions are locked.
```
incident_workflow, any → any  →  is_allowed = false (always, locked by policy)
"Managed in Jira only"
```

**Rule 4:** Restricted transitions may require additional action permission.
```
release_workflow, ready_for_signoff → approved
  requires: sign_off action permission = true
  
  If sign_off action is_allowed = false:
    Cannot transition (both transition AND action required)
```

---

## Complete Permission Check Example

**Scenario:** User with QA Tester role wants to create and export a story in Project Hub.

**Check sequence:**

1. **Module level:**
   - Module: Project Hub
   - Permission: can_create = true? ✅ (QA Tester has this)
   - Permission: can_export = true? ✅ (QA Tester has this)

2. **Entity level:**
   - Entity: ph_issues
   - No entity-level permission check (all field checks below)

3. **Field level (for each field in create/export):**
   - summary: can_view? can_update? ✅
   - status: can_view? ✅ can_update? ✅
   - priority: can_view? ❌ (hidden for QA Tester)
   - assignee: can_view? can_export? ✅
   - [check all fields in form/export]

4. **Action level:**
   - action.create: is_allowed? ✅ (inherited from module.can_create)
   - action.export_csv: is_allowed? ✅ (inherited from module.can_export)

5. **Export filtering:**
   - Exclude priority (can_view = false, hidden)
   - Exclude assessment_feature (banned)
   - Exclude service_now_ref (banned)
   - Include all others where can_export = true

6. **Result:** ✅ Create story (all fields editable), export CSV (filtered columns)

---

## Dependency Summary Table

| Condition | Forces | Override Allowed |
|---|---|---|
| can_read = false | all other module perms = false | No |
| can_view = false | can_update, can_clear, can_export = false | No |
| field.classification = banned | all perms = false, UI locked | No |
| field.classification = admin_only | non-admin cannot toggle | No |
| field.classification = read_only_system | can_update = false always | No |
| module.can_create = true | action.create = true | No |
| incident action category | is_allowed = false always | No |
| transition is_allowed = false | dropdown locked, lock icon shown | No |

---

**All dependencies are hard. No workarounds or exceptions.**
