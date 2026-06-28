-- Generalize ph_wf_migration_preview to native (ph_issues) + bridged
-- (tm_defects, incidents) entities. Read-only, SECURITY DEFINER.
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
