-- CAT-STRATA-RDDEF-20260718-001 · Module 6 Reviews & Decisions defect pack
-- Scope of THIS migration (additive only; no history rewrite, no data mutation):
--   RD-DEF-004 — duplicate / idempotency protection for scheduled reviews.
--   RD-DEF-005 — terminal-state immutability: cancelled reviews are immutable, not just closed.
--
-- Both are enforced at the SERVER/DATABASE boundary (RD spec: "UI disabling/hiding alone is
-- insufficient"). This file only CREATE-OR-REPLACEs the two shipped RPCs and adds one partial
-- unique index. It does not touch 20260717130000_strata_reviews.sql, the backfill, or any row.
--
-- Base branch: strata/pb-defect-pack (contains PB-DEF-010 Reviews↔portfolio linkage).
-- NOT applied to staging by this session — Codex/deploy applies against cyijbdeuehohvhnsywig
-- (staging) only. Production lmqwtldpfacrrlvdnmld must remain untouched.

-- ── RD-DEF-004 · canonical duplicate key, enforced at the DB boundary ─────────
-- The canonical duplicate key for an ACTIVE governance record is
--   (organization_id, lower(name), review_type, cadence, period_id, scheduled_for, chair_id).
-- Nullable members are folded to sentinels so two "unscheduled / no-period / no-chair" repeats
-- COLLIDE instead of slipping past as distinct NULLs. Only 'scheduled' and 'in_progress' rows are
-- constrained: a closed/cancelled review is history and two historical rows may legitimately share
-- these fields. This is idempotency for the live queue, not a rewrite of the past.
CREATE UNIQUE INDEX IF NOT EXISTS strata_reviews_active_dedupe_uidx
  ON public.strata_reviews (
    COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(name)),
    review_type,
    cadence,
    COALESCE(period_id,     '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(scheduled_for, '-infinity'::timestamptz),
    COALESCE(chair_id,      '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status IN ('scheduled','in_progress');

COMMENT ON INDEX public.strata_reviews_active_dedupe_uidx IS
  'RD-DEF-004: idempotency guard. One active (scheduled|in_progress) review per canonical key '
  '(org, name, type, cadence, period, scheduled_for, chair). Nullable members folded to sentinels '
  'so repeated no-period/no-chair/unscheduled submits collide. Terminal rows are exempt (history).';

-- ── RD-DEF-004 · actionable conflict from the scheduling RPC ──────────────────
-- CREATE OR REPLACE of the shipped strata_schedule_review (same signature). Adds a pre-insert
-- lookup that returns an actionable conflict naming the existing review_key, so a double-click /
-- repeated request / concurrent submit yields ONE canonical review and a clear message rather than
-- a raw 23505. The unique index above remains the hard backstop for the concurrent race.
CREATE OR REPLACE FUNCTION public.strata_schedule_review(
  p_name          text,
  p_review_type   text,
  p_period        uuid  DEFAULT NULL,
  p_cycle         uuid  DEFAULT NULL,
  p_scheduled_for timestamptz DEFAULT NULL,
  p_cadence       text  DEFAULT NULL,
  p_chair         uuid  DEFAULT NULL,
  p_scope         jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_cadence text; v_dup_key text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'scheduling a review requires the strategy_office or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'a review name is required';
  END IF;
  IF p_review_type NOT IN ('departmental','executive') THEN
    RAISE EXCEPTION 'review type must be departmental or executive';
  END IF;

  v_cadence := COALESCE(p_cadence,
                        CASE p_review_type WHEN 'departmental' THEN 'monthly'
                                           WHEN 'executive'    THEN 'quarterly' END);
  IF v_cadence NOT IN ('monthly','quarterly','ad_hoc') THEN
    RAISE EXCEPTION 'cadence must be monthly | quarterly | ad_hoc';
  END IF;

  -- RD-DEF-004: reject an exact repeat of an ACTIVE review with an actionable message that
  -- identifies the existing record. Rejected attempts INSERT nothing (zero rows changed).
  SELECT review_key INTO v_dup_key
    FROM public.strata_reviews
   WHERE status IN ('scheduled','in_progress')
     AND lower(btrim(name)) = lower(btrim(p_name))
     AND review_type = p_review_type
     AND cadence     = v_cadence
     AND COALESCE(period_id,     '00000000-0000-0000-0000-000000000000'::uuid)
       = COALESCE(p_period,      '00000000-0000-0000-0000-000000000000'::uuid)
     AND COALESCE(scheduled_for, '-infinity'::timestamptz)
       = COALESCE(p_scheduled_for, '-infinity'::timestamptz)
     AND COALESCE(chair_id,      '00000000-0000-0000-0000-000000000000'::uuid)
       = COALESCE(p_chair,       '00000000-0000-0000-0000-000000000000'::uuid)
   LIMIT 1;
  IF v_dup_key IS NOT NULL THEN
    RAISE EXCEPTION 'an active review with the same name, type, cadence, period, time and chair already exists (%). Open % or change one of these fields.', v_dup_key, v_dup_key
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.strata_reviews
    (name, review_type, cadence, cycle_id, period_id, scheduled_for, chair_id, scope, origin, status)
  VALUES
    (p_name, p_review_type, v_cadence, p_cycle, p_period, p_scheduled_for, p_chair, p_scope,
     'scheduled', 'scheduled')
  RETURNING id INTO v_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_reviews', v_id, 'RPC:schedule_review', auth.uid(),
          format('%s review "%s" scheduled (%s)', p_review_type, p_name, v_cadence));
  RETURN v_id;
END;
$function$;

-- ── RD-DEF-005 · cancelled reviews are terminal and immutable ─────────────────
-- CREATE OR REPLACE of the shipped strata_update_review (same signature). The shipped guard blocked
-- edits only when status='closed'; a CANCELLED review — equally a terminal historical record — was
-- still mutable. Both terminal states are now refused. Corrections to a terminal review must use an
-- explicit prospective/superseding workflow (RD-DEF-005), not a silent field edit here.
CREATE OR REPLACE FUNCTION public.strata_update_review(
  p_review    uuid,
  p_status    text  DEFAULT NULL,
  p_snapshot  uuid  DEFAULT NULL,
  p_pack      uuid  DEFAULT NULL,
  p_agenda    jsonb DEFAULT NULL,
  p_chair     uuid  DEFAULT NULL,
  p_note      text  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_cur record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'updating a review requires the strategy_office or admin role';
  END IF;
  SELECT * INTO v_cur FROM public.strata_reviews WHERE id = p_review;
  IF v_cur.id IS NULL THEN RAISE EXCEPTION 'review not found'; END IF;
  -- RD-DEF-005: closed AND cancelled are terminal. A rejected write here changes zero rows.
  IF v_cur.status = 'closed' THEN
    RAISE EXCEPTION 'this review is closed — a closed review records a meeting that already happened and cannot be edited';
  END IF;
  IF v_cur.status = 'cancelled' THEN
    RAISE EXCEPTION 'this review is cancelled — a cancelled review is a terminal historical record and cannot be edited; create a new review instead';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('scheduled','in_progress','closed','cancelled') THEN
    RAISE EXCEPTION 'status must be scheduled | in_progress | closed | cancelled';
  END IF;

  -- A review may only close on a LOCKED snapshot: closing on live numbers would record a decision
  -- against figures that can still move.
  IF p_status = 'closed' THEN
    IF COALESCE(p_snapshot, v_cur.snapshot_id) IS NULL THEN
      RAISE EXCEPTION 'a review cannot close without a snapshot — there would be no record of which numbers it reviewed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.strata_snapshots s
                    WHERE s.id = COALESCE(p_snapshot, v_cur.snapshot_id) AND s.status = 'locked') THEN
      RAISE EXCEPTION 'a review cannot close on a snapshot that is not locked (it is superseded) — closing here would record a decision against numbers that have been replaced';
    END IF;
  END IF;

  UPDATE public.strata_reviews
     SET status      = COALESCE(p_status, status),
         snapshot_id = COALESCE(p_snapshot, snapshot_id),
         board_pack_id = COALESCE(p_pack, board_pack_id),
         agenda      = COALESCE(p_agenda, agenda),
         chair_id    = COALESCE(p_chair, chair_id),
         note        = COALESCE(p_note, note)
   WHERE id = p_review;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_reviews', p_review, 'RPC:update_review', auth.uid(),
          COALESCE(p_note, format('review updated%s', CASE WHEN p_status IS NOT NULL THEN ' → '||p_status ELSE '' END)));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_schedule_review(text, text, uuid, uuid, timestamptz, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_update_review(uuid, text, uuid, uuid, jsonb, uuid, text) TO authenticated;
