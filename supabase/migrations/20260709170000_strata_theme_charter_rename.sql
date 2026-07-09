-- CAT-STRATA-FOUNDATION-20260709-001 · REQ-002 (CON-001: full rename, no fork)
-- "Play" is retired from active STRATA terminology (locked goal rule 2).
-- Renames the charter table and its authoring RPC, and repairs the
-- strata_needs_attention governance-drift branch that still filtered on
-- element_type='play' — dead since 20260706230000 relabeled play->theme.
-- Data, IDs, RLS policies and indexes are preserved by the in-place rename.
-- Historical strata_audit_events rows keep entity_table='strata_play_charters'
-- (they record what the table was called at the time — not rewritten).

-- 1. Table rename (policies/indexes/constraints follow the table).
ALTER TABLE public.strata_play_charters RENAME TO strata_theme_charters;

-- 2. New RPC name, same contract (F-STR-005). Body identical to
--    20260705190000 except table + audit strings.
CREATE OR REPLACE FUNCTION public.strata_upsert_theme_charter(
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

  SELECT * INTO ch FROM public.strata_theme_charters WHERE element_id = p_element;
  IF ch IS NULL THEN
    INSERT INTO public.strata_theme_charters (element_id, hypothesis, scope, value_thesis, gate_model_id, owner_id, status)
    VALUES (p_element, p_hypothesis, p_scope, p_value_thesis, p_gate_model, p_owner, 'draft')
    RETURNING id INTO cid;
  ELSE
    cid := ch.id;
    UPDATE public.strata_theme_charters
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
    FROM public.strata_theme_charters c WHERE c.id = cid;

  UPDATE public.strata_theme_charters SET status = new_status, updated_at = now() WHERE id = cid;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_theme_charters', cid, 'RPC:upsert_theme_charter', auth.uid(),
          format('charter %s for %s', new_status, el.name));
  RETURN cid;
END;
$$;

COMMENT ON FUNCTION public.strata_upsert_theme_charter(uuid,text,text,text,uuid,uuid) IS
  'F-STR-005 · Author/maintain the Theme charter (renamed from play charter, REQ-002). Status derives from completeness (hypothesis + scope + value thesis + owner + gate model).';

-- 3. Retire the old RPC name — no terminology fork.
DROP FUNCTION IF EXISTS public.strata_upsert_play_charter(uuid,text,text,text,uuid,uuid);

-- 4. Repair strata_needs_attention branch 9 (dead filter + renamed table).
--    Full body identical to 20260706231000 except branch 9.
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
  -- 9) Active Themes with incomplete charters (governance drift).
  -- REQ-002 repair: was element_type='play' (dead since 20260706230000
  -- relabel) joined to the pre-rename table.
  SELECT 'governance_incomplete', 'warning', 'element', e.id, e.name,
         'active theme without a complete charter', NULL::date
    FROM public.strata_strategy_elements e
    LEFT JOIN public.strata_theme_charters c ON c.element_id = e.id
   WHERE e.element_type = 'theme' AND e.status = 'active'
     AND (c.id IS NULL OR c.status <> 'complete')
  UNION ALL
  -- 10) Project Card major delay (Execution Health & Forecast rule 15) —
  -- includes the rule-11 forecast-override case, since that always sets
  -- calculated_health = 'major_delay' too.
  SELECT 'project_major_delay', 'critical', 'project_card', pc.id, pc.name,
         COALESCE(pc.health_reason, 'Project is in major delay'), pc.final_forecast_end
    FROM public.strata_project_cards pc
   WHERE pc.calculated_health = 'major_delay'
  UNION ALL
  -- 11) Project Card health Not Available due to missing milestone baseline data
  SELECT 'project_health_unavailable', 'warning', 'project_card', pc.id, pc.name,
         COALESCE(pc.health_reason, 'Insufficient milestone baseline data to calculate health'), NULL::date
    FROM public.strata_project_cards pc
   WHERE pc.calculated_health = 'not_available'
  UNION ALL
  -- 12) Project Card has an open blocker dependency, in either direction —
  -- broader than branch 3 (which only surfaces the requesting-side entity).
  SELECT 'project_blocked_dependency', 'critical', 'project_card', pc.id, pc.name,
         format('%s dependency blocked%s', d.dependency_type, COALESCE(' — ' || d.impact, '')), d.due_date
    FROM public.strata_project_cards pc
    JOIN public.strata_dependencies d
      ON (d.requesting_type = 'project_card' AND d.requesting_id = pc.id)
      OR (d.serving_type = 'project_card' AND d.serving_id = pc.id)
   WHERE d.is_blocker AND d.status NOT IN ('resolved','cancelled');
$$;

COMMENT ON FUNCTION public.strata_needs_attention(uuid) IS
  'Rule-driven Needs Attention feed (F-REP-004 + Execution Health & Forecast rule 15): attestations, validations, blockers, overdue actions/gates, broken assumptions, missing actuals, upload rejections, governance drift (theme charters), project-card major delay, project-card health unavailable, project-card blocker dependencies. No seeded rows.';
