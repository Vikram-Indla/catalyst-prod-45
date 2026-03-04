CREATE OR REPLACE VIEW public.ph_ideas_board AS
SELECT i.id,
    i.idea_key,
    i.title,
    i.description,
    i.idea_type,
    i.status,
    i.priority,
    i.category,
    i.department,
    i.impact_total,
    i.imperative,
    i.rice_score,
    i.wsjf_score,
    i.vote_count,
    i.vote_score,
    i.assigned_to,
    p.full_name AS assigned_to_name,
    i.ai_enrichment_status,
    i.tags,
    i.created_at,
    i.updated_at
   FROM ph_ideas i
     LEFT JOIN profiles p ON p.id = i.assigned_to
  WHERE i.is_deleted = false;

CREATE OR REPLACE VIEW public.ph_ideas_listing AS
SELECT i.id,
    i.idea_key,
    i.title,
    i.description,
    i.idea_type,
    i.category,
    i.source,
    i.department,
    i.tags,
    i.status,
    i.priority,
    i.submitted_by,
    i.assigned_to,
    i.reach,
    i.impact,
    i.confidence,
    i.effort,
    i.rice_score,
    i.business_value,
    i.time_criticality,
    i.risk_reduction,
    i.job_size,
    i.wsjf_score,
    i.custom_score,
    i.vote_count,
    i.vote_score,
    i.ai_summary,
    i.ai_category,
    i.ai_duplicate_ids,
    i.ai_enrichment_status,
    i.ai_tags,
    i.parent_idea_id,
    i.linked_initiative_id,
    i.converted_at,
    i.converted_by,
    i.is_deleted,
    i.created_at,
    i.updated_at,
    i.imperative,
    i.ministry_efficiency,
    i.pain_severity,
    i.alignment,
    i.complexity_score,
    i.timeframe_score,
    i.impact_total,
    ps.full_name AS submitted_by_name,
    pa.full_name AS assigned_to_name,
    (SELECT count(*) FROM ph_idea_comments c WHERE c.idea_id = i.id) AS comment_count,
    (SELECT count(*) FROM ph_idea_evidence e WHERE e.idea_id = i.id) AS evidence_count,
    (SELECT count(*) FROM ph_ideas child WHERE child.parent_idea_id = i.id AND child.is_deleted = false) AS child_count,
    (SELECT count(*) FROM ph_idea_v2030_mappings v WHERE v.idea_id = i.id) AS v2030_pillar_count,
    (SELECT count(*) FROM ph_idea_compliance_tags ct WHERE ct.idea_id = i.id) AS compliance_tag_count,
    li.title AS linked_initiative_title,
    li.initiative_key AS linked_initiative_key
   FROM ph_ideas i
     LEFT JOIN profiles ps ON ps.id = i.submitted_by
     LEFT JOIN profiles pa ON pa.id = i.assigned_to
     LEFT JOIN ph_initiatives li ON li.id = i.linked_initiative_id
  WHERE i.is_deleted = false;

CREATE OR REPLACE VIEW public.ph_ideas_triage AS
SELECT i.id,
    i.idea_key,
    i.title,
    i.idea_type,
    i.source,
    i.priority,
    i.department,
    i.impact_total,
    i.submitted_by,
    p.full_name AS submitted_by_name,
    i.ai_category,
    i.ai_duplicate_ids,
    i.ai_summary,
    i.ai_enrichment_status,
    i.created_at,
    (SELECT count(*) FROM ph_idea_evidence e WHERE e.idea_id = i.id) AS evidence_count
   FROM ph_ideas i
     LEFT JOIN profiles p ON p.id = i.submitted_by
  WHERE i.status = 'Submitted' AND i.is_deleted = false
  ORDER BY i.impact_total DESC NULLS LAST,
    CASE i.priority
      WHEN 'P1' THEN 1
      WHEN 'P2' THEN 2
      WHEN 'P3' THEN 3
      WHEN 'P4' THEN 4
      ELSE NULL
    END,
    i.created_at;

CREATE OR REPLACE VIEW public.ph_ideas_top_contributors AS
SELECT i.submitted_by,
    p.full_name AS contributor_name,
    count(*) AS ideas_submitted,
    count(*) FILTER (WHERE i.status = 'Approved' OR i.status = 'Converted') AS ideas_approved,
    round(avg(i.impact_total), 2) AS avg_impact
   FROM ph_ideas i
     LEFT JOIN profiles p ON p.id = i.submitted_by
  WHERE i.is_deleted = false AND i.submitted_by IS NOT NULL
  GROUP BY i.submitted_by, p.full_name
  ORDER BY count(*) DESC
  LIMIT 10;