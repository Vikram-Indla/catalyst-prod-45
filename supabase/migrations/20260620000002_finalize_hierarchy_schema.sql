-- Migration: Finalize Hierarchy Schema for Catalyst
-- Date: 2026-06-20
-- Context: Lock hierarchy structure before Phase 0 UI build
--
-- Canonical hierarchy (verified with user):
-- Vision → Goal → Objective → Strategic Theme → Business Request
--   └─ Epic → Feature → Story → Sub-task
--
-- Jira parent links are read-only (not authoritative after migration).
-- Catalyst owns hierarchy.

-- 1. Finalize hierarchy_levels table (canonical levels)
CREATE TABLE IF NOT EXISTS public.hierarchy_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hierarchy_version_id uuid NOT NULL,
  level_order integer NOT NULL,
  level_name text NOT NULL,
  work_item_types text[] NOT NULL DEFAULT '{}',
  allow_children_types text[] NOT NULL DEFAULT '{}',
  is_leaf boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_level_per_version UNIQUE (hierarchy_version_id, level_order),
  CONSTRAINT valid_level_order CHECK (level_order >= 1),
  CONSTRAINT valid_level_name CHECK (level_name ~ '^[A-Z][a-z\s]+$')
);

COMMENT ON TABLE public.hierarchy_levels IS 'Defines each level in Catalyst work item hierarchy. Order matters. work_item_types = which types belong here. allow_children_types = what types can be children of this level.';

-- 2. Finalize hierarchy_configurations table (versioned configs)
CREATE TABLE IF NOT EXISTS public.hierarchy_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT true,
  parent_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  relationship_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_version UNIQUE (is_active) WHERE is_active = true,
  CONSTRAINT version_order CHECK (version >= 1)
);

COMMENT ON TABLE public.hierarchy_configurations IS 'Versioned hierarchy configs. Only one can be active at a time. parent_rules = allowed parent-child pairs. relationship_rules = allowed non-hierarchy links (e.g., Defect relates-to Story).';

-- 3. Link hierarchy_levels to hierarchy_configurations
ALTER TABLE public.hierarchy_levels
ADD CONSTRAINT fk_hierarchy_version
FOREIGN KEY (hierarchy_version_id)
REFERENCES public.hierarchy_configurations(id)
ON DELETE CASCADE;

-- 4. Seed canonical hierarchy (starting state)
INSERT INTO public.hierarchy_configurations (version, is_active, is_draft, parent_rules, relationship_rules)
VALUES (
  1,
  true,
  false,
  '[
    {"from": "Vision", "to": "Goal"},
    {"from": "Goal", "to": "Objective"},
    {"from": "Objective", "to": "Strategic Theme"},
    {"from": "Strategic Theme", "to": "Business Request"},
    {"from": "Business Request", "to": "Epic"},
    {"from": "Epic", "to": "Feature"},
    {"from": "Epic", "to": "Story"},
    {"from": "Feature", "to": "Story"},
    {"from": "Story", "to": "Sub-task"}
  ]'::jsonb,
  '[
    {"type": "Defect", "relatesTo": ["Story", "Epic"]},
    {"type": "Production Incident", "relatesTo": ["Story", "Epic"]},
    {"type": "Bug", "relatesTo": ["Story", "Epic"]}
  ]'::jsonb
) RETURNING id INTO public.hierarchy_configurations;

-- Get the version ID for seeding levels
WITH v AS (SELECT id FROM public.hierarchy_configurations WHERE version = 1)
INSERT INTO public.hierarchy_levels (hierarchy_version_id, level_order, level_name, work_item_types, allow_children_types, is_leaf, description)
SELECT v.id, level_order, level_name, work_item_types, allow_children_types, is_leaf, description
FROM (VALUES
  (1, 'Vision', '{"Vision"}', '{"Goal"}', false, 'Strategic top-level vision'),
  (2, 'Goal', '{"Goal"}', '{"Objective"}', false, 'Goals aligned to vision'),
  (3, 'Objective', '{"Objective"}', '{"Strategic Theme"}', false, 'Objectives under goals'),
  (4, 'Strategic Theme', '{"Strategic Theme"}', '{"Business Request"}', false, 'Themes organizing requests'),
  (5, 'Business Request', '{"Business Request"}', '{"Epic"}', false, 'Entry point for delivery'),
  (6, 'Epic', '{"Epic"}', '{"Feature","Story"}', false, 'Large initiatives'),
  (7, 'Feature', '{"Feature"}', '{"Story"}', false, 'Feature-sized work'),
  (8, 'Story', '{"Story","User Story"}', '{"Sub-task","Technical Task"}', false, 'Delivery-sized stories'),
  (9, 'Sub-task', '{"Sub-task","Technical Task"}', '{}', true, 'Smallest deliverable')
) AS t(level_order, level_name, work_item_types, allow_children_types, is_leaf, description),
v
ORDER BY t.level_order;

-- 5. Create audit table for hierarchy changes
CREATE TABLE IF NOT EXISTS public.hierarchy_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hierarchy_version_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('CREATED', 'UPDATED', 'PUBLISHED', 'ROLLED_BACK')),
  change_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (hierarchy_version_id) REFERENCES public.hierarchy_configurations(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.hierarchy_change_audit IS 'Audit trail for all hierarchy configuration changes. Immutable record.';

-- 6. RLS policies (admin-only for now)
ALTER TABLE public.hierarchy_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hierarchy_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hierarchy_change_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage hierarchy levels" ON public.hierarchy_levels;
CREATE POLICY "Admins manage hierarchy levels" ON public.hierarchy_levels
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

DROP POLICY IF EXISTS "Admins manage hierarchy config" ON public.hierarchy_configurations;
CREATE POLICY "Admins manage hierarchy config" ON public.hierarchy_configurations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

DROP POLICY IF EXISTS "Admins view hierarchy audit" ON public.hierarchy_change_audit;
CREATE POLICY "Admins view hierarchy audit" ON public.hierarchy_change_audit
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

GRANT SELECT, INSERT, UPDATE ON public.hierarchy_levels TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.hierarchy_configurations TO authenticated;
GRANT INSERT ON public.hierarchy_change_audit TO authenticated;
