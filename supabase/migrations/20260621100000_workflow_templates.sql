-- Workflow Template Layer
-- Adds global template tables + apply/push functions.
-- Runtime (ph_workflow_type_statuses, ph_workflow_transitions) unchanged.
-- Templates only consulted at seeding / admin "Apply template" action.

-- ── 1. TEMPLATE TABLES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ph_workflow_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  work_item_type TEXT NOT NULL,        -- 'Story' | 'Epic' | 'BRD Task' etc.
  description   TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, work_item_type)
);
COMMENT ON TABLE ph_workflow_templates IS
  'Global workflow templates — not project-scoped. Applied to projects via fn_apply_workflow_template.';

CREATE TABLE IF NOT EXISTS ph_workflow_template_statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES ph_workflow_templates(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('todo','in_progress','done')),
  color       TEXT NOT NULL DEFAULT '#DDDEE1',
  position    INT  NOT NULL DEFAULT 0,
  is_initial  BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_wf_tmpl_statuses_tmpl ON ph_workflow_template_statuses(template_id);
COMMENT ON TABLE ph_workflow_template_statuses IS
  'Status definitions inside a template. Identified by name, not UUID.';

CREATE TABLE IF NOT EXISTS ph_workflow_template_transitions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      UUID NOT NULL REFERENCES ph_workflow_templates(id) ON DELETE CASCADE,
  from_status_name TEXT,               -- NULL = "any status" global transition
  to_status_name   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wf_tmpl_trans_tmpl ON ph_workflow_template_transitions(template_id);
COMMENT ON TABLE ph_workflow_template_transitions IS
  'Transitions inside a template — keyed by status name, not UUID.
   Resolved to project status UUIDs when template is applied.';

-- Tracks which template each (project × work_item_type) derives from.
CREATE TABLE IF NOT EXISTS ph_project_workflow_assignments (
  project_id    UUID NOT NULL,
  work_item_type TEXT NOT NULL,
  template_id   UUID REFERENCES ph_workflow_templates(id) ON DELETE SET NULL,
  is_customized BOOLEAN NOT NULL DEFAULT false,
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, work_item_type)
);
COMMENT ON TABLE ph_project_workflow_assignments IS
  'One row per (project, work_item_type). is_customized=true means the project
   workflow has diverged from its template since last apply.';

-- ── 2. RLS ────────────────────────────────────────────────────────────────

ALTER TABLE ph_workflow_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_workflow_template_statuses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_workflow_template_transitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_project_workflow_assignments   ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read templates (non-PII config data)
CREATE POLICY "templates_select_all" ON ph_workflow_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "template_statuses_select_all" ON ph_workflow_template_statuses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "template_transitions_select_all" ON ph_workflow_template_transitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "assignments_select_all" ON ph_project_workflow_assignments
  FOR SELECT TO authenticated USING (true);

-- Only admins can mutate templates
CREATE POLICY "templates_write_admin" ON ph_workflow_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));
CREATE POLICY "template_statuses_write_admin" ON ph_workflow_template_statuses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));
CREATE POLICY "template_transitions_write_admin" ON ph_workflow_template_transitions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));
CREATE POLICY "assignments_write_admin" ON ph_project_workflow_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- ── 3. fn_apply_workflow_template ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_apply_workflow_template(
  p_template_id   UUID,
  p_project_id    UUID,
  p_work_item_type TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts  RECORD;
  tt  RECORD;
  s_id UUID;
BEGIN
  -- 1. Ensure every template status exists in project's status pool
  FOR ts IN
    SELECT name, category, color, position, is_initial
    FROM ph_workflow_template_statuses
    WHERE template_id = p_template_id
    ORDER BY position
  LOOP
    -- Insert into pool if not present (case-insensitive match)
    INSERT INTO ph_workflow_statuses (id, project_id, name, category, color, position, is_default)
      SELECT gen_random_uuid(), p_project_id, ts.name, ts.category, ts.color, ts.position, false
      WHERE NOT EXISTS (
        SELECT 1 FROM ph_workflow_statuses
        WHERE project_id = p_project_id AND LOWER(name) = LOWER(ts.name) AND archived_at IS NULL
      );
  END LOOP;

  -- 2. Replace type-status assignments
  DELETE FROM ph_workflow_type_statuses
    WHERE project_id = p_project_id AND work_item_type = p_work_item_type;

  INSERT INTO ph_workflow_type_statuses (project_id, work_item_type, status_id, position, is_initial)
    SELECT p_project_id, p_work_item_type, ws.id, ts.position, ts.is_initial
    FROM ph_workflow_template_statuses ts
    JOIN ph_workflow_statuses ws ON ws.project_id = p_project_id
      AND LOWER(ws.name) = LOWER(ts.name) AND ws.archived_at IS NULL
    WHERE ts.template_id = p_template_id
    ORDER BY ts.position;

  -- 3. Replace type-specific transitions
  DELETE FROM ph_workflow_transitions
    WHERE project_id = p_project_id AND work_item_type = p_work_item_type;

  FOR tt IN
    SELECT from_status_name, to_status_name
    FROM ph_workflow_template_transitions
    WHERE template_id = p_template_id
  LOOP
    DECLARE
      v_from UUID := NULL;
      v_to   UUID;
    BEGIN
      -- Resolve from_status_name → project status UUID
      IF tt.from_status_name IS NOT NULL THEN
        SELECT ws.id INTO v_from
        FROM ph_workflow_statuses ws
        WHERE ws.project_id = p_project_id
          AND LOWER(ws.name) = LOWER(tt.from_status_name)
          AND ws.archived_at IS NULL
        LIMIT 1;
        IF NOT FOUND THEN CONTINUE; END IF;
      END IF;

      SELECT ws.id INTO v_to
      FROM ph_workflow_statuses ws
      WHERE ws.project_id = p_project_id
        AND LOWER(ws.name) = LOWER(tt.to_status_name)
        AND ws.archived_at IS NULL
      LIMIT 1;
      IF NOT FOUND THEN CONTINUE; END IF;

      INSERT INTO ph_workflow_transitions (project_id, work_item_type, from_status_id, to_status_id)
        VALUES (p_project_id, p_work_item_type, v_from, v_to)
        ON CONFLICT DO NOTHING;
    END;
  END LOOP;

  -- 4. Record assignment
  INSERT INTO ph_project_workflow_assignments (project_id, work_item_type, template_id, is_customized, applied_at)
    VALUES (p_project_id, p_work_item_type, p_template_id, false, NOW())
    ON CONFLICT (project_id, work_item_type) DO UPDATE
      SET template_id = p_template_id, is_customized = false, applied_at = NOW();
END;
$$;

-- ── 4. fn_push_template_to_projects ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_push_template_to_projects(
  p_template_id UUID
) RETURNS TABLE(project_id UUID, work_item_type TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a RECORD;
BEGIN
  FOR a IN
    SELECT pa.project_id, pa.work_item_type
    FROM ph_project_workflow_assignments pa
    WHERE pa.template_id = p_template_id
      AND pa.is_customized = false
  LOOP
    PERFORM public.fn_apply_workflow_template(p_template_id, a.project_id, a.work_item_type);
    project_id    := a.project_id;
    work_item_type := a.work_item_type;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.fn_apply_workflow_template IS
  'Applies a workflow template to a project type. Idempotent — safe to call multiple times.
   Creates missing statuses in project pool, replaces type-status and transition rows.';
COMMENT ON FUNCTION public.fn_push_template_to_projects IS
  'Pushes template changes to every non-customized project that uses this template.
   Returns one row per updated (project_id, work_item_type).';

-- ── 5. SEED DEFAULT TEMPLATES from existing BAU workflows ────────────────

DO $$
DECLARE
  v_bau UUID;
  v_tmpl_br UUID; v_tmpl_brd UUID; v_tmpl_story UUID;
  -- Business Request status IDs
  s_new UUID; s_intake UUID; s_dval UUID; s_pappr UUID; s_pbl UUID;
  s_analysis UUID; s_impl UUID; s_rqa UUID; s_puat UUID; s_rprod UUID;
  s_onhold UUID; s_done UUID; s_canceled UUID;
  -- BRD Task status IDs
  s_brd_bl UUID; s_figma UUID; s_brd_prep UUID; s_brd_rev UUID;
  s_brd_so UUID; s_rimpl UUID; s_blocked UUID;
  -- Story status IDs
  s_req UUID; s_design UUID; s_rfd UUID; s_dev UUID; s_qa UUID;
  s_uat UUID; s_beta UUID; s_prodready UUID; s_betaready UUID;
  s_inprod UUID; s_st_onhold UUID;
BEGIN
  SELECT id INTO v_bau FROM ph_projects WHERE key = 'BAU' LIMIT 1;
  IF v_bau IS NULL THEN RAISE NOTICE 'BAU project not found — skipping template seed'; RETURN; END IF;

  -- ── Business Request template ─────────────────────────────────────────
  INSERT INTO ph_workflow_templates (name, work_item_type, description, is_default)
    VALUES ('Business Request Default', 'Business Request', 'Standard BR lifecycle: intake → analysis → implementation → UAT → done', true)
    ON CONFLICT (name, work_item_type) DO NOTHING;
  SELECT id INTO v_tmpl_br FROM ph_workflow_templates WHERE name = 'Business Request Default' AND work_item_type = 'Business Request';

  IF NOT EXISTS (SELECT 1 FROM ph_workflow_template_statuses WHERE template_id = v_tmpl_br) THEN
    INSERT INTO ph_workflow_template_statuses (template_id, name, category, color, position, is_initial) VALUES
      (v_tmpl_br,'New','todo','#DDDEE1',0,true),
      (v_tmpl_br,'Demand Intake','todo','#DDDEE1',1,false),
      (v_tmpl_br,'Demand Validation','todo','#DDDEE1',2,false),
      (v_tmpl_br,'Pending Approval','todo','#DDDEE1',3,false),
      (v_tmpl_br,'Prioritized Backlog','todo','#DDDEE1',4,false),
      (v_tmpl_br,'Analysis & Design','in_progress','#8FB8F6',5,false),
      (v_tmpl_br,'Implementation','in_progress','#8FB8F6',6,false),
      (v_tmpl_br,'Review & QA','in_progress','#8FB8F6',7,false),
      (v_tmpl_br,'Pending UAT/Beta','in_progress','#8FB8F6',8,false),
      (v_tmpl_br,'Ready for Production','done','#94C748',9,false),
      (v_tmpl_br,'On Hold','todo','#DDDEE1',10,false),
      (v_tmpl_br,'Done','done','#94C748',11,false),
      (v_tmpl_br,'Canceled','done','#94C748',12,false);
    INSERT INTO ph_workflow_template_transitions (template_id, from_status_name, to_status_name) VALUES
      (v_tmpl_br,'New','Demand Intake'),
      (v_tmpl_br,'Demand Intake','Demand Validation'),(v_tmpl_br,'Demand Intake','Analysis & Design'),
      (v_tmpl_br,'Demand Validation','Pending Approval'),(v_tmpl_br,'Demand Validation','Prioritized Backlog'),
      (v_tmpl_br,'Pending Approval','Prioritized Backlog'),(v_tmpl_br,'Pending Approval','Analysis & Design'),
      (v_tmpl_br,'Prioritized Backlog','Analysis & Design'),(v_tmpl_br,'Analysis & Design','Implementation'),
      (v_tmpl_br,'Implementation','Demand Validation'),(v_tmpl_br,'Implementation','Prioritized Backlog'),
      (v_tmpl_br,'Implementation','Review & QA'),(v_tmpl_br,'Review & QA','Implementation'),
      (v_tmpl_br,'Review & QA','Pending UAT/Beta'),(v_tmpl_br,'Pending UAT/Beta','Review & QA'),
      (v_tmpl_br,'Pending UAT/Beta','Ready for Production'),(v_tmpl_br,'Ready for Production','Done'),
      (v_tmpl_br,NULL,'On Hold'),(v_tmpl_br,NULL,'Done'),(v_tmpl_br,NULL,'Canceled');
  END IF;

  -- ── BRD Task template ─────────────────────────────────────────────────
  INSERT INTO ph_workflow_templates (name, work_item_type, description, is_default)
    VALUES ('BRD Task Default', 'BRD Task', 'Standard BRD documentation lifecycle: backlog → design → review → sign-off', true)
    ON CONFLICT (name, work_item_type) DO NOTHING;
  SELECT id INTO v_tmpl_brd FROM ph_workflow_templates WHERE name = 'BRD Task Default' AND work_item_type = 'BRD Task';

  IF NOT EXISTS (SELECT 1 FROM ph_workflow_template_statuses WHERE template_id = v_tmpl_brd) THEN
    INSERT INTO ph_workflow_template_statuses (template_id, name, category, color, position, is_initial) VALUES
      (v_tmpl_brd,'BRD Backlog','todo','#DDDEE1',0,true),
      (v_tmpl_brd,'Figma Design','todo','#DDDEE1',1,false),
      (v_tmpl_brd,'BRD Preparation','in_progress','#8FB8F6',2,false),
      (v_tmpl_brd,'BRD Under Review','todo','#DDDEE1',3,false),
      (v_tmpl_brd,'Demand Validation','todo','#DDDEE1',4,false),
      (v_tmpl_brd,'BRD Sign Off','in_progress','#8FB8F6',5,false),
      (v_tmpl_brd,'Ready for Implementation','in_progress','#8FB8F6',6,false),
      (v_tmpl_brd,'Blocked','todo','#DDDEE1',7,false),
      (v_tmpl_brd,'Canceled','done','#94C748',8,false),
      (v_tmpl_brd,'Done','done','#94C748',9,false);
    INSERT INTO ph_workflow_template_transitions (template_id, from_status_name, to_status_name) VALUES
      (v_tmpl_brd,'BRD Backlog','Figma Design'),(v_tmpl_brd,'BRD Backlog','Ready for Implementation'),
      (v_tmpl_brd,'Figma Design','BRD Preparation'),(v_tmpl_brd,'BRD Preparation','BRD Under Review'),
      (v_tmpl_brd,'BRD Under Review','Demand Validation'),(v_tmpl_brd,'BRD Under Review','Figma Design'),
      (v_tmpl_brd,'Demand Validation','BRD Sign Off'),(v_tmpl_brd,'Demand Validation','Figma Design'),
      (v_tmpl_brd,'BRD Sign Off','Ready for Implementation'),(v_tmpl_brd,'BRD Sign Off','Figma Design'),
      (v_tmpl_brd,'BRD Sign Off','Done'),(v_tmpl_brd,'Ready for Implementation','Done'),
      (v_tmpl_brd,NULL,'Blocked'),(v_tmpl_brd,NULL,'Canceled'),(v_tmpl_brd,NULL,'Done');
  END IF;

  -- ── Story template ────────────────────────────────────────────────────
  INSERT INTO ph_workflow_templates (name, work_item_type, description, is_default)
    VALUES ('Story SDLC', 'Story', 'Full SDLC story lifecycle: requirements → design → dev → QA → UAT → beta → production', true)
    ON CONFLICT (name, work_item_type) DO NOTHING;
  SELECT id INTO v_tmpl_story FROM ph_workflow_templates WHERE name = 'Story SDLC' AND work_item_type = 'Story';

  IF NOT EXISTS (SELECT 1 FROM ph_workflow_template_statuses WHERE template_id = v_tmpl_story) THEN
    INSERT INTO ph_workflow_template_statuses (template_id, name, category, color, position, is_initial) VALUES
      (v_tmpl_story,'In Requirements','todo','#DDDEE1',0,true),
      (v_tmpl_story,'In Design','todo','#DDDEE1',1,false),
      (v_tmpl_story,'Ready for Development','in_progress','#8FB8F6',2,false),
      (v_tmpl_story,'In Development','in_progress','#8FB8F6',3,false),
      (v_tmpl_story,'In QA','in_progress','#8FB8F6',4,false),
      (v_tmpl_story,'In UAT','in_progress','#8FB8F6',5,false),
      (v_tmpl_story,'In BETA','in_progress','#8FB8F6',6,false),
      (v_tmpl_story,'Production Ready','done','#94C748',7,false),
      (v_tmpl_story,'BETA READY','done','#94C748',8,false),
      (v_tmpl_story,'In Production','done','#94C748',9,false),
      (v_tmpl_story,'On Hold','todo','#DDDEE1',10,false);
    INSERT INTO ph_workflow_template_transitions (template_id, from_status_name, to_status_name) VALUES
      (v_tmpl_story,'In Requirements','In Design'),
      (v_tmpl_story,'In Requirements','Ready for Development'),
      (v_tmpl_story,'In Design','In Requirements'),
      (v_tmpl_story,'In Design','Ready for Development'),
      (v_tmpl_story,'Ready for Development','In Development'),
      (v_tmpl_story,'In Development','Ready for Development'),
      (v_tmpl_story,'In Development','In QA'),
      (v_tmpl_story,'In Development','On Hold'),
      (v_tmpl_story,'In QA','In Development'),
      (v_tmpl_story,'In QA','In UAT'),
      (v_tmpl_story,'In UAT','In BETA'),
      (v_tmpl_story,'In BETA','In UAT'),
      (v_tmpl_story,'In BETA','Production Ready'),
      (v_tmpl_story,'In BETA','BETA READY'),
      (v_tmpl_story,'In BETA','In Production'),
      (v_tmpl_story,'BETA READY','In BETA'),
      (v_tmpl_story,'BETA READY','Production Ready'),
      (v_tmpl_story,'Production Ready','In Production'),
      (v_tmpl_story,'In Production','In BETA'),
      (v_tmpl_story,'On Hold','In Development');
  END IF;

  -- Mark BAU's existing Story/BR/BRD workflows as originating from their templates
  INSERT INTO ph_project_workflow_assignments (project_id, work_item_type, template_id, is_customized, applied_at)
    VALUES
      (v_bau, 'Business Request', v_tmpl_br, false, NOW()),
      (v_bau, 'BRD Task', v_tmpl_brd, false, NOW()),
      (v_bau, 'Story', v_tmpl_story, false, NOW())
    ON CONFLICT (project_id, work_item_type) DO UPDATE
      SET template_id = EXCLUDED.template_id, applied_at = NOW();

END $$;
