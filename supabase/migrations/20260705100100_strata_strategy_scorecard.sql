-- ============================================================================
-- STRATA R1a — Strategy domain + Scorecard domain
-- CAT-STRATA-20260705-001 · Blueprint §6, §7, §15, §18 · Flow 3
-- Hierarchy + network model: strata_strategy_elements (typed, self-ref) +
-- strata_map_edges (cause/effect). Scorecards are model-driven (never constants).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Strategy cycles & periods
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  period_granularity text NOT NULL DEFAULT 'quarter' CHECK (period_granularity IN ('month','quarter','half','year')),
  snapshot_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','locked','closed')),
  cloned_from_id uuid REFERENCES public.strata_cycles(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_cycles_dates CHECK (ends_on > starts_on)
);
COMMENT ON TABLE public.strata_cycles IS 'Time-bounded strategy periods (FY2026, 2026–2030 wave …). Blueprint §15.';

CREATE TABLE public.strata_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.strata_cycles(id) ON DELETE CASCADE,
  name text NOT NULL,          -- e.g. 'Q2 FY2026'
  period_type text NOT NULL CHECK (period_type IN ('month','quarter','half','year')),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  close_status text NOT NULL DEFAULT 'open' CHECK (close_status IN ('open','pending_close','closed')),
  closed_by uuid,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, name),
  CONSTRAINT strata_periods_dates CHECK (ends_on > starts_on)
);
CREATE INDEX idx_strata_periods_cycle ON public.strata_periods (cycle_id, starts_on);

-- ---------------------------------------------------------------------------
-- Strategy elements (generic node: theme / play / objective / outcome — typed
-- by data, not by schema) + cause/effect edges + play charters
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_strategy_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  cycle_id uuid NOT NULL REFERENCES public.strata_cycles(id) ON DELETE CASCADE,
  element_type text NOT NULL, -- org-configurable taxonomy: 'theme' | 'play' | 'objective' | 'outcome' | custom
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  owner_id uuid,
  parent_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE SET NULL,
  perspective_id uuid REFERENCES public.strata_perspectives(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'draft',   -- workflow-config-driven stage key
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','proposed','active','on_hold','retired')),
  order_index int NOT NULL DEFAULT 0,
  map_position jsonb, -- {x,y} canvas position (presentation-only)
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_elements_cycle ON public.strata_strategy_elements (cycle_id, element_type, order_index);
CREATE INDEX idx_strata_elements_parent ON public.strata_strategy_elements (parent_id);

CREATE TABLE public.strata_map_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.strata_cycles(id) ON DELETE CASCADE,
  from_element_id uuid NOT NULL REFERENCES public.strata_strategy_elements(id) ON DELETE CASCADE,
  to_element_id uuid NOT NULL REFERENCES public.strata_strategy_elements(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'drives' CHECK (relationship_type IN ('drives','enables','depends_on','contributes_to','mitigates')),
  confidence numeric(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  note text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_element_id, to_element_id, relationship_type),
  CONSTRAINT strata_map_edges_no_self CHECK (from_element_id <> to_element_id)
);

CREATE TABLE public.strata_play_charters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id uuid NOT NULL UNIQUE REFERENCES public.strata_strategy_elements(id) ON DELETE CASCADE,
  hypothesis text,
  scope text,
  value_thesis text,
  gate_model_id uuid REFERENCES public.strata_gate_models(id) ON DELETE SET NULL,
  owner_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_play_charters IS
  'Blueprint §6 control: a play without charter+owner+KPI set+value thesis+stage is not promotable (see strata_promote_element RPC).';

-- Element ↔ KPI attribution (m2m with weight — blueprint §18). KPI FK added in the KPI migration.
CREATE TABLE public.strata_element_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id uuid NOT NULL REFERENCES public.strata_strategy_elements(id) ON DELETE CASCADE,
  kpi_id uuid NOT NULL,
  weight numeric(6,3),
  contribution_type text NOT NULL DEFAULT 'direct' CHECK (contribution_type IN ('direct','supporting')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (element_id, kpi_id)
);

-- Promotion control RPC (blueprint §6 "Required behavior")
CREATE OR REPLACE FUNCTION public.strata_promote_element(p_element uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE el record; charter record; kpi_count int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'promotion to active governance requires strategy_office or admin role';
  END IF;
  SELECT * INTO el FROM public.strata_strategy_elements WHERE id = p_element;
  IF el IS NULL THEN RAISE EXCEPTION 'element not found'; END IF;
  IF el.owner_id IS NULL THEN RAISE EXCEPTION 'promotion blocked: element has no accountable owner'; END IF;
  IF el.element_type = 'play' THEN
    SELECT * INTO charter FROM public.strata_play_charters WHERE element_id = p_element;
    IF charter IS NULL OR charter.hypothesis IS NULL OR charter.value_thesis IS NULL OR charter.owner_id IS NULL THEN
      RAISE EXCEPTION 'promotion blocked: play requires a charter with hypothesis, value thesis and owner';
    END IF;
    SELECT count(*) INTO kpi_count FROM public.strata_element_kpis WHERE element_id = p_element;
    IF kpi_count = 0 THEN RAISE EXCEPTION 'promotion blocked: play requires at least one KPI'; END IF;
  END IF;
  UPDATE public.strata_strategy_elements SET status = 'active', updated_at = now() WHERE id = p_element;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', p_element, 'RPC:promote_element', auth.uid(), 'promoted to active governance');
END;
$$;

-- ---------------------------------------------------------------------------
-- Scorecard models (governed) → instances → lines
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_scorecard_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  owner_scope_type text NOT NULL DEFAULT 'enterprise' CHECK (owner_scope_type IN ('enterprise','sector','function','portfolio','initiative','custom')),
  rollup_method text NOT NULL DEFAULT 'weighted_average' CHECK (rollup_method IN ('weighted_average','sum','min','custom')),
  threshold_scheme_id uuid REFERENCES public.strata_threshold_schemes(id) ON DELETE SET NULL,
  period_granularity text NOT NULL DEFAULT 'quarter' CHECK (period_granularity IN ('month','quarter','half','year')),
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_scorecard_models(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_scorecard_models IS 'Reusable scorecard templates (CEO/CXO/sector/function/portfolio/initiative). Blueprint §7.';

CREATE TABLE public.strata_scorecard_model_perspectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.strata_scorecard_models(id) ON DELETE CASCADE,
  perspective_id uuid NOT NULL REFERENCES public.strata_perspectives(id) ON DELETE RESTRICT,
  weight numeric(6,3) NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, perspective_id),
  CONSTRAINT strata_smp_weight_range CHECK (weight >= 0)
);

-- Model weights must total 100 (±0.01) before approval — checked by RPC below.
CREATE OR REPLACE FUNCTION public.strata_validate_model_weights(p_model uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(abs(sum(weight) - 100) <= 0.01, false)
  FROM public.strata_scorecard_model_perspectives WHERE model_id = p_model;
$$;

CREATE TABLE public.strata_scorecard_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  model_id uuid NOT NULL REFERENCES public.strata_scorecard_models(id) ON DELETE RESTRICT,
  model_version int NOT NULL DEFAULT 1,
  cycle_id uuid NOT NULL REFERENCES public.strata_cycles(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE,
  owner_id uuid,
  entity_scope_type text,   -- mirrors model owner_scope_type; NULL = enterprise
  entity_scope_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','pending_validation','locked')),
  locked_snapshot_id uuid,  -- FK added in the governance migration
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_instances_model ON public.strata_scorecard_instances (model_id, cycle_id, period_id);

CREATE TABLE public.strata_scorecard_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.strata_scorecard_instances(id) ON DELETE CASCADE,
  perspective_id uuid NOT NULL REFERENCES public.strata_perspectives(id) ON DELETE RESTRICT,
  ref_type text NOT NULL CHECK (ref_type IN ('kpi','objective','benefit')),
  kpi_id uuid,       -- FK added in the KPI migration
  element_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE CASCADE,
  benefit_id uuid,   -- FK added in the value migration
  weight numeric(6,3) NOT NULL DEFAULT 0,
  target_override jsonb,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_line_single_ref CHECK (
    (ref_type = 'kpi'       AND kpi_id IS NOT NULL AND element_id IS NULL AND benefit_id IS NULL) OR
    (ref_type = 'objective' AND element_id IS NOT NULL AND kpi_id IS NULL AND benefit_id IS NULL) OR
    (ref_type = 'benefit'   AND benefit_id IS NOT NULL AND kpi_id IS NULL AND element_id IS NULL)
  )
);
CREATE INDEX idx_strata_lines_instance ON public.strata_scorecard_lines (instance_id, perspective_id, order_index);

-- Approval guard: scorecard models must have valid perspective weights.
CREATE OR REPLACE FUNCTION public.strata_approve_scorecard_model(p_model uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.strata_validate_model_weights(p_model) THEN
    RAISE EXCEPTION 'approval blocked: perspective weights for this model must total 100';
  END IF;
  PERFORM public.strata_approve_record('strata_scorecard_models', p_model, p_note);
END;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['strata_cycles','strata_strategy_elements','strata_scorecard_models','strata_scorecard_instances'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_slug BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_generate_slug()', t, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'strata_cycles','strata_periods','strata_strategy_elements','strata_map_edges','strata_play_charters',
    'strata_scorecard_models','strata_scorecard_instances','strata_scorecard_lines'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
-- SELECT: approved users. Writes: strategy_office/admin (strategy shaping is a
-- governed activity); scorecard lines also writable while instance is draft/live.
-- Instance status transitions to locked happen only via snapshot RPC.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'strata_cycles','strata_periods','strata_strategy_elements','strata_map_edges','strata_play_charters',
    'strata_element_kpis','strata_scorecard_model_perspectives'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %1$s_select ON public.%1$I FOR SELECT USING (public.current_user_is_approved())', t);
    EXECUTE format($p$
      CREATE POLICY %1$s_write ON public.%1$I FOR ALL
        USING (public.strata_has_role(ARRAY['strategy_office']))
        WITH CHECK (public.strata_has_role(ARRAY['strategy_office']))
    $p$, t);
  END LOOP;
END $$;

ALTER TABLE public.strata_scorecard_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_scorecard_models_select ON public.strata_scorecard_models FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_scorecard_models_insert ON public.strata_scorecard_models FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office']) AND status = 'draft');
CREATE POLICY strata_scorecard_models_update ON public.strata_scorecard_models FOR UPDATE
  USING (status = 'draft' AND (created_by = auth.uid() OR public.strata_is_admin()))
  WITH CHECK (status = 'draft');
CREATE POLICY strata_scorecard_models_delete ON public.strata_scorecard_models FOR DELETE
  USING (status = 'draft' AND (created_by = auth.uid() OR public.strata_is_admin()));

ALTER TABLE public.strata_scorecard_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_instances_select ON public.strata_scorecard_instances FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_instances_insert ON public.strata_scorecard_instances FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office']) AND status IN ('draft','live'));
CREATE POLICY strata_instances_update ON public.strata_scorecard_instances FOR UPDATE
  USING (status <> 'locked' AND public.strata_has_role(ARRAY['strategy_office']))
  WITH CHECK (status <> 'locked'); -- locking is RPC-only
CREATE POLICY strata_instances_delete ON public.strata_scorecard_instances FOR DELETE
  USING (status = 'draft' AND (created_by = auth.uid() OR public.strata_is_admin()));

ALTER TABLE public.strata_scorecard_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_lines_select ON public.strata_scorecard_lines FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_lines_write ON public.strata_scorecard_lines FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office'])
         AND EXISTS (SELECT 1 FROM public.strata_scorecard_instances i
                     WHERE i.id = instance_id AND i.status <> 'locked'))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office'])
              AND EXISTS (SELECT 1 FROM public.strata_scorecard_instances i
                          WHERE i.id = instance_id AND i.status <> 'locked'));
