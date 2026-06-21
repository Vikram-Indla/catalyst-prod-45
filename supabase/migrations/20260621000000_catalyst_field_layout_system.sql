-- =========================================================
-- Catalyst Field Layout System
-- Mirrors Jira's "Work item layout" feature
-- =========================================================

-- 1. Extend field_type enum with Jira-canonical types
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'textarea';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'url';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'user_picker';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'labels';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'datetime';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'radio_buttons';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'checkbox';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'paragraph';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'priority';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'status';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'fix_versions';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'issuelink';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'severity';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'cascading_select';

-- 2. Extend custom_field_defs with layout-system columns
ALTER TABLE custom_field_defs
  ADD COLUMN IF NOT EXISTS applicable_issue_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS searchable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS help_text text;

-- 3. Main layout table: one row per field in a layout
-- project_key = NULL means master/default layout for that issue type
-- NOTE: uniqueness enforced via two partial unique indexes below (not inline constraint),
-- because Postgres does not support functional expressions in inline UNIQUE constraints.
CREATE TABLE IF NOT EXISTS catalyst_field_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key text,
  issue_type text NOT NULL,
  section text NOT NULL CHECK (section IN ('description', 'context', 'hidden')),
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  position integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  is_system_field boolean NOT NULL DEFAULT true,
  custom_field_def_id uuid REFERENCES custom_field_defs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Partial unique indexes to enforce uniqueness for master layouts (project_key IS NULL)
-- and per-project layouts (project_key IS NOT NULL) separately.
CREATE UNIQUE INDEX IF NOT EXISTS uq_field_layout_master
  ON catalyst_field_layouts (issue_type, field_key)
  WHERE project_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_field_layout_project
  ON catalyst_field_layouts (project_key, issue_type, field_key)
  WHERE project_key IS NOT NULL;

-- Trigger: update updated_at on changes
CREATE OR REPLACE FUNCTION set_catalyst_field_layouts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_catalyst_field_layouts_updated_at ON catalyst_field_layouts;
CREATE TRIGGER trg_catalyst_field_layouts_updated_at
  BEFORE UPDATE ON catalyst_field_layouts
  FOR EACH ROW EXECUTE FUNCTION set_catalyst_field_layouts_updated_at();

-- 4. RLS
ALTER TABLE catalyst_field_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated users can read field layouts"
  ON catalyst_field_layouts FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Admins can insert field layouts"
  ON catalyst_field_layouts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

CREATE POLICY IF NOT EXISTS "Admins can update field layouts"
  ON catalyst_field_layouts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

CREATE POLICY IF NOT EXISTS "Admins can delete field layouts"
  ON catalyst_field_layouts FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

-- 5. Seed master layouts (project_key = NULL = master default)
-- ON CONFLICT DO NOTHING works with partial unique indexes.

-- Story
INSERT INTO catalyst_field_layouts (project_key, issue_type, section, field_key, field_label, field_type, position, is_required, is_pinned, is_system_field) VALUES
  (NULL, 'Story', 'description', 'summary',     'Summary',     'text',        0, true,  true,  true),
  (NULL, 'Story', 'description', 'description', 'Description', 'textarea',    1, false, false, true),
  (NULL, 'Story', 'description', 'parent',      'Parent',      'issuelink',   2, false, false, true),
  (NULL, 'Story', 'description', 'priority',    'Priority',    'priority',    3, false, false, true),
  (NULL, 'Story', 'description', 'duedate',     'Due date',    'date',        4, false, false, true),
  (NULL, 'Story', 'context',     'status',      'Status',      'status',      0, true,  true,  true),
  (NULL, 'Story', 'context',     'assignee',    'Assignee',    'user_picker', 1, false, false, true),
  (NULL, 'Story', 'context',     'reporter',    'Reporter',    'user_picker', 2, false, false, true),
  (NULL, 'Story', 'context',     'fixVersions', 'Fix versions','fix_versions',3, false, false, true),
  (NULL, 'Story', 'context',     'labels',      'Labels',      'labels',      4, false, false, true)
ON CONFLICT DO NOTHING;

-- Epic
INSERT INTO catalyst_field_layouts (project_key, issue_type, section, field_key, field_label, field_type, position, is_required, is_pinned, is_system_field) VALUES
  (NULL, 'Epic', 'description', 'summary',     'Summary',     'text',        0, true,  true,  true),
  (NULL, 'Epic', 'description', 'description', 'Description', 'textarea',    1, false, false, true),
  (NULL, 'Epic', 'description', 'parent',      'Parent',      'issuelink',   2, false, false, true),
  (NULL, 'Epic', 'description', 'priority',    'Priority',    'priority',    3, false, false, true),
  (NULL, 'Epic', 'description', 'duedate',     'Due date',    'date',        4, false, false, true),
  (NULL, 'Epic', 'context',     'status',      'Status',      'status',      0, true,  true,  true),
  (NULL, 'Epic', 'context',     'assignee',    'Assignee',    'user_picker', 1, false, false, true),
  (NULL, 'Epic', 'context',     'reporter',    'Reporter',    'user_picker', 2, false, false, true),
  (NULL, 'Epic', 'context',     'fixVersions', 'Fix versions','fix_versions',3, false, false, true)
ON CONFLICT DO NOTHING;

-- Feature
INSERT INTO catalyst_field_layouts (project_key, issue_type, section, field_key, field_label, field_type, position, is_required, is_pinned, is_system_field) VALUES
  (NULL, 'Feature', 'description', 'summary',     'Summary',     'text',        0, true,  true,  true),
  (NULL, 'Feature', 'description', 'description', 'Description', 'textarea',    1, false, false, true),
  (NULL, 'Feature', 'description', 'parent',      'Parent',      'issuelink',   2, false, false, true),
  (NULL, 'Feature', 'description', 'priority',    'Priority',    'priority',    3, false, false, true),
  (NULL, 'Feature', 'context',     'status',      'Status',      'status',      0, true,  true,  true),
  (NULL, 'Feature', 'context',     'assignee',    'Assignee',    'user_picker', 1, false, false, true),
  (NULL, 'Feature', 'context',     'reporter',    'Reporter',    'user_picker', 2, false, false, true)
ON CONFLICT DO NOTHING;

-- Task
INSERT INTO catalyst_field_layouts (project_key, issue_type, section, field_key, field_label, field_type, position, is_required, is_pinned, is_system_field) VALUES
  (NULL, 'Task', 'description', 'summary',     'Summary',     'text',        0, true,  true,  true),
  (NULL, 'Task', 'description', 'description', 'Description', 'textarea',    1, false, false, true),
  (NULL, 'Task', 'description', 'parent',      'Parent',      'issuelink',   2, false, false, true),
  (NULL, 'Task', 'description', 'priority',    'Priority',    'priority',    3, false, false, true),
  (NULL, 'Task', 'description', 'duedate',     'Due date',    'date',        4, false, false, true),
  (NULL, 'Task', 'context',     'status',      'Status',      'status',      0, true,  true,  true),
  (NULL, 'Task', 'context',     'assignee',    'Assignee',    'user_picker', 1, false, false, true),
  (NULL, 'Task', 'context',     'reporter',    'Reporter',    'user_picker', 2, false, false, true),
  (NULL, 'Task', 'context',     'labels',      'Labels',      'labels',      3, false, false, true)
ON CONFLICT DO NOTHING;

-- QA Bug
INSERT INTO catalyst_field_layouts (project_key, issue_type, section, field_key, field_label, field_type, position, is_required, is_pinned, is_system_field) VALUES
  (NULL, 'QA Bug', 'description', 'summary',     'Summary',     'text',        0, true,  true,  true),
  (NULL, 'QA Bug', 'description', 'description', 'Description', 'textarea',    1, false, false, true),
  (NULL, 'QA Bug', 'description', 'parent',      'Parent',      'issuelink',   2, false, false, true),
  (NULL, 'QA Bug', 'description', 'priority',    'Priority',    'priority',    3, false, false, true),
  (NULL, 'QA Bug', 'description', 'severity',    'Severity',    'severity',    4, false, false, true),
  (NULL, 'QA Bug', 'context',     'status',      'Status',      'status',      0, true,  true,  true),
  (NULL, 'QA Bug', 'context',     'assignee',    'Assignee',    'user_picker', 1, false, false, true),
  (NULL, 'QA Bug', 'context',     'reporter',    'Reporter',    'user_picker', 2, false, false, true),
  (NULL, 'QA Bug', 'context',     'fixVersions', 'Fix versions','fix_versions',3, false, false, true)
ON CONFLICT DO NOTHING;

-- Production Incident
INSERT INTO catalyst_field_layouts (project_key, issue_type, section, field_key, field_label, field_type, position, is_required, is_pinned, is_system_field) VALUES
  (NULL, 'Production Incident', 'description', 'summary',     'Summary',     'text',        0, true,  true,  true),
  (NULL, 'Production Incident', 'description', 'description', 'Description', 'textarea',    1, false, false, true),
  (NULL, 'Production Incident', 'description', 'parent',      'Parent',      'issuelink',   2, false, false, true),
  (NULL, 'Production Incident', 'description', 'priority',    'Priority',    'priority',    3, false, false, true),
  (NULL, 'Production Incident', 'description', 'severity',    'Severity',    'severity',    4, false, false, true),
  (NULL, 'Production Incident', 'description', 'duedate',     'Due date',    'date',        5, false, false, true),
  (NULL, 'Production Incident', 'context',     'status',      'Status',      'status',      0, true,  true,  true),
  (NULL, 'Production Incident', 'context',     'assignee',    'Assignee',    'user_picker', 1, false, false, true),
  (NULL, 'Production Incident', 'context',     'reporter',    'Reporter',    'user_picker', 2, false, false, true),
  (NULL, 'Production Incident', 'context',     'fixVersions', 'Fix versions','fix_versions',3, false, false, true)
ON CONFLICT DO NOTHING;

-- Change Request
INSERT INTO catalyst_field_layouts (project_key, issue_type, section, field_key, field_label, field_type, position, is_required, is_pinned, is_system_field) VALUES
  (NULL, 'Change Request', 'description', 'summary',     'Summary',     'text',        0, true,  true,  true),
  (NULL, 'Change Request', 'description', 'description', 'Description', 'textarea',    1, false, false, true),
  (NULL, 'Change Request', 'description', 'parent',      'Parent',      'issuelink',   2, false, false, true),
  (NULL, 'Change Request', 'description', 'priority',    'Priority',    'priority',    3, false, false, true),
  (NULL, 'Change Request', 'description', 'duedate',     'Due date',    'date',        4, false, false, true),
  (NULL, 'Change Request', 'context',     'status',      'Status',      'status',      0, true,  true,  true),
  (NULL, 'Change Request', 'context',     'assignee',    'Assignee',    'user_picker', 1, false, false, true),
  (NULL, 'Change Request', 'context',     'reporter',    'Reporter',    'user_picker', 2, false, false, true),
  (NULL, 'Change Request', 'context',     'fixVersions', 'Fix versions','fix_versions',3, false, false, true)
ON CONFLICT DO NOTHING;

-- Business Gap
INSERT INTO catalyst_field_layouts (project_key, issue_type, section, field_key, field_label, field_type, position, is_required, is_pinned, is_system_field) VALUES
  (NULL, 'Business Gap', 'description', 'summary',     'Summary',     'text',        0, true,  true,  true),
  (NULL, 'Business Gap', 'description', 'description', 'Description', 'textarea',    1, false, false, true),
  (NULL, 'Business Gap', 'description', 'parent',      'Parent',      'issuelink',   2, false, false, true),
  (NULL, 'Business Gap', 'description', 'priority',    'Priority',    'priority',    3, false, false, true),
  (NULL, 'Business Gap', 'context',     'status',      'Status',      'status',      0, true,  true,  true),
  (NULL, 'Business Gap', 'context',     'assignee',    'Assignee',    'user_picker', 1, false, false, true),
  (NULL, 'Business Gap', 'context',     'reporter',    'Reporter',    'user_picker', 2, false, false, true)
ON CONFLICT DO NOTHING;

-- Sub-task
INSERT INTO catalyst_field_layouts (project_key, issue_type, section, field_key, field_label, field_type, position, is_required, is_pinned, is_system_field) VALUES
  (NULL, 'Sub-task', 'description', 'summary',     'Summary',     'text',        0, true,  true,  true),
  (NULL, 'Sub-task', 'description', 'description', 'Description', 'textarea',    1, false, false, true),
  (NULL, 'Sub-task', 'description', 'parent',      'Parent',      'issuelink',   2, true,  true,  true),
  (NULL, 'Sub-task', 'description', 'priority',    'Priority',    'priority',    3, false, false, true),
  (NULL, 'Sub-task', 'context',     'status',      'Status',      'status',      0, true,  true,  true),
  (NULL, 'Sub-task', 'context',     'assignee',    'Assignee',    'user_picker', 1, false, false, true),
  (NULL, 'Sub-task', 'context',     'reporter',    'Reporter',    'user_picker', 2, false, false, true)
ON CONFLICT DO NOTHING;
