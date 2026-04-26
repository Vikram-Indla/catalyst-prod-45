DROP VIEW IF EXISTS ph_backlog_initiatives_view;

CREATE OR REPLACE VIEW ph_backlog_initiatives_view AS
WITH linked_issues AS (
  -- Path 1: ph_issues.parent_key = initiative_key (direct parent)
  SELECT i.id AS initiative_id, pi.issue_key, pi.status
  FROM ph_initiatives i
  JOIN ph_issues pi ON pi.parent_key = i.initiative_key
  WHERE i.is_deleted = false

  UNION

  -- Path 2: ph_issue_links rows where one side is the initiative_key
  -- (text-keyed link table, see useInitiativeLinksByEpicKeys)
  SELECT i.id AS initiative_id, pi.issue_key, pi.status
  FROM ph_initiatives i
  JOIN ph_issue_links pil
    ON pil.source_id = i.initiative_key OR pil.target_id = i.initiative_key
  JOIN ph_issues pi
    ON pi.issue_key = CASE
                        WHEN pil.source_id = i.initiative_key THEN pil.target_id
                        ELSE pil.source_id
                      END
  WHERE i.is_deleted = false
),
link_stats AS (
  SELECT
    initiative_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status IN ('Done', 'Closed', 'Resolved')) AS done
  FROM linked_issues
  GROUP BY initiative_id
)
SELECT
  i.*,
  COALESCE(ls.total, 0) AS linked_items_total,
  COALESCE(ls.done, 0) AS linked_items_done,
  COALESCE(
    ROUND(100.0 * ls.done / NULLIF(ls.total, 0)),
    0
  )::int AS linked_items_progress
FROM ph_initiatives i
LEFT JOIN link_stats ls ON ls.initiative_id = i.id
WHERE i.is_deleted = false
ORDER BY i.created_at DESC;