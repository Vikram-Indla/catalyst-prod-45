
-- Add roadmap-specific date columns (may already exist from partial prior run)
ALTER TABLE ph_initiatives 
  ADD COLUMN IF NOT EXISTS roadmap_start_date DATE,
  ADD COLUMN IF NOT EXISTS roadmap_end_date DATE,
  ADD COLUMN IF NOT EXISTS roadmap_sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ph_initiatives_roadmap ON ph_initiatives(on_roadmap) WHERE on_roadmap = true;

-- Drop and recreate summary view with new columns
DROP VIEW IF EXISTS ph_roadmap_summary_view;
CREATE VIEW ph_roadmap_summary_view AS
SELECT
  COUNT(*) FILTER (WHERE i.on_roadmap = true) AS total_on_roadmap,
  COUNT(*) FILTER (WHERE i.on_roadmap = false) AS total_not_on_roadmap,
  COUNT(*) AS total_initiatives,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND i.status NOT IN ('delivered','closed','cancelled')) AS active_count,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND i.status IN ('new_demand','under_review')) AS validation_count,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND it.key = 'project') AS roadmap_projects,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND it.key = 'enhancement') AS roadmap_enhancements,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND it.key = 'improvement') AS roadmap_improvements,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND i.health_status = 'on_track') AS roadmap_on_track,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND i.health_status = 'at_risk') AS roadmap_at_risk,
  COUNT(*) FILTER (WHERE i.on_roadmap = true AND i.health_status = 'off_track') AS roadmap_off_track
FROM ph_initiatives i
LEFT JOIN initiative_types it ON i.initiative_type_id = it.id
WHERE i.is_deleted = false;

-- Drop and recreate roadmap initiatives view with new date columns
DROP VIEW IF EXISTS ph_roadmap_initiatives_view;
CREATE VIEW ph_roadmap_initiatives_view AS
SELECT
  i.id,
  i.initiative_key,
  i.title,
  i.description,
  i.status,
  i.assignee_id,
  i.business_owner_id,
  i.reporter_id,
  i.department_id,
  i.target_quarter,
  i.business_ask_date,
  i.kickoff_date,
  i.target_complete,
  i.roadmap_start_date,
  i.roadmap_end_date,
  i.roadmap_sort_order,
  i.progress,
  i.sort_order,
  i.risk_count,
  i.is_archived,
  i.is_deleted,
  i.created_at,
  i.updated_at,
  i.budget_allocated,
  i.initiative_type_id,
  i.on_roadmap,
  i.roadmap_added_at,
  i.roadmap_added_by,
  i.business_value,
  i.estimated_budget,
  i.roadmap_priority,
  i.health_status,
  i.tags,
  it.key AS initiative_type_key,
  it.label AS initiative_type_label,
  it.icon AS initiative_type_icon,
  it.color_token AS initiative_type_color_token,
  it.color_hex AS initiative_type_color_hex
FROM ph_initiatives i
LEFT JOIN initiative_types it ON i.initiative_type_id = it.id
WHERE i.on_roadmap = true AND i.is_deleted = false
ORDER BY i.roadmap_priority, i.roadmap_sort_order, i.created_at;
