-- Drop dependent views first
DROP VIEW IF EXISTS ph_backlog_initiatives_view;
DROP VIEW IF EXISTS ph_roadmap_initiatives_view;
DROP VIEW IF EXISTS ph_roadmap_summary_view;

-- Null out type references on ph_initiatives (defensive)
UPDATE ph_initiatives SET initiative_type_id = NULL WHERE initiative_type_id IS NOT NULL;

-- Drop overrides table (FKs into initiative_types)
DROP TABLE IF EXISTS ph_issue_initiative_type_overrides;

-- Drop FK + column on ph_initiatives
ALTER TABLE ph_initiatives DROP CONSTRAINT IF EXISTS ph_initiatives_initiative_type_id_fkey;
ALTER TABLE ph_initiatives DROP COLUMN IF EXISTS initiative_type_id;

-- Drop FK + column on legacy initiatives table (empty, but FK blocks catalog drop)
ALTER TABLE initiatives DROP CONSTRAINT IF EXISTS initiatives_initiative_type_id_fkey;
ALTER TABLE initiatives DROP COLUMN IF EXISTS initiative_type_id;

-- Now safe to drop the catalog
DROP TABLE IF EXISTS initiative_types;

-- Recreate ph_backlog_initiatives_view
CREATE OR REPLACE VIEW ph_backlog_initiatives_view AS
SELECT
  i.id, i.initiative_key, i.title, i.description, i.status,
  i.assignee_id, i.business_owner_id, i.reporter_id, i.department_id,
  i.target_quarter, i.business_ask_date, i.kickoff_date, i.target_complete,
  i.progress, i.sort_order, i.risk_count, i.is_archived, i.is_deleted,
  i.created_at, i.updated_at, i.budget_allocated,
  i.on_roadmap, i.roadmap_added_at, i.roadmap_added_by,
  i.business_value, i.estimated_budget, i.roadmap_priority,
  i.health_status, i.tags, i.ea_review, i.priority
FROM ph_initiatives i
WHERE i.is_deleted = false
ORDER BY i.created_at DESC;

-- Recreate ph_roadmap_initiatives_view
CREATE OR REPLACE VIEW ph_roadmap_initiatives_view AS
SELECT
  i.id, i.initiative_key, i.title, i.description, i.status,
  i.assignee_id, i.business_owner_id, i.reporter_id, i.department_id,
  i.target_quarter, i.business_ask_date, i.kickoff_date, i.target_complete,
  i.roadmap_start_date, i.roadmap_end_date, i.roadmap_sort_order,
  i.progress, i.sort_order, i.risk_count, i.is_archived, i.is_deleted,
  i.created_at, i.updated_at, i.budget_allocated,
  i.on_roadmap, i.roadmap_added_at, i.roadmap_added_by,
  i.business_value, i.estimated_budget, i.roadmap_priority,
  i.health_status, i.tags
FROM ph_initiatives i
WHERE i.on_roadmap = true AND i.is_deleted = false
ORDER BY i.roadmap_priority, i.roadmap_sort_order, i.created_at;

-- Recreate ph_roadmap_summary_view (per-type counts removed)
CREATE OR REPLACE VIEW ph_roadmap_summary_view AS
SELECT
  count(*) FILTER (WHERE i.on_roadmap = true) AS total_on_roadmap,
  count(*) FILTER (WHERE i.on_roadmap = false) AS total_not_on_roadmap,
  count(*) AS total_initiatives,
  count(*) FILTER (
    WHERE i.on_roadmap = true
      AND i.status NOT IN ('delivered'::initiative_status, 'closed'::initiative_status, 'cancelled'::initiative_status)
  ) AS active_count,
  count(*) FILTER (
    WHERE i.on_roadmap = true
      AND i.status IN ('new_demand'::initiative_status, 'under_review'::initiative_status)
  ) AS validation_count,
  count(*) FILTER (WHERE i.on_roadmap = true AND i.health_status = 'on_track') AS roadmap_on_track,
  count(*) FILTER (WHERE i.on_roadmap = true AND i.health_status = 'at_risk') AS roadmap_at_risk,
  count(*) FILTER (WHERE i.on_roadmap = true AND i.health_status = 'off_track') AS roadmap_off_track
FROM ph_initiatives i
WHERE i.is_deleted = false;

-- Rewrite promote_to_roadmap to drop type_key parameter
DROP FUNCTION IF EXISTS public.promote_to_roadmap(uuid, uuid, text, integer);

CREATE OR REPLACE FUNCTION public.promote_to_roadmap(
  p_initiative_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_roadmap_priority integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE ph_initiatives SET
    on_roadmap = true,
    roadmap_added_at = now(),
    roadmap_added_by = COALESCE(p_user_id, roadmap_added_by),
    roadmap_priority = COALESCE(p_roadmap_priority, roadmap_priority),
    updated_at = now()
  WHERE id = p_initiative_id
  RETURNING jsonb_build_object(
    'id', id, 'title', title, 'on_roadmap', on_roadmap, 'roadmap_added_at', roadmap_added_at
  ) INTO v_result;
  RETURN v_result;
END;
$$;