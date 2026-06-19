-- Release portfolio aggregation view for the Release Operations overview.
-- One row per release with the signals the production-confidence resolver needs:
-- work-item scope, date alignment vs go-live, sign-off progress, and open
-- defect/incident counts in scope. security_invoker=on so the caller's RLS on
-- the underlying tables applies (releases/work-items/sign-offs/ph_issues are
-- already readable by authenticated users).

CREATE OR REPLACE VIEW rh_release_portfolio_v
WITH (security_invoker = on) AS
SELECT
  r.id, r.name, r.version, r.status, r.health, r.readiness_pct,
  r.planned_release_date, r.target_env, r.jira_key,
  COALESCE(s.scope_items, 0)        AS scope_items,
  COALESCE(s.items_after_golive, 0) AS items_after_golive,
  COALESCE(s.open_defects, 0)       AS open_defects,
  COALESCE(s.open_incidents, 0)     AS open_incidents,
  COALESCE(g.signoff_done, 0)       AS signoff_done,
  COALESCE(g.signoff_total, 0)      AS signoff_total
FROM rh_releases r
LEFT JOIN LATERAL (
  SELECT
    count(*) AS scope_items,
    count(*) FILTER (WHERE r.planned_release_date IS NOT NULL AND i.effective_due_date > r.planned_release_date) AS items_after_golive,
    count(*) FILTER (WHERE lower(i.issue_type) IN ('qa bug','defect','bug') AND coalesce(i.status_category,'') <> 'done') AS open_defects,
    count(*) FILTER (WHERE lower(i.issue_type) = 'production incident' AND coalesce(i.status_category,'') <> 'done') AS open_incidents
  FROM rh_release_work_items w
  LEFT JOIN ph_issues i ON i.issue_key = w.work_item_key
  WHERE w.release_id = r.id
) s ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE status IN ('approved','signed_off')) AS signoff_done,
    count(*) AS signoff_total
  FROM rh_release_signoffs so
  WHERE so.release_id = r.id
) g ON true;

GRANT SELECT ON rh_release_portfolio_v TO anon, authenticated;
