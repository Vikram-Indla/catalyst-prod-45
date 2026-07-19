-- CAT-STRATA-THEMEOKR-20260719-001 — Wave 5: periodic check-ins, closing review, and the
-- immutable close snapshot (invariants 10,13; prompt "Review, decisions, and close").
--
-- Closing an OKR freezes final eligible observations, formulas, targets, KR membership, result,
-- status, confidence and commentary into an immutable snapshot with a content hash. Closed OKRs
-- and their KRs are already frozen by the guard_closed_okr triggers; the snapshot is byte-stable.
-- An OKR cannot close while a required KR lacks an eligible final observation unless an authorised
-- exception with reason is recorded.

-- ---------------------------------------------------------------------------
-- 1. Periodic check-ins / management review assessments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_okr_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id uuid NOT NULL REFERENCES public.strata_okrs(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  checkin_type text NOT NULL DEFAULT 'monthly' CHECK (checkin_type IN ('monthly','quarterly','half_year','year_end')),
  management_status text CHECK (management_status IS NULL OR management_status IN ('on_track','at_risk','off_track','not_assessed')),
  assessment text,
  decisions text,
  corrective_actions text,
  official_progress_snapshot jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_okr_checkins IS
  'Periodic OKR check-ins / review assessments (CAT-STRATA-THEMEOKR-20260719-001). Management status is captured separately from the mathematical progress score.';
CREATE INDEX IF NOT EXISTS idx_strata_okr_checkins_okr ON public.strata_okr_checkins(okr_id, created_at DESC);
ALTER TABLE public.strata_okr_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_okr_checkins_select ON public.strata_okr_checkins FOR SELECT USING (public.current_user_is_approved());
CREATE POLICY strata_okr_checkins_write ON public.strata_okr_checkins FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office','okr_owner','okr_approver']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','okr_owner','okr_approver']));
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_okr_checkins_audit') THEN
    CREATE TRIGGER trg_strata_okr_checkins_audit AFTER INSERT OR UPDATE OR DELETE ON public.strata_okr_checkins FOR EACH ROW EXECUTE FUNCTION public.strata_audit();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Immutable close snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_okr_close_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id uuid NOT NULL REFERENCES public.strata_okrs(id) ON DELETE RESTRICT,
  okr_version_id uuid REFERENCES public.strata_okr_versions(id) ON DELETE SET NULL,
  final_status text NOT NULL,
  official_progress numeric,
  payload jsonb NOT NULL,
  content_hash text NOT NULL,
  locked_by uuid NOT NULL DEFAULT auth.uid(),
  locked_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_okr_close_snapshots IS
  'Immutable OKR close snapshot (invariant 10). Freezes result/status/confidence/KR membership/observations/formulas/targets + content hash. Never edited; corrections are a new superseding snapshot.';
CREATE INDEX IF NOT EXISTS idx_strata_okr_close_snapshots_okr ON public.strata_okr_close_snapshots(okr_id);
ALTER TABLE public.strata_okr_close_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_okr_close_snapshots_select ON public.strata_okr_close_snapshots FOR SELECT USING (public.current_user_is_approved());
-- writes are RPC-only (SECURITY DEFINER); no client insert/update/delete policy => immutable to clients
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_okr_close_snapshots_audit') THEN
    CREATE TRIGGER trg_strata_okr_close_snapshots_audit AFTER INSERT OR UPDATE OR DELETE ON public.strata_okr_close_snapshots FOR EACH ROW EXECUTE FUNCTION public.strata_audit();
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.strata_guard_okr_close_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  RAISE EXCEPTION 'CLOSED_LOCKED_MUTATION: a locked OKR close snapshot is immutable — create a superseding snapshot';
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_guard_okr_close_snapshot ON public.strata_okr_close_snapshots;
CREATE TRIGGER trg_strata_guard_okr_close_snapshot BEFORE UPDATE OR DELETE ON public.strata_okr_close_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_okr_close_snapshot();

-- ---------------------------------------------------------------------------
-- 3. Lifecycle RPCs: begin closing review, check-in, close + snapshot
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_begin_okr_closing_review(p_okr uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id=p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status <> 'active' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only an active OKR can enter closing review (current: %)', o.status; END IF;
  UPDATE public.strata_okrs SET status='closing_review', lock_version=lock_version+1, updated_at=now() WHERE id=p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_begin_okr_closing_review(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_create_okr_checkin(
  p_okr uuid, p_period uuid, p_type text DEFAULT 'monthly', p_management_status text DEFAULT NULL,
  p_assessment text DEFAULT NULL, p_decisions text DEFAULT NULL, p_corrective_actions text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; v_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','okr_approver']) THEN RAISE EXCEPTION 'STRATA_FORBIDDEN'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id=p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status = 'closed' THEN RAISE EXCEPTION 'CLOSED_LOCKED_MUTATION: a closed OKR is immutable'; END IF;
  INSERT INTO public.strata_okr_checkins (okr_id, period_id, checkin_type, management_status, assessment, decisions, corrective_actions, official_progress_snapshot)
    VALUES (p_okr, p_period, p_type, p_management_status, p_assessment, p_decisions, p_corrective_actions,
            public.strata_okr_official_progress_v2(p_okr))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_create_okr_checkin(uuid,uuid,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_close_and_snapshot_okr(
  p_okr uuid, p_final_status text, p_reason text, p_allow_exception boolean DEFAULT false, p_exception_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; kr record; missing text[] := '{}'; kr_payload jsonb := '[]'::jsonb; prog jsonb;
  official jsonb; payload jsonb; v_hash text; v_snap uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_approver']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: closing an OKR requires strategy_office/okr_approver'; END IF;
  IF p_final_status NOT IN ('achieved','partially_achieved','missed') THEN
    RAISE EXCEPTION 'INVALID_OKR: final status must be achieved|partially_achieved|missed'; END IF;
  IF p_reason IS NULL OR btrim(p_reason)='' THEN RAISE EXCEPTION 'INVALID_OKR: a closure reason is required'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id=p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status NOT IN ('active','closing_review') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: only an active/closing-review OKR can be closed (current: %)', o.status; END IF;

  -- invariant 13: every reportable, non-retired KR needs an eligible final observation unless exception
  FOR kr IN SELECT * FROM public.strata_key_results WHERE okr_id=p_okr AND COALESCE(lifecycle,'active')<>'retired' LOOP
    IF (public.strata_kr_reportability(kr.id)->>'reportable')::boolean THEN
      prog := public.strata_kr_progress(kr.id);
      IF (prog->>'observation_id') IS NULL AND (prog->>'source') <> 'legacy_current_value' THEN
        missing := array_append(missing, kr.name);
      END IF;
      kr_payload := kr_payload || jsonb_build_object(
        'kr_id', kr.id, 'kr_ref', kr.kr_ref, 'name', kr.name, 'baseline', kr.baseline, 'target', kr.target,
        'direction', kr.direction, 'is_critical', kr.is_critical, 'weight', kr.weight,
        'formula_id', kr.formula_id, 'formula_version', kr.formula_version,
        'final_progress', prog);
    END IF;
  END LOOP;
  IF array_length(missing,1) > 0 AND NOT p_allow_exception THEN
    RAISE EXCEPTION 'INELIGIBLE_OBSERVATION: cannot close — KRs lack an eligible final observation: %; record an authorised exception to override', array_to_string(missing,'; ');
  END IF;
  IF array_length(missing,1) > 0 AND (p_exception_reason IS NULL OR btrim(p_exception_reason)='') THEN
    RAISE EXCEPTION 'INELIGIBLE_OBSERVATION: an exception reason is required to close over missing observations'; END IF;

  official := public.strata_okr_official_progress_v2(p_okr);
  payload := jsonb_build_object(
    'okr_id', o.id, 'name', o.name, 'objective_statement', o.objective_statement, 'theme_id', o.theme_id,
    'commitment', o.commitment, 'cycle_id', o.cycle_id, 'current_version_id', o.current_version_id,
    'final_status', p_final_status, 'closure_reason', p_reason,
    'official_progress', official, 'key_results', kr_payload,
    'exception', CASE WHEN array_length(missing,1) > 0 THEN jsonb_build_object('krs', to_jsonb(missing), 'reason', p_exception_reason) ELSE NULL END,
    'frozen_at_note', 'immutable close snapshot');
  v_hash := md5(payload::text);

  INSERT INTO public.strata_okr_close_snapshots (okr_id, okr_version_id, final_status, official_progress, payload, content_hash)
    VALUES (p_okr, o.current_version_id, p_final_status, (official->>'official_progress')::numeric, payload, v_hash)
  RETURNING id INTO v_snap;

  UPDATE public.strata_okrs
     SET status='closed', final_status=p_final_status, closure_reason=p_reason,
         closed_at=now(), closed_by=auth.uid(), lock_version=lock_version+1, updated_at=now()
   WHERE id=p_okr;

  RETURN jsonb_build_object('snapshot_id', v_snap, 'content_hash', v_hash, 'official_progress', (official->>'official_progress'), 'final_status', p_final_status);
END; $function$;
COMMENT ON FUNCTION public.strata_close_and_snapshot_okr(uuid,text,text,boolean,text) IS
  'Close an OKR and freeze an immutable, hashed close snapshot (invariants 10,13). Blocks close while a required KR lacks an eligible final observation unless an authorised exception is recorded.';
GRANT EXECUTE ON FUNCTION public.strata_close_and_snapshot_okr(uuid,text,text,boolean,text) TO authenticated;
