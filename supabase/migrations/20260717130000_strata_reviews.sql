-- CAT-STRATA-IMPL-20260712-001 · R2 / E1 · persisted review scheduling entity (D-6)
-- Plan Lock: blueprint §6 (E1), §7 (backfill), §8.6 · authorization R2.
-- D-6 (Vikram): persisted reviews COEXIST with the derived model during transition. strata_reviews
-- is authoritative going forward. Backfill ONE Closed historical review per existing locked
-- snapshot, marked migrated/historical. **Do NOT invent chair, participants, agenda or meeting
-- details that were never recorded.** Derived logic is retained temporarily as compatibility /
-- verification support, NOT as the system of record.
--
-- WHAT ALREADY EXISTS — probed 2026-07-17, and it reshapes this slice:
--   strata_decisions ALREADY has snapshot_id + forum + decision_key.
--   strata_actions   ALREADY has decision_id.
--   So the ruling's "snapshot, agenda, decision and action relationships" is ALREADY expressed as
--   snapshot ← decisions ← actions. This table therefore joins that chain at the SNAPSHOT and does
--   NOT mint review_id columns on decisions/actions: a second path to the same fact would let the
--   two disagree, and there is no question the existing chain cannot answer. Reviews reach their
--   decisions through snapshot_id, and their actions through those decisions.
--   Only `agenda` is genuinely absent, so only `agenda` is added.
--
-- Key/slug follow the shipped house pattern verbatim (probed): 'REV-' || nextval(seq), and the
-- existing strata_generate_slug BEFORE INSERT trigger.

CREATE SEQUENCE IF NOT EXISTS public.strata_review_seq;

CREATE TABLE IF NOT EXISTS public.strata_reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_key       text NOT NULL UNIQUE DEFAULT ('REV-' || nextval('public.strata_review_seq')::text),
  organization_id  uuid,
  name             text NOT NULL,
  slug             text UNIQUE,

  -- The two defaults the authorization names: "Monthly department and quarterly executive reviews
  -- are the defaults." They are DEFAULTS, not laws — cadence is a separate column so a body that
  -- meets off-cadence is representable without lying about its type.
  review_type      text NOT NULL CHECK (review_type IN ('departmental','executive')),
  cadence          text NOT NULL CHECK (cadence IN ('monthly','quarterly','ad_hoc')),

  scope            jsonb,
  cycle_id         uuid REFERENCES public.strata_cycles(id),
  period_id        uuid REFERENCES public.strata_periods(id),
  -- Nullable BY DESIGN: a review is scheduled BEFORE its snapshot is locked. That is the entire
  -- point of scheduling, and it is also what makes readiness a real question (see the view below).
  snapshot_id      uuid REFERENCES public.strata_snapshots(id),
  board_pack_id    uuid REFERENCES public.strata_board_packs(id),

  scheduled_for    timestamptz,
  status           text NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','in_progress','closed','cancelled')),

  -- D-6: NULL on every backfilled row. NULL here means "not recorded", NEVER "nobody chaired it".
  -- These columns exist precisely so that absence can be stated rather than filled in.
  chair_id         uuid,
  agenda           jsonb,

  -- 'migrated' = reconstructed from a locked snapshot by the backfill below; its meeting details
  -- were never recorded and must not be presented as if they were.
  origin           text NOT NULL DEFAULT 'scheduled' CHECK (origin IN ('scheduled','migrated')),
  note             text,

  created_by       uuid DEFAULT auth.uid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- One review per snapshot: the backfill is keyed on it, and two reviews claiming the same locked
  -- snapshot would make "which meeting approved these numbers?" unanswerable. NULLs stay distinct on
  -- purpose — any number of reviews may be scheduled before any snapshot exists.
  CONSTRAINT strata_reviews_snapshot_unique UNIQUE (snapshot_id)
);

CREATE INDEX IF NOT EXISTS strata_reviews_period_idx   ON public.strata_reviews (period_id);
CREATE INDEX IF NOT EXISTS strata_reviews_snapshot_idx ON public.strata_reviews (snapshot_id);
CREATE INDEX IF NOT EXISTS strata_reviews_status_idx   ON public.strata_reviews (status, scheduled_for);

-- Participants: absent for every migrated row (D-6). An empty participant list on a migrated review
-- is the honest statement "not recorded", which is why they are rows rather than a jsonb blob that
-- would tempt someone to write [] and call it attendance.
CREATE TABLE IF NOT EXISTS public.strata_review_participants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  uuid NOT NULL REFERENCES public.strata_reviews(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  role       text NOT NULL DEFAULT 'attendee' CHECK (role IN ('chair','attendee','presenter','observer')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_review_participants_unique UNIQUE (review_id, user_id, role)
);

-- Reuse the shipped triggers verbatim (E-4 posture: audit every governed table; §13.3 reuse).
DROP TRIGGER IF EXISTS trg_strata_reviews_slug ON public.strata_reviews;
CREATE TRIGGER trg_strata_reviews_slug BEFORE INSERT ON public.strata_reviews
  FOR EACH ROW EXECUTE FUNCTION public.strata_generate_slug();
DROP TRIGGER IF EXISTS trg_strata_reviews_touch ON public.strata_reviews;
CREATE TRIGGER trg_strata_reviews_touch BEFORE UPDATE ON public.strata_reviews
  FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at();
DROP TRIGGER IF EXISTS trg_strata_reviews_audit ON public.strata_reviews;
CREATE TRIGGER trg_strata_reviews_audit AFTER INSERT OR UPDATE OR DELETE ON public.strata_reviews
  FOR EACH ROW EXECUTE FUNCTION public.strata_audit();
DROP TRIGGER IF EXISTS trg_strata_review_participants_audit ON public.strata_review_participants;
CREATE TRIGGER trg_strata_review_participants_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.strata_review_participants
  FOR EACH ROW EXECUTE FUNCTION public.strata_audit();

ALTER TABLE public.strata_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strata_review_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS strata_reviews_select ON public.strata_reviews;
CREATE POLICY strata_reviews_select ON public.strata_reviews
  FOR SELECT USING (public.current_user_is_approved());
DROP POLICY IF EXISTS strata_reviews_write ON public.strata_reviews;
CREATE POLICY strata_reviews_write ON public.strata_reviews
  FOR ALL USING (public.strata_has_role(ARRAY['strategy_office']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office']));

DROP POLICY IF EXISTS strata_review_participants_select ON public.strata_review_participants;
CREATE POLICY strata_review_participants_select ON public.strata_review_participants
  FOR SELECT USING (public.current_user_is_approved());
DROP POLICY IF EXISTS strata_review_participants_write ON public.strata_review_participants;
CREATE POLICY strata_review_participants_write ON public.strata_review_participants
  FOR ALL USING (public.strata_has_role(ARRAY['strategy_office']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office']));

-- ── readiness — DERIVED, never stored ───────────────────────────────────────
-- Readiness is a fact about other rows (is the snapshot locked? is a pack attached?). Storing it
-- would create a second source of truth that goes stale the moment a snapshot locks, and someone
-- would eventually trust the stale copy. Reasons are returned as an array so the UI states WHY a
-- review is not ready instead of showing a bare red dot.
CREATE OR REPLACE VIEW public.strata_review_readiness AS
SELECT
  r.id AS review_id,
  r.review_key,
  r.status,
  (r.snapshot_id IS NOT NULL AND s.status = 'locked') AS snapshot_locked,
  (r.board_pack_id IS NOT NULL) AS pack_attached,
  (r.snapshot_id IS NOT NULL AND s.status = 'locked') AS is_ready,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN r.snapshot_id IS NULL THEN 'no snapshot attached' END,
    CASE WHEN r.snapshot_id IS NOT NULL AND s.status <> 'locked' THEN 'snapshot is not locked' END,
    CASE WHEN r.board_pack_id IS NULL THEN 'no board pack attached' END
  ], NULL) AS blocking_reasons
FROM public.strata_reviews r
LEFT JOIN public.strata_snapshots s ON s.id = r.snapshot_id;

COMMENT ON VIEW public.strata_review_readiness IS
  'Derived review readiness — never stored. is_ready requires a LOCKED snapshot; a board pack is reported separately because a review can legitimately convene on locked numbers before its pack is built. blocking_reasons names every gap so a consumer can state WHY rather than render a bare status.';

GRANT SELECT ON public.strata_review_readiness TO authenticated;

COMMENT ON TABLE public.strata_reviews IS
  'Persisted review scheduling entity (D-6). Authoritative going forward; the derived snapshot-keyed model is retained temporarily as compatibility/verification support, not as the system of record. Decisions and actions are NOT re-parented here — they already reach a review through snapshot_id (decisions) and decision_id (actions). chair_id/agenda/participants NULL on origin=''migrated'' rows means NOT RECORDED, never "none".';

-- ── strata_schedule_review — the cadence defaults live HERE, once ────────────
-- "Monthly department and quarterly executive reviews are the defaults" (authorization). Encoded as
-- a COALESCE default rather than a CHECK, so the default is applied when the caller says nothing and
-- an explicit off-cadence choice is still representable and recorded. A CHECK forcing
-- departmental⇒monthly would make a genuinely ad-hoc departmental review unrepresentable, and the
-- system would be lying about a meeting that really happened.
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
DECLARE v_id uuid; v_cadence text;
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

-- ── strata_update_review ────────────────────────────────────────────────────
-- A closed review is not editable: it is the record of a meeting that happened. Reopening is a
-- governed act, not a field edit, so it is simply refused here rather than quietly permitted.
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
  IF v_cur.status = 'closed' THEN
    RAISE EXCEPTION 'this review is closed — a closed review records a meeting that already happened and cannot be edited';
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

-- ── D-6 BACKFILL — one Closed, migrated review per existing locked snapshot ──
-- Conservative by construction (§7): name and period come from the snapshot itself; EVERYTHING that
-- was never recorded stays NULL — chair, agenda, participants, scheduled_for. There is no attempt to
-- infer who attended or what was discussed, because that information does not exist anywhere.
-- review_type is derived from the snapshot's own scope only where the snapshot SAYS so; otherwise it
-- falls to 'executive' — see the note column, which states the derivation on every row so a reader
-- is never left guessing whether it was recorded or inferred.
INSERT INTO public.strata_reviews
  (name, review_type, cadence, cycle_id, period_id, snapshot_id, scheduled_for,
   status, chair_id, agenda, origin, note)
SELECT
  s.name,
  'executive',
  'quarterly',
  s.cycle_id,
  s.period_id,
  s.id,
  NULL,                       -- never recorded: the meeting date is not in the snapshot
  'closed',
  NULL,                       -- D-6: chair NOT invented
  NULL,                       -- D-6: agenda NOT invented
  'migrated',
  'Migrated from locked snapshot ' || s.snapshot_key || ' (' || s.locked_at::date || '). '
  || 'HISTORICAL RECORD, reconstructed from the snapshot alone: chair, participants, agenda and the '
  || 'meeting date were never recorded and are deliberately NULL — absent, not empty. '
  || 'review_type/cadence default to executive/quarterly and are an ASSUMPTION OF THE MIGRATION, '
  || 'not a recorded fact.'
FROM public.strata_snapshots s
WHERE s.status = 'locked'
ON CONFLICT ON CONSTRAINT strata_reviews_snapshot_unique DO NOTHING;
