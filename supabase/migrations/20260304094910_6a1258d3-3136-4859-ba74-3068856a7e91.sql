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