
CREATE OR REPLACE VIEW ph_initiatives_list
WITH (security_invoker = true)
AS
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
  i.progress,
  i.sort_order,
  i.risk_count,
  i.is_archived,
  i.is_deleted,
  i.created_at,
  i.updated_at,
  d.name AS department_name,
  d.code AS department_code,
  s.strategic_alignment AS score_strategic_alignment,
  s.business_impact AS score_business_impact,
  s.time_urgency AS score_time_urgency,
  s.resource_feasibility AS score_resource_feasibility,
  s.computed_score
FROM ph_initiatives i
LEFT JOIN ph_departments d ON d.id = i.department_id
LEFT JOIN ph_initiative_scores s ON s.initiative_id = i.id
WHERE i.is_deleted = FALSE;
