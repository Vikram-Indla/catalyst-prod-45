-- CAT-STRATA-IMPL-20260712-001 · slice F1a · closes anchor 27's SoD column
-- Plan Lock: features/CAT-STRATA-IMPL-20260712-001/03_PLAN_LOCK_F1_SOD.md (F1-D1 approved, F1-D2 deferred)
--
-- PROJECTS the SoD rules the engine ALREADY enforces onto a person's role set.
-- It invents no policy — anchor 27: "the UI mirrors the server role engine, never replaces it";
-- P5-D4: "SoD stays DB-enforced; no client SoD engine".
--
-- The engine raises exactly four SoD rules (extracted from pg_proc 2026-07-16). Every one is
-- RECORD-scoped: it compares the actor to THAT record's creator/submitter/owner at action time.
--   strata_approve_record        gate strategy_office          vs created_by
--   strata_attest_actual         gate vmo_validator|validator  vs submitted_by
--   strata_validate_benefit_value gate vmo_validator|validator vs submitted_by
--   strata_decide_gate           gate stage.approval_roles     vs subject owner_id
--
-- Therefore the constrained side is NOT a role — it is being that record's submitter/creator/owner,
-- which anyone can be. So GUARDED is NOT a role-COMBINATION property:
--   guarded = holds a role one of the four rules GATES  -> they can approve, so a rule WILL refuse
--             them on their own records.
--   clean   = holds no such role                        -> no SoD rule can ever bite them.
--
-- decide_gate's approving side is DATA-DRIVEN (strata_gate_model_stages.approval_roles), so it is
-- READ here rather than hard-coded; hard-coding would let this projection silently drift from the
-- engine as gate models change.
--
-- CONFLICT is deliberately NOT returned (F1-D2 deferred): the engine never refuses a role
-- COMBINATION — assignRole permits everything — so emitting CONFLICT would assert a check that does
-- not exist. It stays a labelled gap in the UI.
--
-- Not SECURITY DEFINER on purpose: it reads only what the caller may already read under RLS, so it
-- cannot become a privilege-escalation seam. Read-only; adds no tables.

CREATE OR REPLACE FUNCTION public.strata_check_role_sod(p_user uuid)
RETURNS TABLE (role_key text, verdict text, rules text[])
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH rule_roles(r, txt) AS (
    SELECT 'strategy_office'::text,
           'segregation of duties: the creator cannot approve their own record'::text
    UNION ALL
    SELECT 'vmo_validator'::text,
           'segregation of duties: the submitter cannot attest their own actual'::text
    UNION ALL
    SELECT 'vmo_validator'::text,
           'segregation of duties: the submitter cannot validate their own value record'::text
    UNION ALL
    SELECT DISTINCT gr.r::text,
           'segregation of duties: the subject owner cannot decide their own gate'::text
      FROM public.strata_gate_model_stages s,
           unnest(s.approval_roles) AS gr(r)
     WHERE s.approval_roles IS NOT NULL
  ),
  mine AS (
    SELECT DISTINCT ra.role::text AS role_key
      FROM public.strata_role_assignments ra
     WHERE ra.user_id = p_user
  )
  SELECT m.role_key,
         CASE WHEN EXISTS (SELECT 1 FROM rule_roles rr WHERE rr.r = m.role_key)
              THEN 'guarded' ELSE 'clean' END,
         COALESCE(ARRAY(SELECT DISTINCT rr.txt FROM rule_roles rr WHERE rr.r = m.role_key ORDER BY 1),
                  '{}'::text[])
    FROM mine m
   ORDER BY m.role_key;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_check_role_sod(uuid) TO authenticated;
