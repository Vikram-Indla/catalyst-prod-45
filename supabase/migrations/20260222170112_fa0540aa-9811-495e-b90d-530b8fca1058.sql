
-- ═══════════════════════════════════════════════════════════════════════════════
-- CATALYST — Resource 360° View  |  G03 SDLC Schema (Fixed)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. DEPARTMENTS
CREATE TABLE r360_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_r360_departments_code ON r360_departments(dept_code) WHERE deleted_at IS NULL;
ALTER TABLE r360_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_departments_read" ON r360_departments FOR SELECT USING (deleted_at IS NULL);

-- 2. VENDORS
CREATE TABLE r360_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_r360_vendors_code ON r360_vendors(vendor_code) WHERE deleted_at IS NULL;
ALTER TABLE r360_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_vendors_read" ON r360_vendors FOR SELECT USING (deleted_at IS NULL);

-- 3. ASSIGNMENTS
CREATE TABLE r360_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_r360_assignments_code ON r360_assignments(assignment_code) WHERE deleted_at IS NULL;
ALTER TABLE r360_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_assignments_read" ON r360_assignments FOR SELECT USING (deleted_at IS NULL);

-- 4. RESOURCES
CREATE TABLE r360_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rid VARCHAR(10) NOT NULL UNIQUE,
  user_id UUID,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  avatar_url TEXT,
  initials VARCHAR(4),
  job_role VARCHAR(100) NOT NULL,
  department_id UUID NOT NULL REFERENCES r360_departments(id),
  assignment_id UUID REFERENCES r360_assignments(id),
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('Fixed','Variable','Freelance')),
  vendor_id UUID NOT NULL REFERENCES r360_vendors(id),
  country VARCHAR(60) NOT NULL,
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('Onsite','Off-Shore','Hybrid')),
  ctc NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_contract_dates CHECK (contract_end > contract_start)
);
CREATE INDEX idx_r360_resources_dept ON r360_resources(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_resources_vendor ON r360_resources(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_resources_assign ON r360_resources(assignment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_resources_active ON r360_resources(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_resources_rid ON r360_resources(rid) WHERE deleted_at IS NULL;
ALTER TABLE r360_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_resources_read" ON r360_resources FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "r360_resources_self" ON r360_resources FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. RELEASES
CREATE TABLE r360_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_key VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Planning' CHECK (status IN ('Planning','In Progress','Released','Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_release_dates CHECK (end_date > start_date)
);
CREATE INDEX idx_r360_releases_key ON r360_releases(release_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_releases_status ON r360_releases(status) WHERE deleted_at IS NULL;
ALTER TABLE r360_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_releases_read" ON r360_releases FOR SELECT USING (deleted_at IS NULL);

-- 6. PROJECTS
CREATE TABLE r360_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE r360_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_projects_read" ON r360_projects FOR SELECT USING (deleted_at IS NULL);

-- 7. ENUMS
CREATE TYPE r360_hub AS ENUM ('StrategyHub','ProductHub','ProjectHub','ReleaseHub','TestHub','IncidentHub','TaskHub');
CREATE TYPE r360_work_item_type AS ENUM ('Initiative','Epic','Feature','Story','Subtask','Bug','Task','Test Case','Test Plan','Incident','Release','Requirement');
CREATE TYPE r360_status_category AS ENUM ('todo','progress','done');
CREATE TYPE r360_priority AS ENUM ('Critical','High','Medium','Low');
CREATE TYPE r360_resource_role AS ENUM ('assigned','reported');

-- 7b. WORK ITEMS (age_days computed in views, not as generated column)
CREATE TABLE r360_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  work_item_type r360_work_item_type NOT NULL,
  source_hub r360_hub NOT NULL,
  status VARCHAR(50) NOT NULL,
  status_category r360_status_category NOT NULL,
  priority r360_priority NOT NULL DEFAULT 'Medium',
  project_id UUID REFERENCES r360_projects(id),
  release_id UUID REFERENCES r360_releases(id),
  parent_item_id UUID REFERENCES r360_work_items(id),
  resource_id UUID NOT NULL REFERENCES r360_resources(id),
  resource_role r360_resource_role NOT NULL DEFAULT 'assigned',
  assigned_by UUID REFERENCES r360_resources(id),
  assigned_date DATE NOT NULL,
  due_date DATE,
  resolved_date DATE,
  source_table VARCHAR(100),
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_r360_wi_resource ON r360_work_items(resource_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_status_cat ON r360_work_items(status_category) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_hub ON r360_work_items(source_hub) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_type ON r360_work_items(work_item_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_release ON r360_work_items(release_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_project ON r360_work_items(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_priority ON r360_work_items(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_parent ON r360_work_items(parent_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_assigned_date ON r360_work_items(assigned_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_role ON r360_work_items(resource_role) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_assigned_by ON r360_work_items(assigned_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_item_key ON r360_work_items(item_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_source ON r360_work_items(source_table, source_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_resource_release ON r360_work_items(resource_id, release_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_resource_hub ON r360_work_items(resource_id, source_hub) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_wi_resource_status ON r360_work_items(resource_id, status_category) WHERE deleted_at IS NULL;

ALTER TABLE r360_work_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_work_items_read" ON r360_work_items FOR SELECT USING (deleted_at IS NULL);

-- 8. STATUS TRANSITIONS
CREATE TABLE r360_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES r360_work_items(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  from_category r360_status_category,
  to_category r360_status_category NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dwell_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX idx_r360_st_work_item ON r360_status_transitions(work_item_id);
CREATE INDEX idx_r360_st_date ON r360_status_transitions(transitioned_at DESC);
ALTER TABLE r360_status_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_status_transitions_read" ON r360_status_transitions FOR SELECT USING (true);

-- 9. AI PROFILES
CREATE TABLE r360_ai_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES r360_resources(id) UNIQUE,
  resource_pattern TEXT NOT NULL,
  delivery_summary TEXT,
  strength_analysis TEXT,
  delivery_metrics JSONB NOT NULL DEFAULT '{}',
  hub_distribution JSONB NOT NULL DEFAULT '{}',
  hub_closure_rates JSONB NOT NULL DEFAULT '{}',
  role_expectation JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generation_version VARCHAR(10) NOT NULL DEFAULT '2.0',
  next_refresh_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_r360_ai_resource ON r360_ai_profiles(resource_id) WHERE deleted_at IS NULL;
ALTER TABLE r360_ai_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_ai_profiles_read" ON r360_ai_profiles FOR SELECT USING (deleted_at IS NULL);

-- 10. BEHAVIORAL PATTERNS
CREATE TABLE r360_ai_behavioral_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES r360_resources(id),
  pattern_text TEXT NOT NULL,
  evidence_refs TEXT[],
  evidence_filter TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_r360_ai_bp_resource ON r360_ai_behavioral_patterns(resource_id) WHERE deleted_at IS NULL;
ALTER TABLE r360_ai_behavioral_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_ai_bp_read" ON r360_ai_behavioral_patterns FOR SELECT USING (deleted_at IS NULL);

-- 11. RELEASE STANDINGS (completion_pct computed in view, not generated column)
CREATE TABLE r360_ai_release_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES r360_resources(id),
  release_id UUID NOT NULL REFERENCES r360_releases(id),
  total_items INTEGER NOT NULL DEFAULT 0,
  done_count INTEGER NOT NULL DEFAULT 0,
  progress_count INTEGER NOT NULL DEFAULT 0,
  todo_count INTEGER NOT NULL DEFAULT 0,
  completion_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  project_standings JSONB NOT NULL DEFAULT '[]',
  critical_path_items JSONB NOT NULL DEFAULT '[]',
  verdict VARCHAR(20) NOT NULL DEFAULT 'on_track' CHECK (verdict IN ('on_track','at_risk','off_track')),
  verdict_text TEXT,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  current_closure_rate NUMERIC(5,2),
  required_closure_rate NUMERIC(5,2),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  UNIQUE(resource_id, release_id, snapshot_date)
);
CREATE INDEX idx_r360_rs_resource ON r360_ai_release_standings(resource_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_r360_rs_release ON r360_ai_release_standings(release_id) WHERE deleted_at IS NULL;
ALTER TABLE r360_ai_release_standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_ai_rs_read" ON r360_ai_release_standings FOR SELECT USING (deleted_at IS NULL);

-- Trigger to auto-compute completion_pct
CREATE OR REPLACE FUNCTION r360_compute_completion_pct()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_items > 0 THEN
    NEW.completion_pct = ROUND((NEW.done_count::NUMERIC / NEW.total_items) * 100, 2);
  ELSE
    NEW.completion_pct = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_r360_rs_completion
  BEFORE INSERT OR UPDATE ON r360_ai_release_standings
  FOR EACH ROW EXECUTE FUNCTION r360_compute_completion_pct();

-- 12. EXPORT HISTORY
CREATE TABLE r360_ai_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES r360_resources(id),
  export_date DATE NOT NULL DEFAULT CURRENT_DATE,
  export_format VARCHAR(10) NOT NULL DEFAULT 'pdf' CHECK (export_format IN ('pdf','docx','xlsx')),
  file_url TEXT,
  requested_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_r360_exports_resource ON r360_ai_exports(resource_id);
ALTER TABLE r360_ai_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_exports_read" ON r360_ai_exports FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW r360_resource_summary_view AS
SELECT
  r.id AS resource_id, r.full_name, r.job_role, r.rid,
  COUNT(wi.id) AS total_items,
  COUNT(wi.id) FILTER (WHERE wi.status_category = 'todo') AS todo_count,
  COUNT(wi.id) FILTER (WHERE wi.status_category = 'progress') AS progress_count,
  COUNT(wi.id) FILTER (WHERE wi.status_category = 'done') AS done_count
FROM r360_resources r
LEFT JOIN r360_work_items wi ON wi.resource_id = r.id AND wi.deleted_at IS NULL
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.full_name, r.job_role, r.rid;

CREATE OR REPLACE VIEW r360_work_items_enriched_view AS
SELECT
  wi.*,
  (COALESCE(wi.resolved_date, CURRENT_DATE) - wi.assigned_date) AS age_days,
  r.full_name AS resource_name,
  r.initials AS resource_initials,
  r.job_role AS resource_job_role,
  ab.full_name AS assigned_by_name,
  p.name AS project_name,
  p.project_key,
  rel.release_key,
  rel.end_date AS release_end_date,
  parent.item_key AS parent_item_key,
  COALESCE(wi.due_date, rel.end_date) AS effective_due_date,
  COALESCE(wi.due_date, rel.end_date) - CURRENT_DATE AS days_until_due
FROM r360_work_items wi
JOIN r360_resources r ON r.id = wi.resource_id
LEFT JOIN r360_resources ab ON ab.id = wi.assigned_by
LEFT JOIN r360_projects p ON p.id = wi.project_id
LEFT JOIN r360_releases rel ON rel.id = wi.release_id
LEFT JOIN r360_work_items parent ON parent.id = wi.parent_item_id
WHERE wi.deleted_at IS NULL;

CREATE OR REPLACE VIEW r360_resource_hub_distribution_view AS
SELECT
  wi.resource_id, wi.source_hub,
  COUNT(*) AS hub_item_count,
  ROUND(COUNT(*)::NUMERIC / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY wi.resource_id), 0) * 100, 1) AS hub_pct,
  COUNT(*) FILTER (WHERE wi.status_category = 'done') AS hub_done_count,
  ROUND(COUNT(*) FILTER (WHERE wi.status_category = 'done')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 0) AS hub_closure_pct
FROM r360_work_items wi
WHERE wi.deleted_at IS NULL
GROUP BY wi.resource_id, wi.source_hub;

CREATE OR REPLACE VIEW r360_chronology_events_view AS
SELECT wi.resource_id, 'assigned'::TEXT AS event_type, wi.assigned_date::TIMESTAMPTZ AS event_date,
  wi.id AS work_item_id, wi.item_key, wi.title, wi.work_item_type, wi.source_hub, wi.status_category,
  ab.full_name AS actor_name, rel.release_key
FROM r360_work_items wi
LEFT JOIN r360_resources ab ON ab.id = wi.assigned_by
LEFT JOIN r360_releases rel ON rel.id = wi.release_id
WHERE wi.deleted_at IS NULL
UNION ALL
SELECT wi.resource_id, 'status_change'::TEXT, st.transitioned_at,
  wi.id, wi.item_key, wi.title, wi.work_item_type, wi.source_hub, st.to_category,
  NULL, rel.release_key
FROM r360_status_transitions st
JOIN r360_work_items wi ON wi.id = st.work_item_id AND wi.deleted_at IS NULL
LEFT JOIN r360_releases rel ON rel.id = wi.release_id
UNION ALL
SELECT wi.resource_id, 'closed'::TEXT, wi.resolved_date::TIMESTAMPTZ,
  wi.id, wi.item_key, wi.title, wi.work_item_type, wi.source_hub, 'done'::r360_status_category,
  NULL, rel.release_key
FROM r360_work_items wi
LEFT JOIN r360_releases rel ON rel.id = wi.release_id
WHERE wi.deleted_at IS NULL AND wi.resolved_date IS NOT NULL;

CREATE OR REPLACE VIEW r360_gantt_view AS
SELECT wi.resource_id, wi.id AS work_item_id, wi.item_key, wi.title, wi.work_item_type, wi.status_category,
  wi.assigned_date AS bar_start, COALESCE(wi.resolved_date, CURRENT_DATE) AS bar_end,
  (COALESCE(wi.resolved_date, CURRENT_DATE) - wi.assigned_date) AS bar_days,
  rel.release_key, p.name AS project_name
FROM r360_work_items wi
LEFT JOIN r360_releases rel ON rel.id = wi.release_id
LEFT JOIN r360_projects p ON p.id = wi.project_id
WHERE wi.deleted_at IS NULL
ORDER BY wi.assigned_date;

CREATE OR REPLACE VIEW r360_constellation_view AS
SELECT r.id AS resource_id, r.full_name, r.initials, r.job_role, r.vendor_id, v.name AS vendor_name,
  COUNT(wi.id) AS total_items,
  COUNT(wi.id) FILTER (WHERE wi.status_category = 'done') AS done_items,
  COUNT(DISTINCT wi.project_id) AS project_count
FROM r360_resources r
LEFT JOIN r360_work_items wi ON wi.resource_id = r.id AND wi.deleted_at IS NULL
LEFT JOIN r360_vendors v ON v.id = r.vendor_id
WHERE r.deleted_at IS NULL AND r.is_active = true
GROUP BY r.id, r.full_name, r.initials, r.job_role, r.vendor_id, v.name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION r360_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_r360_resources_updated BEFORE UPDATE ON r360_resources FOR EACH ROW EXECUTE FUNCTION r360_set_updated_at();
CREATE TRIGGER trg_r360_work_items_updated BEFORE UPDATE ON r360_work_items FOR EACH ROW EXECUTE FUNCTION r360_set_updated_at();
CREATE TRIGGER trg_r360_ai_profiles_updated BEFORE UPDATE ON r360_ai_profiles FOR EACH ROW EXECUTE FUNCTION r360_set_updated_at();
CREATE TRIGGER trg_r360_departments_updated BEFORE UPDATE ON r360_departments FOR EACH ROW EXECUTE FUNCTION r360_set_updated_at();
CREATE TRIGGER trg_r360_vendors_updated BEFORE UPDATE ON r360_vendors FOR EACH ROW EXECUTE FUNCTION r360_set_updated_at();
CREATE TRIGGER trg_r360_releases_updated BEFORE UPDATE ON r360_releases FOR EACH ROW EXECUTE FUNCTION r360_set_updated_at();
CREATE TRIGGER trg_r360_assignments_updated BEFORE UPDATE ON r360_assignments FOR EACH ROW EXECUTE FUNCTION r360_set_updated_at();

CREATE OR REPLACE FUNCTION r360_effective_due_date(p_work_item_id UUID)
RETURNS DATE AS $$
  SELECT COALESCE(wi.due_date, rel.end_date)
  FROM r360_work_items wi
  LEFT JOIN r360_releases rel ON rel.id = wi.release_id
  WHERE wi.id = p_work_item_id;
$$ LANGUAGE sql STABLE;
