
-- ============================================================================
-- STEP 1: Create Initiative Types Lookup Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS initiative_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📁',
  color_token TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE initiative_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "initiative_types_read" ON initiative_types
  FOR SELECT USING (true);

INSERT INTO initiative_types (key, label, description, icon, color_token, color_hex, sort_order) VALUES
  ('project', 'Project', 'Large strategic initiative with dedicated team and budget. Typically 3-12 months.', '📁', 'primary', '#2563EB', 1),
  ('enhancement', 'Enhancement', 'Significant improvement to existing capability. Adds new functionality. Typically 1-3 months.', '⚡', 'teal', '#0D9488', 2),
  ('improvement', 'Improvement', 'Optimization or refinement of existing process or feature. Typically 1-4 weeks.', '🔧', 'warning', '#D97706', 3)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- STEP 2: ALTER initiatives table — Add new columns
-- ============================================================================
ALTER TABLE initiatives 
  ADD COLUMN IF NOT EXISTS initiative_type_id UUID REFERENCES initiative_types(id);

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS on_roadmap BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS roadmap_added_at TIMESTAMPTZ;

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS roadmap_added_by UUID;

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS business_value TEXT CHECK (business_value IN ('high', 'medium', 'low'));

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(15,2);

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS roadmap_priority INT;

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'on_track' 
  CHECK (health_status IN ('on_track', 'at_risk', 'off_track'));

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- ============================================================================
-- STEP 3: Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_initiatives_on_roadmap 
  ON initiatives(on_roadmap) WHERE on_roadmap = true;

CREATE INDEX IF NOT EXISTS idx_initiatives_type 
  ON initiatives(initiative_type_id);

CREATE INDEX IF NOT EXISTS idx_initiatives_roadmap_priority 
  ON initiatives(roadmap_priority) WHERE on_roadmap = true;

-- ============================================================================
-- STEP 4: Views (adapted to actual column names: name instead of title)
-- ============================================================================
CREATE OR REPLACE VIEW ph_roadmap_initiatives_view AS
SELECT 
  i.*,
  it.key AS initiative_type_key,
  it.label AS initiative_type_label,
  it.icon AS initiative_type_icon,
  it.color_token AS initiative_type_color_token,
  it.color_hex AS initiative_type_color_hex
FROM initiatives i
LEFT JOIN initiative_types it ON i.initiative_type_id = it.id
WHERE i.on_roadmap = true
ORDER BY i.roadmap_priority ASC NULLS LAST, i.created_at ASC;

CREATE OR REPLACE VIEW ph_backlog_initiatives_view AS
SELECT 
  i.*,
  it.key AS initiative_type_key,
  it.label AS initiative_type_label,
  it.icon AS initiative_type_icon,
  it.color_token AS initiative_type_color_token,
  it.color_hex AS initiative_type_color_hex
FROM initiatives i
LEFT JOIN initiative_types it ON i.initiative_type_id = it.id
ORDER BY i.created_at DESC;

CREATE OR REPLACE VIEW ph_roadmap_summary_view AS
SELECT
  COUNT(*) FILTER (WHERE i.on_roadmap = true) AS total_on_roadmap,
  COUNT(*) FILTER (WHERE i.on_roadmap = false) AS total_not_on_roadmap,
  COUNT(*) AS total_initiatives,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND it.key = 'project') AS roadmap_projects,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND it.key = 'enhancement') AS roadmap_enhancements,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND it.key = 'improvement') AS roadmap_improvements,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND i.health_status = 'on_track') AS roadmap_on_track,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND i.health_status = 'at_risk') AS roadmap_at_risk,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND i.health_status = 'off_track') AS roadmap_off_track
FROM initiatives i
LEFT JOIN initiative_types it ON i.initiative_type_id = it.id;

-- ============================================================================
-- STEP 5: RPC Functions (adapted: name instead of title)
-- ============================================================================
CREATE OR REPLACE FUNCTION promote_to_roadmap(
  p_initiative_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_initiative_type_key TEXT DEFAULT NULL,
  p_roadmap_priority INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type_id UUID;
  v_result JSONB;
BEGIN
  IF p_initiative_type_key IS NOT NULL THEN
    SELECT id INTO v_type_id FROM initiative_types WHERE key = p_initiative_type_key;
  END IF;

  UPDATE initiatives SET
    on_roadmap = true,
    roadmap_added_at = now(),
    roadmap_added_by = COALESCE(p_user_id, roadmap_added_by),
    initiative_type_id = COALESCE(v_type_id, initiative_type_id),
    roadmap_priority = COALESCE(p_roadmap_priority, roadmap_priority),
    updated_at = now()
  WHERE id = p_initiative_id
  RETURNING jsonb_build_object(
    'id', id,
    'name', name,
    'on_roadmap', on_roadmap,
    'roadmap_added_at', roadmap_added_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION remove_from_roadmap(
  p_initiative_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE initiatives SET
    on_roadmap = false,
    roadmap_added_at = NULL,
    roadmap_added_by = NULL,
    roadmap_priority = NULL,
    updated_at = now()
  WHERE id = p_initiative_id
  RETURNING jsonb_build_object(
    'id', id,
    'name', name,
    'on_roadmap', on_roadmap
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- STEP 6: Seed — Set types & roadmap status for existing initiatives
-- ============================================================================
DO $$
DECLARE
  v_project_id UUID;
  v_enhancement_id UUID;
  v_improvement_id UUID;
BEGIN
  SELECT id INTO v_project_id FROM initiative_types WHERE key = 'project';
  SELECT id INTO v_enhancement_id FROM initiative_types WHERE key = 'enhancement';
  SELECT id INTO v_improvement_id FROM initiative_types WHERE key = 'improvement';

  -- Projects
  UPDATE initiatives SET initiative_type_id = v_project_id 
  WHERE name ILIKE '%Digital Transformation%' 
     OR name ILIKE '%Core Banking%'
     OR name ILIKE '%Cloud Migration%'
     OR name ILIKE '%Security Operations%'
     OR name ILIKE '%Payment Gateway%'
     OR name ILIKE '%Vendor Management%'
     OR name ILIKE '%Enterprise Content%'
     OR name ILIKE '%Investor Onboarding%'
     OR name ILIKE '%Unified Digital Services%'
     OR name ILIKE '%Integrated Payment%';

  -- Enhancements
  UPDATE initiatives SET initiative_type_id = v_enhancement_id
  WHERE name ILIKE '%Customer Experience Platform%'
     OR name ILIKE '%API Gateway%'
     OR name ILIKE '%Employee Self-Service%'
     OR name ILIKE '%Customer 360%'
     OR name ILIKE '%Real-time Fraud%'
     OR name ILIKE '%Supply Chain%'
     OR name ILIKE '%Mobile App%';

  -- Improvements
  UPDATE initiatives SET initiative_type_id = v_improvement_id
  WHERE name ILIKE '%Data Analytics%'
     OR name ILIKE '%Compliance Reporting%'
     OR name ILIKE '%HR Performance%'
     OR name ILIKE '%DevOps Pipeline%';

  -- Promote strategic items to roadmap
  UPDATE initiatives SET 
    on_roadmap = true,
    roadmap_added_at = now()
  WHERE name ILIKE '%Digital Transformation%'
     OR name ILIKE '%Core Banking%'
     OR name ILIKE '%Customer Experience Platform%'
     OR name ILIKE '%Data Analytics%'
     OR name ILIKE '%API Gateway%'
     OR name ILIKE '%Compliance Reporting%'
     OR name ILIKE '%Cloud Migration%'
     OR name ILIKE '%Security Operations%'
     OR name ILIKE '%Payment Gateway%'
     OR name ILIKE '%Customer 360%'
     OR name ILIKE '%DevOps Pipeline%'
     OR name ILIKE '%Investor Onboarding%';
END $$;

-- ============================================================================
-- STEP 7: Grants
-- ============================================================================
GRANT SELECT ON initiative_types TO anon, authenticated;
GRANT SELECT ON ph_roadmap_initiatives_view TO anon, authenticated;
GRANT SELECT ON ph_backlog_initiatives_view TO anon, authenticated;
GRANT SELECT ON ph_roadmap_summary_view TO anon, authenticated;
GRANT EXECUTE ON FUNCTION promote_to_roadmap TO authenticated;
GRANT EXECUTE ON FUNCTION remove_from_roadmap TO authenticated;
