-- Fix ph_wf_migration_preview to match hyphenated issue_types (Sub-task -> subtask).
CREATE OR REPLACE FUNCTION public.ph_wf_migration_preview(p_entity text)
RETURNS TABLE(legacy_status text, proposed_key text, item_count bigint, mapped boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.status, r.new_status_key, count(*)::bigint, (r.new_status_key IS NOT NULL)
  FROM ph_issues i
  LEFT JOIN ph_wf_status_remaps r
    ON r.old_status_key = i.status AND r.entity_key = p_entity
   AND r.to_version_id = (SELECT id FROM ph_wf_versions WHERE entity_key = p_entity AND lifecycle='published' ORDER BY version_no DESC LIMIT 1)
  WHERE replace(lower(i.issue_type),'-','') = replace(lower(p_entity),'-','')
    AND i.deleted_at IS NULL
  GROUP BY i.status, r.new_status_key
  ORDER BY (r.new_status_key IS NULL) DESC, count(*) DESC;
$$;
REVOKE ALL ON FUNCTION public.ph_wf_migration_preview(text) FROM public;
GRANT EXECUTE ON FUNCTION public.ph_wf_migration_preview(text) TO authenticated;
