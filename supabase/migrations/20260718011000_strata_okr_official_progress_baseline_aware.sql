-- CAT-STRATA-KODEF-20260717-001 — KO-DEF-005: official OKR progress calculation inconsistency.
--
-- Bug: strata_okr_official_progress (20260718009000) computed per-KR progress as
-- least(current_value / target, 1), IGNORING baseline — so a KR with baseline 10, target 20,
-- current 15 reported 15/20 = 75% instead of (15-10)/(20-10) = 50%. The KR row already used the
-- canonical baseline-aware formula (krProgressFraction), so the official figure and the row
-- disagreed.
--
-- Fix: use the SAME canonical formula the KR row uses —
--   (current - baseline) / (target - baseline), clamped [0,1].
-- This is direction-correct for both higher- and lower-better without a branch, because the span
-- sign flips (lower-better 14->5, current 9: (9-14)/(5-14) = 0.5556). Equal baseline/target
-- (span 0) or null values contribute 0 (safe). Reportable-only aggregation is unchanged; only the
-- per-KR fraction is corrected, so official %, reportable count, excluded count and the KR row now
-- reconcile exactly.
--
-- Staging (rolled back): baseline 10 / target 20 / current 15 => official 0.5000, reportable 1,
-- excluded 1 (the pending-KPI KR excluded from numerator AND denominator). Was 0.75.
--
-- Reportability (strata_kr_reportability), KPI/Scorecard/locked calculations and OKR lifecycle
-- are untouched.

CREATE OR REPLACE FUNCTION public.strata_okr_official_progress(p_okr uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE kr record; rep jsonb; n int := 0; excluded int := 0; total numeric := 0; span numeric; base numeric; frac numeric;
BEGIN
  FOR kr IN SELECT * FROM public.strata_key_results WHERE okr_id = p_okr LOOP
    rep := public.strata_kr_reportability(kr.id, p_as_of);
    IF (rep->>'reportable')::boolean THEN
      n := n + 1;
      base := COALESCE(kr.baseline, 0);
      span := kr.target - base;
      IF kr.target IS NOT NULL AND kr.current_value IS NOT NULL AND span <> 0 THEN
        frac := GREATEST(0, LEAST(1, (kr.current_value - base) / span));
        total := total + frac;
      END IF; -- span 0 / null values contribute 0 (safe)
    ELSE excluded := excluded + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('okr_id', p_okr, 'reportable_krs', n, 'excluded_krs', excluded,
    'official_progress', CASE WHEN n > 0 THEN round(total / n, 4) ELSE null END);
END; $function$;

COMMENT ON FUNCTION public.strata_okr_official_progress(uuid, date) IS
  'Official OKR progress over REPORTABLE KRs only (KO-DEF-003/005). Per-KR progress uses the canonical baseline-aware (current-baseline)/(target-baseline) formula, matching the KR row; non-reportable KRs excluded from numerator and denominator.';
