-- =====================================================
-- 20260621230000_workflow_defaults.sql
-- Canonical workflow defaults: table + seed + trigger
-- =====================================================

-- 1. Defaults template table
CREATE TABLE IF NOT EXISTS public.ph_workflow_defaults (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_type text        NOT NULL,
  status_name    text        NOT NULL,
  status_category text       NOT NULL CHECK (status_category IN ('todo','in_progress','done')),
  status_color   text        NOT NULL DEFAULT '#DFE1E6',
  position       integer     NOT NULL DEFAULT 0,
  is_initial     boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_item_type, status_name)
);

ALTER TABLE public.ph_workflow_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_workflow_defaults_select"
  ON public.ph_workflow_defaults FOR SELECT TO authenticated USING (true);

CREATE POLICY "ph_workflow_defaults_admin_write"
  ON public.ph_workflow_defaults FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

-- 2. Seed canonical workflow data
INSERT INTO public.ph_workflow_defaults
  (work_item_type, status_name, status_category, status_color, position, is_initial)
VALUES

-- ===== SIMPLE FLOW (4 statuses): Epic, Task, Sub-task, Figma, Frontend, Backend, Integration, UAT Finding =====
('Epic',        'Backlog',      'todo',        '#DFE1E6', 0, true),
('Epic',        'hold',         'todo',        '#DFE1E6', 1, false),
('Epic',        'In Progress',  'in_progress', '#669DF1', 2, false),
('Epic',        'Done',         'done',        '#94C748', 3, false),

('Task',        'Backlog',      'todo',        '#DFE1E6', 0, true),
('Task',        'hold',         'todo',        '#DFE1E6', 1, false),
('Task',        'In Progress',  'in_progress', '#669DF1', 2, false),
('Task',        'Done',         'done',        '#94C748', 3, false),

('Sub-task',    'Backlog',      'todo',        '#DFE1E6', 0, true),
('Sub-task',    'hold',         'todo',        '#DFE1E6', 1, false),
('Sub-task',    'In Progress',  'in_progress', '#669DF1', 2, false),
('Sub-task',    'Done',         'done',        '#94C748', 3, false),

('Figma',       'Backlog',      'todo',        '#DFE1E6', 0, true),
('Figma',       'hold',         'todo',        '#DFE1E6', 1, false),
('Figma',       'In Progress',  'in_progress', '#669DF1', 2, false),
('Figma',       'Done',         'done',        '#94C748', 3, false),

('Frontend',    'Backlog',      'todo',        '#DFE1E6', 0, true),
('Frontend',    'hold',         'todo',        '#DFE1E6', 1, false),
('Frontend',    'In Progress',  'in_progress', '#669DF1', 2, false),
('Frontend',    'Done',         'done',        '#94C748', 3, false),

('Backend',     'Backlog',      'todo',        '#DFE1E6', 0, true),
('Backend',     'hold',         'todo',        '#DFE1E6', 1, false),
('Backend',     'In Progress',  'in_progress', '#669DF1', 2, false),
('Backend',     'Done',         'done',        '#94C748', 3, false),

('Integration', 'Backlog',      'todo',        '#DFE1E6', 0, true),
('Integration', 'hold',         'todo',        '#DFE1E6', 1, false),
('Integration', 'In Progress',  'in_progress', '#669DF1', 2, false),
('Integration', 'Done',         'done',        '#94C748', 3, false),

('UAT Finding', 'Backlog',      'todo',        '#DFE1E6', 0, true),
('UAT Finding', 'hold',         'todo',        '#DFE1E6', 1, false),
('UAT Finding', 'In Progress',  'in_progress', '#669DF1', 2, false),
('UAT Finding', 'Done',         'done',        '#94C748', 3, false),

-- ===== FEATURE PIPELINE (9 statuses): Feature, Change Request =====
('Feature',        'Demand validation',   'todo',        '#DFE1E6', 0, true),
('Feature',        'In Requirements',     'todo',        '#DFE1E6', 1, false),
('Feature',        'Prioritized Backlog', 'todo',        '#DFE1E6', 2, false),
('Feature',        'In Development',      'in_progress', '#669DF1', 3, false),
('Feature',        'In Integration',      'in_progress', '#669DF1', 4, false),
('Feature',        'Staging/QA',          'done',        '#94C748', 5, false),
('Feature',        'In BETA',             'done',        '#94C748', 6, false),
('Feature',        'Production Ready',    'done',        '#94C748', 7, false),
('Feature',        'In Production',       'done',        '#94C748', 8, false),

('Change Request', 'Demand validation',   'todo',        '#DFE1E6', 0, true),
('Change Request', 'In Requirements',     'todo',        '#DFE1E6', 1, false),
('Change Request', 'Prioritized Backlog', 'todo',        '#DFE1E6', 2, false),
('Change Request', 'In Development',      'in_progress', '#669DF1', 3, false),
('Change Request', 'In Integration',      'in_progress', '#669DF1', 4, false),
('Change Request', 'Staging/QA',          'done',        '#94C748', 5, false),
('Change Request', 'In BETA',             'done',        '#94C748', 6, false),
('Change Request', 'Production Ready',    'done',        '#94C748', 7, false),
('Change Request', 'In Production',       'done',        '#94C748', 8, false),

-- ===== STORY PIPELINE (11 statuses) =====
('Story', 'In Requirements',      'todo',        '#DFE1E6', 0,  true),
('Story', 'In Design',            'todo',        '#DFE1E6', 1,  false),
('Story', 'On Hold',              'todo',        '#DFE1E6', 2,  false),
('Story', 'Ready for development','in_progress', '#669DF1', 3,  false),
('Story', 'In Development',       'in_progress', '#669DF1', 4,  false),
('Story', 'In QA',                'done',        '#94C748', 5,  false),
('Story', 'In UAT',               'done',        '#94C748', 6,  false),
('Story', 'BETA READY',           'done',        '#94C748', 7,  false),
('Story', 'In BETA',              'done',        '#94C748', 8,  false),
('Story', 'Production Ready',     'done',        '#94C748', 9,  false),
('Story', 'In Production',        'done',        '#94C748', 10, false),

-- ===== REVIEW FLOW (5 statuses): Business Gap =====
('Business Gap', 'ToDo',     'todo',        '#DFE1E6', 0, true),
('Business Gap', 'In Review','in_progress', '#669DF1', 1, false),
('Business Gap', 'Re-Open',  'in_progress', '#669DF1', 2, false),
('Business Gap', 'Resolved', 'done',        '#94C748', 3, false),
('Business Gap', 'Closed',   'done',        '#94C748', 4, false),

-- ===== BUG/INCIDENT FLOW (16 statuses): QA Bug, Production Incident =====
('QA Bug', 'ToDo',                'todo',        '#DFE1E6', 0,  true),
('QA Bug', 'Blocked',             'todo',        '#DFE1E6', 1,  false),
('QA Bug', 'Deferred for INT',    'todo',        '#DFE1E6', 2,  false),
('QA Bug', 'Implementation',      'in_progress', '#669DF1', 3,  false),
('QA Bug', 'Re-Open',             'in_progress', '#669DF1', 4,  false),
('QA Bug', 'Ready for QA',        'done',        '#94C748', 5,  false),
('QA Bug', 'Retest',              'done',        '#94C748', 6,  false),
('QA Bug', 'Awaiting Info',       'done',        '#94C748', 7,  false),
('QA Bug', 'UAT Ready',           'done',        '#94C748', 8,  false),
('QA Bug', 'BETA READY',          'done',        '#94C748', 9,  false),
('QA Bug', 'In BETA',             'done',        '#94C748', 10, false),
('QA Bug', 'Ready for production','done',        '#94C748', 11, false),
('QA Bug', 'In Production',       'done',        '#94C748', 12, false),
('QA Bug', 'Monitor',             'done',        '#94C748', 13, false),
('QA Bug', 'Rejected',            'done',        '#94C748', 14, false),
('QA Bug', 'Closed',              'done',        '#94C748', 15, false),

('Production Incident', 'ToDo',                'todo',        '#DFE1E6', 0,  true),
('Production Incident', 'Blocked',             'todo',        '#DFE1E6', 1,  false),
('Production Incident', 'Deferred for INT',    'todo',        '#DFE1E6', 2,  false),
('Production Incident', 'Implementation',      'in_progress', '#669DF1', 3,  false),
('Production Incident', 'Re-Open',             'in_progress', '#669DF1', 4,  false),
('Production Incident', 'Ready for QA',        'done',        '#94C748', 5,  false),
('Production Incident', 'Retest',              'done',        '#94C748', 6,  false),
('Production Incident', 'Awaiting Info',       'done',        '#94C748', 7,  false),
('Production Incident', 'UAT Ready',           'done',        '#94C748', 8,  false),
('Production Incident', 'BETA READY',          'done',        '#94C748', 9,  false),
('Production Incident', 'In BETA',             'done',        '#94C748', 10, false),
('Production Incident', 'Ready for production','done',        '#94C748', 11, false),
('Production Incident', 'In Production',       'done',        '#94C748', 12, false),
('Production Incident', 'Monitor',             'done',        '#94C748', 13, false),
('Production Incident', 'Rejected',            'done',        '#94C748', 14, false),
('Production Incident', 'Closed',              'done',        '#94C748', 15, false),

-- ===== API REQUIREMENT FLOW (9 statuses) =====
('API Requirement', 'Demand Intake',      'todo',        '#DFE1E6', 0, true),
('API Requirement', 'Demand validation',  'todo',        '#DFE1E6', 1, false),
('API Requirement', 'Blocked',            'todo',        '#DFE1E6', 2, false),
('API Requirement', 'Entity Input',       'in_progress', '#669DF1', 3, false),
('API Requirement', 'Ready for Entity',   'in_progress', '#669DF1', 4, false),
('API Requirement', 'Ready to Implement', 'in_progress', '#669DF1', 5, false),
('API Requirement', 'Implementation',     'in_progress', '#669DF1', 6, false),
('API Requirement', 'Internal QA',        'in_progress', '#669DF1', 7, false),
('API Requirement', 'Done',               'done',        '#94C748', 8, false),

-- ===== PRODUCT MODULE: Business Request, BRD Task =====
('Business Request', 'New Demand',                    'todo',        '#DFE1E6', 0, true),
('Business Request', 'Demand Analysis',               'in_progress', '#669DF1', 1, false),
('Business Request', 'RFP and RFQ',                   'in_progress', '#669DF1', 2, false),
('Business Request', 'Document business requirement', 'in_progress', '#669DF1', 3, false),
('Business Request', 'vendor onboarding',             'in_progress', '#669DF1', 4, false),
('Business Request', 'Ready for implementation',      'in_progress', '#669DF1', 5, false),
('Business Request', 'initiate project',              'done',        '#94C748', 6, false),

('BRD Task', 'BRD Under Review',     'todo',        '#DFE1E6', 0, true),
('BRD Task', 'Requirement Gathering','in_progress', '#669DF1', 1, false),
('BRD Task', 'BRD Preparation',      'in_progress', '#669DF1', 2, false),
('BRD Task', 'BRD Sign Off',         'in_progress', '#669DF1', 3, false),
('BRD Task', 'Done',                 'done',        '#94C748', 4, false)

ON CONFLICT (work_item_type, status_name) DO NOTHING;


-- 3. Seeding function: inserts default statuses + type wiring for a new project
CREATE OR REPLACE FUNCTION public.fn_seed_project_workflow(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec       RECORD;
  v_status_id UUID;
BEGIN
  -- Insert unique status names for this project (DISTINCT ON dedupes shared status names)
  INSERT INTO ph_workflow_statuses (project_id, name, category, color, position, is_default)
  SELECT DISTINCT ON (d.status_name)
    p_project_id,
    d.status_name,
    d.status_category,
    d.status_color,
    d.position,
    true
  FROM ph_workflow_defaults d
  ORDER BY d.status_name, d.position
  ON CONFLICT (project_id, name) DO NOTHING;

  -- Wire each (work_item_type, status) pair
  FOR v_rec IN
    SELECT work_item_type, status_name, position, is_initial
    FROM ph_workflow_defaults
    ORDER BY work_item_type, position
  LOOP
    SELECT id INTO v_status_id
    FROM ph_workflow_statuses
    WHERE project_id = p_project_id AND name = v_rec.status_name;

    IF v_status_id IS NOT NULL THEN
      INSERT INTO ph_workflow_type_statuses
        (project_id, work_item_type, status_id, position, is_initial)
      VALUES
        (p_project_id, v_rec.work_item_type, v_status_id, v_rec.position, v_rec.is_initial)
      ON CONFLICT (project_id, work_item_type, status_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;


-- 4. Reset function: clears type-status wiring then re-seeds from defaults
CREATE OR REPLACE FUNCTION public.fn_reset_project_workflow(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ph_workflow_type_statuses WHERE project_id = p_project_id;
  PERFORM fn_seed_project_workflow(p_project_id);
END;
$$;


-- 5. Export function: snapshots current project workflow back into ph_workflow_defaults
CREATE OR REPLACE FUNCTION public.fn_export_project_as_default(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ph_workflow_defaults
    (work_item_type, status_name, status_category, status_color, position, is_initial)
  SELECT
    ts.work_item_type,
    s.name,
    s.category,
    s.color,
    ts.position,
    ts.is_initial
  FROM ph_workflow_type_statuses ts
  JOIN ph_workflow_statuses s ON s.id = ts.status_id
  WHERE ts.project_id = p_project_id
    AND s.archived_at IS NULL
  ON CONFLICT (work_item_type, status_name) DO UPDATE
    SET status_category = EXCLUDED.status_category,
        status_color    = EXCLUDED.status_color,
        position        = EXCLUDED.position,
        is_initial      = EXCLUDED.is_initial;
END;
$$;


-- 6. Trigger: auto-seed workflow when a new ph_project is created
CREATE OR REPLACE FUNCTION public.trigger_seed_project_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_seed_project_workflow(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ph_project_created_seed_workflow ON public.ph_projects;

CREATE TRIGGER on_ph_project_created_seed_workflow
  AFTER INSERT ON public.ph_projects
  FOR EACH ROW EXECUTE FUNCTION public.trigger_seed_project_workflow();
