-- CAT-STRATA-IMPL-20260712-001 · PB-DEF-009 · period-close readiness must reflect assurance
--
-- Root cause: strata_needs_attention flagged benefit values with validation_status='pending'
-- (20260710160000). The assurance vocabulary migration (20260717160000) retired 'pending' →
-- 'reported', so the branch matched NOTHING and readiness reported "Benefit values validated —
-- Clear" while a Reported realized value still awaited assurance.
--
-- Fix (forward-only, idempotent CREATE OR REPLACE — no other branch changed):
--   Flag REALIZED values that are not yet independently assured:
--     reported                 → not clear (no assurance yet)
--     owner_confirmed          → not clear (period close requires independent validation)
--     independently_validated  → clear (eligible)
--     accepted_with_exception  → clear (authorized to count; the exception is disclosed elsewhere)
--     rejected / reversed      → terminal, do not block (they simply do not count)
--   Scoped to value_kind='realized' — planned/forecast are targets, not attestable actuals.
--   Server-derived: the RPC is the readiness source of truth, not advisory UI text.
CREATE OR REPLACE FUNCTION public.strata_needs_attention(p_period uuid DEFAULT NULL::uuid)
 RETURNS TABLE(item_type text, severity text, entity_type text, entity_id uuid, entity_name text, detail text, due_date date, owner_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 'pending_attestation', 'warning', 'kpi', a.kpi_id,
         public.strata_entity_name('kpi', a.kpi_id),
         format('%s actual (%s) awaiting attestation', k.name, a.value), NULL::date, NULL::uuid
    FROM public.strata_kpi_actuals a JOIN public.strata_kpis k ON k.id = a.kpi_id
   WHERE a.validation_status = 'pending' AND (p_period IS NULL OR a.period_id = p_period)
  UNION ALL
  -- PB-DEF-009: realized benefit values not yet independently assured block period close.
  SELECT 'pending_benefit_validation', 'warning', 'benefit', v.benefit_id,
         public.strata_entity_name('benefit', v.benefit_id),
         format('%s realized value (%s) %s', b.name, v.value,
                CASE WHEN v.validation_status = 'reported'
                     THEN 'reported — awaiting assurance'
                     ELSE 'owner-confirmed — awaiting independent validation' END),
         NULL::date, b.validator_id
    FROM public.strata_benefit_values v JOIN public.strata_benefits b ON b.id = v.benefit_id
   WHERE v.value_kind = 'realized'
     AND v.validation_status IN ('reported','owner_confirmed')
     AND (p_period IS NULL OR v.period_id = p_period)
  UNION ALL
  SELECT 'blocked_dependency', 'critical', d.requesting_type, d.requesting_id,
         public.strata_entity_name(d.requesting_type, d.requesting_id),
         format('%s dependency blocked%s', d.dependency_type, COALESCE(' — ' || d.impact, '')), d.due_date, d.owner_id
    FROM public.strata_dependencies d
   WHERE (d.is_blocker OR d.status = 'blocked') AND d.status NOT IN ('resolved','cancelled')
  UNION ALL
  SELECT 'overdue_action', 'warning', 'action', a.id, a.title,
         format('%s overdue since %s', a.action_key, a.due_date), a.due_date, a.owner_id
    FROM public.strata_actions a
   WHERE a.status IN ('open','in_progress') AND a.due_date IS NOT NULL AND a.due_date < now()::date
  UNION ALL
  SELECT 'overdue_gate', 'warning', g.subject_type, g.subject_id,
         public.strata_entity_name(g.subject_type, g.subject_id),
         format('gate "%s" scheduled %s still undecided', public.strata_entity_name('gate_instance', g.id), g.scheduled_for), g.scheduled_for, NULL::uuid
    FROM public.strata_gate_instances g
   WHERE g.status IN ('open','in_review') AND g.scheduled_for IS NOT NULL AND g.scheduled_for < now()::date
  UNION ALL
  SELECT 'broken_assumption', 'critical', 'benefit', s.benefit_id,
         public.strata_entity_name('benefit', s.benefit_id),
         format('assumption broken: %s', left(s.description, 140)), NULL::date, s.owner_id
    FROM public.strata_assumptions s WHERE s.status = 'broken'
  UNION ALL
  SELECT 'missing_actual', 'warning', 'kpi', k.id, k.name,
         format('no actual submitted for %s', p.name), p.ends_on, k.created_by
    FROM public.strata_kpis k CROSS JOIN public.strata_periods p
   WHERE p_period IS NOT NULL AND p.id = p_period AND p.close_status <> 'closed'
     AND k.status = 'approved'
     AND NOT EXISTS (SELECT 1 FROM public.strata_kpi_actuals a WHERE a.kpi_id = k.id AND a.period_id = p.id)
  UNION ALL
  SELECT 'upload_rejections', 'warning', 'upload_run', r.id, r.run_key,
         format('%s of %s rows rejected in %s', r.row_count_rejected, r.row_count_raw, r.run_key), NULL::date, NULL::uuid
    FROM public.strata_upload_runs r
   WHERE COALESCE(r.row_count_rejected, 0) > 0 AND r.status IN ('completed','failed')
  UNION ALL
  SELECT 'governance_incomplete', 'warning', 'element', e.id, e.name,
         'active theme without a complete charter', NULL::date, e.owner_id
    FROM public.strata_strategy_elements e
    LEFT JOIN public.strata_theme_charters c ON c.element_id = e.id
   WHERE e.element_type = 'theme' AND e.status = 'active' AND (c.id IS NULL OR c.status <> 'complete')
  UNION ALL
  SELECT 'project_major_delay', 'critical', 'project_card', pc.id, pc.name,
         COALESCE(pc.health_reason, 'Project is in major delay'), pc.final_forecast_end, pc.pm_id
    FROM public.strata_project_cards pc WHERE pc.calculated_health = 'major_delay'
  UNION ALL
  SELECT 'project_health_unavailable', 'warning', 'project_card', pc.id, pc.name,
         COALESCE(pc.health_reason, 'Insufficient milestone baseline data to calculate health'), NULL::date, pc.pm_id
    FROM public.strata_project_cards pc WHERE pc.calculated_health = 'not_available'
  UNION ALL
  SELECT 'project_blocked_dependency', 'critical', 'project_card', pc.id, pc.name,
         format('%s dependency blocked%s', d.dependency_type, COALESCE(' — ' || d.impact, '')), d.due_date, pc.pm_id
    FROM public.strata_project_cards pc
    JOIN public.strata_dependencies d
      ON (d.requesting_type = 'project_card' AND d.requesting_id = pc.id)
      OR (d.serving_type = 'project_card' AND d.serving_id = pc.id)
   WHERE d.is_blocker AND d.status NOT IN ('resolved','cancelled');
$function$;
