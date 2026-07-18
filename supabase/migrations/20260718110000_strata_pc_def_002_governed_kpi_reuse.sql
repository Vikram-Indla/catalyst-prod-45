-- =============================================================================
-- PC-DEF-002 — Governed KPI reuse for Project Cards
-- Feature: CAT-STRATA-PCDEF-20260717-001
--
-- Defect: the Project Card "New KPI" path minted a brand-new row in the
-- governed KPI dictionary (strata_kpis) from name/unit/direction/frequency and
-- immediately wrote a `measures` edge — a project-local KPI master, created
-- WITHOUT reusing an existing governed KPI and WITHOUT the approval gate every
-- other consumer enforces. This creates a second, project-only KPI dictionary
-- and breaks KPI-defined-once consumption and official-result isolation.
--
-- Fix (server-enforced):
--   1. strata_link_project_kpi — NEW. Project Cards REUSE an existing *approved*
--      governed KPI and attach contextual contribution/target evidence on the
--      link's metadata. It never inserts into strata_kpis and never touches KPI
--      targets/actuals, so official KPI/Scorecard results are unchanged.
--   2. strata_create_project_kpi — the mint path is CLOSED. It now raises and
--      redirects to reuse, so no project-local KPI master can be created.
--
-- The approved-only rule mirrors strata_link_element_kpi (the Theme-level path).
-- =============================================================================

-- 1. Governed reuse: attach an approved dictionary KPI to a Project Card -------
CREATE OR REPLACE FUNCTION public.strata_link_project_kpi(
  p_project         uuid,
  p_kpi             uuid,
  p_contribution    text DEFAULT 'supporting',
  p_target_note     text DEFAULT NULL,
  p_parent_theme_kpi uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id     uuid;
  kpi_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'linking a governed KPI to a project requires strategy_office, kpi_owner or admin role';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.strata_project_cards WHERE id = p_project) THEN
    RAISE EXCEPTION 'project card not found';
  END IF;

  SELECT status INTO kpi_status FROM public.strata_kpis WHERE id = p_kpi;
  IF kpi_status IS NULL THEN
    RAISE EXCEPTION 'governed KPI not found — Project Cards must reuse an existing KPI from the governed dictionary';
  END IF;
  IF kpi_status <> 'approved' THEN
    RAISE EXCEPTION 'only an approved governed KPI can be linked to a project; KPI status: %', kpi_status;
  END IF;

  IF p_contribution NOT IN ('direct','supporting') THEN
    RAISE EXCEPTION 'contribution must be direct | supporting';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.strata_execution_links
     WHERE from_type = 'project_card' AND from_id = p_project
       AND to_type = 'kpi' AND to_id = p_kpi
       AND relationship_type = 'measures'
  ) THEN
    RAISE EXCEPTION 'this governed KPI is already linked to the project card';
  END IF;

  IF p_parent_theme_kpi IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = p_parent_theme_kpi) THEN
    RAISE EXCEPTION 'parent theme KPI not found';
  END IF;

  -- Contribution/target context lives on the link, NOT as a new KPI definition.
  INSERT INTO public.strata_execution_links
    (from_type, from_id, to_type, to_id, relationship_type, mapping_owner_id, created_by, metadata)
  VALUES
    ('project_card', p_project, 'kpi', p_kpi, 'measures', auth.uid(), auth.uid(),
     jsonb_strip_nulls(jsonb_build_object(
       'contribution', p_contribution,
       'target_note',  NULLIF(btrim(COALESCE(p_target_note, '')), '')
     )))
  RETURNING id INTO new_id;

  IF p_parent_theme_kpi IS NOT NULL THEN
    INSERT INTO public.strata_execution_links
      (from_type, from_id, to_type, to_id, relationship_type, mapping_owner_id, created_by)
    VALUES
      ('kpi', p_kpi, 'kpi', p_parent_theme_kpi, 'rolls_up_to', auth.uid(), auth.uid())
    ON CONFLICT (from_type, from_id, to_type, to_id, relationship_type) DO NOTHING;
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_execution_links', new_id, 'RPC:link_project_kpi', auth.uid(),
          format('governed KPI "%s" reused as %s measure on %s',
                 public.strata_entity_name('kpi', p_kpi),
                 p_contribution,
                 public.strata_entity_name('project_card', p_project)));

  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_link_project_kpi(uuid,uuid,text,text,uuid) IS
  'PC-DEF-002: reuses an existing APPROVED governed KPI on a Project Card as a measure, storing contribution/target context on the link metadata. Never mints a KPI and never mutates KPI targets/actuals — official KPI/Scorecard results are unchanged. Replaces the project-local KPI-master mint path.';

GRANT EXECUTE ON FUNCTION public.strata_link_project_kpi(uuid,uuid,text,text,uuid) TO authenticated;

-- 2. Close the duplicate-master mint path -------------------------------------
CREATE OR REPLACE FUNCTION public.strata_create_project_kpi(
  p_project uuid,
  p_name text,
  p_unit text DEFAULT NULL,
  p_direction text DEFAULT 'higher_better',
  p_frequency text DEFAULT 'quarterly',
  p_entry_method text DEFAULT 'manual',
  p_parent_theme_kpi uuid DEFAULT NULL,
  p_accountable_owner uuid DEFAULT NULL,
  p_validator uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'creating a project-local KPI master is no longer permitted (PC-DEF-002). Project Cards must reuse an approved KPI from the governed dictionary via strata_link_project_kpi. This prevents a second KPI dictionary and preserves official KPI/Scorecard results.'
    USING ERRCODE = 'raise_exception';
END;
$$;

COMMENT ON FUNCTION public.strata_create_project_kpi(uuid,text,text,text,text,text,uuid,uuid,uuid) IS
  'PC-DEF-002: DISABLED. Project-local KPI-master creation is prohibited to prevent a second KPI dictionary. Reuse an approved governed KPI via strata_link_project_kpi instead.';
