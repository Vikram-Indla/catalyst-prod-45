DROP VIEW IF EXISTS ph_ideas_listing;

CREATE VIEW ph_ideas_listing AS
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
    i.theme,
    i.assigned_team,
    i.target_release_date,
    i.roadmap_quarter,
    i.is_committed,
    ps.full_name AS submitted_by_name,
    pa.full_name AS assigned_to_name,
    ( SELECT count(*) AS count
           FROM ph_idea_comments c
          WHERE c.idea_id = i.id) AS comment_count,
    ( SELECT count(*) AS count
           FROM ph_idea_evidence e
          WHERE e.idea_id = i.id) AS evidence_count,
    ( SELECT count(*) AS count
           FROM ph_ideas child
          WHERE child.parent_idea_id = i.id AND child.is_deleted = false) AS child_count,
    ( SELECT count(*) AS count
           FROM ph_idea_v2030_mappings v
          WHERE v.idea_id = i.id) AS v2030_pillar_count,
    ( SELECT count(*) AS count
           FROM ph_idea_compliance_tags ct
          WHERE ct.idea_id = i.id) AS compliance_tag_count,
    li.title AS linked_initiative_title,
    li.initiative_key AS linked_initiative_key
   FROM ph_ideas i
     LEFT JOIN profiles ps ON ps.id = i.submitted_by
     LEFT JOIN profiles pa ON pa.id = i.assigned_to
     LEFT JOIN ph_initiatives li ON li.id = i.linked_initiative_id
  WHERE i.is_deleted = false;