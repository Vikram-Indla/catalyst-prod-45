-- CAT-STRATA-IMPL-20260712-001 · PB-DEF-002 · governed benefit definition + traceability
--
-- Adds the governed definition fields to strata_benefits (additive, nullable so existing records
-- survive as visibly-incomplete legacy), a setter RPC that validates governed references, and a
-- server-side activation guard: a benefit cannot progress beyond the initial 'identified' stage
-- until it traces to a Strategic Objective + at least one attributable project/initiative and carries
-- sponsor, reporting owner, owner, validator, baseline, calculation method, evidence and a
-- realization start date. Reuses governed entities (objectives are strata_strategy_elements of
-- element_type='objective'; KPIs are strata_kpis) — no benefit-only KPI master, no parallel entity.
--
-- accountable_owner_id also fixes strata_validate_benefit_value, whose owner_confirm branch already
-- referenced b.accountable_owner_id before the column existed.

ALTER TABLE public.strata_benefits
  ADD COLUMN IF NOT EXISTS strategic_objective_id uuid REFERENCES public.strata_strategy_elements(id),
  ADD COLUMN IF NOT EXISTS governed_kpi_id       uuid REFERENCES public.strata_kpis(id),
  ADD COLUMN IF NOT EXISTS accountable_sponsor_id uuid,
  ADD COLUMN IF NOT EXISTS reporting_owner_id    uuid,
  ADD COLUMN IF NOT EXISTS accountable_owner_id  uuid,
  ADD COLUMN IF NOT EXISTS baseline              numeric,
  ADD COLUMN IF NOT EXISTS baseline_period_id    uuid REFERENCES public.strata_periods(id),
  ADD COLUMN IF NOT EXISTS calculation_method    text,
  ADD COLUMN IF NOT EXISTS evidence_reference    text,
  ADD COLUMN IF NOT EXISTS realization_start     date,
  ADD COLUMN IF NOT EXISTS realization_end       date,
  ADD COLUMN IF NOT EXISTS funding_context       text;

-- Governance completeness — the single source of truth used by both the activation guard and the UI.
CREATE OR REPLACE FUNCTION public.strata_benefit_governance_complete(p_benefit uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.strategic_objective_id IS NOT NULL
     AND b.accountable_sponsor_id IS NOT NULL
     AND b.reporting_owner_id IS NOT NULL
     AND b.owner_id IS NOT NULL
     AND b.validator_id IS NOT NULL
     AND b.baseline IS NOT NULL
     AND b.calculation_method IS NOT NULL AND btrim(b.calculation_method) <> ''
     AND b.evidence_reference IS NOT NULL AND btrim(b.evidence_reference) <> ''
     AND b.realization_start IS NOT NULL
     AND b.funding_context IS NOT NULL AND btrim(b.funding_context) <> ''
     -- attributable via a governed link OR a shared_benefit attribution rule (splits authored on the
     -- portfolio side — the same governed relationship the Project Card reverse traceability uses).
     AND (EXISTS (SELECT 1 FROM public.strata_benefit_project_cards pc WHERE pc.benefit_id = b.id)
          OR EXISTS (SELECT 1 FROM public.strata_benefit_initiatives bi WHERE bi.benefit_id = b.id)
          OR EXISTS (SELECT 1 FROM public.strata_attribution_rules ar
                      WHERE ar.benefit_id = b.id AND ar.rule_type = 'shared_benefit'))
  FROM public.strata_benefits b WHERE b.id = p_benefit;
$$;

-- Activation guard — blocks lifecycle progression beyond 'identified' while governance is incomplete.
-- Fires only when the stage actually changes, so unrelated edits (rename, owner change) are unaffected,
-- and legacy incomplete benefits simply cannot advance until completed (prospective completion).
CREATE OR REPLACE FUNCTION public.strata_tg_benefit_activation_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.lifecycle_stage IS DISTINCT FROM OLD.lifecycle_stage
     AND NEW.lifecycle_stage <> 'identified'
     AND NOT public.strata_benefit_governance_complete(NEW.id) THEN
    RAISE EXCEPTION 'benefit governance incomplete: a Strategic Objective, an attributable project or initiative, an accountable sponsor, reporting owner, owner, validator, baseline, calculation method, evidence, funding context and a realization start date are all required before "%" can progress beyond Identified', NEW.name;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS strata_benefit_activation_guard ON public.strata_benefits;
CREATE TRIGGER strata_benefit_activation_guard
  BEFORE UPDATE ON public.strata_benefits
  FOR EACH ROW EXECUTE FUNCTION public.strata_tg_benefit_activation_guard();

-- Setter for the governed definition. Validates governed references (reuse, never invent).
CREATE OR REPLACE FUNCTION public.strata_set_benefit_governance(
  p_benefit uuid,
  p_strategic_objective uuid,
  p_governed_kpi uuid,
  p_sponsor uuid,
  p_reporting_owner uuid,
  p_accountable_owner uuid,
  p_baseline numeric,
  p_baseline_period uuid,
  p_calc_method text,
  p_evidence text,
  p_realization_start date,
  p_realization_end date,
  p_funding text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'setting benefit governance requires strategy_office, vmo_validator or data_steward (or admin)';
  END IF;
  SELECT * INTO b FROM public.strata_benefits WHERE id = p_benefit;
  IF b.id IS NULL THEN RAISE EXCEPTION 'benefit not found'; END IF;
  IF p_strategic_objective IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements e WHERE e.id = p_strategic_objective AND e.element_type = 'objective') THEN
    RAISE EXCEPTION 'strategic objective must reference a governed objective (strata_strategy_elements.element_type = objective)';
  END IF;
  IF p_governed_kpi IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_kpis k WHERE k.id = p_governed_kpi) THEN
    RAISE EXCEPTION 'governed KPI not found — reuse an existing KPI; benefit-only KPIs are not permitted';
  END IF;
  IF p_baseline IS NOT NULL AND p_baseline < 0 THEN
    RAISE EXCEPTION 'baseline must be non-negative';
  END IF;
  IF p_realization_start IS NOT NULL AND p_realization_end IS NOT NULL AND p_realization_end < p_realization_start THEN
    RAISE EXCEPTION 'realization end date cannot precede realization start date';
  END IF;

  UPDATE public.strata_benefits SET
    strategic_objective_id = p_strategic_objective,
    governed_kpi_id        = p_governed_kpi,
    accountable_sponsor_id = p_sponsor,
    reporting_owner_id     = p_reporting_owner,
    accountable_owner_id   = p_accountable_owner,
    baseline               = p_baseline,
    baseline_period_id     = p_baseline_period,
    calculation_method     = NULLIF(btrim(p_calc_method), ''),
    evidence_reference     = NULLIF(btrim(p_evidence), ''),
    realization_start      = p_realization_start,
    realization_end        = p_realization_end,
    funding_context        = NULLIF(btrim(p_funding), ''),
    updated_at = now()
  WHERE id = p_benefit;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefits', p_benefit, 'RPC:set_benefit_governance', auth.uid(), 'governed definition updated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.strata_benefit_governance_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_set_benefit_governance(uuid, uuid, uuid, uuid, uuid, uuid, numeric, uuid, text, text, date, date, text) TO authenticated;
