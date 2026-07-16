-- CAT-STRATA-IMPL-20260712-001 · slice B1 · fixes backend defect task_65642237
--
-- DEFECT: strata_promote_element() reads the charter from public.strata_play_charters,
-- which no longer exists — 20260709170000_strata_theme_charter_rename.sql renamed it to
-- strata_theme_charters, but the LATER 20260712160000_strata_promote_element_ancestor_gate.sql
-- re-created the function still carrying the pre-rename table name. Any call that reaches the
-- charter branch therefore dies with:
--     relation "public.strata_play_charters" does not exist
--
-- SCOPE IS WIDER THAN PREVIOUSLY LOGGED: the handover recorded this as "errors for legacy
-- elements". It is not a dead legacy branch — the guard is `el.element_type = 'theme'`, and
-- 'theme' is the CANONICAL live type after the play→theme consolidation
-- (CAT-STRATA-HIERARCHY-20260706-001). So promotion is broken for EVERY theme: 11 theme
-- elements exist on the live target and none of them can be promoted to active governance.
-- There are 0 elements of the retired 'play' type, so nothing depends on the old name.
--
-- FIX: repoint the charter read at strata_theme_charters. Verified drop-in — every column the
-- function reads (element_id, hypothesis, scope, value_thesis, owner_id) exists on the renamed
-- table. Nothing else in this function changes: the role gate, the recursive ancestor gate, the
-- missing-requirements accumulation, the status update and the audit write are all byte-identical
-- to the deployed definition. strata_promote_element is the ONLY remaining object in the schema
-- that referenced the dropped table (verified by scanning every pg_proc definition).
--
-- Idempotent: CREATE OR REPLACE. Reversible: re-running the prior migration restores the old body.

CREATE OR REPLACE FUNCTION public.strata_promote_element(p_element uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  el record; charter record; kpi_count int;
  missing text[] := '{}';
  blocked_ancestors text[] := '{}';
  anc record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'promotion to active governance requires strategy_office or admin role';
  END IF;
  SELECT * INTO el FROM public.strata_strategy_elements WHERE id = p_element;
  IF el IS NULL THEN RAISE EXCEPTION 'element not found'; END IF;
  IF el.status = 'active' THEN RAISE EXCEPTION 'element is already active'; END IF;
  IF el.status = 'retired' THEN RAISE EXCEPTION 'retired elements cannot be promoted'; END IF;
  FOR anc IN
    WITH RECURSIVE ancestors AS (
      SELECT p.id, p.name, p.status, p.parent_id
        FROM public.strata_strategy_elements p
       WHERE p.id = el.parent_id
      UNION ALL
      SELECT p.id, p.name, p.status, p.parent_id
        FROM public.strata_strategy_elements p
        JOIN ancestors a ON p.id = a.parent_id
    )
    SELECT name, status FROM ancestors WHERE status <> 'active'
  LOOP
    blocked_ancestors := array_append(blocked_ancestors, format('%s (%s)', anc.name, anc.status));
  END LOOP;
  IF array_length(blocked_ancestors, 1) > 0 THEN
    RAISE EXCEPTION 'promotion blocked — these ancestors must be Active first: %',
      array_to_string(blocked_ancestors, '; ');
  END IF;
  IF el.owner_id IS NULL THEN missing := array_append(missing, 'accountable owner'); END IF;
  IF el.element_type = 'theme' THEN
    -- task_65642237: was public.strata_play_charters (dropped by the theme-charter rename).
    SELECT * INTO charter FROM public.strata_theme_charters WHERE element_id = p_element;
    IF charter IS NULL THEN
      missing := array_append(missing, 'charter');
      missing := array_append(missing, 'value hypothesis (charter value thesis)');
    ELSE
      IF charter.hypothesis IS NULL OR btrim(charter.hypothesis) = '' THEN missing := array_append(missing, 'charter hypothesis'); END IF;
      IF charter.scope IS NULL OR btrim(charter.scope) = '' THEN missing := array_append(missing, 'charter scope'); END IF;
      IF charter.value_thesis IS NULL OR btrim(charter.value_thesis) = '' THEN missing := array_append(missing, 'value hypothesis (charter value thesis)'); END IF;
      IF charter.owner_id IS NULL THEN missing := array_append(missing, 'charter owner'); END IF;
    END IF;
    SELECT count(*) INTO kpi_count FROM public.strata_element_kpis WHERE element_id = p_element;
    IF kpi_count = 0 THEN missing := array_append(missing, 'linked KPI set (at least one KPI)'); END IF;
  END IF;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'promotion blocked — missing: %', array_to_string(missing, '; ');
  END IF;
  UPDATE public.strata_strategy_elements SET status = 'active', updated_at = now() WHERE id = p_element;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', p_element, 'RPC:promote_element', auth.uid(),
          'promoted to active governance (ancestors active + owner + charter + value hypothesis + KPI set verified)');
END;
$function$;
