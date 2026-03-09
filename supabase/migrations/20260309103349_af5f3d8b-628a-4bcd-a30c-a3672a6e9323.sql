
-- VIEWS for ReleaseHub v2.1
CREATE OR REPLACE VIEW rh_change_summary AS
SELECT
  c.*,
  r.name        AS release_name,
  r.version     AS release_version,
  r.status      AS release_status,
  COUNT(wi.id)  AS work_item_count,
  COUNT(s.id) FILTER (WHERE s.status = 'pending') AS pending_signoffs,
  MIN(s.wait_started_at) FILTER (WHERE s.status = 'pending') AS oldest_pending_signoff_at
FROM rh_changes c
LEFT JOIN rh_releases r ON c.release_id = r.id
LEFT JOIN rh_change_work_items wi ON c.id = wi.change_id
LEFT JOIN rh_change_signoffs s ON c.id = s.change_id
GROUP BY c.id, r.name, r.version, r.status;

CREATE OR REPLACE VIEW rh_release_summary AS
SELECT
  r.*,
  COUNT(DISTINCT c.id)   AS change_count,
  COUNT(DISTINCT rtcl.test_cycle_id) AS test_cycle_count,
  GREATEST(0, (r.target_date - CURRENT_DATE)) AS days_remaining,
  (r.target_date < CURRENT_DATE AND r.status NOT IN ('done','archived')) AS is_overdue
FROM rh_releases r
LEFT JOIN rh_changes c ON c.release_id = r.id
LEFT JOIN rh_release_test_cycle_links rtcl ON rtcl.release_id = r.id
GROUP BY r.id;
