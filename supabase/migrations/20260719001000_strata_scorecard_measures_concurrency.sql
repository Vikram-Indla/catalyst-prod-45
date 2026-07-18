-- ─────────────────────────────────────────────────────────────────────────────
-- SC-GOVAPPROVAL P1 — optimistic concurrency for measure saving
-- CAT-STRATA-SC-GOVAPPROVAL-20260718-001 (20-min implementation pass)
--
-- strata_set_model_measures previously accepted no concurrency token, so two
-- concurrent editors could silently overwrite each other (replace-set = last
-- writer wins). This migration:
--   * REQUIRES p_expected_updated_at (the model row's updated_at is the token —
--     same convention as strata_approve_scorecard_model);
--   * locks the model row (FOR UPDATE) and refuses a stale/missing token with
--     check_violation BEFORE any mutation — measures, model timestamp and audit
--     are untouched on conflict;
--   * on success bumps the token atomically with the measure replace-set and
--     RETURNS the new authoritative token plus the persisted validation result.
--
-- Unchanged: role gate, draft/changes_requested-only editability, perspective
-- membership check, NO totals gate on save (incomplete drafts save freely —
-- the validator is called only to REPORT, never to refuse a save).
-- The old 2-arg overload is dropped: with a defaulted 3rd param both would
-- match 2-arg calls, and a token-less path would defeat the protection.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.strata_set_model_measures(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.strata_set_model_measures(
  p_model uuid,
  p_measures jsonb,
  p_expected_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bad uuid;
  v_status text;
  v_updated_at timestamptz;
  v_new timestamptz;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'authoring scorecard measures requires the strategy_office or admin role';
  END IF;

  -- Serialization point: the model row IS the concurrency scope. Two editors
  -- saving from the same starting token queue here; the second sees the bumped
  -- token and conflicts instead of silently overwriting.
  SELECT status, updated_at INTO v_status, v_updated_at
    FROM public.strata_scorecard_models WHERE id = p_model FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;

  -- Definitions are writable only while DRAFT or CHANGES_REQUESTED. Pending,
  -- approved, superseded and rejected definitions are immutable on every path.
  IF v_status NOT IN ('draft','changes_requested') THEN
    RAISE EXCEPTION 'scorecard model is % — its definition is immutable; only draft or changes-requested versions can be edited', v_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION 'a concurrency token is required — reopen the measures editor and try again'
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'the measures changed after you opened the editor — refresh to load the latest definition, then reapply your edits'
      USING ERRCODE = 'check_violation';
  END IF;

  -- every measure's perspective must belong to this model
  SELECT (m->>'perspective_id')::uuid INTO bad
    FROM jsonb_array_elements(coalesce(p_measures, '[]'::jsonb)) m
   WHERE NOT EXISTS (
     SELECT 1 FROM public.strata_scorecard_model_perspectives mp
      WHERE mp.model_id = p_model AND mp.perspective_id = (m->>'perspective_id')::uuid)
   LIMIT 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'perspective % is not on this scorecard model — add the perspective first', bad;
  END IF;

  DELETE FROM public.strata_scorecard_model_measures WHERE model_id = p_model;

  INSERT INTO public.strata_scorecard_model_measures
    (model_id, perspective_id, kpi_id, weight, order_index, required, aggregation_method, target_policy)
  SELECT p_model,
         (m->>'perspective_id')::uuid,
         (m->>'kpi_id')::uuid,
         coalesce((m->>'weight')::numeric, 0),
         coalesce((m->>'order_index')::int, 0),
         coalesce((m->>'required')::boolean, false),
         coalesce(m->>'aggregation_method', 'weighted_average'),
         coalesce(m->>'target_policy', 'default')
    FROM jsonb_array_elements(coalesce(p_measures, '[]'::jsonb)) m;

  -- New authoritative token, atomic with the replace-set (status unchanged, so
  -- the lifecycle guard trigger permits this update). RETURNING reads the row
  -- AFTER any touch trigger — the returned token always equals the stored one.
  UPDATE public.strata_scorecard_models SET updated_at = clock_timestamp()
   WHERE id = p_model
   RETURNING updated_at INTO v_new;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_scorecard_models', p_model, 'RPC:set_model_measures', auth.uid(),
          jsonb_array_length(coalesce(p_measures,'[]'::jsonb))::text || ' measure assignment(s) set');

  RETURN jsonb_build_object(
    'updated_at', v_new,
    'validation', public.strata_validate_scorecard_model(p_model));
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_set_model_measures(uuid, jsonb, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.strata_set_model_measures(uuid, jsonb, timestamptz) IS
  'Replace-set a model''s measure assignments with optimistic concurrency: requires the model row''s updated_at as p_expected_updated_at, locks the row, refuses stale/missing tokens (check_violation, zero mutation), bumps the token atomically on success and returns {updated_at, validation}. No totals gate — incomplete drafts save freely; only submit/approve consume validator blockers.';
