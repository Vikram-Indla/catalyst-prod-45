
CREATE OR REPLACE VIEW public.v_issue_counts AS
SELECT
  project_key,
  issue_type,
  COUNT(*)::bigint AS cnt
FROM public.ph_issues
GROUP BY project_key, issue_type;

-- Grant access to authenticated users
GRANT SELECT ON public.v_issue_counts TO authenticated;
GRANT SELECT ON public.v_issue_counts TO anon;
