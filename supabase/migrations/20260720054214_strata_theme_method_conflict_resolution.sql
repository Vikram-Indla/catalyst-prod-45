-- CAT-STRATA-THEMEMETHOD-20260720-001 — governed conflict-resolution workflow + migration transparency.
-- Depends on 20260719223152 (column + conflict ledger) and 20260719223304 (enforcement). Applied after both.
-- A "both"-conflict Theme (measurement_method NULL) cannot self-heal or be silently converted; an admin
-- explicitly selects the method and dispositions incompatible records through this AUDITED RPC.

-- ---------------------------------------------------------------------------
-- 1. Migration transparency (B): record HOW each Theme's method was assigned so an administrator can
--    review migrated defaults. classification_basis is descriptive, not an enforcement input.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_theme_method_migration_log (
  theme_id uuid PRIMARY KEY REFERENCES public.strata_strategy_elements(id) ON DELETE CASCADE,
  assigned_method text,                 -- NULL for unresolved_both
  classification_basis text NOT NULL,   -- objectives_kpis_from_objectives | okrs_from_theme_okrs | objectives_kpis_default_neither | unresolved_both
  objective_count int NOT NULL,
  theme_okr_count int NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
COMMENT ON TABLE public.strata_theme_method_migration_log IS
  'Transparency ledger: how the measurement-method backfill classified each Theme. objectives_kpis_default_neither rows are DEFAULTS (not explicit choices) and are surfaced for administrator review. CAT-STRATA-THEMEMETHOD-20260720-001.';
ALTER TABLE public.strata_theme_method_migration_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strata_theme_method_migration_log_select ON public.strata_theme_method_migration_log;
CREATE POLICY strata_theme_method_migration_log_select ON public.strata_theme_method_migration_log
  FOR SELECT USING (public.current_user_is_approved());
DROP POLICY IF EXISTS strata_theme_method_migration_log_write ON public.strata_theme_method_migration_log;
CREATE POLICY strata_theme_method_migration_log_write ON public.strata_theme_method_migration_log
  FOR ALL USING (public.strata_has_role(ARRAY['strategy_office','strata_admin']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','strata_admin']));

INSERT INTO public.strata_theme_method_migration_log (theme_id, assigned_method, classification_basis, objective_count, theme_okr_count)
SELECT t.id, t.measurement_method,
  CASE
    WHEN t.measurement_method IS NULL THEN 'unresolved_both'
    WHEN t.measurement_method = 'okrs' THEN 'okrs_from_theme_okrs'
    WHEN oc.obj > 0 THEN 'objectives_kpis_from_objectives'
    ELSE 'objectives_kpis_default_neither'
  END,
  oc.obj, oc.okr
FROM public.strata_strategy_elements t
CROSS JOIN LATERAL (
  SELECT
    (SELECT count(*) FROM public.strata_strategy_elements c
       WHERE c.parent_id=t.id AND c.element_type='objective' AND c.context='theme' AND c.status<>'retired') AS obj,
    (SELECT count(*) FROM public.strata_okrs o WHERE o.theme_id=t.id AND o.status NOT IN ('cancelled','withdrawn','rejected')) AS okr
) oc
WHERE t.element_type='theme' AND t.context='theme' AND t.status<>'retired'
ON CONFLICT (theme_id) DO UPDATE
  SET assigned_method = EXCLUDED.assigned_method,
      classification_basis = EXCLUDED.classification_basis,
      objective_count = EXCLUDED.objective_count,
      theme_okr_count = EXCLUDED.theme_okr_count,
      logged_at = now()
WHERE public.strata_theme_method_migration_log.reviewed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Governed resolution RPC (A). Admin selects the method + a required reason; incompatible records are
--    dispositioned through a SAFE, AUDITED, NON-DESTRUCTIVE process (Objectives -> retired, Theme-owned
--    OKRs -> cancelled — history + lineage preserved), and the resolver/time/decision/reason/affected
--    records are recorded on the conflict ledger.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_resolve_theme_method_conflict(
  p_theme uuid, p_method text, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_theme record; v_retired uuid[] := ARRAY[]::uuid[]; v_cancelled uuid[] := ARRAY[]::uuid[]; v_result jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','strata_admin']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: resolving a Theme measurement-method conflict requires strategy_office or admin';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'THEME_METHOD_RESOLUTION_REASON_REQUIRED: an audited reason is required to resolve a conflict';
  END IF;
  IF p_method NOT IN ('objectives_kpis','okrs') THEN
    RAISE EXCEPTION 'INVALID_MEASUREMENT_METHOD: method must be objectives_kpis | okrs';
  END IF;
  SELECT * INTO v_theme FROM public.strata_strategy_elements WHERE id = p_theme;
  IF v_theme.id IS NULL OR v_theme.element_type <> 'theme' THEN
    RAISE EXCEPTION 'MISSING_THEME: not a Strategic Theme';
  END IF;
  IF v_theme.measurement_method IS NOT NULL THEN
    RAISE EXCEPTION 'THEME_METHOD_NOT_IN_CONFLICT: this Theme already has a resolved measurement method (%)', v_theme.measurement_method;
  END IF;

  IF p_method = 'okrs' THEN
    -- Incompatible = child Strategic Objectives. Disposition: governed retirement (rows kept, history/lineage intact).
    WITH r AS (
      UPDATE public.strata_strategy_elements
         SET status = 'retired', updated_at = now()
       WHERE parent_id = p_theme AND element_type = 'objective' AND context = 'theme' AND status <> 'retired'
      RETURNING id
    ) SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_retired FROM r;
    INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
    SELECT 'strata_strategy_elements', id, 'RPC:resolve_theme_conflict_retire_objective', auth.uid(),
           format('retired on Theme measurement-method resolution -> okrs: %s', p_reason)
    FROM unnest(v_retired) AS id;
  ELSE
    -- Incompatible = Theme-owned OKRs. Disposition: governed cancellation (rows + observations/versions kept).
    WITH c AS (
      UPDATE public.strata_okrs
         SET status = 'cancelled', updated_at = now()
       WHERE theme_id = p_theme AND status NOT IN ('closed','cancelled','withdrawn','rejected')
      RETURNING id
    ) SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_cancelled FROM c;
    INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
    SELECT 'strata_okrs', id, 'RPC:resolve_theme_conflict_cancel_okr', auth.uid(),
           format('cancelled on Theme measurement-method resolution -> objectives_kpis: %s', p_reason)
    FROM unnest(v_cancelled) AS id;
  END IF;

  UPDATE public.strata_strategy_elements SET measurement_method = p_method, updated_at = now() WHERE id = p_theme;

  v_result := jsonb_build_object(
    'theme_id', p_theme, 'method', p_method, 'reason', p_reason,
    'resolved_by', auth.uid(),
    'retired_objectives', to_jsonb(v_retired),
    'cancelled_okrs', to_jsonb(v_cancelled));

  UPDATE public.strata_theme_method_conflicts
     SET resolved_at = now(), resolved_by = auth.uid(), resolution = v_result::text
   WHERE theme_id = p_theme;

  UPDATE public.strata_theme_method_migration_log
     SET assigned_method = p_method, classification_basis = 'resolved_by_admin', reviewed_at = now(), reviewed_by = auth.uid()
   WHERE theme_id = p_theme;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', p_theme, 'RPC:resolve_theme_method_conflict', auth.uid(),
          format('resolved measurement method -> %s (%s); retired %s objective(s), cancelled %s Theme-owned OKR(s)',
                 p_method, p_reason, array_length(v_retired,1), array_length(v_cancelled,1)));
  RETURN v_result;
END;
$$;
COMMENT ON FUNCTION public.strata_resolve_theme_method_conflict(uuid, text, text) IS
  'Admin-governed resolution of a both-conflict Theme: selects the method + audited reason, dispositions incompatible records non-destructively (Objectives->retired, Theme-owned OKRs->cancelled — history kept), records resolver/time/decision/affected records. CAT-STRATA-THEMEMETHOD-20260720-001.';
GRANT EXECUTE ON FUNCTION public.strata_resolve_theme_method_conflict(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Prevent NEW KPIs on an unresolved (NULL-method) Theme until it is resolved (A). Objectives + OKRs are
--    already blocked (trigger / create_okr_v2). Faithful CREATE OR REPLACE of the existing body + one guard.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_link_element_kpi(
  p_element uuid, p_kpi uuid, p_weight numeric DEFAULT NULL, p_contribution text DEFAULT 'direct'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE new_id uuid; kpi_status text; kpi_is_strategic boolean;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'linking KPIs requires strategy_office or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_element AND status <> 'retired') THEN
    RAISE EXCEPTION 'element not found or retired';
  END IF;
  -- Measurement-method conflict guard (CAT-STRATA-THEMEMETHOD-20260720-001): an unresolved Theme freezes new KPIs.
  IF EXISTS (SELECT 1 FROM public.strata_strategy_elements
             WHERE id = p_element AND element_type = 'theme' AND measurement_method IS NULL) THEN
    RAISE EXCEPTION 'THEME_MEASUREMENT_METHOD_REQUIRED: this Theme has an unresolved measurement-method conflict; resolve it before linking KPIs';
  END IF;
  SELECT status, is_strategic INTO kpi_status, kpi_is_strategic FROM public.strata_kpis WHERE id = p_kpi;
  IF kpi_status IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF kpi_status <> 'approved'
     AND NOT (COALESCE(kpi_is_strategic, false) AND kpi_status IN ('draft','pending_approval')) THEN
    RAISE EXCEPTION 'only approved KPIs can be linked (strategic KPIs may also link while draft/pending); KPI status: %', kpi_status;
  END IF;
  IF p_contribution NOT IN ('direct','supporting') THEN
    RAISE EXCEPTION 'contribution must be direct | supporting';
  END IF;
  IF p_weight IS NOT NULL AND (p_weight < 0 OR p_weight > 100) THEN
    RAISE EXCEPTION 'weight must be between 0 and 100';
  END IF;
  IF EXISTS (SELECT 1 FROM public.strata_element_kpis WHERE element_id = p_element AND kpi_id = p_kpi) THEN
    RAISE EXCEPTION 'this KPI is already linked to the element';
  END IF;
  INSERT INTO public.strata_element_kpis (element_id, kpi_id, weight, contribution_type)
  VALUES (p_element, p_kpi, p_weight, p_contribution)
  RETURNING id INTO new_id;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_element_kpis', new_id, 'RPC:link_element_kpi', auth.uid(),
          format('%s ← %s (%s)', public.strata_entity_name('element', p_element),
                 public.strata_entity_name('kpi', p_kpi), p_contribution));
  RETURN new_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_link_element_kpi(uuid, uuid, numeric, text) TO authenticated;
