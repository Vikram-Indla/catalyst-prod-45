-- Migration: Create views for efficient querying

BEGIN;

-- View 1: BR with milestone and progress
DROP VIEW IF EXISTS v_business_request_with_milestones CASCADE;
CREATE VIEW v_business_request_with_milestones AS
SELECT
  br.id,
  br.request_key,
  br.title,
  br.product_id,
  br.urgency,
  br.process_step,
  br.end_date,
  pm.id as milestone_id,
  pm.key as milestone_key,
  pm.title as milestone_title,
  pm.quarter,
  pm.target_date as milestone_target_date,
  brml.sequence_in_milestone as phase_number,
  brml.is_primary,
  COUNT(DISTINCT pf.id) as linked_feature_count,
  COUNT(DISTINCT CASE WHEN pf.status = 'done' THEN pf.id END) as completed_feature_count,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN pf.status = 'done' THEN pf.id END) /
    NULLIF(COUNT(DISTINCT pf.id), 0))::INT as progress_percent
FROM business_requests br
LEFT JOIN business_request_milestone_links brml ON br.id = brml.business_request_id
LEFT JOIN product_milestones pm ON brml.milestone_id = pm.id
LEFT JOIN project_features pf ON br.id = ANY(pf.linked_business_request_ids)
WHERE br.deleted_at IS NULL
GROUP BY br.id, br.request_key, br.title, br.product_id, br.urgency, br.process_step, br.end_date,
         pm.id, pm.key, pm.title, pm.quarter, pm.target_date, brml.sequence_in_milestone, brml.is_primary;

-- View 2: Release with artifacts
DROP VIEW IF EXISTS v_release_with_artifacts CASCADE;
CREATE VIEW v_release_with_artifacts AS
SELECT
  r.id,
  r.key,
  r.name,
  r.release_date,
  r.status,
  COUNT(DISTINCT ra.id) as total_artifacts,
  COUNT(DISTINCT CASE WHEN ra.artifact_type = 'business_request' THEN ra.artifact_id END) as br_count,
  COUNT(DISTINCT CASE WHEN ra.artifact_type = 'feature' THEN ra.artifact_id END) as feature_count,
  COUNT(DISTINCT CASE WHEN ra.artifact_type = 'epic' THEN ra.artifact_id END) as epic_count,
  COUNT(DISTINCT CASE WHEN ra.artifact_type = 'production_incident' THEN ra.artifact_id END) as incident_count,
  COUNT(DISTINCT rs.sprint_id) as sprint_count
FROM releases r
LEFT JOIN release_artifacts ra ON r.id = ra.release_id
LEFT JOIN release_sprints rs ON r.id = rs.release_id
WHERE r.status != 'archived'
GROUP BY r.id, r.key, r.name, r.release_date, r.status;

-- View 3: Product roadmap timeline
DROP VIEW IF EXISTS v_product_roadmap_timeline CASCADE;
CREATE VIEW v_product_roadmap_timeline AS
SELECT
  pm.id as timeline_entity_id,
  'milestone'::TEXT as entity_type,
  pm.key as entity_key,
  pm.title as entity_title,
  pm.quarter,
  pm.start_date as timeline_start_date,
  pm.target_date as timeline_target_date,
  pm.status,
  pm.product_id,
  NULL::INTEGER as artifact_count
FROM product_milestones pm
WHERE pm.archived_at IS NULL

UNION ALL

SELECT
  r.id,
  'release'::TEXT,
  r.key,
  r.name,
  NULL,
  NULL,
  r.release_date,
  r.status,
  NULL,
  COUNT(DISTINCT ra.id)
FROM releases r
LEFT JOIN release_artifacts ra ON r.id = ra.release_id
WHERE r.status != 'archived'
GROUP BY r.id, r.key, r.name, r.release_date, r.status

ORDER BY timeline_start_date, timeline_target_date;

-- View 4: Available artifacts for release selection
DROP VIEW IF EXISTS v_release_artifact_options CASCADE;
CREATE VIEW v_release_artifact_options AS
SELECT
  'business_request'::TEXT as artifact_type,
  br.id as artifact_id,
  br.request_key || ': ' || br.title as artifact_label,
  ROUND(100.0 * COUNT(CASE WHEN pf.status='done' THEN 1 END) / NULLIF(COUNT(*),0))::INT as completion_percent,
  CASE
    WHEN COUNT(CASE WHEN pf.status='done' THEN 1 END) = COUNT(*) AND COUNT(*) > 0 THEN TRUE
    ELSE FALSE
  END as is_complete
FROM business_requests br
LEFT JOIN project_features pf ON br.id = ANY(pf.linked_business_request_ids)
WHERE br.deleted_at IS NULL
GROUP BY br.id, br.request_key, br.title

UNION ALL

SELECT
  'feature'::TEXT,
  pf.id,
  'Feature: ' || pf.name,
  NULL,
  FALSE
FROM project_features pf
WHERE pf.deleted_at IS NULL

UNION ALL

SELECT
  'epic'::TEXT,
  pe.id,
  'Epic: ' || pe.name,
  NULL,
  FALSE
FROM project_epics pe
WHERE pe.deleted_at IS NULL

UNION ALL

SELECT
  'production_incident'::TEXT,
  pi.id,
  'Incident: ' || pi.key || ' ' || pi.title,
  NULL,
  FALSE
FROM production_incidents pi
WHERE pi.status IN ('resolved', 'closed');

COMMIT;
