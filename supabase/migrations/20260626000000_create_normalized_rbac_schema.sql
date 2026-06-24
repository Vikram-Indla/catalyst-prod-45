-- Phase 1.1: Create normalized RBAC schema (additive, non-destructive)
-- RLS enabled on all tables in Phase 1.1
-- No client access policies in Phase 1.1 (added Phase 1.2 after admin bootstrap)
-- No audit triggers in Phase 1.1 (added Phase 1.2)

-- ============================================================================
-- rbac_roles — Role definitions
-- ============================================================================
CREATE TABLE public.rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rbac_roles_is_active ON public.rbac_roles(is_active);
CREATE INDEX idx_rbac_roles_code ON public.rbac_roles(code);

ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_user_roles — User to role assignments (one active per user)
-- ============================================================================
CREATE TABLE public.rbac_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rbac_user_roles_user_id ON public.rbac_user_roles(user_id);
CREATE INDEX idx_rbac_user_roles_role_id ON public.rbac_user_roles(role_id);
CREATE INDEX idx_rbac_user_roles_is_active ON public.rbac_user_roles(is_active);

-- Enforce exactly one active role per user
CREATE UNIQUE INDEX one_active_role_per_user
ON public.rbac_user_roles(user_id)
WHERE is_active = true;

-- Validate role is active before assignment
CREATE OR REPLACE FUNCTION public.validate_role_active()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rbac_roles WHERE id = NEW.role_id AND is_active = true) THEN
    RAISE EXCEPTION 'Cannot assign inactive role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_role_active
  BEFORE INSERT OR UPDATE ON public.rbac_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_active();

ALTER TABLE public.rbac_user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_guest_access — Guest role with 48-hour expiry
-- ============================================================================
CREATE TABLE public.rbac_guest_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_role_id uuid NOT NULL REFERENCES public.rbac_roles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,

  CONSTRAINT guest_expires_48h CHECK (expires_at = created_at + INTERVAL '48 hours')
);

CREATE INDEX idx_rbac_guest_access_user_id ON public.rbac_guest_access(user_id);
CREATE INDEX idx_rbac_guest_access_expires_at ON public.rbac_guest_access(expires_at);
CREATE INDEX idx_rbac_guest_access_is_active ON public.rbac_guest_access(is_active);

ALTER TABLE public.rbac_guest_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_modules — Module definitions (Project Hub, Product Hub, etc.)
-- ============================================================================
CREATE TABLE public.rbac_modules (
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

CREATE INDEX idx_rbac_modules_is_active ON public.rbac_modules(is_active);
CREATE INDEX idx_rbac_modules_key ON public.rbac_modules(key);

ALTER TABLE public.rbac_modules ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_entities — Entities within modules
-- ============================================================================
CREATE TABLE public.rbac_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.rbac_modules(id),
  key text NOT NULL,
  name text NOT NULL,
  table_name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT entity_key_unique_per_module UNIQUE(module_id, key)
);

CREATE INDEX idx_rbac_entities_module_id ON public.rbac_entities(module_id);
CREATE INDEX idx_rbac_entities_key ON public.rbac_entities(key);

ALTER TABLE public.rbac_entities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_fields — Fields within entities
-- ============================================================================
CREATE TABLE public.rbac_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.rbac_entities(id),
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

CREATE INDEX idx_rbac_fields_entity_id ON public.rbac_fields(entity_id);
CREATE INDEX idx_rbac_fields_key ON public.rbac_fields(key);
CREATE INDEX idx_rbac_fields_classification ON public.rbac_fields(classification);

ALTER TABLE public.rbac_fields ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_actions — Actions within modules
-- ============================================================================
CREATE TABLE public.rbac_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.rbac_modules(id),
  key text NOT NULL,
  name text NOT NULL,
  category text NOT NULL
    CHECK (category IN ('CRUD','BULK','EXPORT','COLLABORATION','MODULE_SPECIFIC','AI','INCIDENT')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT action_key_unique_per_module UNIQUE(module_id, key)
);

CREATE INDEX idx_rbac_actions_module_id ON public.rbac_actions(module_id);
CREATE INDEX idx_rbac_actions_key ON public.rbac_actions(key);
CREATE INDEX idx_rbac_actions_category ON public.rbac_actions(category);

ALTER TABLE public.rbac_actions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_workflows — Workflow definitions
-- ============================================================================
CREATE TABLE public.rbac_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.rbac_modules(id),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workflow_key_unique_per_module UNIQUE(module_id, key)
);

CREATE INDEX idx_rbac_workflows_module_id ON public.rbac_workflows(module_id);
CREATE INDEX idx_rbac_workflows_key ON public.rbac_workflows(key);

ALTER TABLE public.rbac_workflows ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_workflow_transitions — Status transitions within workflows
-- ============================================================================
CREATE TABLE public.rbac_workflow_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.rbac_workflows(id),
  from_status text NOT NULL,
  to_status text NOT NULL,
  requires_special_action boolean DEFAULT false,
  special_action_key text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT transition_key_unique_per_workflow UNIQUE(workflow_id, from_status, to_status)
);

CREATE INDEX idx_rbac_workflow_transitions_workflow_id ON public.rbac_workflow_transitions(workflow_id);

ALTER TABLE public.rbac_workflow_transitions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_role_module_permissions — Module-level permissions (7 bools per role-module)
-- ============================================================================
CREATE TABLE public.rbac_role_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id),
  module_id uuid NOT NULL REFERENCES public.rbac_modules(id),
  can_read boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  can_bulk_update boolean NOT NULL DEFAULT false,
  can_bulk_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT role_module_perms_unique UNIQUE(role_id, module_id)
);

CREATE INDEX idx_rbac_role_module_perms_role_id ON public.rbac_role_module_permissions(role_id);
CREATE INDEX idx_rbac_role_module_perms_module_id ON public.rbac_role_module_permissions(module_id);

ALTER TABLE public.rbac_role_module_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_role_field_permissions — Field-level permissions (5 bools per role-field)
-- ============================================================================
CREATE TABLE public.rbac_role_field_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id),
  field_id uuid NOT NULL REFERENCES public.rbac_fields(id),
  can_view boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_clear boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  is_masked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT role_field_perms_unique UNIQUE(role_id, field_id)
);

CREATE INDEX idx_rbac_role_field_perms_role_id ON public.rbac_role_field_permissions(role_id);
CREATE INDEX idx_rbac_role_field_perms_field_id ON public.rbac_role_field_permissions(field_id);

ALTER TABLE public.rbac_role_field_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_role_action_permissions — Action-level permissions (is_allowed per role-action)
-- ============================================================================
CREATE TABLE public.rbac_role_action_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id),
  action_id uuid NOT NULL REFERENCES public.rbac_actions(id),
  is_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT role_action_perms_unique UNIQUE(role_id, action_id)
);

CREATE INDEX idx_rbac_role_action_perms_role_id ON public.rbac_role_action_permissions(role_id);
CREATE INDEX idx_rbac_role_action_perms_action_id ON public.rbac_role_action_permissions(action_id);

ALTER TABLE public.rbac_role_action_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_role_transition_permissions — Transition-level permissions
-- ============================================================================
CREATE TABLE public.rbac_role_transition_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id),
  transition_id uuid NOT NULL REFERENCES public.rbac_workflow_transitions(id),
  is_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT role_transition_perms_unique UNIQUE(role_id, transition_id)
);

CREATE INDEX idx_rbac_role_transition_perms_role_id ON public.rbac_role_transition_permissions(role_id);
CREATE INDEX idx_rbac_role_transition_perms_transition_id ON public.rbac_role_transition_permissions(transition_id);

ALTER TABLE public.rbac_role_transition_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- rbac_permission_audit_log — Audit trail for permission changes
-- ============================================================================
CREATE TABLE public.rbac_permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id),
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rbac_permission_audit_log_actor_id ON public.rbac_permission_audit_log(actor_id);
CREATE INDEX idx_rbac_permission_audit_log_action_type ON public.rbac_permission_audit_log(action_type);
CREATE INDEX idx_rbac_permission_audit_log_created_at ON public.rbac_permission_audit_log(created_at);

ALTER TABLE public.rbac_permission_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Status: All tables have RLS enabled, no policies in Phase 1.1
-- Phase 1.2 will add SECURITY DEFINER functions and client access policies
-- ============================================================================
COMMENT ON TABLE public.rbac_roles IS 'Phase 1.1: RLS enabled, no policies. Phase 1.2: Add read-only policy via SECURITY DEFINER';
COMMENT ON TABLE public.rbac_user_roles IS 'Phase 1.1: RLS enabled, no policies. Phase 1.2: Add admin-write policy after bootstrap';
COMMENT ON TABLE public.rbac_modules IS 'Phase 1.1: RLS enabled, no policies. Phase 1.2: Add read-only policy';
COMMENT ON TABLE public.rbac_actions IS 'Phase 1.1: RLS enabled, no policies. Phase 1.2: Add read-only policy';
