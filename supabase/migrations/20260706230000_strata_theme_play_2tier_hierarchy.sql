-- ============================================================================
-- STRATA Strategy Room — Theme/Play 2-tier hierarchy consolidation
-- CAT-STRATA-HIERARCHY-20260706-001
--
-- Product decision (2026-07-06): Theme and Play are the same business
-- concept. Active Strategy Room hierarchy is Theme -> Objective (2-tier).
-- element_type='play' rows are relabeled to 'theme' in a one-time,
-- non-destructive UPDATE — no id, no FK (parent_id, element_kpis.element_id,
-- play_charters.element_id, gate_instances.subject_id, map_edges) is
-- touched, only the type label. Charter/gate/promotion governance, which
-- was previously gated on element_type='play', now applies to
-- element_type='theme'.
--
-- Scope: context='theme' only. context='project' (Project Objectives,
-- Execution Reconciliation, CAT-STRATA-20260705-001) is completely exempt
-- from every rule below — that flow is owned by a separate workstream and
-- must not be touched by this migration.
--
-- Applied to staging (cyijbdeuehohvhnsywig) ad-hoc on 2026-07-06 and
-- verified there (3 rows relabeled, all dependent-table counts unchanged,
-- audit trigger fired automatically, direct-probe tests for parent
-- eligibility and context-exemption all passed). This file is the durable,
-- idempotent, replayable record of that work — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Defensive: this migration depends on the context column added by the
--    Execution Reconciliation schema (20260706190000, CAT-STRATA-20260705-001,
--    uncommitted as of this writing). Re-stated here with IF NOT EXISTS so
--    this migration is self-sufficient regardless of merge order between the
--    two branches.
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_strategy_elements
  ADD COLUMN IF NOT EXISTS context text NOT NULL DEFAULT 'theme' CHECK (context IN ('theme','project'));

-- ---------------------------------------------------------------------------
-- 1. One-time, non-destructive relabel: Play IS Theme.
-- ---------------------------------------------------------------------------
UPDATE public.strata_strategy_elements SET element_type = 'theme' WHERE element_type = 'play';

-- ---------------------------------------------------------------------------
-- 2. Close element_type to the two remaining active values. Re-runnable.
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_strategy_elements DROP CONSTRAINT IF EXISTS strata_strategy_elements_type_check;
ALTER TABLE public.strata_strategy_elements
  ADD CONSTRAINT strata_strategy_elements_type_check CHECK (element_type IN ('theme','objective'));

-- ---------------------------------------------------------------------------
-- 3. Parent eligibility, scoped to context='theme' only:
--    - Theme is root-level by default (cannot be parented under an Objective;
--      nesting under another Theme is not restricted here — nothing in the
--      approved product rules forbids it, and the UI never offers it as a
--      creation path).
--    - Objective MUST be parented directly to a Theme (parent required, and
--      must be element_type='theme').
--    - Objective cannot parent to another Objective (no configurable
--      hierarchy-rule override exists yet — this is unconditional today).
--    - context='project' rows (Project Objectives) are completely exempt —
--      verified against real staging data: 2 existing Project Objectives are
--      parented to a theme-context Objective, which is valid under their own,
--      separate rule and must not be touched by this trigger.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_validate_element_parent_type()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE parent_type text;
BEGIN
  IF NEW.context <> 'theme' THEN
    RETURN NEW;
  END IF;

  IF NEW.element_type = 'objective' AND NEW.parent_id IS NULL THEN
    RAISE EXCEPTION 'an Objective must be parented to a Theme';
  END IF;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT element_type INTO parent_type FROM public.strata_strategy_elements WHERE id = NEW.parent_id;
    IF parent_type IS NULL THEN
      RAISE EXCEPTION 'parent element not found';
    END IF;

    IF NEW.element_type = 'theme' AND parent_type = 'objective' THEN
      RAISE EXCEPTION 'a Theme cannot be parented under an Objective';
    END IF;

    IF NEW.element_type = 'objective' AND parent_type <> 'theme' THEN
      RAISE EXCEPTION 'an Objective must be parented directly to a Theme';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.strata_validate_element_parent_type() IS
  'Enforces the 2-tier Strategy Room hierarchy (Theme -> Objective) for context=theme elements only. Approved 2026-07-06 (CAT-STRATA-HIERARCHY-20260706-001).';

DROP TRIGGER IF EXISTS trg_strata_strategy_elements_parent_type ON public.strata_strategy_elements;
CREATE TRIGGER trg_strata_strategy_elements_parent_type
  BEFORE INSERT OR UPDATE OF element_type, parent_id, context
  ON public.strata_strategy_elements
  FOR EACH ROW EXECUTE FUNCTION public.strata_validate_element_parent_type();

-- ---------------------------------------------------------------------------
-- 4. Extend promotion governance from element_type='play' to element_type=
--    'theme' (approved DEFECT-007 direction: Play=Theme, so charter/KPI/gate
--    promotion gating must apply to Theme going forward, not disappear).
--    Identical to the prior body (20260705190000_strata_authoring_write_paths
--    .sql:538-582) except the one 'play' -> 'theme' condition.
-- ---------------------------------------------------------------------------
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

  IF el.owner_id IS NULL THEN missing := array_append(missing, 'accountable owner'); END IF;

  IF el.element_type = 'theme' THEN
    SELECT * INTO charter FROM public.strata_play_charters WHERE element_id = p_element;
    IF charter IS NULL THEN
      missing := array_append(missing, 'charter');
      missing := array_append(missing, 'value hypothesis (charter value thesis)');
      missing := array_append(missing, 'gate schedule');
    ELSE
      IF charter.hypothesis IS NULL OR btrim(charter.hypothesis) = '' THEN missing := array_append(missing, 'charter hypothesis'); END IF;
      IF charter.scope IS NULL OR btrim(charter.scope) = '' THEN missing := array_append(missing, 'charter scope'); END IF;
      IF charter.value_thesis IS NULL OR btrim(charter.value_thesis) = '' THEN missing := array_append(missing, 'value hypothesis (charter value thesis)'); END IF;
      IF charter.owner_id IS NULL THEN missing := array_append(missing, 'charter owner'); END IF;
      SELECT count(*) INTO gate_count FROM public.strata_gate_instances
       WHERE subject_type = 'element' AND subject_id = p_element;
      IF gate_count = 0 THEN missing := array_append(missing, 'gate schedule'); END IF;
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
          'promoted to active governance (owner + charter + value hypothesis + KPI set + gate schedule verified)');
END;
$$;

COMMENT ON FUNCTION public.strata_promote_element(uuid) IS
  'Server-side promotion guard (F-STR-008, updated CAT-STRATA-HIERARCHY-20260706-001): aggregates ALL missing prerequisites. Charter/KPI/gate requirements now apply to element_type=theme (was play, before Play=Theme consolidation).';

-- ---------------------------------------------------------------------------
-- 5. Governance-drift rule in the Needs Attention feed: same relabel,
--    'play' -> 'theme'. Identical to the prior body
--    (20260705190000_strata_authoring_write_paths.sql:2256-2337) except the
--    one clause 9 condition and its message text.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_needs_attention(p_period uuid DEFAULT NULL)
RETURNS TABLE (
  item_type text, severity text, entity_type text, entity_id uuid,
  entity_name text, detail text, due_date date
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'pending_attestation', 'warning', 'kpi', a.kpi_id,
         public.strata_entity_name('kpi', a.kpi_id),
         format('%s actual (%s) awaiting attestation', k.name, a.value), NULL::date
    FROM public.strata_kpi_actuals a JOIN public.strata_kpis k ON k.id = a.kpi_id
   WHERE a.validation_status = 'pending' AND (p_period IS NULL OR a.period_id = p_period)
  UNION ALL
  SELECT 'pending_benefit_validation', 'warning', 'benefit', v.benefit_id,
         public.strata_entity_name('benefit', v.benefit_id),
         format('%s %s value (%s) awaiting validation', b.name, v.value_kind, v.value), NULL::date
    FROM public.strata_benefit_values v JOIN public.strata_benefits b ON b.id = v.benefit_id
   WHERE v.validation_status = 'pending' AND (p_period IS NULL OR v.period_id = p_period)
  UNION ALL
  SELECT 'blocked_dependency', 'critical', d.requesting_type, d.requesting_id,
         public.strata_entity_name(d.requesting_type, d.requesting_id),
         format('%s dependency blocked%s', d.dependency_type, COALESCE(' — ' || d.impact, '')), d.due_date
    FROM public.strata_dependencies d
   WHERE (d.is_blocker OR d.status = 'blocked') AND d.status NOT IN ('resolved','cancelled')
  UNION ALL
  SELECT 'overdue_action', 'warning', 'action', a.id,
         a.title, format('%s overdue since %s', a.action_key, a.due_date), a.due_date
    FROM public.strata_actions a
   WHERE a.status IN ('open','in_progress') AND a.due_date IS NOT NULL AND a.due_date < now()::date
  UNION ALL
  SELECT 'overdue_gate', 'warning', g.subject_type, g.subject_id,
         public.strata_entity_name(g.subject_type, g.subject_id),
         format('gate "%s" scheduled %s still undecided', public.strata_entity_name('gate_instance', g.id), g.scheduled_for), g.scheduled_for
    FROM public.strata_gate_instances g
   WHERE g.status IN ('open','in_review') AND g.scheduled_for IS NOT NULL AND g.scheduled_for < now()::date
  UNION ALL
  SELECT 'broken_assumption', 'critical', 'benefit', s.benefit_id,
         public.strata_entity_name('benefit', s.benefit_id),
         format('assumption broken: %s', left(s.description, 140)), NULL::date
    FROM public.strata_assumptions s WHERE s.status = 'broken'
  UNION ALL
  SELECT 'missing_actual', 'warning', 'kpi', k.id, k.name,
         format('no actual submitted for %s', p.name), p.ends_on
    FROM public.strata_kpis k CROSS JOIN public.strata_periods p
   WHERE p_period IS NOT NULL AND p.id = p_period AND p.close_status <> 'closed'
     AND k.status = 'approved'
     AND NOT EXISTS (SELECT 1 FROM public.strata_kpi_actuals a WHERE a.kpi_id = k.id AND a.period_id = p.id)
  UNION ALL
  SELECT 'upload_rejections', 'warning', 'upload_run', r.id, r.run_key,
         format('%s of %s rows rejected in %s', r.row_count_rejected, r.row_count_raw, r.run_key), NULL::date
    FROM public.strata_upload_runs r WHERE COALESCE(r.row_count_rejected, 0) > 0 AND r.status IN ('completed','failed')
  UNION ALL
  SELECT 'governance_incomplete', 'warning', 'element', e.id, e.name,
         'active theme without a complete charter', NULL::date
    FROM public.strata_strategy_elements e LEFT JOIN public.strata_play_charters c ON c.element_id = e.id
   WHERE e.element_type = 'theme' AND e.status = 'active' AND (c.id IS NULL OR c.status <> 'complete');
$$;

COMMENT ON FUNCTION public.strata_needs_attention(uuid) IS
  'Rule-driven Needs Attention feed (F-REP-004, updated CAT-STRATA-HIERARCHY-20260706-001): governance drift now checks element_type=theme (was play).';
