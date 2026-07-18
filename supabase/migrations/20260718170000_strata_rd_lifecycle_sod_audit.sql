-- CAT-STRATA-RDDEF-20260718-001 · Module 6 Reviews & Decisions defect pack — main server slice
-- Covers the SERVER-AUTHORITATIVE portions of:
--   RD-DEF-001 — accountable owner + governed evidence reference types (reuses PB-DEF-010
--                strata_review_links; no second master, no parallel link model).
--   RD-DEF-002 — one server-authoritative readiness calculation + explicit lifecycle transition
--                matrix enforced in the RPC layer; rejected transitions change zero rows.
--   RD-DEF-003 — decision outcome vocabulary (separate from type), rationale, approver columns,
--                and server-enforced segregation of duties (creator cannot decide own decision).
--   RD-DEF-005 — terminal-state immutability for children: participants, links, decisions'
--                actions; closed decisions are immutable.
--   RD-DEF-007 — server-side stale/impossible scheduled-date rejection (client alignment in UI).
--
-- RD-DEF-009 needs NO new server object: the canonical append-only store (strata_audit_events,
-- before/after captured by the shipped strata_audit() triggers) is already exposed read-only by
-- strata_entity_audit() (PB-DEF-008, 20260718120000) with no table restriction. Creating another
-- read RPC here would be exactly the parallel audit path the RD spec forbids — the remaining
-- RD-DEF-009 gap is UI reachability only.
--
-- Additive only. No existing row is updated or deleted; no recorded fact is rewritten.
-- REV-7 (in progress without snapshot), REV-8 (cancelled duplicate) and DEC-1104 (closed)
-- remain byte-stable as truthful historical evidence of the defects.
--
-- NOT applied to any environment by this session. Codex/deploy applies against staging
-- cyijbdeuehohvhnsywig only; production lmqwtldpfacrrlvdnmld untouched.

-- ════════════════════════════════════════════════════════════════════════════
-- A · RD-DEF-001 — accountable owner + governed evidence reference types
-- ════════════════════════════════════════════════════════════════════════════

-- NULL = not recorded, never "nobody accountable" (zero-assumption rendering).
ALTER TABLE public.strata_reviews
  ADD COLUMN IF NOT EXISTS accountable_owner_id uuid;

-- Extend the PB-DEF-010 link vocabulary with the governed read-only reference types the RD spec
-- names: strategy objectives, scorecards, KPIs/OKRs, project cards and locked snapshots. All are
-- verified existing masters — links never duplicate or mutate the source.
ALTER TABLE public.strata_review_links
  DROP CONSTRAINT IF EXISTS strata_review_links_target_type_check;
ALTER TABLE public.strata_review_links
  ADD CONSTRAINT strata_review_links_target_type_check CHECK (target_type IN
    ('portfolio','benefit','benefit_value','gate_instance',
     'objective','kpi','okr','scorecard_instance','project_card','snapshot'));

-- Re-issue link RPC: new target types + RD-DEF-005 terminal guard.
CREATE OR REPLACE FUNCTION public.strata_link_review(p_review uuid, p_target_type text, p_target_id uuid, p_note text DEFAULT NULL)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; ok boolean; v_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'linking a review requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT status INTO v_status FROM public.strata_reviews WHERE id = p_review;
  IF v_status IS NULL THEN RAISE EXCEPTION 'review not found'; END IF;
  -- RD-DEF-005: a terminal review is a historical record — its evidence set is frozen.
  IF v_status IN ('closed','cancelled') THEN
    RAISE EXCEPTION 'this review is % — its evidence references are frozen history and cannot be changed', v_status;
  END IF;
  ok := CASE p_target_type
    WHEN 'portfolio'          THEN EXISTS (SELECT 1 FROM public.strata_portfolios          WHERE id = p_target_id)
    WHEN 'benefit'            THEN EXISTS (SELECT 1 FROM public.strata_benefits            WHERE id = p_target_id)
    WHEN 'benefit_value'      THEN EXISTS (SELECT 1 FROM public.strata_benefit_values      WHERE id = p_target_id)
    WHEN 'gate_instance'      THEN EXISTS (SELECT 1 FROM public.strata_gate_instances      WHERE id = p_target_id)
    WHEN 'objective'          THEN EXISTS (SELECT 1 FROM public.strata_strategy_elements   WHERE id = p_target_id)
    WHEN 'kpi'                THEN EXISTS (SELECT 1 FROM public.strata_kpis                WHERE id = p_target_id)
    WHEN 'okr'                THEN EXISTS (SELECT 1 FROM public.strata_okrs                WHERE id = p_target_id)
    WHEN 'scorecard_instance' THEN EXISTS (SELECT 1 FROM public.strata_scorecard_instances WHERE id = p_target_id)
    WHEN 'project_card'       THEN EXISTS (SELECT 1 FROM public.strata_project_cards       WHERE id = p_target_id)
    WHEN 'snapshot'           THEN EXISTS (SELECT 1 FROM public.strata_snapshots           WHERE id = p_target_id)
    ELSE false END;
  IF NOT ok THEN RAISE EXCEPTION 'referenced % not found (governed reference required, never a free-text id)', p_target_type; END IF;

  INSERT INTO public.strata_review_links (review_id, target_type, target_id, note)
  VALUES (p_review, p_target_type, p_target_id, NULLIF(btrim(p_note), ''))
  ON CONFLICT (review_id, target_type, target_id) DO UPDATE SET note = COALESCE(EXCLUDED.note, strata_review_links.note)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_reviews', p_review, 'RPC:link_review', auth.uid(), format('linked %s %s', p_target_type, p_target_id));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_unlink_review(p_review uuid, p_target_type text, p_target_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'unlinking a review requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT status INTO v_status FROM public.strata_reviews WHERE id = p_review;
  IF v_status IS NULL THEN RAISE EXCEPTION 'review not found'; END IF;
  IF v_status IN ('closed','cancelled') THEN
    RAISE EXCEPTION 'this review is % — its evidence references are frozen history and cannot be changed', v_status;
  END IF;
  DELETE FROM public.strata_review_links
   WHERE review_id = p_review AND target_type = p_target_type AND target_id = p_target_id;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_reviews', p_review, 'RPC:unlink_review', auth.uid(), format('unlinked %s %s', p_target_type, p_target_id));
END;
$$;

-- Name resolution for the new types (existing types unchanged).
CREATE OR REPLACE FUNCTION public.strata_review_links_of(p_review uuid)
 RETURNS TABLE(id uuid, target_type text, target_id uuid, target_name text, note text, created_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.target_type, l.target_id,
         CASE l.target_type
           WHEN 'portfolio'          THEN (SELECT name FROM public.strata_portfolios    WHERE id = l.target_id)
           WHEN 'benefit'            THEN (SELECT name FROM public.strata_benefits       WHERE id = l.target_id)
           WHEN 'gate_instance'      THEN public.strata_entity_name('gate_instance', l.target_id)
           WHEN 'benefit_value'      THEN (SELECT b.name || ' · ' || bv.value_kind FROM public.strata_benefit_values bv JOIN public.strata_benefits b ON b.id = bv.benefit_id WHERE bv.id = l.target_id)
           WHEN 'objective'          THEN public.strata_entity_name('objective', l.target_id)
           WHEN 'kpi'                THEN public.strata_entity_name('kpi', l.target_id)
           WHEN 'okr'                THEN public.strata_entity_name('okr', l.target_id)
           WHEN 'scorecard_instance' THEN public.strata_entity_name('scorecard_instance', l.target_id)
           WHEN 'project_card'       THEN public.strata_entity_name('project_card', l.target_id)
           WHEN 'snapshot'           THEN (SELECT s.snapshot_key || ' · ' || s.name FROM public.strata_snapshots s WHERE s.id = l.target_id)
           ELSE NULL END,
         l.note, l.created_at
    FROM public.strata_review_links l
   WHERE l.review_id = p_review
     AND public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward','kpi_owner','strata_admin'])
   ORDER BY l.created_at DESC;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- B · RD-DEF-002 — one server-authoritative readiness calculation
-- ════════════════════════════════════════════════════════════════════════════
-- Readiness now states EVERY prerequisite the RD policy names: locked snapshot, chair,
-- accountable owner, at least one participant, and a non-empty agenda. Board-pack attachment
-- remains REPORTED SEPARATELY (pack_attached) and is deliberately NOT a prerequisite — that is
-- the existing governed policy and this migration does not silently change it.
-- Existing columns keep their positions/types (CREATE OR REPLACE VIEW contract); new columns
-- are appended. Command Center and any other consumer read the SAME view — one calculation.
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
    AND (jsonb_typeof(r.agenda) = 'array' AND jsonb_array_length(r.agenda) > 0)
  ) AS is_ready,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN r.snapshot_id IS NULL THEN 'no snapshot attached' END,
    CASE WHEN r.snapshot_id IS NOT NULL AND s.status <> 'locked' THEN 'snapshot is not locked' END,
    CASE WHEN r.chair_id IS NULL THEN 'no chair recorded' END,
    CASE WHEN r.accountable_owner_id IS NULL THEN 'no accountable owner recorded' END,
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.strata_review_participants p WHERE p.review_id = r.id)
         THEN 'no participants recorded' END,
    CASE WHEN NOT (jsonb_typeof(r.agenda) = 'array' AND jsonb_array_length(r.agenda) > 0)
         THEN 'agenda is empty' END,
    CASE WHEN r.board_pack_id IS NULL THEN 'no board pack attached' END
  ], NULL) AS blocking_reasons,
  (r.chair_id IS NOT NULL)              AS chair_present,
  (r.accountable_owner_id IS NOT NULL)  AS accountable_present,
  EXISTS (SELECT 1 FROM public.strata_review_participants p WHERE p.review_id = r.id) AS participants_present,
  (jsonb_typeof(r.agenda) = 'array' AND jsonb_array_length(r.agenda) > 0)             AS agenda_present
FROM public.strata_reviews r
LEFT JOIN public.strata_snapshots s ON s.id = r.snapshot_id;

COMMENT ON VIEW public.strata_review_readiness IS
  'THE server-authoritative review readiness calculation (RD-DEF-002). is_ready requires: locked snapshot, chair, accountable owner, ≥1 participant, non-empty agenda array. Board pack is reported separately (pack_attached) — NOT a prerequisite, per the standing governed policy. blocking_reasons lists every missing prerequisite so consumers explain WHY. ''no board pack attached'' appears in blocking_reasons as information only; it never blocks is_ready.';

GRANT SELECT ON public.strata_review_readiness TO authenticated;

-- ── RD-DEF-002/007 · schedule with stale-date rejection (dedupe kept from 20260718160000) ──
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

  -- RD-DEF-007: a NEW review cannot be scheduled into the past (1-hour grace for "starting now"),
  -- nor absurdly far out (impossible-date guard; a typo like year 20026 is caught here).
  IF p_scheduled_for IS NOT NULL AND p_scheduled_for < now() - interval '1 hour' THEN
    RAISE EXCEPTION 'the scheduled date/time is in the past — a new review must be scheduled for a future date';
  END IF;
  IF p_scheduled_for IS NOT NULL AND p_scheduled_for > now() + interval '10 years' THEN
    RAISE EXCEPTION 'the scheduled date/time is more than 10 years out — this looks like a mistyped date';
  END IF;

  v_cadence := COALESCE(p_cadence,
                        CASE p_review_type WHEN 'departmental' THEN 'monthly'
                                           WHEN 'executive'    THEN 'quarterly' END);
  IF v_cadence NOT IN ('monthly','quarterly','ad_hoc') THEN
    RAISE EXCEPTION 'cadence must be monthly | quarterly | ad_hoc';
  END IF;

  -- RD-DEF-004: reject an exact repeat of an ACTIVE review, naming the existing record.
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

-- ── RD-DEF-002 · explicit transition matrix + readiness enforcement in the RPC layer ──
-- Signature grows (p_accountable_owner, p_scheduled_for appended). Postgres would treat the new
-- argument list as an OVERLOAD, so the old 7-arg version is dropped first — otherwise PostgREST
-- calls that omit the new args become ambiguous (same hazard the PB linkage migration documented).
DROP FUNCTION IF EXISTS public.strata_update_review(uuid, text, uuid, uuid, jsonb, uuid, text);

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

  -- RD-DEF-002: only explicit valid transitions. (Same-status writes are field edits, not
  -- transitions.) scheduled → in_progress | cancelled; in_progress → closed | cancelled.
  IF p_status IS NOT NULL AND p_status <> v_cur.status THEN
    IF NOT ((v_cur.status = 'scheduled'   AND p_status IN ('in_progress','cancelled')) OR
            (v_cur.status = 'in_progress' AND p_status IN ('closed','cancelled'))) THEN
      RAISE EXCEPTION 'invalid transition % → %: a review moves scheduled → in progress → closed, or is cancelled from either state',
        v_cur.status, p_status;
    END IF;
  END IF;

  -- RD-DEF-007: a rescheduled date must not be stale or impossible.
  IF p_scheduled_for IS NOT NULL AND v_cur.status = 'scheduled' THEN
    IF p_scheduled_for < now() - interval '1 hour' THEN
      RAISE EXCEPTION 'the scheduled date/time is in the past — pick a future date or start the review';
    END IF;
    IF p_scheduled_for > now() + interval '10 years' THEN
      RAISE EXCEPTION 'the scheduled date/time is more than 10 years out — this looks like a mistyped date';
    END IF;
  END IF;

  -- RD-DEF-002: readiness gates BOTH In progress and Closed. Evaluated against the row AS IT
  -- WILL BE after this call (fields supplied now count). Every missing prerequisite is named.
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
      CASE WHEN NOT (jsonb_typeof(COALESCE(p_agenda, v_cur.agenda)) = 'array'
                     AND jsonb_array_length(COALESCE(p_agenda, v_cur.agenda)) > 0)
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

  -- Actor/timestamp come from the audit row itself; before/after state is captured by the
  -- trg_strata_reviews_audit trigger. The note records the explicit transition.
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_reviews', p_review, 'RPC:update_review', auth.uid(),
          COALESCE(p_note,
                   CASE WHEN p_status IS NOT NULL AND p_status <> v_cur.status
                        THEN format('status %s → %s', v_cur.status, p_status)
                        ELSE 'review updated' END));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_schedule_review(text, text, uuid, uuid, timestamptz, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_update_review(uuid, text, uuid, uuid, jsonb, uuid, text, uuid, timestamptz) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- C · RD-DEF-003 — decision outcome, rationale, approver + segregation of duties
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.strata_decisions
  ADD COLUMN IF NOT EXISTS outcome     text,
  ADD COLUMN IF NOT EXISTS rationale   text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.strata_decisions
  DROP CONSTRAINT IF EXISTS strata_decisions_outcome_check;
ALTER TABLE public.strata_decisions
  ADD CONSTRAINT strata_decisions_outcome_check CHECK (outcome IS NULL OR outcome IN
    ('approved','rejected','deferred','escalated','noted'));

COMMENT ON COLUMN public.strata_decisions.outcome IS
  'RD-DEF-003 outcome vocabulary — SEPARATE from decision_type. NULL on open/draft decisions and on history recorded before this vocabulary existed (absent, not "noted").';
COMMENT ON COLUMN public.strata_decisions.approved_by IS
  'The distinct authorized approver who made the decision official. Server-enforced ≠ created_by (segregation of duties). NULL on pre-vocabulary history.';

-- Signature grows (p_outcome, p_rationale, p_evidence_refs appended) — drop the old 5-arg
-- version first to avoid PostgREST overload ambiguity.
DROP FUNCTION IF EXISTS public.strata_update_decision(uuid, text, text, uuid, date);

CREATE OR REPLACE FUNCTION public.strata_update_decision(
  p_decision uuid,
  p_status text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_outcome text DEFAULT NULL,
  p_rationale text DEFAULT NULL,
  p_evidence_refs jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating a decision requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO d FROM public.strata_decisions WHERE id = p_decision;
  IF d IS NULL THEN RAISE EXCEPTION 'decision not found'; END IF;

  -- RD-DEF-005: a closed decision is an immutable historical record.
  IF d.status = 'closed' THEN
    RAISE EXCEPTION 'this decision is closed — a closed decision is a terminal historical record and cannot be edited; record a new superseding decision instead';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('open','decided','closed') THEN
    RAISE EXCEPTION 'status must be open | decided | closed';
  END IF;
  IF p_outcome IS NOT NULL AND p_outcome NOT IN ('approved','rejected','deferred','escalated','noted') THEN
    RAISE EXCEPTION 'outcome must be approved | rejected | deferred | escalated | noted';
  END IF;

  -- RD-DEF-002-style explicit transitions: open → decided → closed. A decision cannot close
  -- without first being officially decided — draft/open stays distinguishable from official.
  IF p_status IS NOT NULL AND p_status <> d.status THEN
    IF NOT ((d.status = 'open' AND p_status = 'decided') OR
            (d.status = 'decided' AND p_status = 'closed')) THEN
      RAISE EXCEPTION 'invalid transition % → %: a decision moves open → decided → closed', d.status, p_status;
    END IF;
  END IF;

  -- RD-DEF-003: making a decision OFFICIAL requires a distinct authorized approver, an explicit
  -- outcome and a rationale. The creator/author must not approve their own decision.
  IF p_status = 'decided' THEN
    IF d.created_by IS NOT NULL AND auth.uid() = d.created_by THEN
      -- Zero rows changed: this RAISE rolls the transaction back.
      RAISE EXCEPTION 'segregation of duties: the creator of a decision cannot decide/approve it — a second authorized identity must record the official outcome';
    END IF;
    IF COALESCE(p_outcome, d.outcome) IS NULL THEN
      RAISE EXCEPTION 'an official decision requires an explicit outcome (approved | rejected | deferred | escalated | noted)';
    END IF;
    IF COALESCE(NULLIF(btrim(p_rationale), ''), d.rationale) IS NULL THEN
      RAISE EXCEPTION 'an official decision requires a rationale';
    END IF;
  END IF;

  IF p_status = 'closed' AND EXISTS (
    SELECT 1 FROM public.strata_actions WHERE decision_id = p_decision AND status IN ('open','in_progress')
  ) THEN
    RAISE EXCEPTION 'decision has open actions; close or cancel them first';
  END IF;

  UPDATE public.strata_decisions
     SET status = COALESCE(p_status, status),
         description = COALESCE(p_description, description),
         owner_id = COALESCE(p_owner, owner_id),
         due_date = COALESCE(p_due_date, due_date),
         outcome = COALESCE(p_outcome, outcome),
         rationale = COALESCE(NULLIF(btrim(p_rationale), ''), rationale),
         evidence_refs = COALESCE(p_evidence_refs, evidence_refs),
         decided_by = CASE WHEN p_status = 'decided' THEN auth.uid() ELSE decided_by END,
         decided_at = CASE WHEN p_status = 'decided' THEN now() ELSE decided_at END,
         approved_by = CASE WHEN p_status = 'decided' THEN auth.uid() ELSE approved_by END,
         approved_at = CASE WHEN p_status = 'decided' THEN now() ELSE approved_at END,
         updated_at = now()
   WHERE id = p_decision;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_decisions', p_decision, 'RPC:update_decision', auth.uid(),
          CASE WHEN p_status IS NOT NULL AND p_status <> d.status
               THEN format('status %s → %s%s', d.status, p_status,
                           COALESCE(' · outcome '||COALESCE(p_outcome, d.outcome), ''))
               ELSE 'updated' END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.strata_update_decision(uuid, text, text, uuid, date, text, text, jsonb) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- D · RD-DEF-005 — terminal-state immutability for children
-- ════════════════════════════════════════════════════════════════════════════

-- Actions under a CLOSED decision: no new action, no edits — same signatures, so plain replace.
CREATE OR REPLACE FUNCTION public.strata_create_action(
  p_decision uuid,
  p_title text,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; akey text; v_dstatus text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'creating an action requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT status INTO v_dstatus FROM public.strata_decisions WHERE id = p_decision;
  IF v_dstatus IS NULL THEN RAISE EXCEPTION 'decision not found'; END IF;
  -- RD-DEF-005: no new action after decision closure.
  IF v_dstatus = 'closed' THEN
    RAISE EXCEPTION 'this decision is closed — no new action can be added to a closed decision';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'action title is required'; END IF;

  akey := 'ACT-' || nextval('public.strata_action_key_seq');
  INSERT INTO public.strata_actions (action_key, decision_id, title, owner_id, due_date, status, note, created_by)
  VALUES (akey, p_decision, btrim(p_title), p_owner, p_due_date, 'open', p_note, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_actions', new_id, 'RPC:create_action', auth.uid(),
          format('%s "%s" under %s', akey, btrim(p_title), public.strata_entity_name('decision', p_decision)));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_update_action(
  p_action uuid,
  p_status text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; v_dstatus text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating an action requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO a FROM public.strata_actions WHERE id = p_action;
  IF a IS NULL THEN RAISE EXCEPTION 'action not found'; END IF;

  -- RD-DEF-005: children of a closed decision are frozen with it.
  SELECT status INTO v_dstatus FROM public.strata_decisions WHERE id = a.decision_id;
  IF v_dstatus = 'closed' THEN
    RAISE EXCEPTION 'this action belongs to a closed decision — the record is frozen history and cannot be edited';
  END IF;
  -- A done/cancelled action is itself a terminal record.
  IF a.status IN ('done','cancelled') THEN
    RAISE EXCEPTION 'this action is % — a terminal action cannot be edited; create a new action instead', a.status;
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('open','in_progress','done','cancelled') THEN
    RAISE EXCEPTION 'status must be open | in_progress | done | cancelled';
  END IF;

  UPDATE public.strata_actions
     SET status = COALESCE(p_status, status),
         note = COALESCE(p_note, note),
         owner_id = COALESCE(p_owner, owner_id),
         due_date = COALESCE(p_due_date, due_date),
         updated_at = now()
   WHERE id = p_action;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_actions', p_action, 'RPC:update_action', auth.uid(),
          CASE WHEN p_status IS NOT NULL THEN format('status %s → %s', a.status, p_status) ELSE 'updated' END);
END;
$$;

-- Participants under a terminal review: guarded by TRIGGER because participants are written
-- directly under RLS (no RPC), and RLS cannot see the parent row's state change atomically.
CREATE OR REPLACE FUNCTION public.strata_review_children_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_review uuid; v_status text;
BEGIN
  v_review := COALESCE(NEW.review_id, OLD.review_id);
  SELECT status INTO v_status FROM public.strata_reviews WHERE id = v_review;
  IF v_status IN ('closed','cancelled') THEN
    RAISE EXCEPTION 'this review is % — its participant list is frozen history and cannot be changed', v_status;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_strata_review_participants_guard ON public.strata_review_participants;
CREATE TRIGGER trg_strata_review_participants_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.strata_review_participants
  FOR EACH ROW EXECUTE FUNCTION public.strata_review_children_guard();
