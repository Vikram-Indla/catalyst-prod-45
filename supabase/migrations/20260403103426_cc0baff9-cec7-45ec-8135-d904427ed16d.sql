DROP VIEW IF EXISTS public.rh_release_summary;

CREATE VIEW public.rh_release_summary AS
SELECT r.id,
    r.name,
    r.version,
    r.status,
    r.source,
    r.jira_key,
    r.target_date,
    r.owner_id,
    r.project_id,
    r.chg_count,
    r.created_at,
    r.updated_at,
    count(DISTINCT c.id) AS change_count,
    (SELECT COUNT(*) FROM rh_changes c2 WHERE c2.release_id = r.id AND c2.status = 'IN_PRODUCTION') AS completed_change_count,
    count(DISTINCT rtcl.test_cycle_id) AS test_cycle_count,
    GREATEST(0, r.target_date - CURRENT_DATE) AS days_remaining,
    r.target_date < CURRENT_DATE AND (r.status <> ALL (ARRAY['done'::text, 'archived'::text])) AS is_overdue
FROM rh_releases r
    LEFT JOIN rh_changes c ON c.release_id = r.id
    LEFT JOIN rh_release_test_cycle_links rtcl ON rtcl.release_id = r.id
GROUP BY r.id;