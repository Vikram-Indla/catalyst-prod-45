# 02. Architecture & Entity Relationship Diagram

**Status:** Approved  
**Last Updated:** 2026-06-24

---

## Current-State Issues

### What Was Broken Before Role Management

1. **Hardcoded role groups** — `ROLE_GROUPS` constant in code, not in database
2. **Single-dimension access** — isAdmin / isSuperAdmin booleans, not a permission model
3. **No field-level permissions** — all roles saw all fields
4. **No audit trail** — changes to user roles were not logged
5. **No guest role** — no time-limited read-only access
6. **No workflow transitions** — no per-role status change rules
7. **No action-level control** — export, bulk operations uncontrolled

---

## Target-State Model

### Permission Chain (The Core Concept)

```
User
  ↓
has ONE active Role
  ↓
Role grants permissions on Modules
  ↓
Module grants access to Entities (ph_issues, business_requests, etc.)
  ↓
Entity exposes Fields with classification
  ↓
Role has explicit field-level permissions (view, update, clear, export)
  ↓
Role has action permissions (create, delete, bulk, export, AI, etc.)
  ↓
Role has workflow transition permissions (status changes)
  ↓
Everything flows through four enforcement layers
```

### Four Enforcement Layers

**Layer 1: Route Guard (Next.js)**
- Block `/admin/*` routes for non-admin users
- Block module routes if `role.module_permissions.can_read = false`

**Layer 2: UI/Component Guard (React)**
- Hide buttons if role lacks action permission
- Hide fields if role lacks field.can_view
- Hide tabs/sections if not permitted

**Layer 3: Mutation/API Guard (Edge Functions + handlers)**
- Reject CREATE if role lacks module.can_create
- Reject UPDATE if role lacks module.can_update OR field.can_update
- Reject DELETE if role lacks module.can_delete
- Reject bulk operations if role lacks can_bulk_* permissions
- Reject transitions if role lacks transition permission
- Reject exports if role lacks export permissions

**Layer 4: Database/RLS Guard (Supabase)**
- RLS policies on all tables prevent unauthorized reads
- SECURITY DEFINER functions for safe membership checks (avoid recursion)
- Hard row-level filtering on sensitive tables

---

## Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    USERS ||--|| PROFILES : has
    USERS ||--o{ USER_ROLES : assigned
    USER_ROLES }o--|| ROLES : "points to"
    
    USERS ||--o{ GUEST_ACCESS : "may have"
    GUEST_ACCESS }o--|| ROLES : "guest_role"
    
    ROLES ||--o{ ROLE_MODULE_PERMISSIONS : grants
    ROLE_MODULE_PERMISSIONS }o--|| MODULES : "on module"
    
    MODULES ||--o{ ENTITIES : contains
    ENTITIES ||--o{ FIELDS : exposes
    FIELDS }o--|| FIELD_CLASSIFICATIONS : "is classified"
    
    ROLES ||--o{ ROLE_FIELD_PERMISSIONS : has
    ROLE_FIELD_PERMISSIONS }o--|| FIELDS : "permission on"
    ROLE_FIELD_PERMISSIONS }o--|| ENTITIES : "in entity"
    
    ROLES ||--o{ ROLE_ACTION_PERMISSIONS : allows
    ROLE_ACTION_PERMISSIONS }o--|| ACTIONS : "action"
    ACTIONS }o--|| MODULES : "in module"
    
    ROLES ||--o{ ROLE_TRANSITION_PERMISSIONS : permits
    ROLE_TRANSITION_PERMISSIONS }o--|| WORKFLOW_TRANSITIONS : "transition"
    WORKFLOW_TRANSITIONS }o--|| WORKFLOWS : "in workflow"
    WORKFLOWS }o--|| MODULES : "of module"
    
    ROLES ||--o{ PERMISSION_AUDIT_LOG : recorded_in
    USER_ROLES ||--o{ PERMISSION_AUDIT_LOG : recorded_in
    ROLE_MODULE_PERMISSIONS ||--o{ PERMISSION_AUDIT_LOG : recorded_in
    ROLE_FIELD_PERMISSIONS ||--o{ PERMISSION_AUDIT_LOG : recorded_in
    ROLE_ACTION_PERMISSIONS ||--o{ PERMISSION_AUDIT_LOG : recorded_in
    
    USERS {
        uuid id PK
        string email UK
        string full_name
        timestamptz created_at
    }
    
    PROFILES {
        uuid id PK
        uuid user_id FK
        string avatar_url
        string phone
        timestamptz created_at
    }
    
    ROLES {
        uuid id PK
        string name UK
        string code UK
        string description
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    
    USER_ROLES {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
        "CONSTRAINT: one_active_role_per_user"
    }
    
    GUEST_ACCESS {
        uuid id PK
        uuid user_id FK
        uuid guest_role_id FK
        timestamptz created_at
        timestamptz expires_at
        boolean is_active
    }
    
    MODULES {
        uuid id PK
        string key UK
        string name
        string route_prefix
        string primary_entity
        boolean is_active
        timestamptz created_at
    }
    
    ENTITIES {
        uuid id PK
        uuid module_id FK
        string key UK
        string name
        string table_name
        timestamptz created_at
    }
    
    FIELDS {
        uuid id PK
        uuid entity_id FK
        string key UK
        string display_name
        string data_type
        string classification
        boolean is_banned
        boolean is_admin_only
        timestamptz created_at
    }
    
    ROLE_MODULE_PERMISSIONS {
        uuid id PK
        uuid role_id FK
        uuid module_id FK
        boolean can_read
        boolean can_create
        boolean can_update
        boolean can_delete
        boolean can_export
        boolean can_bulk_update
        boolean can_bulk_delete
        timestamptz created_at
    }
    
    ROLE_FIELD_PERMISSIONS {
        uuid id PK
        uuid role_id FK
        uuid field_id FK
        boolean can_view
        boolean can_update
        boolean can_clear
        boolean can_export
        boolean is_masked
        timestamptz created_at
    }
    
    ACTIONS {
        uuid id PK
        uuid module_id FK
        string key UK
        string name
        string category
        string description
        timestamptz created_at
    }
    
    ROLE_ACTION_PERMISSIONS {
        uuid id PK
        uuid role_id FK
        uuid action_id FK
        boolean is_allowed
        timestamptz created_at
    }
    
    WORKFLOWS {
        uuid id PK
        uuid module_id FK
        string key UK
        string name
        timestamptz created_at
    }
    
    WORKFLOW_TRANSITIONS {
        uuid id PK
        uuid workflow_id FK
        string from_status
        string to_status
        boolean requires_special_action
        string special_action_key
        timestamptz created_at
    }
    
    ROLE_TRANSITION_PERMISSIONS {
        uuid id PK
        uuid role_id FK
        uuid workflow_id FK
        string from_status
        string to_status
        boolean is_allowed
        timestamptz created_at
    }
    
    PERMISSION_AUDIT_LOG {
        uuid id PK
        uuid actor_id FK
        string action_type
        string target_type
        uuid target_id
        jsonb old_value
        jsonb new_value
        string reason
        inet ip_address
        timestamptz created_at
    }
```

---

## RLS & Enforcement Safety Notes

### Avoid Recursive RLS Policies

**Bad Pattern:**
```sql
CREATE POLICY "members can view members" ON project_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members m2
      WHERE m2.project_id = project_members.project_id
      AND m2.user_id = auth.uid()
    )
  );
```

This triggers infinite recursion — the policy on `project_members` queries `project_members`, causing the policy to re-invoke itself.

**Good Pattern:**
```sql
CREATE FUNCTION public.is_project_member(project_id uuid, user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members m
    WHERE m.project_id = $1 AND m.user_id = $2
  );
$$;

CREATE POLICY "members can view members" ON project_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_project_member(project_id, auth.uid())
  );
```

The SECURITY DEFINER function runs as superuser and is not subject to RLS on its own table, breaking the cycle.

### Use SECURITY DEFINER Carefully

- Only for membership/permission checks
- Never for data-modifying operations
- Always set `search_path = public` to prevent schema injection
- Validate inputs in the function

---

## Four-Layer Implementation Checklist

- [ ] **Layer 1 (Route)**: AdminGuard checks `isAdmin` before rendering `/admin/*`
- [ ] **Layer 1 (Route)**: Module routes check `role.module_permissions.can_read`
- [ ] **Layer 2 (UI)**: ActionAccessGuard hides buttons based on role permissions
- [ ] **Layer 2 (UI)**: FieldAccessGuard hides fields based on role permissions
- [ ] **Layer 3 (API)**: Every mutation endpoint checks role permissions
- [ ] **Layer 3 (API)**: Export endpoint filters fields by `can_export`
- [ ] **Layer 4 (RLS)**: All sensitive tables have RLS policies
- [ ] **Layer 4 (RLS)**: No recursive policies (use SECURITY DEFINER helpers)

---

**Do not skip any layer. All four are required for security and compliance.**
