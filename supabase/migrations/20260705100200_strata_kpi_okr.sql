-- ============================================================================
-- STRATA R1b — KPI / OKR domain (governed performance dictionary)
-- CAT-STRATA-20260705-001 · Blueprint §8, §16 · Flow 3
-- KPI defined once, consumed everywhere. Five ownership roles are distinct.
-- Formula changes create versions. Actuals carry lineage + validation + SoD.
-- ============================================================================

CREATE TABLE public.strata_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  business_meaning text,
  kpi_type_id uuid REFERENCES public.strata_kpi_type_configs(id) ON DELETE SET NULL,
  unit text,
  direction text NOT NULL DEFAULT 'higher_better' CHECK (direction IN ('higher_better','lower_better','band','manual')),
  frequency text NOT NULL DEFAULT 'quarterly' CHECK (frequency IN ('weekly','monthly','quarterly','half_yearly','yearly')),
  entry_method text NOT NULL DEFAULT 'upload' CHECK (entry_method IN ('upload','manual','connector')),
  -- Distinct ownership roles (blueprint §8: do not collapse)
  accountable_owner_id uuid,
  data_owner_id uuid,
  reporter_id uuid,
  validator_id uuid,
  escalation_owner_id uuid,
  data_source_id uuid, -- FK added in the lineage migration
  threshold_scheme_id uuid REFERENCES public.strata_threshold_schemes(id) ON DELETE SET NULL,
  -- Governance envelope
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_kpis(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_kpis IS 'Governed KPI dictionary (blueprint §8). Approval gate: strata_approve_kpi enforces mandatory metadata.';

CREATE TABLE public.strata_kpi_formula_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.strata_kpis(id) ON DELETE CASCADE,
  version int NOT NULL,
  expression text NOT NULL,       -- human-auditable formula, e.g. 'actual / target' or 'numerator / denominator * 100'
  variables jsonb NOT NULL DEFAULT '{}'::jsonb, -- {numerator:'…', denominator:'…'}
  formula_type text NOT NULL DEFAULT 'ratio_to_target',
  normalization jsonb,
  effective_from timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','superseded')),
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kpi_id, version)
);
COMMENT ON TABLE public.strata_kpi_formula_versions IS 'No silent formula changes: every change is a new version with approval (blueprint §21).';

CREATE TABLE public.strata_kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.strata_kpis(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.strata_periods(id) ON DELETE CASCADE,
  baseline numeric,
  target numeric NOT NULL,
  band_min numeric,
  band_max numeric,
  tolerance numeric,
  target_type text NOT NULL DEFAULT 'point' CHECK (target_type IN ('point','band','milestone')),
  target_source text,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('draft','approved','superseded')),
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kpi_id, period_id, version)
);

CREATE TABLE public.strata_kpi_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.strata_kpis(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.strata_periods(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  entry_method text NOT NULL DEFAULT 'upload' CHECK (entry_method IN ('upload','manual','connector')),
  upload_run_id uuid,      -- FK added in the lineage migration
  staging_row_id uuid,     -- FK added in the lineage migration
  submitted_by uuid DEFAULT auth.uid(),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','validated','rejected','quarantined')),
  validated_by uuid,
  validated_at timestamptz,
  validation_note text,
  confidence numeric(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  evidence jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Blueprint §18: period + source run uniqueness
  UNIQUE NULLS NOT DISTINCT (kpi_id, period_id, upload_run_id),
  CONSTRAINT strata_actual_sod CHECK (validated_by IS NULL OR validated_by <> submitted_by)
);
COMMENT ON CONSTRAINT strata_actual_sod ON public.strata_kpi_actuals IS
  'Segregation of duties: an actual can never be validated by its submitter.';
CREATE INDEX idx_strata_actuals_kpi_period ON public.strata_kpi_actuals (kpi_id, period_id);

-- ---------------------------------------------------------------------------
-- OKRs (separate but interoperable — blueprint §8)
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  objective_element_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE,
  owner_id uuid,
  cycle_id uuid REFERENCES public.strata_cycles(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  confidence numeric(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.strata_key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id uuid NOT NULL REFERENCES public.strata_okrs(id) ON DELETE CASCADE,
  kpi_id uuid REFERENCES public.strata_kpis(id) ON DELETE SET NULL, -- optional: KR may reuse a governed KPI
  name text NOT NULL,
  unit text,
  baseline numeric,
  target numeric,
  current_value numeric,
  direction text NOT NULL DEFAULT 'higher_better' CHECK (direction IN ('higher_better','lower_better','band')),
  status text NOT NULL DEFAULT 'on_track',
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_key_results IS 'KR may reference a KPI definition or carry a standalone measurement (blueprint §8).';

CREATE TABLE public.strata_commentary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'kpi' | 'scorecard_line' | 'benefit' | 'initiative' | 'snapshot' | …
  entity_id uuid NOT NULL,
  period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_commentary_entity ON public.strata_commentary (entity_type, entity_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- KPI governance RPCs
-- ---------------------------------------------------------------------------

-- Approval gate (blueprint §8 / Appendix D): owner, source or entry method,
-- frequency, at least one approved formula version, at least one target, validator.
CREATE OR REPLACE FUNCTION public.strata_approve_kpi(p_kpi uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record; formula_ok int; target_ok int;
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF k.accountable_owner_id IS NULL THEN RAISE EXCEPTION 'approval blocked: KPI has no accountable owner'; END IF;
  IF k.validator_id IS NULL THEN RAISE EXCEPTION 'approval blocked: KPI has no validator'; END IF;
  IF k.validator_id = k.accountable_owner_id THEN
    RAISE EXCEPTION 'approval blocked: validator must differ from accountable owner (segregation of duties)';
  END IF;
  IF k.entry_method = 'upload' AND k.data_source_id IS NULL THEN
    RAISE EXCEPTION 'approval blocked: upload-fed KPI requires a registered data source';
  END IF;
  SELECT count(*) INTO formula_ok FROM public.strata_kpi_formula_versions
    WHERE kpi_id = p_kpi AND status = 'approved';
  IF formula_ok = 0 AND k.entry_method <> 'manual' THEN
    RAISE EXCEPTION 'approval blocked: KPI requires an approved formula version';
  END IF;
  SELECT count(*) INTO target_ok FROM public.strata_kpi_targets WHERE kpi_id = p_kpi AND status = 'approved';
  IF target_ok = 0 THEN RAISE EXCEPTION 'approval blocked: KPI requires at least one approved target'; END IF;
  PERFORM public.strata_approve_record('strata_kpis', p_kpi, p_note);
END;
$$;

-- Formula approval: SoD + auto-supersede previous approved version.
CREATE OR REPLACE FUNCTION public.strata_approve_formula_version(p_formula uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'formula approval requires strategy_office or admin role';
  END IF;
  SELECT * INTO f FROM public.strata_kpi_formula_versions WHERE id = p_formula;
  IF f IS NULL THEN RAISE EXCEPTION 'formula version not found'; END IF;
  IF f.status <> 'pending_approval' THEN RAISE EXCEPTION 'only pending_approval formula versions can be approved'; END IF;
  IF f.created_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the author cannot approve their own formula version';
  END IF;
  UPDATE public.strata_kpi_formula_versions
     SET status = 'superseded', updated_at = now()
   WHERE kpi_id = f.kpi_id AND status = 'approved';
  UPDATE public.strata_kpi_formula_versions
     SET status = 'approved', approved_by = auth.uid(), approved_at = now(),
         effective_from = COALESCE(effective_from, now()), updated_at = now()
   WHERE id = p_formula;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpi_formula_versions', p_formula, 'RPC:approve_formula_version', auth.uid(), p_note);
END;
$$;

-- Attestation: validator validates/rejects an actual (SoD via table CHECK + role).
CREATE OR REPLACE FUNCTION public.strata_attest_actual(p_actual uuid, p_verdict text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; k record;
BEGIN
  IF p_verdict NOT IN ('validated','rejected','quarantined') THEN
    RAISE EXCEPTION 'verdict must be validated | rejected | quarantined';
  END IF;
  SELECT * INTO a FROM public.strata_kpi_actuals WHERE id = p_actual;
  IF a IS NULL THEN RAISE EXCEPTION 'actual not found'; END IF;
  SELECT * INTO k FROM public.strata_kpis WHERE id = a.kpi_id;
  IF NOT (auth.uid() = k.validator_id OR public.strata_has_role(ARRAY['vmo_validator'])) THEN
    RAISE EXCEPTION 'attestation requires the KPI validator or a vmo_validator/admin role';
  END IF;
  IF a.submitted_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the submitter cannot attest their own actual';
  END IF;
  UPDATE public.strata_kpi_actuals
     SET validation_status = p_verdict, validated_by = auth.uid(), validated_at = now(),
         validation_note = p_note, updated_at = now()
   WHERE id = p_actual;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpi_actuals', p_actual, 'RPC:attest_actual', auth.uid(), p_verdict || COALESCE(': ' || p_note, ''));
END;
$$;

-- ---------------------------------------------------------------------------
-- Deferred FKs from the strategy/scorecard migration
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_element_kpis
  ADD CONSTRAINT strata_element_kpis_kpi_fk FOREIGN KEY (kpi_id) REFERENCES public.strata_kpis(id) ON DELETE CASCADE;
ALTER TABLE public.strata_scorecard_lines
  ADD CONSTRAINT strata_lines_kpi_fk FOREIGN KEY (kpi_id) REFERENCES public.strata_kpis(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['strata_kpis','strata_okrs'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_slug BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_generate_slug()', t, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'strata_kpis','strata_kpi_formula_versions','strata_kpi_targets','strata_kpi_actuals',
    'strata_okrs','strata_key_results','strata_commentary'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.strata_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_kpis_select ON public.strata_kpis FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_kpis_insert ON public.strata_kpis FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','kpi_owner']) AND status = 'draft');
CREATE POLICY strata_kpis_update ON public.strata_kpis FOR UPDATE
  USING (status = 'draft' AND (created_by = auth.uid() OR public.strata_is_admin()))
  WITH CHECK (status = 'draft');
CREATE POLICY strata_kpis_delete ON public.strata_kpis FOR DELETE
  USING (status = 'draft' AND (created_by = auth.uid() OR public.strata_is_admin()));

ALTER TABLE public.strata_kpi_formula_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_formula_select ON public.strata_kpi_formula_versions FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_formula_insert ON public.strata_kpi_formula_versions FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','kpi_owner']) AND status IN ('draft','pending_approval'));
CREATE POLICY strata_formula_update ON public.strata_kpi_formula_versions FOR UPDATE
  USING (status = 'draft' AND (created_by = auth.uid() OR public.strata_is_admin()))
  WITH CHECK (status IN ('draft','pending_approval'));

ALTER TABLE public.strata_kpi_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_targets_select ON public.strata_kpi_targets FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_targets_write ON public.strata_kpi_targets FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office']));

ALTER TABLE public.strata_kpi_actuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_actuals_select ON public.strata_kpi_actuals FOR SELECT
  USING (public.current_user_is_approved());
-- Submitters insert pending rows only; validation fields untouched at insert.
CREATE POLICY strata_actuals_insert ON public.strata_kpi_actuals FOR INSERT
  WITH CHECK (
    public.strata_has_role(ARRAY['kpi_owner','data_steward','strategy_office'])
    AND submitted_by = auth.uid()
    AND validation_status = 'pending'
    AND validated_by IS NULL
  );
-- Clients may edit only their own still-pending rows; attestation is RPC-only.
CREATE POLICY strata_actuals_update ON public.strata_kpi_actuals FOR UPDATE
  USING (validation_status = 'pending' AND submitted_by = auth.uid())
  WITH CHECK (validation_status = 'pending' AND validated_by IS NULL);
CREATE POLICY strata_actuals_delete ON public.strata_kpi_actuals FOR DELETE
  USING (validation_status = 'pending' AND (submitted_by = auth.uid() OR public.strata_is_admin()));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['strata_okrs','strata_key_results'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %1$s_select ON public.%1$I FOR SELECT USING (public.current_user_is_approved())', t);
    EXECUTE format($p$
      CREATE POLICY %1$s_write ON public.%1$I FOR ALL
        USING (public.strata_has_role(ARRAY['strategy_office','kpi_owner']))
        WITH CHECK (public.strata_has_role(ARRAY['strategy_office','kpi_owner']))
    $p$, t);
  END LOOP;
END $$;

ALTER TABLE public.strata_commentary ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_commentary_select ON public.strata_commentary FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_commentary_insert ON public.strata_commentary FOR INSERT
  WITH CHECK (author_id = auth.uid() AND public.current_user_is_approved());
CREATE POLICY strata_commentary_update ON public.strata_commentary FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
CREATE POLICY strata_commentary_delete ON public.strata_commentary FOR DELETE
  USING (author_id = auth.uid() OR public.strata_is_admin());
