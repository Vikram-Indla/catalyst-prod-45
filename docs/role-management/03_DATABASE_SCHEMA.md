# 03. Database Schema — Normalized Tables

**Status:** Approved  
**Last Updated:** 2026-06-24

All tables use UUID primary keys and timestamptz for time fields.

---

## Core Tables

### roles

```sql
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roles_is_active ON public.roles(is_active);
CREATE INDEX idx_roles_code ON public.roles(code);
```

**is_system:** true for Admin, false for User, Guest, custom roles.

### user_roles

```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX idx_user_roles_is_active ON public.user_roles(is_active);

-- Enforce exactly one active role per user via partial unique index
CREATE UNIQUE INDEX one_active_role_per_user
ON public.user_roles(user_id)
WHERE is_active = true;
```

**Enforcement:**
- **One active role per user:** Enforced by partial unique index `one_active_role_per_user`. Only allows one row per user where `is_active = true`.
- **Prevent assigning inactive roles:** Enforced in service layer OR via `BEFORE INSERT/UPDATE` trigger. Do NOT use a CHECK constraint with subquery (invalid PostgreSQL syntax).

**Service-layer enforcement (recommended):**
```typescript
// Before insert/update, check:
if (!role.is_active) {
  throw new Error('Cannot assign inactive role');
}
```

**OR trigger-based enforcement:**
```sql
CREATE OR REPLACE FUNCTION public.validate_role_active()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = NEW.role_id AND is_active = true) THEN
    RAISE EXCEPTION 'Cannot assign inactive role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_role_active
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_active();
```

### guest_access

```sql
CREATE TABLE public.guest_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  guest_role_id uuid NOT NULL REFERENCES public.roles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  
  CONSTRAINT guest_expires_after_48h CHECK (expires_at = created_at + INTERVAL '48 hours')
);

CREATE INDEX idx_guest_access_user_id ON public.guest_access(user_id);
CREATE INDEX idx_guest_access_expires_at ON public.guest_access(expires_at);
CREATE INDEX idx_guest_access_is_active ON public.guest_access(is_active);
```

**Constraint:** Ensures guest access always expires exactly 48 hours after creation.

---

## Configuration Tables

### modules

```sql
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  route_prefix text NOT NULL,
  primary_entity text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_modules_is_active ON public.modules(is_active);
CREATE INDEX idx_modules_key ON public.modules(key);
```

### entities

```sql
CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id),
  key text NOT NULL,
  name text NOT NULL,
  table_name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT entity_key_unique_per_module UNIQUE(module_id, key)
);

CREATE INDEX idx_entities_module_id ON public.entities(module_id);
CREATE INDEX idx_entities_key ON public.entities(key);
```

### fields

```sql
CREATE TABLE public.fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id),
  key text NOT NULL,
  display_name text NOT NULL,
  data_type text,
  classification text NOT NULL DEFAULT 'normal'
    CHECK (classification IN ('normal','system','admin_only','banned','read_only_system','derived','deprecated')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT field_key_unique_per_entity UNIQUE(entity_id, key)
);

CREATE INDEX idx_fields_entity_id ON public.fields(entity_id);
CREATE INDEX idx_fields_key ON public.fields(key);
CREATE INDEX idx_fields_classification ON public.fields(classification);
```

### actions

```sql
CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id),
  key text NOT NULL,
  name text NOT NULL,
  category text NOT NULL
    CHECK (category IN ('CRUD','BULK','EXPORT','COLLABORATION','MODULE_SPECIFIC','AI','INCIDENT')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT action_key_unique_per_module UNIQUE(module_id, key)
);

CREATE INDEX idx_actions_module_id ON public.actions(module_id);
CREATE INDEX idx_actions_key ON public.actions(key);
CREATE INDEX idx_actions_category ON public.actions(category);
```

### workflows

```sql
CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT workflow_key_unique_per_module UNIQUE(module_id, key)
);

CREATE INDEX idx_workflows_module_id ON public.workflows(module_id);
CREATE INDEX idx_workflows_key ON public.workflows(key);
```

### workflow_transitions

```sql
CREATE TABLE public.workflow_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id),
  from_status text NOT NULL,
  to_status text NOT NULL,
  requires_special_action boolean DEFAULT false,
  special_action_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT transition_unique_per_workflow UNIQUE(workflow_id, from_status, to_status)
);

CREATE INDEX idx_workflow_transitions_workflow_id ON public.workflow_transitions(workflow_id);
```

---

## Permission Tables

### role_module_permissions

```sql
CREATE TABLE public.role_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id),
  can_read boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  can_bulk_update boolean NOT NULL DEFAULT false,
  can_bulk_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT role_module_unique UNIQUE(role_id, module_id),
  CONSTRAINT read_required_for_write CHECK (
    (can_create = false AND can_update = false AND can_delete = false) OR
    can_read = true
  )
);

CREATE INDEX idx_role_module_perms_role_id ON public.role_module_permissions(role_id);
CREATE INDEX idx_role_module_perms_module_id ON public.role_module_permissions(module_id);
```

### role_field_permissions

```sql
CREATE TABLE public.role_field_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.fields(id),
  can_view boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_clear boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  is_masked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT role_field_unique UNIQUE(role_id, field_id),
  CONSTRAINT view_required_for_edit CHECK (
    (can_update = false AND can_clear = false) OR
    can_view = true
  )
);

CREATE INDEX idx_role_field_perms_role_id ON public.role_field_permissions(role_id);
CREATE INDEX idx_role_field_perms_field_id ON public.role_field_permissions(field_id);
```

### role_action_permissions

```sql
CREATE TABLE public.role_action_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  action_id uuid NOT NULL REFERENCES public.actions(id),
  is_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT role_action_unique UNIQUE(role_id, action_id)
);

CREATE INDEX idx_role_action_perms_role_id ON public.role_action_permissions(role_id);
CREATE INDEX idx_role_action_perms_action_id ON public.role_action_permissions(action_id);
```

### role_transition_permissions

```sql
CREATE TABLE public.role_transition_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id),
  from_status text NOT NULL,
  to_status text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT role_transition_unique UNIQUE(role_id, workflow_id, from_status, to_status)
);

CREATE INDEX idx_role_transition_perms_role_id ON public.role_transition_permissions(role_id);
CREATE INDEX idx_role_transition_perms_workflow_id ON public.role_transition_permissions(workflow_id);
```

---

## Audit Table

### permission_audit_log

```sql
CREATE TABLE public.permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.users(id),
  action_type text NOT NULL
    CHECK (action_type IN (
      'role_created','role_updated','role_deactivated','role_deleted',
      'user_role_assigned','user_role_deactivated',
      'guest_access_created','guest_access_expired',
      'permission_changed','access_revoked',
      'invitation_created','invitation_revoked',
      'email_sent'
    )),
  target_type text NOT NULL,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor_id ON public.permission_audit_log(actor_id);
CREATE INDEX idx_audit_action_type ON public.permission_audit_log(action_type);
CREATE INDEX idx_audit_target_type ON public.permission_audit_log(target_type);
CREATE INDEX idx_audit_created_at ON public.permission_audit_log(created_at);
```

---

## Extensions to Existing Tables

### user_invitations (Extension)

```sql
ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS pre_assigned_role_id uuid REFERENCES public.roles(id),
ADD COLUMN IF NOT EXISTS delivery_channel text DEFAULT 'email'
  CHECK (delivery_channel IN ('email','sms','whatsapp','manual')),
ADD COLUMN IF NOT EXISTS purpose text DEFAULT 'invite'
  CHECK (purpose IN ('invite','reset','unlock')),
ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
```

---

## Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| roles | is_active, code | Fast lookups by state/code |
| user_roles | user_id, role_id, is_active | Fast user → role and role validation |
| guest_access | user_id, expires_at, is_active | Fast guest expiry checks |
| modules | is_active, key | Fast module lookups |
| fields | entity_id, classification | Fast field filtering |
| actions | module_id, category | Fast action grouping |
| role_module_perms | role_id, module_id | Fast permission checks |
| role_field_perms | role_id, field_id | Fast field permission checks |
| role_action_perms | role_id, action_id | Fast action permission checks |
| role_transition_perms | role_id, workflow_id | Fast transition checks |
| permission_audit_log | actor_id, action_type, created_at | Fast audit queries |

---

**All tables use cascading deletes where appropriate. All constraints are hard (not soft).**
