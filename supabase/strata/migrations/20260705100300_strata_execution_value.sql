-- ============================================================================
-- STRATA R2/R3 — Execution domain (source-agnostic Project Card) + Value/VMO
-- CAT-STRATA-20260705-001 · Blueprint §9, §10, §17, §18 · Flow 3
-- Jira is a connector, never the schema: project cards carry source_system +
-- source_key; execution links carry confidence + mapping owner.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Initiatives
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  cycle_id uuid REFERENCES public.strata_cycles(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  sponsor_id uuid,
  owner_id uuid,
  stage text NOT NULL DEFAULT 'proposed', -- workflow-config-driven
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','on_hold','completed','stopped')),
  budget_envelope numeric,
  business_case text,
  value_hypothesis text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Initiative ↔ strategy element attribution (m2m — blueprint §18)
CREATE TABLE public.strata_initiative_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.strata_initiatives(id) ON DELETE CASCADE,
  element_id uuid NOT NULL REFERENCES public.strata_strategy_elements(id) ON DELETE CASCADE,
  contribution_weight numeric(6,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (initiative_id, element_id)
);

-- Initiative ↔ KPI linkage
CREATE TABLE public.strata_initiative_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.strata_initiatives(id) ON DELETE CASCADE,
  kpi_id uuid NOT NULL REFERENCES public.strata_kpis(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (initiative_id, kpi_id)
);

-- ---------------------------------------------------------------------------
-- Project cards (source-agnostic executive delivery objects)
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_project_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  source_system text NOT NULL DEFAULT 'manual' CHECK (source_system IN ('jira','manual','upload','api')),
  source_key text,          -- e.g. Jira project key; NULL for manual
  pm_id uuid,
  sector text,
  budget numeric,
  baseline_start date,
  baseline_end date,
  forecast_end date,
  actual_progress numeric(5,2) CHECK (actual_progress IS NULL OR (actual_progress >= 0 AND actual_progress <= 100)),
  execution_health text,    -- threshold-scheme band key; computed server-side, never in UI
  stage text NOT NULL DEFAULT 'active',
  risk_summary text,
  dependency_summary text,
  last_synced_at timestamptz,
  sync_metadata jsonb,      -- connector payload reference (hash, run id) — never rendered as truth
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (source_system, source_key)
);
COMMENT ON TABLE public.strata_project_cards IS
  'Executive project abstraction (blueprint §9). Jira/API/manual/upload feed this via mappings; STRATA UI never reads connector tables.';

-- Initiative ↔ project mapping with confidence + owner (blueprint §9)
CREATE TABLE public.strata_initiative_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.strata_initiatives(id) ON DELETE CASCADE,
  project_card_id uuid NOT NULL REFERENCES public.strata_project_cards(id) ON DELETE CASCADE,
  mapping_confidence numeric(4,3) CHECK (mapping_confidence IS NULL OR (mapping_confidence >= 0 AND mapping_confidence <= 1)),
  mapping_owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (initiative_id, project_card_id)
);

CREATE TABLE public.strata_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_card_id uuid NOT NULL REFERENCES public.strata_project_cards(id) ON DELETE CASCADE,
  name text NOT NULL,
  owner_id uuid,
  baseline_start date,
  baseline_end date,
  forecast_date date,
  actual_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','done','missed','descoped')),
  progress numeric(5,2) CHECK (progress IS NULL OR (progress >= 0 AND progress <= 100)),
  weight numeric(6,3) NOT NULL DEFAULT 1,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_milestones_project ON public.strata_milestones (project_card_id, order_index);

CREATE TABLE public.strata_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_type text NOT NULL CHECK (requesting_type IN ('initiative','project_card')),
  requesting_id uuid NOT NULL,
  serving_type text NOT NULL CHECK (serving_type IN ('initiative','project_card','external')),
  serving_id uuid,
  serving_label text, -- for external parties
  dependency_type text NOT NULL DEFAULT 'delivery' CHECK (dependency_type IN ('delivery','data','decision','resource','external')),
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','at_risk','blocked','resolved','cancelled')),
  sla_days int,
  impact text,
  is_blocker boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Generic traceability bridge (blueprint §9 ExecutionLink)
CREATE TABLE public.strata_execution_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type text NOT NULL,
  from_id uuid NOT NULL,
  to_type text NOT NULL,
  to_id uuid NOT NULL,
  relationship_type text NOT NULL DEFAULT 'maps_to',
  confidence numeric(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  mapping_owner_id uuid,
  metadata jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_type, from_id, to_type, to_id, relationship_type)
);

-- ---------------------------------------------------------------------------
-- Portfolio / VMO / Benefits
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  category_id uuid REFERENCES public.strata_value_categories(id) ON DELETE SET NULL,
  owner_id uuid,
  strategy_scope jsonb,
  value_target numeric,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.strata_portfolio_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.strata_portfolios(id) ON DELETE CASCADE,
  member_type text NOT NULL CHECK (member_type IN ('initiative','project_card')),
  member_id uuid NOT NULL,
  allocation_pct numeric(6,3) CHECK (allocation_pct IS NULL OR (allocation_pct >= 0 AND allocation_pct <= 100)),
  priority int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, member_type, member_id)
);

CREATE TABLE public.strata_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  category_id uuid REFERENCES public.strata_value_categories(id) ON DELETE SET NULL,
  portfolio_id uuid REFERENCES public.strata_portfolios(id) ON DELETE SET NULL,
  owner_id uuid,
  validator_id uuid,
  unit text,
  lifecycle_stage text NOT NULL DEFAULT 'identified' CHECK (lifecycle_stage IN (
    'identified','qualified','approved','baselined','in_flight','forecast_revised','realized','finance_validated','closed'
  )),
  value_hypothesis text,
  causal_mechanism text,
  confidence numeric(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_benefit_sod CHECK (validator_id IS NULL OR owner_id IS NULL OR validator_id <> owner_id)
);
COMMENT ON TABLE public.strata_benefits IS
  'Benefit lifecycle per blueprint §10 — every stage transition is audited; realized value requires finance validation.';

-- Benefit ↔ initiative attribution (m2m + share, prevents double counting)
CREATE TABLE public.strata_benefit_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.strata_benefits(id) ON DELETE CASCADE,
  initiative_id uuid NOT NULL REFERENCES public.strata_initiatives(id) ON DELETE CASCADE,
  attribution_share numeric(6,3) CHECK (attribution_share IS NULL OR (attribution_share >= 0 AND attribution_share <= 100)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (benefit_id, initiative_id)
);

-- Periodic value records: planned curve, forecast revisions, realized actuals
CREATE TABLE public.strata_benefit_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.strata_benefits(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.strata_periods(id) ON DELETE CASCADE,
  value_kind text NOT NULL CHECK (value_kind IN ('baseline','planned','forecast','realized')),
  value numeric NOT NULL,
  upload_run_id uuid,   -- FK added in the lineage migration
  submitted_by uuid DEFAULT auth.uid(),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','validated','rejected')),
  validated_by uuid,
  validated_at timestamptz,
  validation_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (benefit_id, period_id, value_kind, upload_run_id),
  CONSTRAINT strata_benefit_value_sod CHECK (validated_by IS NULL OR validated_by <> submitted_by)
);
CREATE INDEX idx_strata_benefit_values ON public.strata_benefit_values (benefit_id, period_id, value_kind);

CREATE TABLE public.strata_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.strata_benefits(id) ON DELETE CASCADE,
  description text NOT NULL,
  owner_id uuid,
  confidence numeric(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','holding','broken','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.strata_attribution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.strata_benefits(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('shared_benefit','counterfactual','double_counting')),
  definition jsonb NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Value gates (instances of governed gate models)
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_gate_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_model_id uuid NOT NULL REFERENCES public.strata_gate_models(id) ON DELETE RESTRICT,
  stage_id uuid NOT NULL REFERENCES public.strata_gate_model_stages(id) ON DELETE RESTRICT,
  subject_type text NOT NULL CHECK (subject_type IN ('initiative','project_card','benefit')),
  subject_id uuid NOT NULL,
  scheduled_for date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','decided','cancelled')),
  verdict text,             -- constrained at decision time against stage.decision_options
  verdict_note text,
  decided_by uuid,
  decided_at timestamptz,
  decision_id uuid,         -- FK added in the governance migration
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_gates_subject ON public.strata_gate_instances (subject_type, subject_id);

CREATE TABLE public.strata_gate_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_instance_id uuid NOT NULL REFERENCES public.strata_gate_instances(id) ON DELETE CASCADE,
  criterion_key text NOT NULL,
  evidence_ref jsonb,       -- {entity_type, entity_id} or {url} or {snapshot_id}
  satisfied boolean,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gate_instance_id, criterion_key)
);

-- Deferred FK from the scorecard migration
ALTER TABLE public.strata_scorecard_lines
  ADD CONSTRAINT strata_lines_benefit_fk FOREIGN KEY (benefit_id) REFERENCES public.strata_benefits(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['strata_initiatives','strata_project_cards','strata_portfolios','strata_benefits'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_slug BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_generate_slug()', t, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'strata_initiatives','strata_project_cards','strata_milestones','strata_dependencies',
    'strata_portfolios','strata_benefits','strata_benefit_values','strata_assumptions',
    'strata_attribution_rules','strata_gate_instances','strata_gate_evidence'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  -- Strategy/VMO-shaped writes
  FOREACH t IN ARRAY ARRAY[
    'strata_initiatives','strata_initiative_elements','strata_initiative_kpis',
    'strata_initiative_projects','strata_portfolios','strata_portfolio_memberships',
    'strata_execution_links'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %1$s_select ON public.%1$I FOR SELECT USING (public.current_user_is_approved())', t);
    EXECUTE format($p$
      CREATE POLICY %1$s_write ON public.%1$I FOR ALL
        USING (public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']))
        WITH CHECK (public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']))
    $p$, t);
  END LOOP;
  -- Delivery-facts writes (also connector/steward-updateable)
  FOREACH t IN ARRAY ARRAY['strata_project_cards','strata_milestones','strata_dependencies'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %1$s_select ON public.%1$I FOR SELECT USING (public.current_user_is_approved())', t);
    EXECUTE format($p$
      CREATE POLICY %1$s_write ON public.%1$I FOR ALL
        USING (public.strata_has_role(ARRAY['strategy_office','data_steward','kpi_owner']))
        WITH CHECK (public.strata_has_role(ARRAY['strategy_office','data_steward','kpi_owner']))
    $p$, t);
  END LOOP;
  -- VMO value records
  FOREACH t IN ARRAY ARRAY['strata_benefits','strata_benefit_initiatives','strata_assumptions','strata_attribution_rules'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %1$s_select ON public.%1$I FOR SELECT USING (public.current_user_is_approved())', t);
    EXECUTE format($p$
      CREATE POLICY %1$s_write ON public.%1$I FOR ALL
        USING (public.strata_has_role(ARRAY['strategy_office','vmo_validator']))
        WITH CHECK (public.strata_has_role(ARRAY['strategy_office','vmo_validator']))
    $p$, t);
  END LOOP;
END $$;

ALTER TABLE public.strata_benefit_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_benefit_values_select ON public.strata_benefit_values FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_benefit_values_insert ON public.strata_benefit_values FOR INSERT
  WITH CHECK (
    public.strata_has_role(ARRAY['kpi_owner','data_steward','strategy_office','vmo_validator'])
    AND submitted_by = auth.uid()
    AND validation_status = 'pending'
    AND validated_by IS NULL
  );
CREATE POLICY strata_benefit_values_update ON public.strata_benefit_values FOR UPDATE
  USING (validation_status = 'pending' AND submitted_by = auth.uid())
  WITH CHECK (validation_status = 'pending' AND validated_by IS NULL);
CREATE POLICY strata_benefit_values_delete ON public.strata_benefit_values FOR DELETE
  USING (validation_status = 'pending' AND (submitted_by = auth.uid() OR public.strata_is_admin()));

ALTER TABLE public.strata_gate_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_gates_select ON public.strata_gate_instances FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_gates_insert ON public.strata_gate_instances FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','vmo_validator']) AND status IN ('open','in_review') AND verdict IS NULL);
CREATE POLICY strata_gates_update ON public.strata_gate_instances FOR UPDATE
  USING (status IN ('open','in_review') AND public.strata_has_role(ARRAY['strategy_office','vmo_validator']))
  WITH CHECK (status IN ('open','in_review','cancelled') AND verdict IS NULL); -- deciding is RPC-only

ALTER TABLE public.strata_gate_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_gate_evidence_select ON public.strata_gate_evidence FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_gate_evidence_write ON public.strata_gate_evidence FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office','vmo_validator','kpi_owner','data_steward']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','vmo_validator','kpi_owner','data_steward']));

-- ---------------------------------------------------------------------------
-- Benefit validation RPC (finance/VMO attestation with SoD)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_validate_benefit_value(p_value uuid, p_verdict text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record; b record;
BEGIN
  IF p_verdict NOT IN ('validated','rejected') THEN
    RAISE EXCEPTION 'verdict must be validated | rejected';
  END IF;
  SELECT * INTO v FROM public.strata_benefit_values WHERE id = p_value;
  IF v IS NULL THEN RAISE EXCEPTION 'benefit value not found'; END IF;
  SELECT * INTO b FROM public.strata_benefits WHERE id = v.benefit_id;
  IF NOT (auth.uid() = b.validator_id OR public.strata_has_role(ARRAY['vmo_validator'])) THEN
    RAISE EXCEPTION 'benefit validation requires the benefit validator or a vmo_validator/admin role';
  END IF;
  IF v.submitted_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the submitter cannot validate their own value record';
  END IF;
  UPDATE public.strata_benefit_values
     SET validation_status = p_verdict, validated_by = auth.uid(), validated_at = now(),
         validation_note = p_note, updated_at = now()
   WHERE id = p_value;
  -- realized + validated moves the benefit lifecycle forward
  IF p_verdict = 'validated' AND v.value_kind = 'realized' THEN
    UPDATE public.strata_benefits
       SET lifecycle_stage = 'finance_validated', updated_at = now()
     WHERE id = v.benefit_id AND lifecycle_stage IN ('in_flight','realized','forecast_revised');
  END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_values', p_value, 'RPC:validate_benefit_value', auth.uid(), p_verdict || COALESCE(': ' || p_note, ''));
END;
$$;
