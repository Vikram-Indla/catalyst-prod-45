-- ============================================================================
-- STRATA RECOVERY — Authoring write paths (create → link → measure → trace)
-- CAT-STRATA-20260705-001 · Session 004 · Recovery Ledger §5–§17 / Functional
-- Spec F-STR/F-KPI/F-EXE/F-VAL/F-GOV/F-REP.
-- Closes every P0/P1 missing write path: cycles, periods, element update/owner/
-- perspective, charters, element↔KPI links, gate schedules, hardened promotion,
-- initiatives + all links, source-agnostic project cards + links, milestones
-- (weighted progress recalc), dependencies (blockers), portfolios + membership,
-- benefit update/values/assumptions/attribution, KPI targets/formula versions/
-- manual actuals, key results, decisions, actions, role assignment, snapshot
-- entity names, needs-attention rule engine, KPI evidence chain.
-- All RPCs: SECURITY DEFINER, role-guarded to mirror RLS, validate enums/refs,
-- write strata_audit_events RPC rows (table triggers add before/after images),
-- and write strata_lineage_records for canonical data writes.
-- Replaces exactly two existing functions (strata_promote_element,
-- strata_lock_snapshot) — both strictly widen validation/payload; prior bodies
-- live in 20260705100100 / 20260705100400 for rollback.
-- Staging-only apply (cyijbdeuehohvhnsywig). No production.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Shared helpers
-- ---------------------------------------------------------------------------

-- Gate instances must be schedulable for strategy plays (Recovery Ledger
-- "Play -> Gate Schedule"). Additive CHECK widening: + 'element'.
ALTER TABLE public.strata_gate_instances
  DROP CONSTRAINT IF EXISTS strata_gate_instances_subject_type_check;
ALTER TABLE public.strata_gate_instances
  ADD CONSTRAINT strata_gate_instances_subject_type_check
  CHECK (subject_type IN ('initiative','project_card','benefit','element'));

CREATE SEQUENCE IF NOT EXISTS public.strata_decision_key_seq START 1100;
CREATE SEQUENCE IF NOT EXISTS public.strata_action_key_seq START 1100;

-- Human-readable name for any STRATA entity (snapshot evidence, needs
-- attention, evidence chain). Returns NULL when unknown — never a fake name
-- (zero-assumption rendering).
CREATE OR REPLACE FUNCTION public.strata_entity_name(p_type text, p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_type
    WHEN 'kpi'                THEN (SELECT name FROM public.strata_kpis WHERE id = p_id)
    WHEN 'kpi_actual'         THEN (SELECT k.name FROM public.strata_kpi_actuals a JOIN public.strata_kpis k ON k.id = a.kpi_id WHERE a.id = p_id)
    WHEN 'element'            THEN (SELECT name FROM public.strata_strategy_elements WHERE id = p_id)
    WHEN 'objective'          THEN (SELECT name FROM public.strata_strategy_elements WHERE id = p_id)
    WHEN 'scorecard_instance' THEN (SELECT name FROM public.strata_scorecard_instances WHERE id = p_id)
    WHEN 'scorecard_line'     THEN (SELECT COALESCE(k.name, e.name, b.name)
                                      FROM public.strata_scorecard_lines l
                                      LEFT JOIN public.strata_kpis k ON k.id = l.kpi_id
                                      LEFT JOIN public.strata_strategy_elements e ON e.id = l.element_id
                                      LEFT JOIN public.strata_benefits b ON b.id = l.benefit_id
                                     WHERE l.id = p_id)
    WHEN 'perspective'        THEN (SELECT name FROM public.strata_perspectives WHERE id = p_id)
    WHEN 'initiative'         THEN (SELECT name FROM public.strata_initiatives WHERE id = p_id)
    WHEN 'project_card'       THEN (SELECT name FROM public.strata_project_cards WHERE id = p_id)
    WHEN 'milestone'          THEN (SELECT name FROM public.strata_milestones WHERE id = p_id)
    WHEN 'benefit'            THEN (SELECT name FROM public.strata_benefits WHERE id = p_id)
    WHEN 'portfolio'          THEN (SELECT name FROM public.strata_portfolios WHERE id = p_id)
    WHEN 'okr'                THEN (SELECT name FROM public.strata_okrs WHERE id = p_id)
    WHEN 'cycle'              THEN (SELECT name FROM public.strata_cycles WHERE id = p_id)
    WHEN 'period'             THEN (SELECT name FROM public.strata_periods WHERE id = p_id)
    WHEN 'dependency'         THEN (SELECT COALESCE(serving_label, dependency_type) FROM public.strata_dependencies WHERE id = p_id)
    WHEN 'gate_instance'      THEN (SELECT s.name FROM public.strata_gate_instances g JOIN public.strata_gate_model_stages s ON s.id = g.stage_id WHERE g.id = p_id)
    WHEN 'decision'           THEN (SELECT title FROM public.strata_decisions WHERE id = p_id)
    WHEN 'action'             THEN (SELECT title FROM public.strata_actions WHERE id = p_id)
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.strata_entity_name(text, uuid) IS
  'Resolves the display name for a STRATA entity reference. NULL when unknown — evidence never invents names.';

-- Existence probe used by generic link RPCs.
CREATE OR REPLACE FUNCTION public.strata_entity_exists(p_type text, p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_type
    WHEN 'kpi'          THEN EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = p_id)
    WHEN 'element'      THEN EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_id)
    WHEN 'objective'    THEN EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_id)
    WHEN 'initiative'   THEN EXISTS (SELECT 1 FROM public.strata_initiatives WHERE id = p_id)
    WHEN 'project_card' THEN EXISTS (SELECT 1 FROM public.strata_project_cards WHERE id = p_id)
    WHEN 'benefit'      THEN EXISTS (SELECT 1 FROM public.strata_benefits WHERE id = p_id)
    WHEN 'okr'          THEN EXISTS (SELECT 1 FROM public.strata_okrs WHERE id = p_id)
    ELSE false
  END;
$$;

-- ---------------------------------------------------------------------------
-- 1. LANE A — Strategy authoring & governance
-- ---------------------------------------------------------------------------

-- F-STR-001 · Create strategy cycle (draft-first; activation via update).
CREATE OR REPLACE FUNCTION public.strata_create_cycle(
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_granularity text DEFAULT 'quarter',
  p_description text DEFAULT NULL,
  p_snapshot_policy jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a cycle requires strategy_office or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'cycle name is required'; END IF;
  IF p_starts_on IS NULL OR p_ends_on IS NULL THEN RAISE EXCEPTION 'start and end dates are required'; END IF;
  IF p_ends_on <= p_starts_on THEN RAISE EXCEPTION 'cycle end date must be after start date'; END IF;
  IF p_granularity NOT IN ('month','quarter','half','year') THEN
    RAISE EXCEPTION 'period granularity must be month | quarter | half | year';
  END IF;

  INSERT INTO public.strata_cycles
    (name, description, starts_on, ends_on, period_granularity, snapshot_policy, status, created_by)
  VALUES
    (btrim(p_name), p_description, p_starts_on, p_ends_on, p_granularity,
     COALESCE(p_snapshot_policy, '{}'::jsonb), 'draft', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_cycles', new_id, 'RPC:create_cycle', auth.uid(),
          format('draft cycle %s (%s → %s, %s)', btrim(p_name), p_starts_on, p_ends_on, p_granularity));
  RETURN new_id;
END;
$$;

-- F-STR-001 · Edit cycle / lifecycle. Activation enforces the single-active-
-- overlapping-cycle rule; locked/closed cycles reject edits.
CREATE OR REPLACE FUNCTION public.strata_update_cycle(
  p_cycle uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_starts_on date DEFAULT NULL,
  p_ends_on date DEFAULT NULL,
  p_granularity text DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cyc record; ns date; ne date;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'updating a cycle requires strategy_office or admin role';
  END IF;
  SELECT * INTO cyc FROM public.strata_cycles WHERE id = p_cycle;
  IF cyc IS NULL THEN RAISE EXCEPTION 'cycle not found'; END IF;
  IF cyc.status IN ('locked','closed') AND p_status IS NULL THEN
    RAISE EXCEPTION 'cycle % is %; metadata edits are not allowed', cyc.name, cyc.status;
  END IF;

  ns := COALESCE(p_starts_on, cyc.starts_on);
  ne := COALESCE(p_ends_on, cyc.ends_on);
  IF ne <= ns THEN RAISE EXCEPTION 'cycle end date must be after start date'; END IF;
  IF p_granularity IS NOT NULL AND p_granularity NOT IN ('month','quarter','half','year') THEN
    RAISE EXCEPTION 'period granularity must be month | quarter | half | year';
  END IF;

  IF p_status IS NOT NULL AND p_status <> cyc.status THEN
    IF NOT ((cyc.status = 'draft'  AND p_status = 'active') OR
            (cyc.status = 'active' AND p_status IN ('locked','closed')) OR
            (cyc.status = 'locked' AND p_status = 'closed')) THEN
      RAISE EXCEPTION 'invalid cycle status transition % → %', cyc.status, p_status;
    END IF;
    IF p_status = 'active' AND EXISTS (
      SELECT 1 FROM public.strata_cycles c2
       WHERE c2.id <> p_cycle AND c2.status = 'active'
         AND daterange(c2.starts_on, c2.ends_on, '[]') && daterange(ns, ne, '[]')
    ) THEN
      RAISE EXCEPTION 'another active cycle overlaps % → %; close or re-date it first', ns, ne;
    END IF;
  END IF;

  UPDATE public.strata_cycles
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         starts_on = ns,
         ends_on = ne,
         period_granularity = COALESCE(p_granularity, period_granularity),
         status = COALESCE(p_status, status),
         updated_at = now()
   WHERE id = p_cycle;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_cycles', p_cycle, 'RPC:update_cycle', auth.uid(),
          CASE WHEN p_status IS NOT NULL AND p_status <> cyc.status
               THEN format('status %s → %s', cyc.status, p_status)
               ELSE 'metadata updated' END);
END;
$$;

-- F-STR-002 · Create a reporting period under a cycle. Overlaps rejected.
CREATE OR REPLACE FUNCTION public.strata_create_period(
  p_cycle uuid,
  p_name text,
  p_period_type text,
  p_starts_on date,
  p_ends_on date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cyc record; new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a period requires strategy_office or admin role';
  END IF;
  SELECT * INTO cyc FROM public.strata_cycles WHERE id = p_cycle;
  IF cyc IS NULL THEN RAISE EXCEPTION 'cycle not found'; END IF;
  IF cyc.status IN ('locked','closed') THEN
    RAISE EXCEPTION 'cycle % is %; new periods are not allowed', cyc.name, cyc.status;
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'period name is required'; END IF;
  IF p_period_type NOT IN ('month','quarter','half','year') THEN
    RAISE EXCEPTION 'period type must be month | quarter | half | year';
  END IF;
  IF p_starts_on IS NULL OR p_ends_on IS NULL THEN RAISE EXCEPTION 'start and end dates are required'; END IF;
  IF p_ends_on <= p_starts_on THEN RAISE EXCEPTION 'period end date must be after start date'; END IF;
  IF p_starts_on < cyc.starts_on OR p_ends_on > cyc.ends_on THEN
    RAISE EXCEPTION 'period % → % falls outside cycle % (% → %)', p_starts_on, p_ends_on, cyc.name, cyc.starts_on, cyc.ends_on;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.strata_periods pr
     WHERE pr.cycle_id = p_cycle
       AND daterange(pr.starts_on, pr.ends_on, '[]') && daterange(p_starts_on, p_ends_on, '[]')
  ) THEN
    RAISE EXCEPTION 'period % → % overlaps an existing period in cycle %', p_starts_on, p_ends_on, cyc.name;
  END IF;

  INSERT INTO public.strata_periods (cycle_id, name, period_type, starts_on, ends_on, close_status)
  VALUES (p_cycle, btrim(p_name), p_period_type, p_starts_on, p_ends_on, 'open')
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_periods', new_id, 'RPC:create_period', auth.uid(),
          format('period %s (%s → %s) in cycle %s', btrim(p_name), p_starts_on, p_ends_on, cyc.name));
  RETURN new_id;
END;
$$;

-- F-STR-002 · Generate the full period calendar from the cycle granularity.
-- Skips spans that already exist (idempotent); returns how many were created.
CREATE OR REPLACE FUNCTION public.strata_generate_periods(p_cycle uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cyc record;
  step interval;
  d_start date;
  d_end date;
  n int := 0;
  idx int := 0;
  label text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'generating periods requires strategy_office or admin role';
  END IF;
  SELECT * INTO cyc FROM public.strata_cycles WHERE id = p_cycle;
  IF cyc IS NULL THEN RAISE EXCEPTION 'cycle not found'; END IF;
  IF cyc.status IN ('locked','closed') THEN
    RAISE EXCEPTION 'cycle % is %; new periods are not allowed', cyc.name, cyc.status;
  END IF;

  step := CASE cyc.period_granularity
    WHEN 'month' THEN interval '1 month'
    WHEN 'quarter' THEN interval '3 months'
    WHEN 'half' THEN interval '6 months'
    ELSE interval '12 months' END;

  d_start := cyc.starts_on;
  WHILE d_start <= cyc.ends_on LOOP
    idx := idx + 1;
    d_end := LEAST((d_start + step - interval '1 day')::date, cyc.ends_on);
    label := CASE cyc.period_granularity
      WHEN 'month'   THEN to_char(d_start, 'Mon YYYY')
      WHEN 'quarter' THEN format('Q%s %s', idx, cyc.name)
      WHEN 'half'    THEN format('H%s %s', idx, cyc.name)
      ELSE cyc.name END;
    IF NOT EXISTS (
      SELECT 1 FROM public.strata_periods pr
       WHERE pr.cycle_id = p_cycle
         AND daterange(pr.starts_on, pr.ends_on, '[]') && daterange(d_start, d_end, '[]')
    ) THEN
      INSERT INTO public.strata_periods (cycle_id, name, period_type, starts_on, ends_on, close_status)
      VALUES (p_cycle, label, cyc.period_granularity, d_start, d_end, 'open');
      n := n + 1;
    END IF;
    d_start := (d_start + step)::date;
  END LOOP;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_cycles', p_cycle, 'RPC:generate_periods', auth.uid(),
          format('%s %s period(s) generated for %s', n, cyc.period_granularity, cyc.name));
  RETURN n;
END;
$$;

-- F-STR-004 / ledger "Edit hierarchy parent/order/status" · Patch a strategy
-- element: name, description, owner, perspective, parent (loop-safe), stage,
-- order. Retired elements reject edits.
CREATE OR REPLACE FUNCTION public.strata_update_element(
  p_element uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_perspective uuid DEFAULT NULL,
  p_parent uuid DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_order_index int DEFAULT NULL,
  p_clear_parent boolean DEFAULT false,
  p_clear_owner boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE el record; walker uuid; hops int := 0; parent_cycle uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'updating a strategy element requires strategy_office or admin role';
  END IF;
  SELECT * INTO el FROM public.strata_strategy_elements WHERE id = p_element;
  IF el IS NULL THEN RAISE EXCEPTION 'element not found'; END IF;
  IF el.status = 'retired' THEN RAISE EXCEPTION 'retired elements cannot be edited'; END IF;

  IF p_perspective IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_perspectives WHERE id = p_perspective) THEN
    RAISE EXCEPTION 'perspective not found';
  END IF;

  IF p_parent IS NOT NULL THEN
    IF p_parent = p_element THEN RAISE EXCEPTION 'element cannot be its own parent'; END IF;
    SELECT cycle_id INTO parent_cycle FROM public.strata_strategy_elements WHERE id = p_parent;
    IF parent_cycle IS NULL THEN RAISE EXCEPTION 'parent element not found'; END IF;
    IF parent_cycle <> el.cycle_id THEN RAISE EXCEPTION 'parent element belongs to a different cycle'; END IF;
    -- reject cycles in the hierarchy
    walker := p_parent;
    WHILE walker IS NOT NULL AND hops < 50 LOOP
      IF walker = p_element THEN RAISE EXCEPTION 'parent change would create a hierarchy loop'; END IF;
      SELECT parent_id INTO walker FROM public.strata_strategy_elements WHERE id = walker;
      hops := hops + 1;
    END LOOP;
  END IF;

  UPDATE public.strata_strategy_elements
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         owner_id = CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, owner_id) END,
         perspective_id = COALESCE(p_perspective, perspective_id),
         parent_id = CASE WHEN p_clear_parent THEN NULL ELSE COALESCE(p_parent, parent_id) END,
         stage = COALESCE(p_stage, stage),
         order_index = COALESCE(p_order_index, order_index),
         updated_at = now()
   WHERE id = p_element;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', p_element, 'RPC:update_element', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_owner IS NOT NULL OR p_clear_owner THEN 'owner changed' END,
            CASE WHEN p_perspective IS NOT NULL THEN 'perspective changed' END,
            CASE WHEN p_parent IS NOT NULL OR p_clear_parent THEN 'parent changed' END,
            CASE WHEN p_name IS NOT NULL THEN 'renamed' END,
            CASE WHEN p_stage IS NOT NULL THEN format('stage → %s', p_stage) END));
END;
$$;

-- Ledger "Retire/archive element" · history-preserving retirement.
CREATE OR REPLACE FUNCTION public.strata_retire_element(p_element uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE el record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'retiring a strategy element requires strategy_office or admin role';
  END IF;
  SELECT * INTO el FROM public.strata_strategy_elements WHERE id = p_element;
  IF el IS NULL THEN RAISE EXCEPTION 'element not found'; END IF;
  IF el.status = 'retired' THEN RAISE EXCEPTION 'element is already retired'; END IF;

  UPDATE public.strata_strategy_elements SET status = 'retired', updated_at = now() WHERE id = p_element;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', p_element, 'RPC:retire_element', auth.uid(),
          COALESCE('retired: ' || p_reason, 'retired'));
END;
$$;

-- F-STR-005 · Author/maintain the play charter. Status derives from
-- completeness (hypothesis + scope + value thesis + owner + gate model).
CREATE OR REPLACE FUNCTION public.strata_upsert_play_charter(
  p_element uuid,
  p_hypothesis text DEFAULT NULL,
  p_scope text DEFAULT NULL,
  p_value_thesis text DEFAULT NULL,
  p_gate_model uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE el record; ch record; cid uuid; new_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'authoring a charter requires strategy_office or admin role';
  END IF;
  SELECT * INTO el FROM public.strata_strategy_elements WHERE id = p_element;
  IF el IS NULL THEN RAISE EXCEPTION 'element not found'; END IF;
  IF el.status = 'retired' THEN RAISE EXCEPTION 'retired elements cannot receive a charter'; END IF;
  IF p_gate_model IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.strata_gate_models WHERE id = p_gate_model AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'gate model not found or not approved';
  END IF;

  SELECT * INTO ch FROM public.strata_play_charters WHERE element_id = p_element;
  IF ch IS NULL THEN
    INSERT INTO public.strata_play_charters (element_id, hypothesis, scope, value_thesis, gate_model_id, owner_id, status)
    VALUES (p_element, p_hypothesis, p_scope, p_value_thesis, p_gate_model, p_owner, 'draft')
    RETURNING id INTO cid;
  ELSE
    cid := ch.id;
    UPDATE public.strata_play_charters
       SET hypothesis = COALESCE(p_hypothesis, hypothesis),
           scope = COALESCE(p_scope, scope),
           value_thesis = COALESCE(p_value_thesis, value_thesis),
           gate_model_id = COALESCE(p_gate_model, gate_model_id),
           owner_id = COALESCE(p_owner, owner_id),
           updated_at = now()
     WHERE id = cid;
  END IF;

  SELECT CASE WHEN c.hypothesis IS NOT NULL AND btrim(c.hypothesis) <> ''
              AND c.scope IS NOT NULL AND btrim(c.scope) <> ''
              AND c.value_thesis IS NOT NULL AND btrim(c.value_thesis) <> ''
              AND c.owner_id IS NOT NULL AND c.gate_model_id IS NOT NULL
         THEN 'complete' ELSE 'draft' END
    INTO new_status
    FROM public.strata_play_charters c WHERE c.id = cid;
  UPDATE public.strata_play_charters SET status = new_status, updated_at = now() WHERE id = cid;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_play_charters', cid, 'RPC:upsert_play_charter', auth.uid(),
          format('charter %s for %s', new_status, el.name));
  RETURN cid;
END;
$$;

-- F-STR-006 · Link/unlink KPI set to a strategy element with weight.
CREATE OR REPLACE FUNCTION public.strata_link_element_kpi(
  p_element uuid,
  p_kpi uuid,
  p_weight numeric DEFAULT NULL,
  p_contribution text DEFAULT 'direct'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; kpi_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'linking KPIs requires strategy_office or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_element AND status <> 'retired') THEN
    RAISE EXCEPTION 'element not found or retired';
  END IF;
  SELECT status INTO kpi_status FROM public.strata_kpis WHERE id = p_kpi;
  IF kpi_status IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF kpi_status <> 'approved' THEN
    RAISE EXCEPTION 'only approved KPIs can be linked (KPI status: %)', kpi_status;
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
$$;

CREATE OR REPLACE FUNCTION public.strata_unlink_element_kpi(p_element uuid, p_kpi uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'unlinking KPIs requires strategy_office or admin role';
  END IF;
  DELETE FROM public.strata_element_kpis WHERE element_id = p_element AND kpi_id = p_kpi
  RETURNING id INTO link_id;
  IF link_id IS NULL THEN RAISE EXCEPTION 'link not found'; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_element_kpis', link_id, 'RPC:unlink_element_kpi', auth.uid(),
          format('%s ⇸ %s', public.strata_entity_name('element', p_element),
                 public.strata_entity_name('kpi', p_kpi)));
END;
$$;

-- F-STR-007 / F-VAL-008 · Schedule a gate instance for a play (element),
-- initiative, project card or benefit, from an approved gate model stage.
CREATE OR REPLACE FUNCTION public.strata_schedule_gate(
  p_gate_model uuid,
  p_stage uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_scheduled_for date DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'scheduling a gate requires strategy_office, vmo_validator or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_gate_models WHERE id = p_gate_model AND status = 'approved') THEN
    RAISE EXCEPTION 'gate model not found or not approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_gate_model_stages WHERE id = p_stage AND gate_model_id = p_gate_model) THEN
    RAISE EXCEPTION 'stage does not belong to the selected gate model';
  END IF;
  IF p_subject_type NOT IN ('initiative','project_card','benefit','element') THEN
    RAISE EXCEPTION 'subject type must be initiative | project_card | benefit | element';
  END IF;
  IF NOT public.strata_entity_exists(p_subject_type, p_subject_id) THEN
    RAISE EXCEPTION '% not found', p_subject_type;
  END IF;

  INSERT INTO public.strata_gate_instances
    (gate_model_id, stage_id, subject_type, subject_id, scheduled_for, status, created_by)
  VALUES (p_gate_model, p_stage, p_subject_type, p_subject_id, p_scheduled_for, 'open', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_gate_instances', new_id, 'RPC:schedule_gate', auth.uid(),
          format('gate scheduled for %s "%s"%s', p_subject_type,
                 public.strata_entity_name(p_subject_type, p_subject_id),
                 COALESCE(' on ' || p_scheduled_for, '')));
  RETURN new_id;
END;
$$;

-- F-STR-008 · REPLACED: promotion guard now aggregates EVERY missing
-- prerequisite into one explicit error, and (for plays) additionally requires
-- charter completeness (hypothesis + scope + value thesis + owner), a value
-- hypothesis (charter value thesis), ≥1 linked KPI, and a gate schedule.
-- Prior body: 20260705100100_strata_strategy_scorecard.sql (rollback source).
CREATE OR REPLACE FUNCTION public.strata_promote_element(p_element uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  el record; charter record; kpi_count int; gate_count int;
  missing text[] := '{}';
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'promotion to active governance requires strategy_office or admin role';
  END IF;
  SELECT * INTO el FROM public.strata_strategy_elements WHERE id = p_element;
  IF el IS NULL THEN RAISE EXCEPTION 'element not found'; END IF;
  IF el.status = 'active' THEN RAISE EXCEPTION 'element is already active'; END IF;
  IF el.status = 'retired' THEN RAISE EXCEPTION 'retired elements cannot be promoted'; END IF;

  IF el.owner_id IS NULL THEN missing := missing || 'accountable owner'; END IF;

  IF el.element_type = 'play' THEN
    SELECT * INTO charter FROM public.strata_play_charters WHERE element_id = p_element;
    IF charter IS NULL THEN
      missing := missing || 'charter';
      missing := missing || 'value hypothesis (charter value thesis)';
      missing := missing || 'gate schedule';
    ELSE
      IF charter.hypothesis IS NULL OR btrim(charter.hypothesis) = '' THEN missing := missing || 'charter hypothesis'; END IF;
      IF charter.scope IS NULL OR btrim(charter.scope) = '' THEN missing := missing || 'charter scope'; END IF;
      IF charter.value_thesis IS NULL OR btrim(charter.value_thesis) = '' THEN missing := missing || 'value hypothesis (charter value thesis)'; END IF;
      IF charter.owner_id IS NULL THEN missing := missing || 'charter owner'; END IF;
      SELECT count(*) INTO gate_count FROM public.strata_gate_instances
       WHERE subject_type = 'element' AND subject_id = p_element;
      IF gate_count = 0 THEN missing := missing || 'gate schedule'; END IF;
    END IF;
    SELECT count(*) INTO kpi_count FROM public.strata_element_kpis WHERE element_id = p_element;
    IF kpi_count = 0 THEN missing := missing || 'linked KPI set (at least one KPI)'; END IF;
  END IF;

  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'promotion blocked — missing: %', array_to_string(missing, '; ');
  END IF;

  UPDATE public.strata_strategy_elements SET status = 'active', updated_at = now() WHERE id = p_element;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_elements', p_element, 'RPC:promote_element', auth.uid(),
          'promoted to active governance (owner + charter + value hypothesis + KPI set + gate schedule verified)');
END;
$$;

COMMENT ON FUNCTION public.strata_promote_element(uuid) IS
  'Server-side promotion guard (F-STR-008): aggregates ALL missing prerequisites (owner, charter completeness, value hypothesis, KPI set, gate schedule) into one explicit error.';

-- ---------------------------------------------------------------------------
-- 2. LANE B — KPI / OKR / targets / actuals
-- ---------------------------------------------------------------------------

-- F-KPI-001 · Patch a draft KPI's governance metadata (owners, source, type).
CREATE OR REPLACE FUNCTION public.strata_update_kpi(
  p_kpi uuid,
  p_name text DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_direction text DEFAULT NULL,
  p_frequency text DEFAULT NULL,
  p_entry_method text DEFAULT NULL,
  p_accountable_owner uuid DEFAULT NULL,
  p_data_owner uuid DEFAULT NULL,
  p_reporter uuid DEFAULT NULL,
  p_validator uuid DEFAULT NULL,
  p_escalation_owner uuid DEFAULT NULL,
  p_data_source uuid DEFAULT NULL,
  p_threshold_scheme uuid DEFAULT NULL,
  p_kpi_type uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'updating a KPI requires strategy_office, kpi_owner or admin role';
  END IF;
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF k.status NOT IN ('draft','pending_approval') THEN
    RAISE EXCEPTION 'only draft or pending KPIs can be edited (current: %); retire and recreate to change an approved KPI', k.status;
  END IF;
  IF p_direction IS NOT NULL AND p_direction NOT IN ('higher_better','lower_better','band','manual') THEN
    RAISE EXCEPTION 'direction must be higher_better | lower_better | band | manual';
  END IF;
  IF p_frequency IS NOT NULL AND p_frequency NOT IN ('weekly','monthly','quarterly','half_yearly','yearly') THEN
    RAISE EXCEPTION 'frequency must be weekly | monthly | quarterly | half_yearly | yearly';
  END IF;
  IF p_entry_method IS NOT NULL AND p_entry_method NOT IN ('upload','manual','connector') THEN
    RAISE EXCEPTION 'entry_method must be upload | manual | connector';
  END IF;
  IF p_validator IS NOT NULL AND p_validator = COALESCE(p_accountable_owner, k.accountable_owner_id) THEN
    RAISE EXCEPTION 'validator must differ from the accountable owner (separation of duties)';
  END IF;
  IF p_data_source IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_data_sources WHERE id = p_data_source) THEN
    RAISE EXCEPTION 'data source not found';
  END IF;
  IF p_threshold_scheme IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_threshold_schemes WHERE id = p_threshold_scheme) THEN
    RAISE EXCEPTION 'threshold scheme not found';
  END IF;
  IF p_kpi_type IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_kpi_type_configs WHERE id = p_kpi_type) THEN
    RAISE EXCEPTION 'KPI type config not found';
  END IF;

  UPDATE public.strata_kpis
     SET name = COALESCE(btrim(p_name), name),
         unit = COALESCE(p_unit, unit),
         direction = COALESCE(p_direction, direction),
         frequency = COALESCE(p_frequency, frequency),
         entry_method = COALESCE(p_entry_method, entry_method),
         accountable_owner_id = COALESCE(p_accountable_owner, accountable_owner_id),
         data_owner_id = COALESCE(p_data_owner, data_owner_id),
         reporter_id = COALESCE(p_reporter, reporter_id),
         validator_id = COALESCE(p_validator, validator_id),
         escalation_owner_id = COALESCE(p_escalation_owner, escalation_owner_id),
         data_source_id = COALESCE(p_data_source, data_source_id),
         threshold_scheme_id = COALESCE(p_threshold_scheme, threshold_scheme_id),
         kpi_type_id = COALESCE(p_kpi_type, kpi_type_id),
         updated_at = now()
   WHERE id = p_kpi;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpis', p_kpi, 'RPC:update_kpi', auth.uid(), 'KPI governance metadata updated');
END;
$$;

-- F-KPI-002 · New formula version (N+1, pending approval — approval via the
-- existing strata_approve_formula_version, which supersedes the prior one and
-- never mutates old snapshot evidence).
CREATE OR REPLACE FUNCTION public.strata_create_formula_version(
  p_kpi uuid,
  p_expression text,
  p_variables jsonb DEFAULT '{}'::jsonb,
  p_formula_type text DEFAULT 'ratio_to_target',
  p_change_reason text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; next_version int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'creating a formula version requires strategy_office, kpi_owner or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = p_kpi) THEN
    RAISE EXCEPTION 'KPI not found';
  END IF;
  IF p_expression IS NULL OR btrim(p_expression) = '' THEN
    RAISE EXCEPTION 'formula expression is required';
  END IF;

  SELECT COALESCE(max(version), 0) + 1 INTO next_version
    FROM public.strata_kpi_formula_versions WHERE kpi_id = p_kpi;

  INSERT INTO public.strata_kpi_formula_versions
    (kpi_id, version, expression, variables, formula_type, status, change_reason, created_by)
  VALUES
    (p_kpi, next_version, btrim(p_expression), COALESCE(p_variables, '{}'::jsonb),
     p_formula_type, 'pending_approval', p_change_reason, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpi_formula_versions', new_id, 'RPC:create_formula_version', auth.uid(),
          format('v%s pending approval for %s', next_version, public.strata_entity_name('kpi', p_kpi)));
  RETURN new_id;
END;
$$;

-- F-KPI-003 · Period target/baseline. Versioned per (kpi, period): the new
-- version is approved and the prior approved version is superseded, so the
-- calc engine (which reads status=approved, max version) picks it up while
-- history stays intact.
CREATE OR REPLACE FUNCTION public.strata_create_kpi_target(
  p_kpi uuid,
  p_period uuid,
  p_target numeric,
  p_baseline numeric DEFAULT NULL,
  p_band_min numeric DEFAULT NULL,
  p_band_max numeric DEFAULT NULL,
  p_tolerance numeric DEFAULT NULL,
  p_target_type text DEFAULT 'point'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; next_version int; per record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a KPI target requires strategy_office or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = p_kpi) THEN
    RAISE EXCEPTION 'KPI not found';
  END IF;
  SELECT * INTO per FROM public.strata_periods WHERE id = p_period;
  IF per IS NULL THEN RAISE EXCEPTION 'period not found'; END IF;
  IF per.close_status = 'closed' THEN RAISE EXCEPTION 'period % is closed; targets cannot be set', per.name; END IF;
  IF p_target IS NULL THEN RAISE EXCEPTION 'target value is required'; END IF;
  IF p_target_type NOT IN ('point','band','milestone') THEN
    RAISE EXCEPTION 'target type must be point | band | milestone';
  END IF;
  IF p_target_type = 'band' AND (p_band_min IS NULL OR p_band_max IS NULL) THEN
    RAISE EXCEPTION 'band targets require band_min and band_max';
  END IF;
  IF p_band_min IS NOT NULL AND p_band_max IS NOT NULL AND p_band_max <= p_band_min THEN
    RAISE EXCEPTION 'band_max must be greater than band_min';
  END IF;

  SELECT COALESCE(max(version), 0) + 1 INTO next_version
    FROM public.strata_kpi_targets WHERE kpi_id = p_kpi AND period_id = p_period;

  UPDATE public.strata_kpi_targets
     SET status = 'superseded', updated_at = now()
   WHERE kpi_id = p_kpi AND period_id = p_period AND status = 'approved';

  INSERT INTO public.strata_kpi_targets
    (kpi_id, period_id, baseline, target, band_min, band_max, tolerance,
     target_type, target_source, version, status, approved_by, approved_at, created_by)
  VALUES
    (p_kpi, p_period, p_baseline, p_target, p_band_min, p_band_max, p_tolerance,
     p_target_type, 'manual', next_version, 'approved', auth.uid(), now(), auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpi_targets', new_id, 'RPC:create_kpi_target', auth.uid(),
          format('target v%s = %s for %s · %s', next_version, p_target,
                 public.strata_entity_name('kpi', p_kpi), per.name));
  RETURN new_id;
END;
$$;

-- F-KPI-004 · Manual KPI actual submission with commentary/evidence.
-- Enters pending validation; attestation stays a separate human step
-- (strata_attest_actual — SoD submitter ≠ validator enforced by table CHECK).
-- Resubmission before validation updates the pending row (one manual actual
-- per KPI+period by UNIQUE NULLS NOT DISTINCT).
CREATE OR REPLACE FUNCTION public.strata_submit_kpi_actual(
  p_kpi uuid,
  p_period uuid,
  p_value numeric,
  p_note text DEFAULT NULL,
  p_confidence numeric DEFAULT NULL,
  p_evidence jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record; per record; existing record; actual_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['kpi_owner','data_steward','strategy_office']) THEN
    RAISE EXCEPTION 'submitting a KPI actual requires kpi_owner, data_steward, strategy_office or admin role';
  END IF;
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF k.status <> 'approved' THEN
    RAISE EXCEPTION 'actuals can only be submitted against approved KPIs (current: %)', k.status;
  END IF;
  SELECT * INTO per FROM public.strata_periods WHERE id = p_period;
  IF per IS NULL THEN RAISE EXCEPTION 'period not found'; END IF;
  IF per.close_status = 'closed' THEN
    RAISE EXCEPTION 'period % is closed; actuals cannot be submitted', per.name;
  END IF;
  IF p_value IS NULL THEN RAISE EXCEPTION 'actual value is required'; END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'confidence must be between 0 and 1';
  END IF;

  SELECT * INTO existing FROM public.strata_kpi_actuals
   WHERE kpi_id = p_kpi AND period_id = p_period AND upload_run_id IS NULL;

  IF existing IS NOT NULL THEN
    IF existing.validation_status = 'validated' THEN
      RAISE EXCEPTION 'a validated manual actual already exists for % · %; correction requires a new period value via governance', k.name, per.name;
    END IF;
    UPDATE public.strata_kpi_actuals
       SET value = p_value,
           confidence = COALESCE(p_confidence, confidence),
           evidence = COALESCE(p_evidence, evidence, '{}'::jsonb)
                      || CASE WHEN p_note IS NOT NULL THEN jsonb_build_object('note', p_note) ELSE '{}'::jsonb END,
           submitted_by = auth.uid(),
           submitted_at = now(),
           validation_status = 'pending',
           validated_by = NULL, validated_at = NULL, validation_note = NULL,
           updated_at = now()
     WHERE id = existing.id;
    actual_id := existing.id;
  ELSE
    INSERT INTO public.strata_kpi_actuals
      (kpi_id, period_id, value, entry_method, submitted_by, validation_status, confidence, evidence)
    VALUES
      (p_kpi, p_period, p_value, 'manual', auth.uid(), 'pending', p_confidence,
       COALESCE(p_evidence, '{}'::jsonb)
       || CASE WHEN p_note IS NOT NULL THEN jsonb_build_object('note', p_note) ELSE '{}'::jsonb END)
    RETURNING id INTO actual_id;
  END IF;

  -- Manual-entry lineage (channel provenance; no upload run).
  INSERT INTO public.strata_lineage_records
    (entity_table, entity_id, written_by, config_context)
  VALUES
    ('strata_kpi_actuals', actual_id, auth.uid(),
     jsonb_build_object('channel', 'manual', 'kpi_id', p_kpi, 'period_id', p_period,
                        'note', p_note));

  IF p_note IS NOT NULL AND btrim(p_note) <> '' THEN
    INSERT INTO public.strata_commentary (entity_type, entity_id, period_id, author_id, body, status)
    VALUES ('kpi', p_kpi, p_period, auth.uid(), btrim(p_note), 'published');
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpi_actuals', actual_id, 'RPC:submit_kpi_actual', auth.uid(),
          format('manual actual %s for %s · %s (pending attestation)', p_value, k.name, per.name));
  RETURN actual_id;
END;
$$;

-- F-KPI-006 · Key Results under an OKR, optionally measured by a KPI.
CREATE OR REPLACE FUNCTION public.strata_create_key_result(
  p_okr uuid,
  p_name text,
  p_kpi uuid DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_baseline numeric DEFAULT NULL,
  p_target numeric DEFAULT NULL,
  p_current_value numeric DEFAULT NULL,
  p_direction text DEFAULT 'higher_better'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; next_order int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'creating a key result requires strategy_office, kpi_owner or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_okrs WHERE id = p_okr) THEN
    RAISE EXCEPTION 'OKR not found';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'key result name is required'; END IF;
  IF p_kpi IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = p_kpi) THEN
    RAISE EXCEPTION 'KPI not found';
  END IF;
  IF p_direction NOT IN ('higher_better','lower_better','band') THEN
    RAISE EXCEPTION 'direction must be higher_better | lower_better | band';
  END IF;

  SELECT COALESCE(max(order_index), 0) + 1 INTO next_order
    FROM public.strata_key_results WHERE okr_id = p_okr;

  INSERT INTO public.strata_key_results
    (okr_id, kpi_id, name, unit, baseline, target, current_value, direction, status, order_index)
  VALUES
    (p_okr, p_kpi, btrim(p_name), p_unit, p_baseline, p_target, p_current_value, p_direction, 'active', next_order)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_key_results', new_id, 'RPC:create_key_result', auth.uid(),
          format('KR "%s" under %s%s', btrim(p_name), public.strata_entity_name('okr', p_okr),
                 CASE WHEN p_kpi IS NOT NULL THEN ' measured by ' || public.strata_entity_name('kpi', p_kpi) ELSE '' END));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_update_key_result(
  p_kr uuid,
  p_current_value numeric DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_target numeric DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_kpi uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE kr record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','kpi_owner']) THEN
    RAISE EXCEPTION 'updating a key result requires strategy_office, kpi_owner or admin role';
  END IF;
  SELECT * INTO kr FROM public.strata_key_results WHERE id = p_kr;
  IF kr IS NULL THEN RAISE EXCEPTION 'key result not found'; END IF;
  IF p_kpi IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_kpis WHERE id = p_kpi) THEN
    RAISE EXCEPTION 'KPI not found';
  END IF;

  UPDATE public.strata_key_results
     SET current_value = COALESCE(p_current_value, current_value),
         name = COALESCE(btrim(p_name), name),
         target = COALESCE(p_target, target),
         status = COALESCE(p_status, status),
         kpi_id = COALESCE(p_kpi, kpi_id),
         updated_at = now()
   WHERE id = p_kr;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_key_results', p_kr, 'RPC:update_key_result', auth.uid(),
          CASE WHEN p_current_value IS NOT NULL THEN format('progress → %s', p_current_value) ELSE 'updated' END);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. LANE C — Initiative registry & linkage
-- ---------------------------------------------------------------------------

-- F-EXE-001 · Create initiative.
CREATE OR REPLACE FUNCTION public.strata_create_initiative(
  p_name text,
  p_cycle uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_sponsor uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_stage text DEFAULT 'proposed',
  p_budget_envelope numeric DEFAULT NULL,
  p_business_case text DEFAULT NULL,
  p_value_hypothesis text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating an initiative requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'initiative name is required'; END IF;
  IF p_cycle IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.strata_cycles WHERE id = p_cycle) THEN
      RAISE EXCEPTION 'cycle not found';
    END IF;
    IF EXISTS (SELECT 1 FROM public.strata_cycles WHERE id = p_cycle AND status IN ('locked','closed')) THEN
      RAISE EXCEPTION 'cycle is locked/closed; new initiatives are not allowed';
    END IF;
  END IF;
  IF p_budget_envelope IS NOT NULL AND p_budget_envelope < 0 THEN
    RAISE EXCEPTION 'budget envelope cannot be negative';
  END IF;

  INSERT INTO public.strata_initiatives
    (name, cycle_id, description, sponsor_id, owner_id, stage, status,
     budget_envelope, business_case, value_hypothesis, created_by)
  VALUES
    (btrim(p_name), p_cycle, p_description, p_sponsor, p_owner, COALESCE(p_stage, 'proposed'), 'draft',
     p_budget_envelope, p_business_case, p_value_hypothesis, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiatives', new_id, 'RPC:create_initiative', auth.uid(),
          format('draft initiative "%s" created', btrim(p_name)));
  RETURN new_id;
END;
$$;

-- F-EXE-002 · Edit initiative (governed status machine).
CREATE OR REPLACE FUNCTION public.strata_update_initiative(
  p_initiative uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_sponsor uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_budget_envelope numeric DEFAULT NULL,
  p_business_case text DEFAULT NULL,
  p_value_hypothesis text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ini record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating an initiative requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO ini FROM public.strata_initiatives WHERE id = p_initiative;
  IF ini IS NULL THEN RAISE EXCEPTION 'initiative not found'; END IF;
  IF ini.status = 'stopped' AND p_status IS NULL THEN
    RAISE EXCEPTION 'stopped (archived) initiatives cannot be edited';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('draft','active','on_hold','completed','stopped') THEN
    RAISE EXCEPTION 'status must be draft | active | on_hold | completed | stopped';
  END IF;
  IF p_budget_envelope IS NOT NULL AND p_budget_envelope < 0 THEN
    RAISE EXCEPTION 'budget envelope cannot be negative';
  END IF;

  UPDATE public.strata_initiatives
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         sponsor_id = COALESCE(p_sponsor, sponsor_id),
         owner_id = COALESCE(p_owner, owner_id),
         stage = COALESCE(p_stage, stage),
         status = COALESCE(p_status, status),
         budget_envelope = COALESCE(p_budget_envelope, budget_envelope),
         business_case = COALESCE(p_business_case, business_case),
         value_hypothesis = COALESCE(p_value_hypothesis, value_hypothesis),
         updated_at = now()
   WHERE id = p_initiative;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiatives', p_initiative, 'RPC:update_initiative', auth.uid(),
          CASE WHEN p_status IS NOT NULL AND p_status <> ini.status
               THEN format('status %s → %s', ini.status, p_status) ELSE 'updated' END);
END;
$$;

-- F-EXE-002 · Archive/retire with mandatory reason (history preserved).
CREATE OR REPLACE FUNCTION public.strata_archive_initiative(p_initiative uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ini record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'archiving an initiative requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'an archive reason is required';
  END IF;
  SELECT * INTO ini FROM public.strata_initiatives WHERE id = p_initiative;
  IF ini IS NULL THEN RAISE EXCEPTION 'initiative not found'; END IF;
  IF ini.status = 'stopped' THEN RAISE EXCEPTION 'initiative is already archived'; END IF;

  UPDATE public.strata_initiatives SET status = 'stopped', updated_at = now() WHERE id = p_initiative;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiatives', p_initiative, 'RPC:archive_initiative', auth.uid(),
          'archived: ' || btrim(p_reason));
END;
$$;

-- F-EXE-004 · Initiative ↔ strategy element (contribution weight).
CREATE OR REPLACE FUNCTION public.strata_link_initiative_element(
  p_initiative uuid, p_element uuid, p_weight numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'linking initiatives requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_initiatives WHERE id = p_initiative) THEN RAISE EXCEPTION 'initiative not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = p_element AND status <> 'retired') THEN
    RAISE EXCEPTION 'strategy element not found or retired';
  END IF;
  IF p_weight IS NOT NULL AND (p_weight < 0 OR p_weight > 100) THEN
    RAISE EXCEPTION 'contribution weight must be between 0 and 100';
  END IF;
  IF EXISTS (SELECT 1 FROM public.strata_initiative_elements WHERE initiative_id = p_initiative AND element_id = p_element) THEN
    RAISE EXCEPTION 'initiative is already linked to this element';
  END IF;

  INSERT INTO public.strata_initiative_elements (initiative_id, element_id, contribution_weight)
  VALUES (p_initiative, p_element, p_weight)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiative_elements', new_id, 'RPC:link_initiative_element', auth.uid(),
          format('%s → %s', public.strata_entity_name('initiative', p_initiative),
                 public.strata_entity_name('element', p_element)));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_unlink_initiative_element(p_initiative uuid, p_element uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'unlinking initiatives requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  DELETE FROM public.strata_initiative_elements
   WHERE initiative_id = p_initiative AND element_id = p_element RETURNING id INTO link_id;
  IF link_id IS NULL THEN RAISE EXCEPTION 'link not found'; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiative_elements', link_id, 'RPC:unlink_initiative_element', auth.uid(),
          format('%s ⇸ %s', public.strata_entity_name('initiative', p_initiative),
                 public.strata_entity_name('element', p_element)));
END;
$$;

-- F-EXE-005 · Initiative ↔ KPI.
CREATE OR REPLACE FUNCTION public.strata_link_initiative_kpi(p_initiative uuid, p_kpi uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; kpi_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'linking initiatives requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_initiatives WHERE id = p_initiative) THEN RAISE EXCEPTION 'initiative not found'; END IF;
  SELECT status INTO kpi_status FROM public.strata_kpis WHERE id = p_kpi;
  IF kpi_status IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF kpi_status <> 'approved' THEN RAISE EXCEPTION 'only approved KPIs can be linked (KPI status: %)', kpi_status; END IF;
  IF EXISTS (SELECT 1 FROM public.strata_initiative_kpis WHERE initiative_id = p_initiative AND kpi_id = p_kpi) THEN
    RAISE EXCEPTION 'initiative is already linked to this KPI';
  END IF;

  INSERT INTO public.strata_initiative_kpis (initiative_id, kpi_id)
  VALUES (p_initiative, p_kpi) RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiative_kpis', new_id, 'RPC:link_initiative_kpi', auth.uid(),
          format('%s → %s', public.strata_entity_name('initiative', p_initiative),
                 public.strata_entity_name('kpi', p_kpi)));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_unlink_initiative_kpi(p_initiative uuid, p_kpi uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'unlinking initiatives requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  DELETE FROM public.strata_initiative_kpis
   WHERE initiative_id = p_initiative AND kpi_id = p_kpi RETURNING id INTO link_id;
  IF link_id IS NULL THEN RAISE EXCEPTION 'link not found'; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiative_kpis', link_id, 'RPC:unlink_initiative_kpi', auth.uid(), 'unlinked');
END;
$$;

-- F-VAL-005 · Benefit ↔ initiative (attribution share, 0–100).
CREATE OR REPLACE FUNCTION public.strata_link_benefit_initiative(
  p_benefit uuid, p_initiative uuid, p_attribution_share numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'linking benefits requires strategy_office, vmo_validator or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_benefits WHERE id = p_benefit) THEN RAISE EXCEPTION 'benefit not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_initiatives WHERE id = p_initiative) THEN RAISE EXCEPTION 'initiative not found'; END IF;
  IF p_attribution_share IS NOT NULL AND (p_attribution_share < 0 OR p_attribution_share > 100) THEN
    RAISE EXCEPTION 'attribution share must be between 0 and 100';
  END IF;
  IF EXISTS (SELECT 1 FROM public.strata_benefit_initiatives WHERE benefit_id = p_benefit AND initiative_id = p_initiative) THEN
    RAISE EXCEPTION 'benefit is already linked to this initiative';
  END IF;

  INSERT INTO public.strata_benefit_initiatives (benefit_id, initiative_id, attribution_share)
  VALUES (p_benefit, p_initiative, p_attribution_share) RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_initiatives', new_id, 'RPC:link_benefit_initiative', auth.uid(),
          format('%s → %s (%s%%)', public.strata_entity_name('benefit', p_benefit),
                 public.strata_entity_name('initiative', p_initiative),
                 COALESCE(p_attribution_share::text, '—')));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_unlink_benefit_initiative(p_benefit uuid, p_initiative uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'unlinking benefits requires strategy_office, vmo_validator or admin role';
  END IF;
  DELETE FROM public.strata_benefit_initiatives
   WHERE benefit_id = p_benefit AND initiative_id = p_initiative RETURNING id INTO link_id;
  IF link_id IS NULL THEN RAISE EXCEPTION 'link not found'; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_initiatives', link_id, 'RPC:unlink_benefit_initiative', auth.uid(), 'unlinked');
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. LANE D — Project Card (source-agnostic), milestones, dependencies
-- ---------------------------------------------------------------------------

-- F-EXE-006 · Create source-agnostic Project Card. Manual is the default
-- source; jira/upload/api are source mappings, never a coupling.
CREATE OR REPLACE FUNCTION public.strata_create_project_card(
  p_name text,
  p_source_system text DEFAULT 'manual',
  p_source_key text DEFAULT NULL,
  p_pm uuid DEFAULT NULL,
  p_sector text DEFAULT NULL,
  p_budget numeric DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_forecast_end date DEFAULT NULL,
  p_stage text DEFAULT 'planning',
  p_execution_health text DEFAULT NULL,
  p_sync_metadata jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating a project card requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'project name is required'; END IF;
  IF p_source_system NOT IN ('jira','manual','upload','api') THEN
    RAISE EXCEPTION 'source system must be manual | upload | api | jira';
  END IF;
  IF p_source_system <> 'manual' AND (p_source_key IS NULL OR btrim(p_source_key) = '') THEN
    RAISE EXCEPTION 'source key is required for %-sourced project cards', p_source_system;
  END IF;
  IF p_baseline_start IS NOT NULL AND p_baseline_end IS NOT NULL AND p_baseline_end <= p_baseline_start THEN
    RAISE EXCEPTION 'baseline end must be after baseline start';
  END IF;
  IF p_budget IS NOT NULL AND p_budget < 0 THEN RAISE EXCEPTION 'budget cannot be negative'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.strata_project_cards
     WHERE source_system = p_source_system
       AND source_key IS NOT DISTINCT FROM NULLIF(btrim(COALESCE(p_source_key,'')), '')
       AND p_source_key IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'a project card already exists for % source key %', p_source_system, p_source_key;
  END IF;

  INSERT INTO public.strata_project_cards
    (name, source_system, source_key, pm_id, sector, budget,
     baseline_start, baseline_end, forecast_end, stage, execution_health, sync_metadata, created_by)
  VALUES
    (btrim(p_name), p_source_system, NULLIF(btrim(COALESCE(p_source_key,'')), ''), p_pm, p_sector, p_budget,
     p_baseline_start, p_baseline_end, p_forecast_end, COALESCE(p_stage, 'planning'),
     p_execution_health, p_sync_metadata, auth.uid())
  RETURNING id INTO new_id;

  -- Provenance for the execution object itself (channel = source system).
  INSERT INTO public.strata_lineage_records (entity_table, entity_id, written_by, config_context)
  VALUES ('strata_project_cards', new_id, auth.uid(),
          jsonb_build_object('channel', p_source_system, 'source_key', p_source_key));

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_project_cards', new_id, 'RPC:create_project_card', auth.uid(),
          format('%s project card "%s" created', p_source_system, btrim(p_name)));
  RETURN new_id;
END;
$$;

-- F-EXE-007 · Edit project card.
CREATE OR REPLACE FUNCTION public.strata_update_project_card(
  p_project uuid,
  p_name text DEFAULT NULL,
  p_pm uuid DEFAULT NULL,
  p_sector text DEFAULT NULL,
  p_budget numeric DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_forecast_end date DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_execution_health text DEFAULT NULL,
  p_risk_summary text DEFAULT NULL,
  p_dependency_summary text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pc record; nbs date; nbe date;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating a project card requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_project;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage = 'archived' THEN RAISE EXCEPTION 'archived project cards cannot be edited'; END IF;
  nbs := COALESCE(p_baseline_start, pc.baseline_start);
  nbe := COALESCE(p_baseline_end, pc.baseline_end);
  IF nbs IS NOT NULL AND nbe IS NOT NULL AND nbe <= nbs THEN
    RAISE EXCEPTION 'baseline end must be after baseline start';
  END IF;
  IF p_budget IS NOT NULL AND p_budget < 0 THEN RAISE EXCEPTION 'budget cannot be negative'; END IF;

  UPDATE public.strata_project_cards
     SET name = COALESCE(btrim(p_name), name),
         pm_id = COALESCE(p_pm, pm_id),
         sector = COALESCE(p_sector, sector),
         budget = COALESCE(p_budget, budget),
         baseline_start = nbs,
         baseline_end = nbe,
         forecast_end = COALESCE(p_forecast_end, forecast_end),
         stage = COALESCE(p_stage, stage),
         execution_health = COALESCE(p_execution_health, execution_health),
         risk_summary = COALESCE(p_risk_summary, risk_summary),
         dependency_summary = COALESCE(p_dependency_summary, dependency_summary),
         updated_at = now()
   WHERE id = p_project;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_project_cards', p_project, 'RPC:update_project_card', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_stage IS NOT NULL THEN format('stage → %s', p_stage) END,
            CASE WHEN p_execution_health IS NOT NULL THEN format('health → %s', p_execution_health) END,
            CASE WHEN p_budget IS NOT NULL THEN 'budget updated' END,
            CASE WHEN p_forecast_end IS NOT NULL THEN 'forecast updated' END,
            'edited'));
END;
$$;

-- F-EXE-007 · Archive project card (kept in history, out of active views).
CREATE OR REPLACE FUNCTION public.strata_archive_project_card(p_project uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pc record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'archiving a project card requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'an archive reason is required'; END IF;
  SELECT * INTO pc FROM public.strata_project_cards WHERE id = p_project;
  IF pc IS NULL THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF pc.stage = 'archived' THEN RAISE EXCEPTION 'project card is already archived'; END IF;

  UPDATE public.strata_project_cards SET stage = 'archived', updated_at = now() WHERE id = p_project;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_project_cards', p_project, 'RPC:archive_project_card', auth.uid(),
          'archived: ' || btrim(p_reason));
END;
$$;

-- F-EXE-009 · Initiative ↔ project card (mapping confidence + owner).
CREATE OR REPLACE FUNCTION public.strata_link_initiative_project(
  p_initiative uuid, p_project uuid, p_confidence numeric DEFAULT NULL, p_mapping_owner uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'linking projects requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_initiatives WHERE id = p_initiative) THEN RAISE EXCEPTION 'initiative not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_project_cards WHERE id = p_project) THEN RAISE EXCEPTION 'project card not found'; END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'mapping confidence must be between 0 and 1';
  END IF;
  IF EXISTS (SELECT 1 FROM public.strata_initiative_projects WHERE initiative_id = p_initiative AND project_card_id = p_project) THEN
    RAISE EXCEPTION 'initiative is already linked to this project';
  END IF;

  INSERT INTO public.strata_initiative_projects (initiative_id, project_card_id, mapping_confidence, mapping_owner_id)
  VALUES (p_initiative, p_project, p_confidence, COALESCE(p_mapping_owner, auth.uid()))
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiative_projects', new_id, 'RPC:link_initiative_project', auth.uid(),
          format('%s → %s', public.strata_entity_name('initiative', p_initiative),
                 public.strata_entity_name('project_card', p_project)));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_unlink_initiative_project(p_initiative uuid, p_project uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'unlinking projects requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  DELETE FROM public.strata_initiative_projects
   WHERE initiative_id = p_initiative AND project_card_id = p_project RETURNING id INTO link_id;
  IF link_id IS NULL THEN RAISE EXCEPTION 'link not found'; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_initiative_projects', link_id, 'RPC:unlink_initiative_project', auth.uid(), 'unlinked');
END;
$$;

-- F-EXE-010 · Generic execution link (project→objective/KPI/benefit etc.).
CREATE OR REPLACE FUNCTION public.strata_link_execution(
  p_from_type text, p_from_id uuid, p_to_type text, p_to_id uuid,
  p_relationship text DEFAULT 'contributes_to',
  p_confidence numeric DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; allowed text[] := ARRAY['element','objective','kpi','initiative','project_card','benefit','okr'];
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating execution links requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF NOT (p_from_type = ANY (allowed)) OR NOT (p_to_type = ANY (allowed)) THEN
    RAISE EXCEPTION 'link endpoints must be one of: %', array_to_string(allowed, ', ');
  END IF;
  IF NOT public.strata_entity_exists(p_from_type, p_from_id) THEN RAISE EXCEPTION '% (from) not found', p_from_type; END IF;
  IF NOT public.strata_entity_exists(p_to_type, p_to_id) THEN RAISE EXCEPTION '% (to) not found', p_to_type; END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'confidence must be between 0 and 1';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.strata_execution_links
     WHERE from_type = p_from_type AND from_id = p_from_id
       AND to_type = p_to_type AND to_id = p_to_id AND relationship_type = p_relationship
  ) THEN
    RAISE EXCEPTION 'this link already exists';
  END IF;

  INSERT INTO public.strata_execution_links
    (from_type, from_id, to_type, to_id, relationship_type, confidence, mapping_owner_id, metadata, created_by)
  VALUES
    (p_from_type, p_from_id, p_to_type, p_to_id, p_relationship, p_confidence, auth.uid(), p_metadata, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_execution_links', new_id, 'RPC:link_execution', auth.uid(),
          format('%s "%s" %s %s "%s"', p_from_type, public.strata_entity_name(p_from_type, p_from_id),
                 p_relationship, p_to_type, public.strata_entity_name(p_to_type, p_to_id)));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_unlink_execution(p_link uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'removing execution links requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  DELETE FROM public.strata_execution_links WHERE id = p_link RETURNING id INTO link_id;
  IF link_id IS NULL THEN RAISE EXCEPTION 'link not found'; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_execution_links', link_id, 'RPC:unlink_execution', auth.uid(), 'link removed');
END;
$$;

-- F-EXE-011/012 · Milestone create/update; both re-run the milestone-weighted
-- execution progress calculation so project progress is always derived, with
-- provenance in strata_calculated_values.
CREATE OR REPLACE FUNCTION public.strata_create_milestone(
  p_project uuid,
  p_name text,
  p_owner uuid DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_forecast_date date DEFAULT NULL,
  p_actual_date date DEFAULT NULL,
  p_status text DEFAULT 'planned',
  p_progress numeric DEFAULT 0,
  p_weight numeric DEFAULT 1
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; next_order int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating a milestone requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_project_cards WHERE id = p_project) THEN
    RAISE EXCEPTION 'project card not found';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'milestone name is required'; END IF;
  IF p_status NOT IN ('planned','in_progress','done','missed','descoped') THEN
    RAISE EXCEPTION 'status must be planned | in_progress | done | missed | descoped';
  END IF;
  IF p_progress IS NOT NULL AND (p_progress < 0 OR p_progress > 100) THEN
    RAISE EXCEPTION 'progress must be between 0 and 100';
  END IF;
  IF p_weight IS NULL OR p_weight <= 0 THEN RAISE EXCEPTION 'weight must be greater than 0'; END IF;
  IF p_baseline_start IS NOT NULL AND p_baseline_end IS NOT NULL AND p_baseline_end < p_baseline_start THEN
    RAISE EXCEPTION 'baseline end cannot precede baseline start';
  END IF;

  SELECT COALESCE(max(order_index), 0) + 1 INTO next_order
    FROM public.strata_milestones WHERE project_card_id = p_project;

  INSERT INTO public.strata_milestones
    (project_card_id, name, owner_id, baseline_start, baseline_end, forecast_date, actual_date,
     status, progress, weight, order_index)
  VALUES
    (p_project, btrim(p_name), p_owner, p_baseline_start, p_baseline_end, p_forecast_date, p_actual_date,
     p_status, COALESCE(p_progress, 0), p_weight, next_order)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_milestones', new_id, 'RPC:create_milestone', auth.uid(),
          format('milestone "%s" under %s', btrim(p_name), public.strata_entity_name('project_card', p_project)));

  -- Derived progress with provenance (never hand-typed).
  PERFORM public.strata_calc_execution_progress(p_project);
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_update_milestone(
  p_milestone uuid,
  p_name text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_forecast_date date DEFAULT NULL,
  p_actual_date date DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_progress numeric DEFAULT NULL,
  p_weight numeric DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ms record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating a milestone requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO ms FROM public.strata_milestones WHERE id = p_milestone;
  IF ms IS NULL THEN RAISE EXCEPTION 'milestone not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('planned','in_progress','done','missed','descoped') THEN
    RAISE EXCEPTION 'status must be planned | in_progress | done | missed | descoped';
  END IF;
  IF p_progress IS NOT NULL AND (p_progress < 0 OR p_progress > 100) THEN
    RAISE EXCEPTION 'progress must be between 0 and 100';
  END IF;
  IF p_weight IS NOT NULL AND p_weight <= 0 THEN RAISE EXCEPTION 'weight must be greater than 0'; END IF;

  UPDATE public.strata_milestones
     SET name = COALESCE(btrim(p_name), name),
         owner_id = COALESCE(p_owner, owner_id),
         baseline_start = COALESCE(p_baseline_start, baseline_start),
         baseline_end = COALESCE(p_baseline_end, baseline_end),
         forecast_date = COALESCE(p_forecast_date, forecast_date),
         actual_date = COALESCE(p_actual_date, actual_date),
         status = COALESCE(p_status, status),
         progress = COALESCE(p_progress, progress),
         weight = COALESCE(p_weight, weight),
         updated_at = now()
   WHERE id = p_milestone;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_milestones', p_milestone, 'RPC:update_milestone', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_progress IS NOT NULL THEN format('progress → %s%%', p_progress) END,
            CASE WHEN p_status IS NOT NULL THEN format('status → %s', p_status) END,
            'updated'));

  PERFORM public.strata_calc_execution_progress(ms.project_card_id);
END;
$$;

-- F-EXE-013 · Dependencies with SLA/blocker state. Blocked-dependency counts
-- on the Command Center derive from these rows.
CREATE OR REPLACE FUNCTION public.strata_create_dependency(
  p_requesting_type text,
  p_requesting_id uuid,
  p_serving_type text,
  p_serving_id uuid DEFAULT NULL,
  p_serving_label text DEFAULT NULL,
  p_dependency_type text DEFAULT 'delivery',
  p_due_date date DEFAULT NULL,
  p_sla_days int DEFAULT NULL,
  p_impact text DEFAULT NULL,
  p_is_blocker boolean DEFAULT false,
  p_status text DEFAULT 'open'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating a dependency requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF p_requesting_type NOT IN ('initiative','project_card') THEN
    RAISE EXCEPTION 'requesting type must be initiative | project_card';
  END IF;
  IF NOT public.strata_entity_exists(p_requesting_type, p_requesting_id) THEN
    RAISE EXCEPTION '% (requesting) not found', p_requesting_type;
  END IF;
  IF p_serving_type NOT IN ('initiative','project_card','external') THEN
    RAISE EXCEPTION 'serving type must be initiative | project_card | external';
  END IF;
  IF p_serving_type = 'external' THEN
    IF p_serving_label IS NULL OR btrim(p_serving_label) = '' THEN
      RAISE EXCEPTION 'external dependencies require a serving label';
    END IF;
  ELSE
    IF p_serving_id IS NULL OR NOT public.strata_entity_exists(p_serving_type, p_serving_id) THEN
      RAISE EXCEPTION '% (serving) not found', p_serving_type;
    END IF;
  END IF;
  IF p_dependency_type NOT IN ('delivery','data','decision','resource','external') THEN
    RAISE EXCEPTION 'dependency type must be delivery | data | decision | resource | external';
  END IF;
  IF p_status NOT IN ('open','at_risk','blocked','resolved','cancelled') THEN
    RAISE EXCEPTION 'status must be open | at_risk | blocked | resolved | cancelled';
  END IF;
  IF p_sla_days IS NOT NULL AND p_sla_days < 0 THEN RAISE EXCEPTION 'SLA days cannot be negative'; END IF;

  INSERT INTO public.strata_dependencies
    (requesting_type, requesting_id, serving_type, serving_id, serving_label,
     dependency_type, due_date, status, sla_days, impact, is_blocker, created_by)
  VALUES
    (p_requesting_type, p_requesting_id, p_serving_type, p_serving_id, p_serving_label,
     p_dependency_type, p_due_date, p_status, p_sla_days, p_impact, COALESCE(p_is_blocker, false), auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_dependencies', new_id, 'RPC:create_dependency', auth.uid(),
          format('%s dependency for %s "%s"%s', p_dependency_type, p_requesting_type,
                 public.strata_entity_name(p_requesting_type, p_requesting_id),
                 CASE WHEN COALESCE(p_is_blocker,false) THEN ' · BLOCKER' ELSE '' END));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_update_dependency(
  p_dependency uuid,
  p_status text DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_sla_days int DEFAULT NULL,
  p_impact text DEFAULT NULL,
  p_is_blocker boolean DEFAULT NULL,
  p_serving_label text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dep record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating a dependency requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO dep FROM public.strata_dependencies WHERE id = p_dependency;
  IF dep IS NULL THEN RAISE EXCEPTION 'dependency not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open','at_risk','blocked','resolved','cancelled') THEN
    RAISE EXCEPTION 'status must be open | at_risk | blocked | resolved | cancelled';
  END IF;
  IF p_sla_days IS NOT NULL AND p_sla_days < 0 THEN RAISE EXCEPTION 'SLA days cannot be negative'; END IF;

  UPDATE public.strata_dependencies
     SET status = COALESCE(p_status, status),
         due_date = COALESCE(p_due_date, due_date),
         sla_days = COALESCE(p_sla_days, sla_days),
         impact = COALESCE(p_impact, impact),
         is_blocker = COALESCE(p_is_blocker, is_blocker),
         serving_label = COALESCE(p_serving_label, serving_label),
         updated_at = now()
   WHERE id = p_dependency;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_dependencies', p_dependency, 'RPC:update_dependency', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_status IS NOT NULL THEN format('status → %s', p_status) END,
            CASE WHEN p_is_blocker IS NOT NULL THEN format('blocker → %s', p_is_blocker) END,
            'updated'));
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. LANE E — Portfolio, benefits, values, assumptions, attribution
-- ---------------------------------------------------------------------------

-- F-VAL-001 · Create portfolio.
CREATE OR REPLACE FUNCTION public.strata_create_portfolio(
  p_name text,
  p_description text DEFAULT NULL,
  p_category uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_value_target numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'creating a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'portfolio name is required'; END IF;
  IF p_category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_value_categories WHERE id = p_category) THEN
    RAISE EXCEPTION 'value category not found';
  END IF;
  IF p_value_target IS NOT NULL AND p_value_target < 0 THEN
    RAISE EXCEPTION 'value target cannot be negative';
  END IF;

  INSERT INTO public.strata_portfolios (name, description, category_id, owner_id, value_target, status, created_by)
  VALUES (btrim(p_name), p_description, p_category, p_owner, p_value_target, 'active', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_portfolios', new_id, 'RPC:create_portfolio', auth.uid(),
          format('portfolio "%s" created', btrim(p_name)));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_update_portfolio(
  p_portfolio uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_category uuid DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_value_target numeric DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pf record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO pf FROM public.strata_portfolios WHERE id = p_portfolio;
  IF pf IS NULL THEN RAISE EXCEPTION 'portfolio not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active','archived') THEN
    RAISE EXCEPTION 'status must be active | archived';
  END IF;
  IF p_category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_value_categories WHERE id = p_category) THEN
    RAISE EXCEPTION 'value category not found';
  END IF;

  UPDATE public.strata_portfolios
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         category_id = COALESCE(p_category, category_id),
         owner_id = COALESCE(p_owner, owner_id),
         value_target = COALESCE(p_value_target, value_target),
         status = COALESCE(p_status, status),
         updated_at = now()
   WHERE id = p_portfolio;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_portfolios', p_portfolio, 'RPC:update_portfolio', auth.uid(),
          CASE WHEN p_status IS NOT NULL THEN format('status → %s', p_status) ELSE 'updated' END);
END;
$$;

-- F-VAL-002 · Portfolio membership (initiative/project card).
CREATE OR REPLACE FUNCTION public.strata_add_portfolio_member(
  p_portfolio uuid, p_member_type text, p_member_id uuid,
  p_allocation_pct numeric DEFAULT NULL, p_priority int DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'managing portfolio membership requires strategy_office, vmo_validator or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_portfolios WHERE id = p_portfolio AND status = 'active') THEN
    RAISE EXCEPTION 'portfolio not found or archived';
  END IF;
  IF p_member_type NOT IN ('initiative','project_card') THEN
    RAISE EXCEPTION 'member type must be initiative | project_card';
  END IF;
  IF NOT public.strata_entity_exists(p_member_type, p_member_id) THEN
    RAISE EXCEPTION '% not found', p_member_type;
  END IF;
  IF p_allocation_pct IS NOT NULL AND (p_allocation_pct < 0 OR p_allocation_pct > 100) THEN
    RAISE EXCEPTION 'allocation must be between 0 and 100';
  END IF;
  IF EXISTS (SELECT 1 FROM public.strata_portfolio_memberships
              WHERE portfolio_id = p_portfolio AND member_type = p_member_type AND member_id = p_member_id) THEN
    RAISE EXCEPTION 'member is already in this portfolio';
  END IF;

  INSERT INTO public.strata_portfolio_memberships (portfolio_id, member_type, member_id, allocation_pct, priority)
  VALUES (p_portfolio, p_member_type, p_member_id, p_allocation_pct, p_priority)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_portfolio_memberships', new_id, 'RPC:add_portfolio_member', auth.uid(),
          format('%s "%s" added to %s', p_member_type, public.strata_entity_name(p_member_type, p_member_id),
                 public.strata_entity_name('portfolio', p_portfolio)));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_remove_portfolio_member(
  p_portfolio uuid, p_member_type text, p_member_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'managing portfolio membership requires strategy_office, vmo_validator or admin role';
  END IF;
  DELETE FROM public.strata_portfolio_memberships
   WHERE portfolio_id = p_portfolio AND member_type = p_member_type AND member_id = p_member_id
  RETURNING id INTO link_id;
  IF link_id IS NULL THEN RAISE EXCEPTION 'membership not found'; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_portfolio_memberships', link_id, 'RPC:remove_portfolio_member', auth.uid(), 'member removed');
END;
$$;

-- F-VAL-003 · Benefit governance metadata + forward-only lifecycle.
CREATE OR REPLACE FUNCTION public.strata_update_benefit(
  p_benefit uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_validator uuid DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_category uuid DEFAULT NULL,
  p_portfolio uuid DEFAULT NULL,
  p_value_hypothesis text DEFAULT NULL,
  p_causal_mechanism text DEFAULT NULL,
  p_confidence numeric DEFAULT NULL,
  p_lifecycle_stage text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b record;
  stages text[] := ARRAY['identified','qualified','approved','baselined','in_flight','forecast_revised','realized','finance_validated','closed'];
  old_idx int; new_idx int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating a benefit requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO b FROM public.strata_benefits WHERE id = p_benefit;
  IF b IS NULL THEN RAISE EXCEPTION 'benefit not found'; END IF;
  IF b.lifecycle_stage = 'closed' AND p_lifecycle_stage IS NULL THEN
    RAISE EXCEPTION 'closed benefits cannot be edited';
  END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'confidence must be between 0 and 1';
  END IF;
  IF p_category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_value_categories WHERE id = p_category) THEN
    RAISE EXCEPTION 'value category not found';
  END IF;
  IF p_portfolio IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_portfolios WHERE id = p_portfolio) THEN
    RAISE EXCEPTION 'portfolio not found';
  END IF;
  IF COALESCE(p_validator, b.validator_id) IS NOT NULL
     AND COALESCE(p_validator, b.validator_id) = COALESCE(p_owner, b.owner_id) THEN
    RAISE EXCEPTION 'validator must differ from the benefit owner (separation of duties)';
  END IF;
  IF p_lifecycle_stage IS NOT NULL THEN
    old_idx := array_position(stages, b.lifecycle_stage);
    new_idx := array_position(stages, p_lifecycle_stage);
    IF new_idx IS NULL THEN
      RAISE EXCEPTION 'lifecycle stage must be one of: %', array_to_string(stages, ', ');
    END IF;
    -- forward-only, except forecast_revised which may be re-entered from later stages
    IF new_idx < old_idx AND p_lifecycle_stage <> 'forecast_revised' THEN
      RAISE EXCEPTION 'lifecycle cannot move backwards (% → %)', b.lifecycle_stage, p_lifecycle_stage;
    END IF;
    -- finance_validated is set by strata_validate_benefit_value, not by hand
    IF p_lifecycle_stage = 'finance_validated' THEN
      RAISE EXCEPTION 'finance_validated is reached through realized-value validation, not manual edit';
    END IF;
  END IF;

  UPDATE public.strata_benefits
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         owner_id = COALESCE(p_owner, owner_id),
         validator_id = COALESCE(p_validator, validator_id),
         unit = COALESCE(p_unit, unit),
         category_id = COALESCE(p_category, category_id),
         portfolio_id = COALESCE(p_portfolio, portfolio_id),
         value_hypothesis = COALESCE(p_value_hypothesis, value_hypothesis),
         causal_mechanism = COALESCE(p_causal_mechanism, causal_mechanism),
         confidence = COALESCE(p_confidence, confidence),
         lifecycle_stage = COALESCE(p_lifecycle_stage, lifecycle_stage),
         updated_at = now()
   WHERE id = p_benefit;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefits', p_benefit, 'RPC:update_benefit', auth.uid(),
          CASE WHEN p_lifecycle_stage IS NOT NULL
               THEN format('lifecycle %s → %s', b.lifecycle_stage, p_lifecycle_stage) ELSE 'updated' END);
END;
$$;

-- F-VAL-004 · Benefit value lines (baseline/planned/forecast/realized) by
-- period. Pending validation; realized values validated by the benefit
-- validator via strata_validate_benefit_value (SoD). Resubmission before
-- validation updates the pending row.
CREATE OR REPLACE FUNCTION public.strata_create_benefit_value(
  p_benefit uuid,
  p_period uuid,
  p_value_kind text,
  p_value numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; per record; existing record; value_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['kpi_owner','data_steward','strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'submitting a benefit value requires kpi_owner, data_steward, strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO b FROM public.strata_benefits WHERE id = p_benefit;
  IF b IS NULL THEN RAISE EXCEPTION 'benefit not found'; END IF;
  IF b.lifecycle_stage = 'closed' THEN RAISE EXCEPTION 'closed benefits cannot receive values'; END IF;
  SELECT * INTO per FROM public.strata_periods WHERE id = p_period;
  IF per IS NULL THEN RAISE EXCEPTION 'period not found'; END IF;
  IF per.close_status = 'closed' THEN RAISE EXCEPTION 'period % is closed; values cannot be submitted', per.name; END IF;
  IF p_value_kind NOT IN ('baseline','planned','forecast','realized') THEN
    RAISE EXCEPTION 'value kind must be baseline | planned | forecast | realized';
  END IF;
  IF p_value IS NULL THEN RAISE EXCEPTION 'value is required'; END IF;

  SELECT * INTO existing FROM public.strata_benefit_values
   WHERE benefit_id = p_benefit AND period_id = p_period AND value_kind = p_value_kind
     AND upload_run_id IS NULL;

  IF existing IS NOT NULL THEN
    IF existing.validation_status = 'validated' THEN
      RAISE EXCEPTION 'a validated % value already exists for % · %; correction requires governance', p_value_kind, b.name, per.name;
    END IF;
    UPDATE public.strata_benefit_values
       SET value = p_value, submitted_by = auth.uid(), submitted_at = now(),
           validation_status = 'pending', validated_by = NULL, validated_at = NULL, validation_note = NULL,
           updated_at = now()
     WHERE id = existing.id;
    value_id := existing.id;
  ELSE
    INSERT INTO public.strata_benefit_values
      (benefit_id, period_id, value_kind, value, submitted_by, validation_status)
    VALUES (p_benefit, p_period, p_value_kind, p_value, auth.uid(), 'pending')
    RETURNING id INTO value_id;
  END IF;

  INSERT INTO public.strata_lineage_records (entity_table, entity_id, written_by, config_context)
  VALUES ('strata_benefit_values', value_id, auth.uid(),
          jsonb_build_object('channel', 'manual', 'benefit_id', p_benefit,
                             'period_id', p_period, 'value_kind', p_value_kind));

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_benefit_values', value_id, 'RPC:create_benefit_value', auth.uid(),
          format('%s value %s for %s · %s (pending validation)', p_value_kind, p_value, b.name, per.name));
  RETURN value_id;
END;
$$;

-- F-VAL-006 · Assumptions.
CREATE OR REPLACE FUNCTION public.strata_create_assumption(
  p_benefit uuid,
  p_description text,
  p_owner uuid DEFAULT NULL,
  p_confidence numeric DEFAULT NULL,
  p_status text DEFAULT 'open'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'creating an assumption requires strategy_office, vmo_validator or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_benefits WHERE id = p_benefit) THEN RAISE EXCEPTION 'benefit not found'; END IF;
  IF p_description IS NULL OR btrim(p_description) = '' THEN RAISE EXCEPTION 'assumption description is required'; END IF;
  IF p_status NOT IN ('open','holding','broken','retired') THEN
    RAISE EXCEPTION 'status must be open | holding | broken | retired';
  END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'confidence must be between 0 and 1';
  END IF;

  INSERT INTO public.strata_assumptions (benefit_id, description, owner_id, confidence, status)
  VALUES (p_benefit, btrim(p_description), p_owner, p_confidence, p_status)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_assumptions', new_id, 'RPC:create_assumption', auth.uid(),
          format('assumption for %s', public.strata_entity_name('benefit', p_benefit)));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_update_assumption(
  p_assumption uuid,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_confidence numeric DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating an assumption requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO a FROM public.strata_assumptions WHERE id = p_assumption;
  IF a IS NULL THEN RAISE EXCEPTION 'assumption not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open','holding','broken','retired') THEN
    RAISE EXCEPTION 'status must be open | holding | broken | retired';
  END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'confidence must be between 0 and 1';
  END IF;

  UPDATE public.strata_assumptions
     SET description = COALESCE(btrim(p_description), description),
         owner_id = COALESCE(p_owner, owner_id),
         confidence = COALESCE(p_confidence, confidence),
         status = COALESCE(p_status, status),
         updated_at = now()
   WHERE id = p_assumption;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_assumptions', p_assumption, 'RPC:update_assumption', auth.uid(),
          CASE WHEN p_status IS NOT NULL THEN format('status → %s', p_status) ELSE 'updated' END);
END;
$$;

-- F-VAL-007 · Attribution / double-counting / counterfactual rules.
CREATE OR REPLACE FUNCTION public.strata_create_attribution_rule(
  p_benefit uuid,
  p_rule_type text,
  p_definition jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'creating an attribution rule requires strategy_office, vmo_validator or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_benefits WHERE id = p_benefit) THEN RAISE EXCEPTION 'benefit not found'; END IF;
  IF p_rule_type NOT IN ('shared_benefit','counterfactual','double_counting') THEN
    RAISE EXCEPTION 'rule type must be shared_benefit | counterfactual | double_counting';
  END IF;
  IF p_definition IS NULL OR p_definition = '{}'::jsonb THEN
    RAISE EXCEPTION 'rule definition is required';
  END IF;

  INSERT INTO public.strata_attribution_rules (benefit_id, rule_type, definition, created_by)
  VALUES (p_benefit, p_rule_type, p_definition, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_attribution_rules', new_id, 'RPC:create_attribution_rule', auth.uid(),
          format('%s rule for %s', p_rule_type, public.strata_entity_name('benefit', p_benefit)));
  RETURN new_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. LANE G — Decisions, actions, roles, snapshot names
-- ---------------------------------------------------------------------------

-- F-GOV-001 · Create decision (review forums, gates, escalations).
CREATE OR REPLACE FUNCTION public.strata_create_decision(
  p_title text,
  p_decision_type text DEFAULT 'governance',
  p_forum text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_snapshot uuid DEFAULT NULL,
  p_evidence_refs jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; dkey text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','executive_viewer','vmo_validator']) THEN
    RAISE EXCEPTION 'creating a decision requires strategy_office, executive_viewer, vmo_validator or admin role';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'decision title is required'; END IF;
  IF p_decision_type NOT IN ('governance','gate','escalation','action_only') THEN
    RAISE EXCEPTION 'decision type must be governance | gate | escalation | action_only';
  END IF;
  IF p_snapshot IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_snapshots WHERE id = p_snapshot) THEN
    RAISE EXCEPTION 'snapshot not found';
  END IF;

  dkey := 'DEC-' || nextval('public.strata_decision_key_seq');
  INSERT INTO public.strata_decisions
    (decision_key, forum, snapshot_id, decision_type, title, description,
     owner_id, due_date, status, evidence_refs, created_by)
  VALUES
    (dkey, p_forum, p_snapshot, p_decision_type, btrim(p_title), p_description,
     p_owner, p_due_date, 'open', p_evidence_refs, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_decisions', new_id, 'RPC:create_decision', auth.uid(),
          format('%s "%s" opened%s', dkey, btrim(p_title),
                 COALESCE(' in ' || p_forum, '')));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_update_decision(
  p_decision uuid,
  p_status text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','executive_viewer','vmo_validator']) THEN
    RAISE EXCEPTION 'updating a decision requires strategy_office, executive_viewer, vmo_validator or admin role';
  END IF;
  SELECT * INTO d FROM public.strata_decisions WHERE id = p_decision;
  IF d IS NULL THEN RAISE EXCEPTION 'decision not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open','decided','closed') THEN
    RAISE EXCEPTION 'status must be open | decided | closed';
  END IF;
  IF p_status = 'closed' AND EXISTS (
    SELECT 1 FROM public.strata_actions WHERE decision_id = p_decision AND status IN ('open','in_progress')
  ) THEN
    RAISE EXCEPTION 'decision has open actions; close or cancel them first';
  END IF;

  UPDATE public.strata_decisions
     SET status = COALESCE(p_status, status),
         description = COALESCE(p_description, description),
         owner_id = COALESCE(p_owner, owner_id),
         due_date = COALESCE(p_due_date, due_date),
         decided_by = CASE WHEN p_status IN ('decided','closed') AND decided_by IS NULL THEN auth.uid() ELSE decided_by END,
         decided_at = CASE WHEN p_status IN ('decided','closed') AND decided_at IS NULL THEN now() ELSE decided_at END,
         updated_at = now()
   WHERE id = p_decision;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_decisions', p_decision, 'RPC:update_decision', auth.uid(),
          CASE WHEN p_status IS NOT NULL THEN format('status %s → %s', d.status, p_status) ELSE 'updated' END);
END;
$$;

-- F-GOV-002 · Create/track actions under a decision.
CREATE OR REPLACE FUNCTION public.strata_create_action(
  p_decision uuid,
  p_title text,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; akey text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','executive_viewer','vmo_validator']) THEN
    RAISE EXCEPTION 'creating an action requires strategy_office, executive_viewer, vmo_validator or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_decisions WHERE id = p_decision) THEN
    RAISE EXCEPTION 'decision not found';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'action title is required'; END IF;

  akey := 'ACT-' || nextval('public.strata_action_key_seq');
  INSERT INTO public.strata_actions (action_key, decision_id, title, owner_id, due_date, status, note, created_by)
  VALUES (akey, p_decision, btrim(p_title), p_owner, p_due_date, 'open', p_note, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_actions', new_id, 'RPC:create_action', auth.uid(),
          format('%s "%s" under %s', akey, btrim(p_title), public.strata_entity_name('decision', p_decision)));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_update_action(
  p_action uuid,
  p_status text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','executive_viewer','vmo_validator']) THEN
    RAISE EXCEPTION 'updating an action requires strategy_office, executive_viewer, vmo_validator or admin role';
  END IF;
  SELECT * INTO a FROM public.strata_actions WHERE id = p_action;
  IF a IS NULL THEN RAISE EXCEPTION 'action not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open','in_progress','done','cancelled') THEN
    RAISE EXCEPTION 'status must be open | in_progress | done | cancelled';
  END IF;

  UPDATE public.strata_actions
     SET status = COALESCE(p_status, status),
         note = COALESCE(p_note, note),
         owner_id = COALESCE(p_owner, owner_id),
         due_date = COALESCE(p_due_date, due_date),
         updated_at = now()
   WHERE id = p_action;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_actions', p_action, 'RPC:update_action', auth.uid(),
          CASE WHEN p_status IS NOT NULL THEN format('status %s → %s', a.status, p_status) ELSE 'updated' END);
END;
$$;

-- F-GOV-006 · Role assignment (admin-only; SoD flows need ≥2 role-bearing users).
CREATE OR REPLACE FUNCTION public.strata_assign_role(
  p_user uuid,
  p_role text,
  p_scope_type text DEFAULT 'global',
  p_scope_entity uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'assigning STRATA roles requires admin or strata_admin role';
  END IF;
  IF p_user IS NULL THEN RAISE EXCEPTION 'user is required'; END IF;
  IF p_role NOT IN ('strata_admin','strategy_office','executive_viewer','kpi_owner','vmo_validator','data_steward') THEN
    RAISE EXCEPTION 'role must be strata_admin | strategy_office | executive_viewer | kpi_owner | vmo_validator | data_steward';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.strata_role_assignments
     WHERE user_id = p_user AND role = p_role AND scope_type = p_scope_type
       AND scope_entity_id IS NOT DISTINCT FROM p_scope_entity
  ) THEN
    RAISE EXCEPTION 'user already holds this role at this scope';
  END IF;

  INSERT INTO public.strata_role_assignments (user_id, role, scope_type, scope_entity_id, granted_by)
  VALUES (p_user, p_role, COALESCE(p_scope_type, 'global'), p_scope_entity, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_role_assignments', new_id, 'RPC:assign_role', auth.uid(),
          format('%s granted to %s (%s scope)', p_role, p_user, COALESCE(p_scope_type, 'global')));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_revoke_role(p_assignment uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  IF NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'revoking STRATA roles requires admin or strata_admin role';
  END IF;
  DELETE FROM public.strata_role_assignments WHERE id = p_assignment RETURNING * INTO a;
  IF a IS NULL THEN RAISE EXCEPTION 'role assignment not found'; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_role_assignments', p_assignment, 'RPC:revoke_role', auth.uid(),
          format('%s revoked from %s', a.role, a.user_id));
END;
$$;

-- F-GOV-003/004 · REPLACED: snapshot lock now freezes human-readable entity
-- names into each snapshot item payload (reviewers never cross-reference IDs).
-- Prior body: 20260705100400_strata_lineage_governance.sql (rollback source).
CREATE OR REPLACE FUNCTION public.strata_lock_snapshot(
  p_name text,
  p_cycle uuid,
  p_period uuid,
  p_instance_ids uuid[] DEFAULT NULL,
  p_scope jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE snap uuid; runs uuid[]; cfg jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'locking a snapshot requires strategy_office or admin role';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT a.upload_run_id) FILTER (WHERE a.upload_run_id IS NOT NULL), '{}')
    INTO runs
    FROM public.strata_kpi_actuals a
   WHERE a.period_id = p_period AND a.validation_status = 'validated';
  SELECT jsonb_build_object(
    'perspectives',      (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_perspectives WHERE status = 'approved'),
    'threshold_schemes', (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_threshold_schemes WHERE status = 'approved'),
    'scorecard_models',  (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_scorecard_models WHERE status = 'approved')
  ) INTO cfg;
  INSERT INTO public.strata_snapshots (name, cycle_id, period_id, scope, config_versions, data_run_ids, created_by, approved_by)
  VALUES (p_name, p_cycle, p_period,
          COALESCE(p_scope, jsonb_build_object('instance_ids', to_jsonb(COALESCE(p_instance_ids, '{}'::uuid[])))),
          cfg, runs, auth.uid(), auth.uid())
  RETURNING id INTO snap;
  -- Freeze the latest calculated values WITH resolved entity names.
  INSERT INTO public.strata_snapshot_items (snapshot_id, entity_type, entity_id, payload)
  SELECT snap, cv.entity_type, cv.entity_id,
         (to_jsonb(cv) - 'id' - 'snapshot_id')
         || jsonb_build_object('entity_name', public.strata_entity_name(cv.entity_type, cv.entity_id))
    FROM public.strata_calculated_values cv
   WHERE cv.period_id = p_period
     AND cv.calculated_at = (
       SELECT max(cv2.calculated_at) FROM public.strata_calculated_values cv2
        WHERE cv2.entity_type = cv.entity_type AND cv2.entity_id = cv.entity_id
          AND cv2.period_id = cv.period_id AND cv2.metric_key = cv.metric_key
     );
  UPDATE public.strata_calculated_values SET snapshot_id = snap
   WHERE period_id = p_period AND snapshot_id IS NULL;
  IF p_instance_ids IS NOT NULL THEN
    UPDATE public.strata_scorecard_instances
       SET status = 'locked', locked_snapshot_id = snap, updated_at = now()
     WHERE id = ANY (p_instance_ids);
  END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_snapshots', snap, 'RPC:lock_snapshot', auth.uid(), p_name);
  RETURN snap;
END;
$$;

COMMENT ON FUNCTION public.strata_lock_snapshot(text, uuid, uuid, uuid[], jsonb) IS
  'Locks review evidence (F-GOV-003/004): freezes latest calculated values with resolved entity names, config versions and validated data-run IDs.';

-- ---------------------------------------------------------------------------
-- 7. LANE F — Needs Attention rule engine + KPI evidence chain
-- ---------------------------------------------------------------------------

-- F-REP-004 · Rule-driven exceptions. Every row carries the source entity
-- reference so the Command Center can drill. No seed rows, no statics.
CREATE OR REPLACE FUNCTION public.strata_needs_attention(p_period uuid DEFAULT NULL)
RETURNS TABLE (
  item_type text,
  severity text,
  entity_type text,
  entity_id uuid,
  entity_name text,
  detail text,
  due_date date
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- 1) KPI actuals awaiting attestation
  SELECT 'pending_attestation', 'warning', 'kpi', a.kpi_id,
         public.strata_entity_name('kpi', a.kpi_id),
         format('%s actual (%s) awaiting attestation', k.name, a.value), NULL::date
    FROM public.strata_kpi_actuals a
    JOIN public.strata_kpis k ON k.id = a.kpi_id
   WHERE a.validation_status = 'pending'
     AND (p_period IS NULL OR a.period_id = p_period)
  UNION ALL
  -- 2) Benefit values awaiting validation
  SELECT 'pending_benefit_validation', 'warning', 'benefit', v.benefit_id,
         public.strata_entity_name('benefit', v.benefit_id),
         format('%s %s value (%s) awaiting validation', b.name, v.value_kind, v.value), NULL::date
    FROM public.strata_benefit_values v
    JOIN public.strata_benefits b ON b.id = v.benefit_id
   WHERE v.validation_status = 'pending'
     AND (p_period IS NULL OR v.period_id = p_period)
  UNION ALL
  -- 3) Blocked dependencies
  SELECT 'blocked_dependency', 'critical', d.requesting_type, d.requesting_id,
         public.strata_entity_name(d.requesting_type, d.requesting_id),
         format('%s dependency blocked%s', d.dependency_type,
                COALESCE(' — ' || d.impact, '')), d.due_date
    FROM public.strata_dependencies d
   WHERE (d.is_blocker OR d.status = 'blocked')
     AND d.status NOT IN ('resolved','cancelled')
  UNION ALL
  -- 4) Overdue actions
  SELECT 'overdue_action', 'warning', 'action', a.id,
         a.title, format('%s overdue since %s', a.action_key, a.due_date), a.due_date
    FROM public.strata_actions a
   WHERE a.status IN ('open','in_progress') AND a.due_date IS NOT NULL AND a.due_date < now()::date
  UNION ALL
  -- 5) Overdue gates
  SELECT 'overdue_gate', 'warning', g.subject_type, g.subject_id,
         public.strata_entity_name(g.subject_type, g.subject_id),
         format('gate "%s" scheduled %s still undecided',
                public.strata_entity_name('gate_instance', g.id), g.scheduled_for), g.scheduled_for
    FROM public.strata_gate_instances g
   WHERE g.status IN ('open','in_review') AND g.scheduled_for IS NOT NULL AND g.scheduled_for < now()::date
  UNION ALL
  -- 6) Broken assumptions
  SELECT 'broken_assumption', 'critical', 'benefit', s.benefit_id,
         public.strata_entity_name('benefit', s.benefit_id),
         format('assumption broken: %s', left(s.description, 140)), NULL::date
    FROM public.strata_assumptions s
   WHERE s.status = 'broken'
  UNION ALL
  -- 7) Approved KPIs missing an actual for the (open) period
  SELECT 'missing_actual', 'warning', 'kpi', k.id, k.name,
         format('no actual submitted for %s', p.name), p.ends_on
    FROM public.strata_kpis k
    CROSS JOIN public.strata_periods p
   WHERE p_period IS NOT NULL AND p.id = p_period AND p.close_status <> 'closed'
     AND k.status = 'approved'
     AND NOT EXISTS (SELECT 1 FROM public.strata_kpi_actuals a
                      WHERE a.kpi_id = k.id AND a.period_id = p.id)
  UNION ALL
  -- 8) Upload runs with rejected rows
  SELECT 'upload_rejections', 'warning', 'upload_run', r.id, r.run_key,
         format('%s of %s rows rejected in %s', r.row_count_rejected, r.row_count_raw, r.run_key), NULL::date
    FROM public.strata_upload_runs r
   WHERE COALESCE(r.row_count_rejected, 0) > 0 AND r.status IN ('completed','failed')
  UNION ALL
  -- 9) Active plays with incomplete charters (governance drift)
  SELECT 'governance_incomplete', 'warning', 'element', e.id, e.name,
         'active play without a complete charter', NULL::date
    FROM public.strata_strategy_elements e
    LEFT JOIN public.strata_play_charters c ON c.element_id = e.id
   WHERE e.element_type = 'play' AND e.status = 'active'
     AND (c.id IS NULL OR c.status <> 'complete');
$$;

COMMENT ON FUNCTION public.strata_needs_attention(uuid) IS
  'Rule-driven Needs Attention feed (F-REP-004): attestations, validations, blockers, overdue actions/gates, broken assumptions, missing actuals, upload rejections, governance drift. No seeded rows.';

-- F-REP-005 / F-KPI-008 · Full evidence chain for one KPI (+period):
-- KPI → formula version → target → actual (+validation/owner) → source
-- (upload run / manual lineage) → strategy elements → initiatives → projects
-- (milestones/dependencies) → benefits. Missing links stay honest nulls/[].
CREATE OR REPLACE FUNCTION public.strata_kpi_evidence_chain(p_kpi uuid, p_period uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k record;
  result jsonb;
  initiative_ids uuid[];
  project_ids uuid[];
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;

  -- initiatives connected directly or via linked strategy elements
  SELECT COALESCE(array_agg(DISTINCT i), '{}') INTO initiative_ids FROM (
    SELECT ik.initiative_id AS i FROM public.strata_initiative_kpis ik WHERE ik.kpi_id = p_kpi
    UNION
    SELECT ie.initiative_id FROM public.strata_initiative_elements ie
      JOIN public.strata_element_kpis ek ON ek.element_id = ie.element_id
     WHERE ek.kpi_id = p_kpi
  ) s;

  SELECT COALESCE(array_agg(DISTINCT s.p), '{}') INTO project_ids FROM (
    SELECT ip.project_card_id AS p FROM public.strata_initiative_projects ip
     WHERE ip.initiative_id = ANY (initiative_ids)
    UNION
    SELECT el.from_id FROM public.strata_execution_links el
     WHERE el.from_type = 'project_card' AND el.to_type = 'kpi' AND el.to_id = p_kpi
  ) s;

  SELECT jsonb_build_object(
    'kpi', jsonb_build_object(
      'id', k.id, 'name', k.name, 'slug', k.slug, 'unit', k.unit, 'direction', k.direction,
      'status', k.status,
      'accountable_owner_id', k.accountable_owner_id, 'data_owner_id', k.data_owner_id,
      'reporter_id', k.reporter_id, 'validator_id', k.validator_id,
      'escalation_owner_id', k.escalation_owner_id),
    'formula_version', (
      SELECT to_jsonb(f) - 'variables' FROM public.strata_kpi_formula_versions f
       WHERE f.kpi_id = p_kpi AND f.status = 'approved'
       ORDER BY f.version DESC LIMIT 1),
    'target', (
      SELECT to_jsonb(t) FROM public.strata_kpi_targets t
       WHERE t.kpi_id = p_kpi AND t.period_id = p_period AND t.status = 'approved'
       ORDER BY t.version DESC LIMIT 1),
    'actual', (
      SELECT to_jsonb(a) FROM public.strata_kpi_actuals a
       WHERE a.kpi_id = p_kpi AND a.period_id = p_period
       ORDER BY (a.validation_status = 'validated') DESC, a.submitted_at DESC LIMIT 1),
    'lineage', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', l.id, 'entity_table', l.entity_table, 'entity_id', l.entity_id,
               'upload_run_id', l.upload_run_id, 'run_key', r.run_key,
               'staging_row_id', l.staging_row_id, 'written_by', l.written_by,
               'written_at', l.written_at, 'config_context', l.config_context)), '[]'::jsonb)
        FROM public.strata_lineage_records l
        LEFT JOIN public.strata_upload_runs r ON r.id = l.upload_run_id
       WHERE l.entity_table = 'strata_kpi_actuals'
         AND l.entity_id IN (SELECT a2.id FROM public.strata_kpi_actuals a2
                              WHERE a2.kpi_id = p_kpi AND a2.period_id = p_period)),
    'elements', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', e.id, 'name', e.name, 'element_type', e.element_type,
               'owner_id', e.owner_id, 'perspective_id', e.perspective_id,
               'status', e.status, 'weight', ek.weight)), '[]'::jsonb)
        FROM public.strata_element_kpis ek
        JOIN public.strata_strategy_elements e ON e.id = ek.element_id
       WHERE ek.kpi_id = p_kpi),
    'initiatives', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', i.id, 'name', i.name, 'stage', i.stage, 'status', i.status,
               'owner_id', i.owner_id, 'sponsor_id', i.sponsor_id)), '[]'::jsonb)
        FROM public.strata_initiatives i WHERE i.id = ANY (initiative_ids)),
    'projects', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', pc.id, 'name', pc.name, 'source_system', pc.source_system,
               'stage', pc.stage, 'execution_health', pc.execution_health,
               'actual_progress', pc.actual_progress, 'pm_id', pc.pm_id,
               'milestones', (SELECT count(*) FROM public.strata_milestones m WHERE m.project_card_id = pc.id),
               'blocked_dependencies', (
                 SELECT count(*) FROM public.strata_dependencies d
                  WHERE d.requesting_type = 'project_card' AND d.requesting_id = pc.id
                    AND (d.is_blocker OR d.status = 'blocked')
                    AND d.status NOT IN ('resolved','cancelled')))), '[]'::jsonb)
        FROM public.strata_project_cards pc WHERE pc.id = ANY (project_ids)),
    'benefits', (
      SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
               'id', b.id, 'name', b.name, 'lifecycle_stage', b.lifecycle_stage,
               'owner_id', b.owner_id, 'validator_id', b.validator_id,
               'confidence', b.confidence)), '[]'::jsonb)
        FROM public.strata_benefits b
       WHERE b.id IN (
         SELECT bi.benefit_id FROM public.strata_benefit_initiatives bi
          WHERE bi.initiative_id = ANY (initiative_ids)
         UNION
         SELECT el.to_id FROM public.strata_execution_links el
          WHERE el.to_type = 'benefit' AND el.from_type = 'kpi' AND el.from_id = p_kpi)),
    'snapshots', (
      SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
               'snapshot_id', cv.snapshot_id)), '[]'::jsonb)
        FROM public.strata_calculated_values cv
       WHERE cv.entity_type = 'kpi' AND cv.entity_id = p_kpi
         AND cv.period_id = p_period AND cv.snapshot_id IS NOT NULL)
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.strata_kpi_evidence_chain(uuid, uuid) IS
  'Evidence chain for a KPI/period (F-REP-005): formula, target, actual+validation, source lineage, elements, initiatives, projects (milestones/blockers), benefits, snapshots. Missing links stay empty — never invented.';
