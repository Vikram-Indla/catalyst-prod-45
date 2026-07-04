-- P1-S10 follow-up: tm_link_requirement never populated tm_requirement_links.project_id
-- (added in P1-S9). New rows would leak nulls forever. Derive it from the case.
CREATE OR REPLACE FUNCTION public.tm_link_requirement(
  p_case_id uuid,
  p_requirement_type text,
  p_requirement_id uuid DEFAULT NULL::uuid,
  p_external_key text DEFAULT NULL::text,
  p_external_url text DEFAULT NULL::text,
  p_external_title text DEFAULT NULL::text,
  p_link_type text DEFAULT 'verifies'::text,
  p_notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO tm_requirement_links (
    test_case_id,
    requirement_type,
    requirement_id,
    external_key,
    external_url,
    external_title,
    link_type,
    notes,
    project_id,
    created_by
  ) VALUES (
    p_case_id,
    p_requirement_type,
    p_requirement_id,
    p_external_key,
    p_external_url,
    p_external_title,
    p_link_type,
    p_notes,
    (SELECT project_id FROM tm_test_cases WHERE id = p_case_id),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;
