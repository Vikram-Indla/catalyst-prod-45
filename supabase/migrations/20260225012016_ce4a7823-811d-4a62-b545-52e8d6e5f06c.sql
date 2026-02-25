
-- Drop existing views that point to wrong table
DROP VIEW IF EXISTS ph_roadmap_initiatives_view CASCADE;
DROP VIEW IF EXISTS ph_backlog_initiatives_view CASCADE;
DROP VIEW IF EXISTS ph_roadmap_summary_view CASCADE;

-- STEP 1: Add columns to ph_initiatives (idempotent)
ALTER TABLE ph_initiatives 
  ADD COLUMN IF NOT EXISTS initiative_type_id UUID REFERENCES initiative_types(id);
ALTER TABLE ph_initiatives
  ADD COLUMN IF NOT EXISTS on_roadmap BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ph_initiatives
  ADD COLUMN IF NOT EXISTS roadmap_added_at TIMESTAMPTZ;
ALTER TABLE ph_initiatives
  ADD COLUMN IF NOT EXISTS roadmap_added_by UUID;
ALTER TABLE ph_initiatives
  ADD COLUMN IF NOT EXISTS business_value TEXT CHECK (business_value IN ('high', 'medium', 'low'));
ALTER TABLE ph_initiatives
  ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(15,2);
ALTER TABLE ph_initiatives
  ADD COLUMN IF NOT EXISTS roadmap_priority INT;
ALTER TABLE ph_initiatives
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'on_track' 
  CHECK (health_status IN ('on_track', 'at_risk', 'off_track'));
ALTER TABLE ph_initiatives
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- STEP 2: Indexes
CREATE INDEX IF NOT EXISTS idx_ph_initiatives_on_roadmap 
  ON ph_initiatives(on_roadmap) WHERE on_roadmap = true;
CREATE INDEX IF NOT EXISTS idx_ph_initiatives_type 
  ON ph_initiatives(initiative_type_id);

-- STEP 3: Recreate views targeting ph_initiatives
CREATE VIEW ph_roadmap_initiatives_view AS
SELECT 
  i.*,
  it.key AS initiative_type_key,
  it.label AS initiative_type_label,
  it.icon AS initiative_type_icon,
  it.color_token AS initiative_type_color_token,
  it.color_hex AS initiative_type_color_hex
FROM ph_initiatives i
LEFT JOIN initiative_types it ON i.initiative_type_id = it.id
WHERE i.on_roadmap = true
ORDER BY i.roadmap_priority ASC NULLS LAST, i.created_at ASC NULLS LAST;

CREATE VIEW ph_backlog_initiatives_view AS
SELECT 
  i.*,
  it.key AS initiative_type_key,
  it.label AS initiative_type_label,
  it.icon AS initiative_type_icon,
  it.color_token AS initiative_type_color_token,
  it.color_hex AS initiative_type_color_hex
FROM ph_initiatives i
LEFT JOIN initiative_types it ON i.initiative_type_id = it.id
ORDER BY i.created_at DESC;

CREATE VIEW ph_roadmap_summary_view AS
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
FROM ph_initiatives i
LEFT JOIN initiative_types it ON i.initiative_type_id = it.id;

-- STEP 4: RPCs targeting ph_initiatives
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
  UPDATE ph_initiatives SET
    on_roadmap = true,
    roadmap_added_at = now(),
    roadmap_added_by = COALESCE(p_user_id, roadmap_added_by),
    initiative_type_id = COALESCE(v_type_id, initiative_type_id),
    roadmap_priority = COALESCE(p_roadmap_priority, roadmap_priority),
    updated_at = now()
  WHERE id = p_initiative_id
  RETURNING jsonb_build_object(
    'id', id, 'title', title, 'on_roadmap', on_roadmap, 'roadmap_added_at', roadmap_added_at
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
  UPDATE ph_initiatives SET
    on_roadmap = false,
    roadmap_added_at = NULL,
    roadmap_added_by = NULL,
    roadmap_priority = NULL,
    updated_at = now()
  WHERE id = p_initiative_id
  RETURNING jsonb_build_object(
    'id', id, 'title', title, 'on_roadmap', on_roadmap
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- STEP 5: Grants
GRANT SELECT ON ph_roadmap_initiatives_view TO anon, authenticated;
GRANT SELECT ON ph_backlog_initiatives_view TO anon, authenticated;
GRANT SELECT ON ph_roadmap_summary_view TO anon, authenticated;
GRANT EXECUTE ON FUNCTION promote_to_roadmap TO authenticated;
GRANT EXECUTE ON FUNCTION remove_from_roadmap TO authenticated;

-- STEP 6: Seed data on ph_initiatives
DO $$
DECLARE
  v_project_id UUID;
  v_enhancement_id UUID;
  v_improvement_id UUID;
BEGIN
  SELECT id INTO v_project_id FROM initiative_types WHERE key = 'project';
  SELECT id INTO v_enhancement_id FROM initiative_types WHERE key = 'enhancement';
  SELECT id INTO v_improvement_id FROM initiative_types WHERE key = 'improvement';

  UPDATE ph_initiatives SET initiative_type_id = v_project_id 
  WHERE title ILIKE '%Digital Transformation%' 
     OR title ILIKE '%Core Banking%'
     OR title ILIKE '%Cloud Migration%'
     OR title ILIKE '%Security Operations%'
     OR title ILIKE '%Payment Gateway%'
     OR title ILIKE '%Vendor Management%'
     OR title ILIKE '%Enterprise Content%'
     OR title ILIKE '%Investor Onboarding%'
     OR title ILIKE '%Unified Digital Services%'
     OR title ILIKE '%Integrated Payment%';

  UPDATE ph_initiatives SET initiative_type_id = v_enhancement_id
  WHERE title ILIKE '%Customer Experience Platform%'
     OR title ILIKE '%API Gateway%'
     OR title ILIKE '%Employee Self-Service%'
     OR title ILIKE '%Customer 360%'
     OR title ILIKE '%Real-time Fraud%'
     OR title ILIKE '%Supply Chain%'
     OR title ILIKE '%Mobile App%';

  UPDATE ph_initiatives SET initiative_type_id = v_improvement_id
  WHERE title ILIKE '%Data Analytics%'
     OR title ILIKE '%Compliance Reporting%'
     OR title ILIKE '%HR Performance%'
     OR title ILIKE '%DevOps Pipeline%';

  UPDATE ph_initiatives SET 
    on_roadmap = true,
    roadmap_added_at = now()
  WHERE title ILIKE '%Digital Transformation%'
     OR title ILIKE '%Core Banking%'
     OR title ILIKE '%Customer Experience Platform%'
     OR title ILIKE '%Data Analytics%'
     OR title ILIKE '%API Gateway%'
     OR title ILIKE '%Compliance Reporting%'
     OR title ILIKE '%Cloud Migration%'
     OR title ILIKE '%Security Operations%'
     OR title ILIKE '%Payment Gateway%'
     OR title ILIKE '%Customer 360%'
     OR title ILIKE '%DevOps Pipeline%'
     OR title ILIKE '%Investor Onboarding%';
END $$;
