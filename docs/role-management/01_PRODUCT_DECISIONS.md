# 01. Catalyst Enterprise Role Management — Product Decisions

**Status:** Approved, Non-Negotiable  
**Last Updated:** 2026-06-24

These decisions are final. Do not re-interpret, suggest alternatives, or implement workarounds.

---

## User Role Assignment

### One Active Role Per User

**Decision:** A user can have exactly ONE active role at any given time.

**Enforcement:**
```sql
CREATE UNIQUE INDEX one_active_role_per_user
ON public.user_roles(user_id)
WHERE is_active = true;
```

**IMPORTANT:** Do not implement this as an inline table constraint. PostgreSQL requires this as a partial unique index (UNIQUE constraints cannot have WHERE clauses). The index must be created as a separate DDL statement after the table creation.

**Implication:** 
- User can have MANY inactive roles (for audit/history)
- Only ONE can be active
- Switching roles = deactivate old, activate new
- No multi-role assignment
- No scope/project-specific overrides to roles

### Only Admin Can Manage Roles

**Decision:** Only users with `role = 'admin'` in `user_roles` table can:
- Create roles
- Edit role permissions
- Delete roles
- Assign roles to users
- Manage Access (invitations, email log, etc.)
- View permission audit

**Implication:**
- PMO/Governance role (future) is read-only until explicitly enabled in Phase 2+
- No delegation of role management to project managers or team leads in Phase 1
- No self-service role changes
- All role changes must be logged in audit trail

### Default Fallback Role

**Decision:** If a user has no active role, the system assigns `role_id` pointing to the User role.

**User role definition:**
```
name: 'User'
code: 'user'
is_active: true
description: 'Default read-only access to assigned modules'
```

Permissions:
- Home Hub: read only
- All other modules: no access by default
- Can only upgrade via explicit admin assignment

### Create Access Requires Role Selection

**Decision:** When creating a new user in the Access Management page, role selection is **mandatory**.

- Role dropdown must be filled before submit is enabled
- Dropdown loads from `SELECT id, name FROM roles WHERE is_active = true`
- No role → cannot create access
- Fallback to User role NOT permitted

---

## Guest Access & Expiry

### Guest = Read-Only + 48-Hour Expiry

**Decision:** Guest role is a special system-managed role with hardcoded rules:

```sql
INSERT INTO public.roles (name, code, description, is_active)
VALUES ('Guest', 'guest', 'Limited read-only access, expires after 48 hours', true);

INSERT INTO public.guest_access (user_id, created_at, expires_at, is_active)
VALUES (..., NOW(), NOW() + INTERVAL '48 hours', true);
```

**Guest permissions (immutable):**
- Home Hub: read only
- Project Hub: read only (ph_issues, 3 active modules)
- All write operations: blocked
- All delete operations: blocked
- All exports: blocked
- All bulk operations: blocked
- Cannot add comments, watchers, attachments
- Cannot transition status
- Cannot change any field value

**Auto-expiry:**
- Guest access is marked `is_active = false` at `expires_at`
- UI shows "Expires in N hours" countdown
- Access Management audit log records expiry as system action
- Email notification sent 1 hour before expiry (future phase)

---

## Permission Model

### Module Permissions (7 per module)

**Decision:** Every role has exactly 7 boolean permissions per module:

1. `can_read` — view module and list
2. `can_create` — create new items
3. `can_update` — edit existing items
4. `can_delete` — delete items
5. `can_export` — export items to CSV
6. `can_bulk_update` — bulk edit (separate from update)
7. `can_bulk_delete` — bulk delete (separate from delete)

**Dependency rules:**
- If `can_read = false`, all other module permissions are automatically `false`
- `can_export` can be `true` even if `can_update = false` (read-only export)
- `can_bulk_delete` is independent from `can_delete`

### Field Permissions (5 per field per role)

**Decision:** Every field in every entity has 5 permissions per role:

1. `can_view` — render field in UI
2. `can_update` — edit field value
3. `can_clear` — set field to null
4. `can_export` — include in CSV/export
5. `is_masked` — show placeholder instead of actual value (phase 2+)

**Dependency rules:**
- If `can_view = false`, fields `can_update`, `can_clear`, `can_export`, `is_masked` are disabled
- Hidden fields cannot be exported (even if `can_export = true`)
- Banned fields are locked (lock icon, no toggles possible)

### Action Permissions

**Decision:** Actions are grouped by category:

- **CRUD** (auto-inherited from module permissions, read-only display in UI)
- **BULK** (bulk_update, bulk_delete)
- **EXPORT** (export_csv, export_excel)
- **COLLABORATION** (add_comment, add_watcher, add_attachment)
- **MODULE-SPECIFIC** (release_sign_off, test_execute, etc.)
- **AI** (ask_caty, improve_story, generate_summary)

Each action has `is_allowed: boolean` per role.

**Incident Hub actions are locked:**
- add_comment → LOCKED
- add_watcher → LOCKED
- add_attachment → LOCKED
- transition_status → LOCKED
- All render with lock icon, disabled toggle, tooltip "Managed in Jira only"

### Status Transitions (Workflow Permissions)

**Decision:** Every status transition in every workflow has a per-role permission.

**Transition format:**
```
workflow_key, from_status, to_status → is_allowed: boolean
```

**Examples:**
- project_workflow: todo → in_progress → is_allowed
- release_workflow: ready_for_signoff → approved → is_allowed (may require sign_off action)

**Incident Hub transitions:**
- All marked `is_allowed = false`
- Lock icon rendered
- Tooltip: "Managed in Jira only"
- Cannot be toggled by admin

---

## Field Classification

### System Field Classes

**Decision:** Every field is classified by its system nature (separate from role permissions):

1. **normal** — regular editable field
2. **system** — internal system field (id, created_at, updated_at)
3. **admin_only** — admin-only technical field
4. **banned** — never show to non-admin (assessment_feature, service_now_ref) — LOCKED
5. **read_only_system** — cannot be edited by any role
6. **derived** — calculated/read-only field
7. **deprecated** — exists but should not be used

**Implementation:**
- Classification is stored in `fields.classification` enum
- Banned fields render with lock icon + "Banned" lozenge in all UIs
- Admin-only fields render with lock icon in non-admin views
- Classification is DISTINCT from role permissions

### Banned Fields (Permanent Lock)

**Decision:** Two fields are permanently banned from non-admin roles:

1. `assessment_feature` (customfield_10126 in Jira)
2. `service_now_ref` (custom field in Catalyst)

**Rule:** These fields:
- Never render in UI for non-admin users
- Never appear in exports for non-admin users
- Cannot be toggled in Field Permissions UI
- Show "Banned" lozenge in admin panel
- Tooltip explains why they are locked

---

## Hidden Fields & Export

### Hidden Fields = Not Rendered + Not Exported

**Decision:** If a field has `can_view = false`, it is:
- Not rendered in UI (detail view, tables, forms)
- Not included in CSV/Excel exports
- Not available for inline editing
- Not available in bulk edit dialogs

**No workaround:** Even if someone manually requests the field, it is filtered out at API layer.

### Export Respects Field Permissions

**Decision:** CSV/Excel exports are filtered per role:

1. Only include fields where `can_export = true`
2. Exclude all fields with `can_view = false` (hidden)
3. Exclude all banned fields
4. Exclude fields marked `is_masked = true`
5. Masked fields show placeholder (e.g., "***") if included

**Implementation:**
- Export function receives `role_id` as parameter
- Query role field permissions before building export
- Filter columns based on permissions
- Return error if role has no export permission on module

---

## Incident Hub Read-Only Policy

### Incident Hub Cannot Be Modified in Catalyst

**Decision:** Incident Hub is strictly read-only in Catalyst. All mutations are managed in Jira.

**What is blocked in Catalyst:**
- No status transitions
- No field edits
- No comments (can view, cannot add)
- No watchers (can view, cannot change)
- No attachments
- No incident deletion

**Where mutations happen:**
- User must go to Jira to change incident status
- User must go to Jira to add comments
- User must go to Jira to add watchers
- Catalyst shows "Managed in Jira" overlay on write actions

**UI implementation:**
- Incident Hub detail view shows modal: "Edit in Jira" (link to Jira incident)
- All edit buttons disabled with tooltip
- Status dropdown disabled with lock icon
- Add comment button hidden or disabled

**Why:** Incidents are the source of truth in Jira. Catalyst is a read-only mirror for visibility only.

---

## Role Changes & Immediate Effect

### Role Changes Take Effect Immediately

**Decision:** When an admin changes a user's role or permission:

1. Change is saved to database
2. Permission audit log records change
3. User's next request/page load sees new permissions
4. No "apply changes" button
5. No "wait 1 hour" delay
6. No cache invalidation delay

**Implementation:**
- No session cache for roles/permissions (always fresh from DB)
- RLS policies re-evaluated on every request
- Component guards re-evaluated on every render
- If user is logged in, they see new permissions immediately on refresh

---

## Audit Logging

### Every Permission Change Is Logged

**Decision:** Every change to roles, users, and permissions is recorded in `permission_audit_log`:

**Logged events:**
- Role created
- Role updated (any field)
- Role deactivated
- Role deleted
- User role assigned
- User role deactivated
- Guest access created
- Guest access expired (auto)
- Permission changed (module, field, action, transition)
- Access revoked
- Invitation created
- Invitation revoked
- Email sent (setup, invite, reset)

**Audit entry format:**
```
{
  id: uuid,
  timestamp: timestamptz,
  actor_id: uuid (user who made the change),
  action_type: text (role_created, permission_changed, etc.),
  target_type: text (role, user, module, field, action, transition),
  target_id: uuid or text,
  old_value: jsonb,
  new_value: jsonb,
  reason: text (optional),
  ip_address: inet (optional),
  created_at: timestamptz
}
```

**Who can view:**
- Admin only (no delegation to PMO/Governance in Phase 1)

**How long:**
- Kept indefinitely (audit compliance)

---

## Global Permissions Only (Phase 1)

### No Project-Specific Overrides

**Decision:** In Phase 1, permissions are **global only**.

- Role A has same permissions in Project Hub, Product Hub, Release Hub, etc.
- No "role A in project X has permission Y, but in project Z does not"
- No team-specific role overrides

**Future (Phase 2+):**
- Project-specific permission overrides
- Team-level role assignment
- Delegated role management

**Why Phase 1 is global-only:**
- Simpler schema (no extra dimension)
- Easier to understand/debug
- Faster implementation
- Covers 80% of use case

---

## Summary of Non-Negotiable Rules

| Rule | Yes | No |
|---|---|---|
| One active role per user | ✅ | ❌ Multi-role |
| Only Admin manages roles | ✅ | ❌ Delegate to PM |
| Guest = read-only + 48h | ✅ | ❌ Permanent guest |
| Role changes immediate | ✅ | ❌ Delayed effect |
| Hidden fields excluded from export | ✅ | ❌ Exported anyway |
| Incident Hub read-only | ✅ | ❌ Mutations in Catalyst |
| Banned fields locked | ✅ | ❌ Toggleable |
| Every change audited | ✅ | ❌ No audit |
| Create Access requires role | ✅ | ❌ Optional role |
| Global permissions only (Phase 1) | ✅ | ❌ Project-specific |

---

**These decisions are final. Do not implement alternatives.**
