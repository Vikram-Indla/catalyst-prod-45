-- CAT-STRATA-RDDEF-20260718-001 · deployment correction (found by staging probe P5)
--
-- BUG in 20260718170000: the agenda readiness term used
--   NOT (jsonb_typeof(agenda) = 'array' AND jsonb_array_length(agenda) > 0)
-- With agenda NULL (every review that has never authored one), jsonb_typeof(NULL) is NULL, the
-- whole predicate collapses to NULL, and the CASE emits NO 'agenda is empty' reason. Consequence:
-- a review missing ONLY its agenda would pass the RPC readiness gate and could Start — and the
-- view's is_ready became NULL rather than false. COALESCE(..., false) restores three-valued
-- sanity in both places. No data change; view + one function replaced in-kind.

CREATE OR REPLACE VIEW public.strata_review_readiness AS
SELECT
  r.id AS review_id,
  r.review_key,
  r.status,
  (r.snapshot_id IS NOT NULL AND s.status = 'locked') AS snapshot_locked,
  (r.board_pack_id IS NOT NULL) AS pack_attached,
  (
    (r.snapshot_id IS NOT NULL AND s.status = 'locked')
    AND r.chair_id IS NOT NULL
    AND r.accountable_owner_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.strata_review_participants p WHERE p.review_id = r.id)
    AND COALESCE(jsonb_typeof(r.agenda) = 'array' AND jsonb_array_length(r.agenda) > 0, false)
  ) AS is_ready,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN r.snapshot_id IS NULL THEN 'no snapshot attached' END,
    CASE WHEN r.snapshot_id IS NOT NULL AND s.status <> 'locked' THEN 'snapshot is not locked' END,
    CASE WHEN r.chair_id IS NULL THEN 'no chair recorded' END,
    CASE WHEN r.accountable_owner_id IS NULL THEN 'no accountable owner recorded' END,
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.strata_review_participants p WHERE p.review_id = r.id)
         THEN 'no participants recorded' END,
    CASE WHEN NOT COALESCE(jsonb_typeof(r.agenda) = 'array' AND jsonb_array_length(r.agenda) > 0, false)
         THEN 'agenda is empty' END,
    CASE WHEN r.board_pack_id IS NULL THEN 'no board pack attached' END
  ], NULL) AS blocking_reasons,
  (r.chair_id IS NOT NULL)              AS chair_present,
  (r.accountable_owner_id IS NOT NULL)  AS accountable_present,
  EXISTS (SELECT 1 FROM public.strata_review_participants p WHERE p.review_id = r.id) AS participants_present,
  COALESCE(jsonb_typeof(r.agenda) = 'array' AND jsonb_array_length(r.agenda) > 0, false) AS agenda_present
FROM public.strata_reviews r
LEFT JOIN public.strata_snapshots s ON s.id = r.snapshot_id;

GRANT SELECT ON public.strata_review_readiness TO authenticated;

-- Same 9-arg signature — in-kind replace; only the agenda readiness term changes.
CREATE OR REPLACE FUNCTION public.strata_update_review(
  p_review    uuid,
  p_status    text  DEFAULT NULL,
  p_snapshot  uuid  DEFAULT NULL,
  p_pack      uuid  DEFAULT NULL,
  p_agenda    jsonb DEFAULT NULL,
  p_chair     uuid  DEFAULT NULL,
  p_note      text  DEFAULT NULL,
  p_accountable_owner uuid DEFAULT NULL,
  p_scheduled_for     timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cur record;
  v_missing text[];
  v_snapshot uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'updating a review requires the strategy_office or admin role';
  END IF;
  SELECT * INTO v_cur FROM public.strata_reviews WHERE id = p_review;
  IF v_cur.id IS NULL THEN RAISE EXCEPTION 'review not found'; END IF;

  IF v_cur.status = 'closed' THEN
    RAISE EXCEPTION 'this review is closed — a closed review records a meeting that already happened and cannot be edited';
  END IF;
  IF v_cur.status = 'cancelled' THEN
    RAISE EXCEPTION 'this review is cancelled — a cancelled review is a terminal historical record and cannot be edited; create a new review instead';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('scheduled','in_progress','closed','cancelled') THEN
    RAISE EXCEPTION 'status must be scheduled | in_progress | closed | cancelled';
  END IF;

  IF p_status IS NOT NULL AND p_status <> v_cur.status THEN
    IF NOT ((v_cur.status = 'scheduled'   AND p_status IN ('in_progress','cancelled')) OR
            (v_cur.status = 'in_progress' AND p_status IN ('closed','cancelled'))) THEN
      RAISE EXCEPTION 'invalid transition % → %: a review moves scheduled → in progress → closed, or is cancelled from either state',
        v_cur.status, p_status;
    END IF;
  END IF;

  IF p_scheduled_for IS NOT NULL AND v_cur.status = 'scheduled' THEN
    IF p_scheduled_for < now() - interval '1 hour' THEN
      RAISE EXCEPTION 'the scheduled date/time is in the past — pick a future date or start the review';
    END IF;
    IF p_scheduled_for > now() + interval '10 years' THEN
      RAISE EXCEPTION 'the scheduled date/time is more than 10 years out — this looks like a mistyped date';
    END IF;
  END IF;

  IF p_status IN ('in_progress','closed') THEN
    v_snapshot := COALESCE(p_snapshot, v_cur.snapshot_id);
    v_missing := ARRAY_REMOVE(ARRAY[
      CASE WHEN v_snapshot IS NULL THEN 'no snapshot attached' END,
      CASE WHEN v_snapshot IS NOT NULL AND NOT EXISTS
             (SELECT 1 FROM public.strata_snapshots s WHERE s.id = v_snapshot AND s.status = 'locked')
           THEN 'snapshot is not locked' END,
      CASE WHEN COALESCE(p_chair, v_cur.chair_id) IS NULL THEN 'no chair recorded' END,
      CASE WHEN COALESCE(p_accountable_owner, v_cur.accountable_owner_id) IS NULL
           THEN 'no accountable owner recorded' END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.strata_review_participants pp WHERE pp.review_id = p_review)
           THEN 'no participants recorded' END,
      -- COALESCE(..., false): a NULL agenda is EMPTY, not exempt (deployment probe P5).
      CASE WHEN NOT COALESCE(jsonb_typeof(COALESCE(p_agenda, v_cur.agenda)) = 'array'
                     AND jsonb_array_length(COALESCE(p_agenda, v_cur.agenda)) > 0, false)
           THEN 'agenda is empty' END
    ], NULL);
    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'this review is not ready to move to %: %', p_status, array_to_string(v_missing, '; ');
    END IF;
  END IF;

  UPDATE public.strata_reviews
     SET status        = COALESCE(p_status, status),
         snapshot_id   = COALESCE(p_snapshot, snapshot_id),
         board_pack_id = COALESCE(p_pack, board_pack_id),
         agenda        = COALESCE(p_agenda, agenda),
         chair_id      = COALESCE(p_chair, chair_id),
         accountable_owner_id = COALESCE(p_accountable_owner, accountable_owner_id),
         scheduled_for = COALESCE(p_scheduled_for, scheduled_for),
         note          = COALESCE(p_note, note)
   WHERE id = p_review;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_reviews', p_review, 'RPC:update_review', auth.uid(),
          COALESCE(p_note,
                   CASE WHEN p_status IS NOT NULL AND p_status <> v_cur.status
                        THEN format('status %s → %s', v_cur.status, p_status)
                        ELSE 'review updated' END));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_update_review(uuid, text, uuid, uuid, jsonb, uuid, text, uuid, timestamptz) TO authenticated;
