-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S10 — snapshot chain, notifications, review evidence
-- Forward-only, additive.
--   050 — strata_governance_snapshots: immutable frozen record of approved assignments +
--         contribution mappings + KR measurement contracts.
--   052 — notification rules + strata_notify_stale_measurements + strata_notify_retirement_impact.
--   046 — review_id provenance columns on contribution mappings + assignment observations.
-- ---------------------------------------------------------------------------

-- 046: review-evidence provenance (recorded on the governed rows) ---------------
ALTER TABLE public.strata_kpi_contribution_mappings ADD COLUMN IF NOT EXISTS review_id uuid;
ALTER TABLE public.strata_kpi_assignment_observations ADD COLUMN IF NOT EXISTS review_id uuid;
COMMENT ON COLUMN public.strata_kpi_contribution_mappings.review_id IS
  'Optional governed review that authorised this mapping (STRATA-KPI-046). Records approval evidence for material changes.';

-- 050: immutable governance snapshot -------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_governance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid DEFAULT auth.uid(),
  assignments jsonb NOT NULL,
  contribution_mappings jsonb NOT NULL,
  kr_contracts jsonb NOT NULL
);
COMMENT ON TABLE public.strata_governance_snapshots IS
  'Immutable point-in-time freeze of approved KPI Assignments, Contribution Mappings and KR measurement contracts (STRATA-KPI-050). Never updated or deleted.';
ALTER TABLE public.strata_governance_snapshots ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_governance_snapshots' AND policyname='strata_govsnap_read') THEN
    CREATE POLICY strata_govsnap_read ON public.strata_governance_snapshots FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='strata_governance_snapshots' AND policyname='strata_govsnap_insert') THEN
    CREATE POLICY strata_govsnap_insert ON public.strata_governance_snapshots FOR INSERT TO authenticated
      WITH CHECK (public.strata_has_role(ARRAY['strategy_office']));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.strata_guard_govsnap_immutable()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE: governance snapshots are frozen and cannot be % (STRATA-KPI-050)', TG_OP;
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_govsnap_immutable ON public.strata_governance_snapshots;
CREATE TRIGGER trg_strata_govsnap_immutable BEFORE UPDATE OR DELETE ON public.strata_governance_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_govsnap_immutable();

CREATE OR REPLACE FUNCTION public.strata_snapshot_governance(p_label text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: capturing a governance snapshot requires strategy_office'; END IF;
  INSERT INTO public.strata_governance_snapshots(label, assignments, contribution_mappings, kr_contracts)
  VALUES(
    p_label,
    COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.strata_kpi_assignments a WHERE a.status='approved'), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(to_jsonb(m)) FROM public.strata_kpi_contribution_mappings m WHERE m.status='approved'), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('kr', kr.id, 'okr', kr.okr_id, 'kpi', kr.kpi_id,
              'assignment', kr.strategic_assignment_id, 'version', kr.current_version_id))
              FROM public.strata_key_results kr
              JOIN public.strata_okrs o ON o.id=kr.okr_id WHERE o.status IN ('active','closing_review','closed')), '[]'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_snapshot_governance(text) TO authenticated;

-- 052: notification rules for the new governed events --------------------------
INSERT INTO public.strata_notification_rules(event_type, label, audience, enabled, status)
VALUES
  ('kpi_assignment_stale','Stale KPI assignment measurement','owner', true, 'approved'),
  ('kpi_retirement_impact','KPI retirement impacts dependents','owner', true, 'approved'),
  ('kpi_assignment_approved','KPI assignment approved','owner', true, 'approved')
ON CONFLICT DO NOTHING;

-- Stale-measurement sweep: notify owners of approved assignments whose latest eligible
-- observation is older than p_days (or missing). Returns the number of notifications sent.
CREATE OR REPLACE FUNCTION public.strata_notify_stale_measurements(p_days int DEFAULT 90)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record; last_obs date; n int := 0;
BEGIN
  FOR a IN SELECT * FROM public.strata_kpi_assignments WHERE status='approved' AND owner_id IS NOT NULL LOOP
    SELECT max(as_of_date) INTO last_obs FROM public.strata_kpi_assignment_observations
     WHERE assignment_id = a.id AND status IN ('validated','accepted_with_exception');
    IF last_obs IS NULL OR last_obs < (current_date - p_days) THEN
      PERFORM public.strata_notify(a.owner_id, 'kpi_assignment_stale', 'strata_kpi_assignments', a.id,
        format('KPI assignment %s measurement is stale', COALESCE(a.assignment_key, a.id::text)),
        format('No eligible observation since %s', COALESCE(last_obs::text, 'ever')));
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_notify_stale_measurements(int) TO authenticated;

-- Retirement-impact notification: warn accountable owners before retiring a KPI with dependents.
CREATE OR REPLACE FUNCTION public.strata_notify_retirement_impact(p_kpi uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE impact jsonb; k record; n int := 0;
BEGIN
  impact := public.strata_kpi_dependency_impact(p_kpi);
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF (impact->'active_total')::int > 0 AND k.accountable_owner_id IS NOT NULL THEN
    PERFORM public.strata_notify(k.accountable_owner_id, 'kpi_retirement_impact', 'strata_kpis', p_kpi,
      format('Retiring %s affects %s active dependent(s)', k.name, impact->>'active_total'),
      impact::text);
    n := 1;
  END IF;
  RETURN n;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_notify_retirement_impact(uuid) TO authenticated;
