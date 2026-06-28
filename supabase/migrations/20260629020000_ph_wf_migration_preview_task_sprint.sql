-- Extend ph_wf_migration_preview to cover task (via task_statuses) + sprint.
CREATE OR REPLACE FUNCTION public.ph_wf_migration_preview(p_entity text)
RETURNS TABLE(legacy_status text, proposed_key text, item_count bigint, mapped boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ver uuid;
BEGIN
  SELECT id INTO v_ver FROM ph_wf_versions WHERE entity_key=p_entity AND lifecycle='published' ORDER BY version_no DESC LIMIT 1;
  IF p_entity = 'defect' THEN
    RETURN QUERY
      SELECT d.status::text, r.new_status_key, count(*)::bigint, (r.new_status_key IS NOT NULL)
      FROM tm_defects d
      LEFT JOIN ph_wf_status_remaps r ON r.old_status_key=d.status::text AND r.entity_key='defect' AND r.to_version_id=v_ver
      GROUP BY d.status, r.new_status_key ORDER BY (r.new_status_key IS NULL) DESC, count(*) DESC;
  ELSIF p_entity = 'incident' THEN
    RETURN QUERY
      SELECT i.status::text, r.new_status_key, count(*)::bigint, (r.new_status_key IS NOT NULL)
      FROM incidents i
      LEFT JOIN ph_wf_status_remaps r ON r.old_status_key=i.status::text AND r.entity_key='incident' AND r.to_version_id=v_ver
      GROUP BY i.status, r.new_status_key ORDER BY (r.new_status_key IS NULL) DESC, count(*) DESC;
  ELSIF p_entity = 'release' THEN
    RETURN QUERY
      SELECT rl.status::text, r.new_status_key, count(*)::bigint, (r.new_status_key IS NOT NULL)
      FROM rh_releases rl
      LEFT JOIN ph_wf_status_remaps r ON r.old_status_key=rl.status::text AND r.entity_key='release' AND r.to_version_id=v_ver
      GROUP BY rl.status, r.new_status_key ORDER BY (r.new_status_key IS NULL) DESC, count(*) DESC;
  ELSIF p_entity = 'business_request' THEN
    RETURN QUERY
      SELECT b.process_step::text, r.new_status_key, count(*)::bigint, (r.new_status_key IS NOT NULL)
      FROM business_requests b
      LEFT JOIN ph_wf_status_remaps r ON r.old_status_key=b.process_step::text AND r.entity_key='business_request' AND r.to_version_id=v_ver
      GROUP BY b.process_step, r.new_status_key ORDER BY (r.new_status_key IS NULL) DESC, count(*) DESC;
  ELSIF p_entity = 'product_milestone' THEN
    RETURN QUERY
      SELECT m.status::text, r.new_status_key, count(*)::bigint, (r.new_status_key IS NOT NULL)
      FROM product_milestones m
      LEFT JOIN ph_wf_status_remaps r ON r.old_status_key=m.status::text AND r.entity_key='product_milestone' AND r.to_version_id=v_ver
      GROUP BY m.status, r.new_status_key ORDER BY (r.new_status_key IS NULL) DESC, count(*) DESC;
  ELSIF p_entity = 'task' THEN
    -- A_projection: task_statuses.slug is the "raw value"; tasks hold a status_id FK.
    RETURN QUERY
      SELECT ts.slug::text, r.new_status_key, count(t.id)::bigint, (r.new_status_key IS NOT NULL)
      FROM task_statuses ts
      LEFT JOIN tasks t ON t.status_id = ts.id AND t.deleted_at IS NULL
      LEFT JOIN ph_wf_status_remaps r ON r.old_status_key=ts.slug AND r.entity_key='task' AND r.to_version_id=v_ver
      GROUP BY ts.slug, r.new_status_key
      ORDER BY (r.new_status_key IS NULL) DESC, count(t.id) DESC;
  ELSIF p_entity = 'sprint' THEN
    RETURN QUERY
      SELECT s.status::text, r.new_status_key, count(*)::bigint, (r.new_status_key IS NOT NULL)
      FROM ph_jira_sprints s
      LEFT JOIN ph_wf_status_remaps r ON r.old_status_key=s.status AND r.entity_key='sprint' AND r.to_version_id=v_ver
      GROUP BY s.status, r.new_status_key
      ORDER BY (r.new_status_key IS NULL) DESC, count(*) DESC;
  ELSE
    RETURN QUERY
      SELECT i.status, r.new_status_key, count(*)::bigint, (r.new_status_key IS NOT NULL)
      FROM ph_issues i
      LEFT JOIN ph_wf_status_remaps r ON r.old_status_key=i.status AND r.entity_key=p_entity AND r.to_version_id=v_ver
      WHERE replace(lower(i.issue_type),'-','') = replace(lower(p_entity),'-','') AND i.deleted_at IS NULL
      GROUP BY i.status, r.new_status_key ORDER BY (r.new_status_key IS NULL) DESC, count(*) DESC;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.ph_wf_migration_preview(text) FROM public;
GRANT EXECUTE ON FUNCTION public.ph_wf_migration_preview(text) TO authenticated;
