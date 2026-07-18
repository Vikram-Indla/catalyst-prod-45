-- CAT-STRATA-SC-GOVAPPROVAL-20260718-001 · governed Scorecard version approval lifecycle
-- Contract: SC_SCORECARD_GOVERNED_APPROVAL_IMPLEMENTATION.md
--
-- WHAT THIS ADDS (semantics per contract, names per repo conventions):
--   * Two new lifecycle states on strata_scorecard_models: 'changes_requested' and 'rejected'.
--     'approved' remains the ACTIVE state (4 snapshot call-sites + instance generation key on it);
--     activation cutover = the atomic approve+supersede already established by the engine.
--   * Submission metadata: submitted_by/at, submission_attempt, assigned approver + source,
--     review_comment (latest decision comment — full history stays in strata_audit_events).
--   * A first-class approval task table with a DB-enforced one-open-task-per-version invariant.
--   * One shared server-side validator (strata_validate_scorecard_model) used by submit AND
--     approve — blockers/warnings/passed checklist, queryable by the UI.
--   * Dedicated transition RPCs: submit/resubmit (approver resolved + task created atomically),
--     withdraw (submitter/admin), request changes + reject (assigned approver only, comment
--     mandatory), approve (assigned approver only, maker-checker both-sided, validation rerun,
--     optimistic concurrency, atomic supersede), assign/reassign (strata_admin remediation path).
--   * The generic 4-verb engine now REFUSES strata_scorecard_models for submit/approve so the
--     richer workflow cannot be bypassed; retire stays generic (approved → retired only).
--   * A status-transition trigger guard: lifecycle status changes only through the workflow RPCs
--     (transaction-local GUC handshake), closing every direct-UPDATE path.
--   * Editability extended to 'changes_requested' (RLS on both child tables + set_model_measures
--     + parent update policy) — requesting changes edits the SAME version, never a new one.
--   * Notification rules + emits for submitted/withdrawn/changes-requested/rejected/approved/
--     assigned, via the established strata_notify outbox-style engine (in-app, retry-safe,
--     delivery failure cannot corrupt workflow state — emit is same-transaction, dedup-guarded).
--   * Legacy remediation: pre-existing pending rows have no assignee and no open task, so they
--     are NOT actionable until a strata_admin assigns an approver (strata_assign_scorecard_approver).
--     No approver or decision history is fabricated; submission_attempt stays 0 = "pre-workflow".
--
-- ROLLBACK IMPLICATIONS: new states/tasks/events written after this migration cannot be
-- represented by the old CHECK constraint; rolling back requires first resolving any row in
-- 'changes_requested'/'rejected' (withdraw-equivalent manual UPDATE) and dropping the task table.
-- Audit events are append-only and are retained either way.

-- ── 1. States + submission/assignment metadata ───────────────────────────────
ALTER TABLE public.strata_scorecard_models
  DROP CONSTRAINT IF EXISTS strata_scorecard_models_status_check;
ALTER TABLE public.strata_scorecard_models
  ADD CONSTRAINT strata_scorecard_models_status_check
  CHECK (status IN ('draft','pending_approval','changes_requested','approved','retired','superseded','rejected'));

ALTER TABLE public.strata_scorecard_models
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submission_attempt int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_approver_id uuid,
  ADD COLUMN IF NOT EXISTS assignment_source text
    CHECK (assignment_source IN ('selected','policy','delegated')),
  ADD COLUMN IF NOT EXISTS review_comment text,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

COMMENT ON COLUMN public.strata_scorecard_models.submission_attempt IS
  'Monotonic resubmission counter. 0 = never submitted through the governed workflow (pre-migration rows keep 0 — deterministic, nothing fabricated).';
COMMENT ON COLUMN public.strata_scorecard_models.review_comment IS
  'Latest request-changes/reject comment. Full append-only history lives in strata_audit_events.';

-- ── 2. Approval task ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strata_scorecard_approval_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.strata_scorecard_models(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled','superseded')),
  assigned_to uuid NOT NULL,
  submission_attempt int NOT NULL DEFAULT 1,
  due_date date,
  outcome text CHECK (outcome IN ('approved','changes_requested','rejected')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text
);
-- THE invariant: exactly one current open approval task per pending version.
CREATE UNIQUE INDEX IF NOT EXISTS strata_sc_approval_one_open
  ON public.strata_scorecard_approval_tasks (model_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS strata_sc_approval_assignee_idx
  ON public.strata_scorecard_approval_tasks (assigned_to, status);

ALTER TABLE public.strata_scorecard_approval_tasks ENABLE ROW LEVEL SECURITY;
-- Read-only to approved users (work queue + card display); writes are RPC-only.
DROP POLICY IF EXISTS strata_sc_approval_tasks_select ON public.strata_scorecard_approval_tasks;
CREATE POLICY strata_sc_approval_tasks_select ON public.strata_scorecard_approval_tasks
  FOR SELECT USING (public.current_user_is_approved());
GRANT SELECT ON public.strata_scorecard_approval_tasks TO authenticated;

-- ── 3. Status-transition guard trigger ───────────────────────────────────────
-- Lifecycle status changes are legal only inside the workflow RPCs (they set a
-- transaction-local GUC before writing). The single exemption is approved→retired,
-- which stays with the generic audited strata_retire_record; clients cannot reach
-- it directly anyway (RLS UPDATE policy never matches an approved row).
CREATE OR REPLACE FUNCTION public.strata_guard_scorecard_model_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status = 'approved' AND NEW.status = 'retired')
     AND COALESCE(current_setting('strata.scorecard_lifecycle', true), '') <> '1' THEN
    RAISE EXCEPTION 'scorecard model lifecycle status changes only through the governed workflow (submit / withdraw / request changes / reject / approve)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_strata_scorecard_models_status_guard ON public.strata_scorecard_models;
CREATE TRIGGER trg_strata_scorecard_models_status_guard
  BEFORE UPDATE ON public.strata_scorecard_models
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_scorecard_model_status();

-- ── 4. Editability: CHANGES_REQUESTED edits the SAME version ─────────────────
DROP POLICY IF EXISTS strata_scorecard_model_perspectives_write ON public.strata_scorecard_model_perspectives;
CREATE POLICY strata_scorecard_model_perspectives_write ON public.strata_scorecard_model_perspectives
  FOR ALL
  USING (
    public.strata_has_role(ARRAY['strategy_office'])
    AND EXISTS (
      SELECT 1 FROM public.strata_scorecard_models m
       WHERE m.id = strata_scorecard_model_perspectives.model_id
         AND m.status IN ('draft','changes_requested')
    )
  )
  WITH CHECK (
    public.strata_has_role(ARRAY['strategy_office'])
    AND EXISTS (
      SELECT 1 FROM public.strata_scorecard_models m
       WHERE m.id = strata_scorecard_model_perspectives.model_id
         AND m.status IN ('draft','changes_requested')
    )
  );

DROP POLICY IF EXISTS strata_model_measures_write ON public.strata_scorecard_model_measures;
CREATE POLICY strata_model_measures_write ON public.strata_scorecard_model_measures
  FOR ALL
  USING (
    public.strata_has_role(ARRAY['strategy_office'])
    AND EXISTS (
      SELECT 1 FROM public.strata_scorecard_models m
       WHERE m.id = strata_scorecard_model_measures.model_id
         AND m.status IN ('draft','changes_requested')
    )
  )
  WITH CHECK (
    public.strata_has_role(ARRAY['strategy_office'])
    AND EXISTS (
      SELECT 1 FROM public.strata_scorecard_models m
       WHERE m.id = strata_scorecard_model_measures.model_id
         AND m.status IN ('draft','changes_requested')
    )
  );

-- Parent-row metadata edits follow the same two editable states. Status flips via
-- this path are blocked by the trigger guard in §3, so widening is safe.
DROP POLICY IF EXISTS strata_scorecard_models_update ON public.strata_scorecard_models;
CREATE POLICY strata_scorecard_models_update ON public.strata_scorecard_models
  FOR UPDATE
  USING (status IN ('draft','changes_requested') AND (created_by = auth.uid() OR public.strata_is_admin()))
  WITH CHECK (status IN ('draft','changes_requested'));

-- set_model_measures (SECURITY DEFINER bypasses RLS): same widening, same message discipline.
CREATE OR REPLACE FUNCTION public.strata_set_model_measures(p_model uuid, p_measures jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bad uuid;
  v_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'authoring scorecard measures requires the strategy_office or admin role';
  END IF;

  SELECT status INTO v_status FROM public.strata_scorecard_models WHERE id = p_model;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;

  -- Definitions are writable only while DRAFT or CHANGES_REQUESTED. Pending,
  -- approved, superseded and rejected definitions are immutable on every path.
  IF v_status NOT IN ('draft','changes_requested') THEN
    RAISE EXCEPTION 'scorecard model is % — its definition is immutable; only draft or changes-requested versions can be edited', v_status
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

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_scorecard_models', p_model, 'RPC:set_model_measures', auth.uid(),
          jsonb_array_length(coalesce(p_measures,'[]'::jsonb))::text || ' measure assignment(s) set');
END;
$function$;

-- ── 5. ONE shared server-side validator ─────────────────────────────────────
-- Used by submit AND approve; independently queryable so the UI checklist and
-- the RPCs read the same authority. Returns {blockers, warnings, passed}.
CREATE OR REPLACE FUNCTION public.strata_validate_scorecard_model(p_model uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m public.strata_scorecard_models%ROWTYPE;
  v_blockers text[] := '{}';
  v_warnings text[] := '{}';
  v_passed   text[] := '{}';
  v_wsum numeric;
  v_wcount int;
  r RECORD;
BEGIN
  SELECT * INTO m FROM public.strata_scorecard_models WHERE id = p_model;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;

  -- Identity / scope / roll-up / granularity (NOT NULL + CHECKed at DDL level).
  IF btrim(coalesce(m.name,'')) = '' THEN
    v_blockers := v_blockers || 'Model name is blank'::text;
  ELSE
    v_passed := v_passed || 'Model identity complete (name, scope, roll-up, granularity)'::text;
  END IF;

  IF m.threshold_scheme_id IS NULL THEN
    v_blockers := v_blockers || 'No threshold scheme assigned — required before approval'::text;
  ELSE
    v_passed := v_passed || 'Threshold scheme assigned'::text;
  END IF;

  SELECT coalesce(sum(weight),0), count(*) INTO v_wsum, v_wcount
    FROM public.strata_scorecard_model_perspectives WHERE model_id = p_model;
  IF v_wcount = 0 THEN
    v_blockers := v_blockers || 'Model has no perspectives'::text;
  ELSIF abs(v_wsum - 100) > 0.01 THEN
    v_blockers := v_blockers || format('Perspective weights total %s — must total 100', v_wsum::text);
  ELSE
    v_passed := v_passed || 'Perspective weights total 100'::text;
  END IF;

  -- Every weighted perspective needs measures whose weights total 100. An empty
  -- weighted perspective is a FAILURE, never healthy (contract + CFG-006).
  FOR r IN
    SELECT mp.perspective_id, p.name AS pname,
           coalesce(sum(mm.weight), 0) AS msum,
           count(mm.id) AS mcount
      FROM public.strata_scorecard_model_perspectives mp
      JOIN public.strata_perspectives p ON p.id = mp.perspective_id
      LEFT JOIN public.strata_scorecard_model_measures mm
        ON mm.model_id = mp.model_id AND mm.perspective_id = mp.perspective_id
     WHERE mp.model_id = p_model
     GROUP BY mp.perspective_id, p.name
     ORDER BY p.name
  LOOP
    IF r.mcount = 0 THEN
      v_blockers := v_blockers || format('%s has no measures assigned', r.pname);
    ELSIF abs(r.msum - 100) > 0.01 THEN
      v_blockers := v_blockers || format('%s measure weights total %s — must total 100', r.pname, r.msum::text);
    ELSE
      v_passed := v_passed || format('%s measure weights total 100', r.pname);
    END IF;
  END LOOP;

  -- Measure/KPI references: retired KPIs block; not-yet-approved KPIs warn.
  FOR r IN
    SELECT k.name AS kname, k.status AS kstatus
      FROM public.strata_scorecard_model_measures mm
      JOIN public.strata_kpis k ON k.id = mm.kpi_id
     WHERE mm.model_id = p_model AND k.status <> 'approved'
     ORDER BY k.name
  LOOP
    IF r.kstatus = 'retired' THEN
      v_blockers := v_blockers || format('Measure KPI "%s" is retired — replace it', r.kname);
    ELSE
      v_warnings := v_warnings || format('Measure KPI "%s" is %s — not yet an approved KPI', r.kname, r.kstatus);
    END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM public.strata_scorecard_model_measures mm
    JOIN public.strata_kpis k ON k.id = mm.kpi_id
    WHERE mm.model_id = p_model AND k.status <> 'approved')
    AND EXISTS (SELECT 1 FROM public.strata_scorecard_model_measures WHERE model_id = p_model)
  THEN
    v_passed := v_passed || 'All measure KPI references are approved'::text;
  END IF;

  -- Duplicate assignment is impossible (UNIQUE (model_id, perspective_id, kpi_id)).
  v_passed := v_passed || 'No duplicate measure assignments (DB-enforced)'::text;

  RETURN jsonb_build_object(
    'blockers', to_jsonb(v_blockers),
    'warnings', to_jsonb(v_warnings),
    'passed',   to_jsonb(v_passed));
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_validate_scorecard_model(uuid) TO authenticated;

-- ── 6. Approver candidates (permitted directory scope only) ──────────────────
-- Eligible = ACTIVE approved profiles holding strategy_office or strata_admin,
-- excluding the caller (maker-checker) and the version's creator. Revalidated
-- server-side at submission — this list is a convenience, never trusted.
CREATE OR REPLACE FUNCTION public.strata_scorecard_approver_candidates(p_model uuid)
RETURNS TABLE (user_id uuid, display_name text, email text, roles text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ra.user_id,
         max(coalesce(nullif(p.full_name,''), p.email)) AS display_name,
         max(p.email) AS email,
         array_agg(DISTINCT ra.role::text) AS roles
    FROM public.strata_role_assignments ra
    JOIN public.profiles p ON p.id = ra.user_id AND p.approval_status = 'APPROVED'
   WHERE public.current_user_is_approved()
     AND public.strata_has_role(ARRAY['strategy_office'])
     AND ra.role IN ('strategy_office','strata_admin')
     AND ra.user_id <> auth.uid()
     AND ra.user_id IS DISTINCT FROM
         (SELECT created_by FROM public.strata_scorecard_models WHERE id = p_model)
   GROUP BY ra.user_id
   ORDER BY 2;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_scorecard_approver_candidates(uuid) TO authenticated;

-- Shared eligibility re-check used by submit + assign. Raises with the reason.
CREATE OR REPLACE FUNCTION public.strata_assert_scorecard_approver_eligible(
  p_model uuid, p_approver uuid, p_submitter uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_creator uuid;
BEGIN
  IF p_approver IS NULL THEN
    RAISE EXCEPTION 'an approver must be selected — submission cannot proceed without a resolved approver';
  END IF;
  IF p_approver = p_submitter THEN
    RAISE EXCEPTION 'segregation of duties: the submitter cannot be the approver of their own submission';
  END IF;
  SELECT created_by INTO v_creator FROM public.strata_scorecard_models WHERE id = p_model;
  IF p_approver IS NOT DISTINCT FROM v_creator THEN
    RAISE EXCEPTION 'segregation of duties: the version creator cannot be its approver';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = p_approver AND p.approval_status = 'APPROVED') THEN
    RAISE EXCEPTION 'the selected approver is not an active user';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.strata_role_assignments ra
     WHERE ra.user_id = p_approver AND ra.role IN ('strategy_office','strata_admin')) THEN
    RAISE EXCEPTION 'the selected approver does not hold an approval role (strategy_office or strata_admin)';
  END IF;
END;
$function$;

-- ── 7. Submit / resubmit ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_submit_scorecard_model(
  p_model uuid,
  p_approver uuid,
  p_note text DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m public.strata_scorecard_models%ROWTYPE;
  v_validation jsonb;
  v_blockers jsonb;
  v_attempt int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'submitting a scorecard model requires the strategy_office or admin role';
  END IF;

  SELECT * INTO m FROM public.strata_scorecard_models WHERE id = p_model FOR UPDATE;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;
  IF m.status NOT IN ('draft','changes_requested') THEN
    RAISE EXCEPTION 'only draft or changes-requested versions can be submitted (current: %)', m.status;
  END IF;
  IF m.created_by IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the version author (or an admin) may submit it for approval';
  END IF;
  -- Optimistic concurrency: the submitter confirms against the definition they saw.
  IF p_expected_updated_at IS NOT NULL AND m.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'this model changed after you opened it — refresh to load the latest definition, then submit again';
  END IF;

  -- ONE shared validator; blockers refuse the transition with every reason at once.
  v_validation := public.strata_validate_scorecard_model(p_model);
  v_blockers := v_validation->'blockers';
  IF jsonb_array_length(v_blockers) > 0 THEN
    RAISE EXCEPTION 'submission blocked — % issue(s): %',
      jsonb_array_length(v_blockers),
      (SELECT string_agg(x, '; ') FROM jsonb_array_elements_text(v_blockers) t(x));
  END IF;

  -- Server-side approver resolution — chooser results are never trusted.
  PERFORM public.strata_assert_scorecard_approver_eligible(p_model, p_approver, auth.uid());

  -- Exactly one open task per version (also DB-enforced by the partial unique index).
  IF EXISTS (SELECT 1 FROM public.strata_scorecard_approval_tasks
              WHERE model_id = p_model AND status = 'open') THEN
    RAISE EXCEPTION 'an open approval task already exists for this version';
  END IF;

  v_attempt := m.submission_attempt + 1;

  INSERT INTO public.strata_scorecard_approval_tasks
    (model_id, status, assigned_to, submission_attempt, created_by)
  VALUES (p_model, 'open', p_approver, v_attempt, auth.uid());

  PERFORM set_config('strata.scorecard_lifecycle', '1', true);
  UPDATE public.strata_scorecard_models
     SET status = 'pending_approval',
         submitted_by = auth.uid(),
         submitted_at = now(),
         submission_attempt = v_attempt,
         assigned_approver_id = p_approver,
         assignment_source = 'selected',
         review_comment = NULL,
         updated_at = now()
   WHERE id = p_model
     AND status IN ('draft','changes_requested');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission conflict — the version is no longer editable';
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_scorecard_models', p_model,
          CASE WHEN v_attempt > 1 THEN 'RPC:resubmit_scorecard_model' ELSE 'RPC:submit_scorecard_model' END,
          auth.uid(),
          jsonb_build_object('status', m.status),
          jsonb_build_object('status', 'pending_approval', 'assigned_approver_id', p_approver,
                             'assignment_source', 'selected', 'submission_attempt', v_attempt),
          coalesce(nullif(btrim(p_note), ''),
                   format('v%s submitted for approval (attempt %s)', m.version, v_attempt)));

  PERFORM public.strata_notify(
    p_approver, 'scorecard_submitted', 'strata_scorecard_models', p_model,
    'Scorecard version awaiting your approval',
    format('%s v%s was submitted for your approval (attempt %s).', m.name, m.version, v_attempt));
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_submit_scorecard_model(uuid, uuid, text, timestamptz) TO authenticated;

-- ── 8. Withdraw ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_withdraw_scorecard_model(
  p_model uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m public.strata_scorecard_models%ROWTYPE;
  v_task public.strata_scorecard_approval_tasks%ROWTYPE;
BEGIN
  SELECT * INTO m FROM public.strata_scorecard_models WHERE id = p_model FOR UPDATE;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;
  IF m.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can be withdrawn (current: %)', m.status;
  END IF;
  IF m.submitted_by IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the submitter (or an admin) may withdraw this submission';
  END IF;

  -- Cancel the open task atomically with the state change.
  UPDATE public.strata_scorecard_approval_tasks
     SET status = 'cancelled', cancelled_at = now(),
         cancel_reason = nullif(btrim(coalesce(p_reason,'')), '')
   WHERE model_id = p_model AND status = 'open'
   RETURNING * INTO v_task;

  PERFORM set_config('strata.scorecard_lifecycle', '1', true);
  UPDATE public.strata_scorecard_models
     SET status = 'draft',
         assigned_approver_id = NULL,
         assignment_source = NULL,
         updated_at = now()
   WHERE id = p_model AND status = 'pending_approval';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'withdraw conflict — the version is no longer pending approval';
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_scorecard_models', p_model, 'RPC:withdraw_scorecard_model', auth.uid(),
          jsonb_build_object('status', 'pending_approval', 'assigned_approver_id', m.assigned_approver_id),
          jsonb_build_object('status', 'draft'),
          coalesce(nullif(btrim(coalesce(p_reason,'')), ''),
                   format('v%s submission withdrawn (attempt %s)', m.version, m.submission_attempt)));

  IF v_task.assigned_to IS NOT NULL THEN
    PERFORM public.strata_notify(
      v_task.assigned_to, 'scorecard_withdrawn', 'strata_scorecard_models', p_model,
      'Scorecard submission withdrawn',
      format('%s v%s was withdrawn by its submitter — no action needed.', m.name, m.version));
  END IF;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_withdraw_scorecard_model(uuid, text) TO authenticated;

-- ── 9. Decision core (request changes / reject share actor rules) ────────────
-- Only the CURRENT ASSIGNED approver may decide. Being an administrator does
-- NOT imply decision authority (contract) — an admin's remediation verb is
-- strata_assign_scorecard_approver, never deciding directly.
CREATE OR REPLACE FUNCTION public.strata_request_scorecard_changes(
  p_model uuid,
  p_comment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m public.strata_scorecard_models%ROWTYPE;
  v_comment text := nullif(btrim(coalesce(p_comment,'')), '');
BEGIN
  IF v_comment IS NULL THEN
    RAISE EXCEPTION 'a comment is required to request changes';
  END IF;
  IF length(v_comment) > 2000 THEN
    RAISE EXCEPTION 'comment too long (max 2000 characters)';
  END IF;

  SELECT * INTO m FROM public.strata_scorecard_models WHERE id = p_model FOR UPDATE;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;
  IF m.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can receive requested changes (current: %)', m.status;
  END IF;
  IF m.assigned_approver_id IS NULL THEN
    RAISE EXCEPTION 'this submission has no assigned approver — a strata_admin must assign one first';
  END IF;
  IF m.assigned_approver_id <> auth.uid() THEN
    RAISE EXCEPTION 'only the assigned approver may decide this submission';
  END IF;
  IF m.submitted_by IS NOT DISTINCT FROM auth.uid() OR m.created_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the submitter/creator cannot decide their own submission';
  END IF;

  -- Completing the open task is the serialization point: a concurrent decision
  -- finds zero open rows and stops. Never two decisions for one submission.
  UPDATE public.strata_scorecard_approval_tasks
     SET status = 'completed', outcome = 'changes_requested',
         completed_by = auth.uid(), completed_at = now()
   WHERE model_id = p_model AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'decision conflict — this submission has already been decided';
  END IF;

  PERFORM set_config('strata.scorecard_lifecycle', '1', true);
  -- SAME version becomes editable again; the version number never changes here.
  UPDATE public.strata_scorecard_models
     SET status = 'changes_requested',
         review_comment = v_comment,
         updated_at = now()
   WHERE id = p_model AND status = 'pending_approval';

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_scorecard_models', p_model, 'RPC:request_scorecard_changes', auth.uid(),
          jsonb_build_object('status', 'pending_approval', 'submission_attempt', m.submission_attempt),
          jsonb_build_object('status', 'changes_requested'),
          v_comment);

  IF m.submitted_by IS NOT NULL THEN
    PERFORM public.strata_notify(
      m.submitted_by, 'scorecard_changes_requested', 'strata_scorecard_models', p_model,
      'Changes requested on your scorecard submission',
      format('%s v%s: %s', m.name, m.version, v_comment));
  END IF;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_request_scorecard_changes(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_reject_scorecard_model(
  p_model uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m public.strata_scorecard_models%ROWTYPE;
  v_reason text := nullif(btrim(coalesce(p_reason,'')), '');
BEGIN
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'a reason is required to reject a submission';
  END IF;
  IF length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'reason too long (max 2000 characters)';
  END IF;

  SELECT * INTO m FROM public.strata_scorecard_models WHERE id = p_model FOR UPDATE;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;
  IF m.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can be rejected (current: %)', m.status;
  END IF;
  IF m.assigned_approver_id IS NULL THEN
    RAISE EXCEPTION 'this submission has no assigned approver — a strata_admin must assign one first';
  END IF;
  IF m.assigned_approver_id <> auth.uid() THEN
    RAISE EXCEPTION 'only the assigned approver may decide this submission';
  END IF;
  IF m.submitted_by IS NOT DISTINCT FROM auth.uid() OR m.created_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the submitter/creator cannot decide their own submission';
  END IF;

  UPDATE public.strata_scorecard_approval_tasks
     SET status = 'completed', outcome = 'rejected',
         completed_by = auth.uid(), completed_at = now()
   WHERE model_id = p_model AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'decision conflict — this submission has already been decided';
  END IF;

  PERFORM set_config('strata.scorecard_lifecycle', '1', true);
  -- Terminal: a rejected version never becomes active. Revising means a new
  -- version cloned from the approved predecessor.
  UPDATE public.strata_scorecard_models
     SET status = 'rejected',
         review_comment = v_reason,
         rejected_by = auth.uid(),
         rejected_at = now(),
         updated_at = now()
   WHERE id = p_model AND status = 'pending_approval';

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_scorecard_models', p_model, 'RPC:reject_scorecard_model', auth.uid(),
          jsonb_build_object('status', 'pending_approval', 'submission_attempt', m.submission_attempt),
          jsonb_build_object('status', 'rejected'),
          v_reason);

  IF m.submitted_by IS NOT NULL THEN
    PERFORM public.strata_notify(
      m.submitted_by, 'scorecard_rejected', 'strata_scorecard_models', p_model,
      'Scorecard submission rejected',
      format('%s v%s was rejected: %s', m.name, m.version, v_reason));
  END IF;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_reject_scorecard_model(uuid, text) TO authenticated;

-- ── 10. Approve (assigned approver only; validation rerun; atomic cutover) ───
-- Signature change: the old 2-arg form is dropped so exactly one definition
-- exists (PostgREST overload ambiguity is a real failure mode).
DROP FUNCTION IF EXISTS public.strata_approve_scorecard_model(uuid, text);
CREATE FUNCTION public.strata_approve_scorecard_model(
  p_model uuid,
  p_note text DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m public.strata_scorecard_models%ROWTYPE;
  v_validation jsonb;
  v_blockers jsonb;
BEGIN
  SELECT * INTO m FROM public.strata_scorecard_models WHERE id = p_model FOR UPDATE;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;
  IF m.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can be approved (current: %)', m.status;
  END IF;
  IF m.assigned_approver_id IS NULL THEN
    RAISE EXCEPTION 'this submission has no assigned approver — a strata_admin must assign one before it can be decided';
  END IF;
  -- Only the CURRENT assignee decides — not the submitter, not an unrelated admin.
  IF m.assigned_approver_id <> auth.uid() THEN
    RAISE EXCEPTION 'only the assigned approver may decide this submission';
  END IF;
  -- Maker-checker, both sides, re-checked at decision time.
  IF m.submitted_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the submitter cannot approve their own submission';
  END IF;
  IF m.created_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the creator cannot approve their own record';
  END IF;
  IF p_expected_updated_at IS NOT NULL AND m.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'this submission changed after you opened it — refresh and review again before deciding';
  END IF;

  -- Validation is RERUN at approval: a dependency broken after submission
  -- (retired KPI, weight edit in a prior state) must fail here, not activate.
  v_validation := public.strata_validate_scorecard_model(p_model);
  v_blockers := v_validation->'blockers';
  IF jsonb_array_length(v_blockers) > 0 THEN
    RAISE EXCEPTION 'approval blocked — % issue(s): %',
      jsonb_array_length(v_blockers),
      (SELECT string_agg(x, '; ') FROM jsonb_array_elements_text(v_blockers) t(x));
  END IF;

  -- Serialization point: completing the single open task. A duplicate/concurrent
  -- approval finds no open task and stops — one decision, one activation.
  UPDATE public.strata_scorecard_approval_tasks
     SET status = 'completed', outcome = 'approved',
         completed_by = auth.uid(), completed_at = now()
   WHERE model_id = p_model AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'decision conflict — this submission has already been decided';
  END IF;

  PERFORM set_config('strata.scorecard_lifecycle', '1', true);
  -- ACTIVATION CUTOVER — atomic with superseding the predecessor (below), in
  -- this same transaction. 'approved' is the active state; effective_from
  -- honours a pre-set prospective date.
  UPDATE public.strata_scorecard_models
     SET status = 'approved',
         approved_by = auth.uid(),
         approved_at = now(),
         effective_from = COALESCE(effective_from, now()),
         review_comment = NULL,
         updated_at = now()
   WHERE id = p_model AND status = 'pending_approval';

  IF m.supersedes_id IS NOT NULL THEN
    UPDATE public.strata_scorecard_models
       SET status = 'superseded',
           effective_to = COALESCE(effective_to, now()),
           updated_at = now()
     WHERE id = m.supersedes_id;
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_scorecard_models', p_model, 'RPC:approve_scorecard_model', auth.uid(),
          jsonb_build_object('status', 'pending_approval', 'submission_attempt', m.submission_attempt),
          jsonb_build_object('status', 'approved', 'superseded_predecessor', m.supersedes_id),
          coalesce(nullif(btrim(coalesce(p_note,'')), ''),
                   format('v%s approved and active (attempt %s)', m.version, m.submission_attempt)));

  IF m.submitted_by IS NOT NULL THEN
    PERFORM public.strata_notify(
      m.submitted_by, 'scorecard_approved', 'strata_scorecard_models', p_model,
      'Scorecard version approved',
      format('%s v%s was approved and is now the active version.', m.name, m.version));
  END IF;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_approve_scorecard_model(uuid, text, timestamptz) TO authenticated;

-- ── 11. Assign / reassign (strata_admin remediation, never a decision) ───────
CREATE OR REPLACE FUNCTION public.strata_assign_scorecard_approver(
  p_model uuid,
  p_approver uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m public.strata_scorecard_models%ROWTYPE;
  v_prev uuid;
  v_attempt int;
BEGIN
  IF NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'assigning a scorecard approver requires the strata_admin role';
  END IF;

  SELECT * INTO m FROM public.strata_scorecard_models WHERE id = p_model FOR UPDATE;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;
  IF m.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can be (re)assigned (current: %)', m.status;
  END IF;

  PERFORM public.strata_assert_scorecard_approver_eligible(p_model, p_approver, m.submitted_by);
  IF p_approver = m.assigned_approver_id THEN
    RAISE EXCEPTION 'this user is already the assigned approver';
  END IF;

  v_prev := m.assigned_approver_id;
  v_attempt := GREATEST(m.submission_attempt, 1);

  -- Original assignment is retained as a superseded task row (history), the
  -- new open task carries the same submission attempt.
  UPDATE public.strata_scorecard_approval_tasks
     SET status = 'superseded'
   WHERE model_id = p_model AND status = 'open';

  INSERT INTO public.strata_scorecard_approval_tasks
    (model_id, status, assigned_to, submission_attempt, created_by)
  VALUES (p_model, 'open', p_approver, v_attempt, auth.uid());

  UPDATE public.strata_scorecard_models
     SET assigned_approver_id = p_approver,
         assignment_source = CASE WHEN v_prev IS NULL THEN 'policy' ELSE 'delegated' END,
         submission_attempt = v_attempt,
         updated_at = now()
   WHERE id = p_model AND status = 'pending_approval';

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_scorecard_models', p_model, 'RPC:assign_scorecard_approver', auth.uid(),
          jsonb_build_object('assigned_approver_id', v_prev),
          jsonb_build_object('assigned_approver_id', p_approver,
                             'assignment_source', CASE WHEN v_prev IS NULL THEN 'policy' ELSE 'delegated' END),
          nullif(btrim(coalesce(p_reason,'')), ''));

  PERFORM public.strata_notify(
    p_approver, 'scorecard_approver_assigned', 'strata_scorecard_models', p_model,
    'Scorecard approval assigned to you',
    format('%s v%s is pending your approval decision.', m.name, m.version));
  IF v_prev IS NOT NULL THEN
    PERFORM public.strata_notify(
      v_prev, 'scorecard_approver_assigned', 'strata_scorecard_models', p_model,
      'Scorecard approval reassigned',
      format('%s v%s was reassigned to another approver — no action needed.', m.name, m.version));
  END IF;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.strata_assign_scorecard_approver(uuid, uuid, text) TO authenticated;

-- ── 12. Generic engine: scorecard models must use the dedicated workflow ─────
-- Bodies are the latest definitions (20260718005000 submit / 20260705100000
-- approve) plus ONLY the redirect guard. retire_record stays generic.
CREATE OR REPLACE FUNCTION public.strata_submit_record(p_table text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE cur_status text; cur_creator uuid; v_blockers text[];
BEGIN
  IF NOT (p_table = ANY (public.strata_governed_tables())) THEN
    RAISE EXCEPTION 'strata_submit_record: % is not a governed table', p_table;
  END IF;
  -- Scorecard models carry approver assignment + an approval task; the generic
  -- verb would create an orphan pending version with no assignee.
  IF p_table = 'strata_scorecard_models' THEN
    RAISE EXCEPTION 'scorecard models use the governed approval workflow — submit with strata_submit_scorecard_model (an approver must be assigned)';
  END IF;
  EXECUTE format('SELECT status, created_by FROM public.%I WHERE id = $1', p_table)
    INTO cur_status, cur_creator USING p_id;
  IF cur_status IS NULL THEN RAISE EXCEPTION 'record not found'; END IF;
  IF cur_status <> 'draft' THEN RAISE EXCEPTION 'only draft records can be submitted (current: %)', cur_status; END IF;
  IF cur_creator IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the creator (or an admin) may submit a draft';
  END IF;

  -- KO-DEF-001: refuse the transition unless every applicable prerequisite is met, and report
  -- them ALL at once rather than one failed approval at a time.
  IF p_table = 'strata_kpis' THEN
    v_blockers := public.strata_kpi_submission_blockers(p_id);
    IF array_length(v_blockers, 1) > 0 THEN
      RAISE EXCEPTION 'submission blocked — % prerequisite(s) not met: %',
        array_length(v_blockers, 1), array_to_string(v_blockers, '; ');
    END IF;
  END IF;

  EXECUTE format('UPDATE public.%I SET status = ''pending_approval'', updated_at = now() WHERE id = $1', p_table) USING p_id;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES (p_table, p_id, 'RPC:submit_record', auth.uid(), 'draft → pending_approval');
  PERFORM public.strata_notify(
    ra.user_id, 'config_pending_approval', p_table, p_id,
    'Config change awaiting approval',
    format('A %s record is pending approval.', replace(p_table, 'strata_', '')))
  FROM public.strata_role_assignments ra
  WHERE ra.role = 'strategy_office' AND ra.user_id <> auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.strata_approve_record(p_table text, p_id uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur_status text; cur_creator uuid; cur_supersedes uuid;
BEGIN
  IF NOT (p_table = ANY (public.strata_governed_tables())) THEN
    RAISE EXCEPTION 'strata_approve_record: % is not a governed table', p_table;
  END IF;
  -- Scorecard models: only the ASSIGNED approver decides, with validation rerun
  -- and task completion — the generic verb has none of that.
  IF p_table = 'strata_scorecard_models' THEN
    RAISE EXCEPTION 'scorecard models use the governed approval workflow — decide with strata_approve_scorecard_model';
  END IF;
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'approval requires strategy_office or admin role';
  END IF;
  EXECUTE format('SELECT status, created_by, supersedes_id FROM public.%I WHERE id = $1', p_table)
    INTO cur_status, cur_creator, cur_supersedes USING p_id;
  IF cur_status IS NULL THEN RAISE EXCEPTION 'record not found'; END IF;
  IF cur_status <> 'pending_approval' THEN RAISE EXCEPTION 'only pending_approval records can be approved (current: %)', cur_status; END IF;
  IF cur_creator IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the creator cannot approve their own record';
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET status = ''approved'', approved_by = $2, approved_at = now(),
       effective_from = COALESCE(effective_from, now()), updated_at = now() WHERE id = $1',
    p_table) USING p_id, auth.uid();
  -- Approving a superseding version retires its predecessor.
  IF cur_supersedes IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.%I SET status = ''superseded'', effective_to = COALESCE(effective_to, now()), updated_at = now() WHERE id = $1',
      p_table) USING cur_supersedes;
  END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES (p_table, p_id, 'RPC:approve_record', auth.uid(), COALESCE(p_note, 'pending_approval → approved'));
END;
$$;

-- ── 13. Draft-version RPC: open-successor set + approved-source rule ─────────
CREATE OR REPLACE FUNCTION public.strata_create_model_draft_version(
  p_model  uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_src  public.strata_scorecard_models%ROWTYPE;
  v_new  uuid;
  v_open uuid;
  v_next int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a scorecard model version requires the strategy_office or admin role';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a change reason is required to create a new version';
  END IF;

  SELECT * INTO v_src FROM public.strata_scorecard_models WHERE id = p_model;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;

  IF v_src.status IN ('draft','changes_requested') THEN
    RAISE EXCEPTION 'this version is already editable (%) — edit it directly instead of creating a version', v_src.status;
  END IF;

  -- New versions are created from the ACTIVE (approved) version — never as a
  -- workaround for correcting a pending or rejected one (withdraw / request
  -- changes are the recovery paths; a rejected lineage revises its approved
  -- predecessor).
  IF v_src.status <> 'approved' THEN
    RAISE EXCEPTION 'new versions are created from the approved version (current: %)', v_src.status;
  END IF;

  -- One open successor per predecessor — changes_requested is an OPEN state.
  SELECT id INTO v_open
    FROM public.strata_scorecard_models
   WHERE supersedes_id = p_model AND status IN ('draft','pending_approval','changes_requested')
   LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'a draft version of this model already exists (%) — finish or discard it first', v_open;
  END IF;

  -- Monotonic version numbers even past rejected attempts: a rejected v2 must
  -- never share its number with the next revision of v1.
  v_next := GREATEST(
    v_src.version,
    COALESCE((SELECT max(version) FROM public.strata_scorecard_models WHERE supersedes_id = p_model), 0)
  ) + 1;

  INSERT INTO public.strata_scorecard_models (
    organization_id, name, slug, description, owner_scope_type, rollup_method,
    threshold_scheme_id, period_granularity, version, status,
    effective_from, effective_to, approved_by, approved_at, change_reason, supersedes_id
  ) VALUES (
    v_src.organization_id, v_src.name, NULL, v_src.description, v_src.owner_scope_type,
    v_src.rollup_method, v_src.threshold_scheme_id, v_src.period_granularity,
    v_next, 'draft',
    NULL, NULL, NULL, NULL, p_reason, p_model
  ) RETURNING id INTO v_new;

  INSERT INTO public.strata_scorecard_model_perspectives (model_id, perspective_id, weight, order_index)
  SELECT v_new, perspective_id, weight, order_index
    FROM public.strata_scorecard_model_perspectives
   WHERE model_id = p_model;

  INSERT INTO public.strata_scorecard_model_measures (
    model_id, perspective_id, kpi_id, weight, order_index, required, aggregation_method, target_policy)
  SELECT v_new, perspective_id, kpi_id, weight, order_index, required, aggregation_method, target_policy
    FROM public.strata_scorecard_model_measures
   WHERE model_id = p_model;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_scorecard_models', v_new, 'RPC:create_model_draft_version', auth.uid(),
          format('v%s draft cloned from v%s (%s): %s',
                 v_next, v_src.version, v_src.name, p_reason));

  RETURN v_new;
END;
$function$;

-- ── 14. Notification rules (in-app engine; disabled-rule = silent no-op) ─────
INSERT INTO public.strata_notification_rules (event_type, label, description, audience, approved_at)
VALUES
  ('scorecard_submitted', 'Scorecard awaiting your approval', 'A scorecard version was submitted and assigned to you for decision.', 'assignee', now()),
  ('scorecard_withdrawn', 'Scorecard submission withdrawn', 'A submission assigned to you was withdrawn by its submitter.', 'assignee', now()),
  ('scorecard_changes_requested', 'Changes requested on your scorecard', 'The assigned approver requested changes on your submission.', 'submitter', now()),
  ('scorecard_rejected', 'Scorecard submission rejected', 'The assigned approver rejected your submission.', 'submitter', now()),
  ('scorecard_approved', 'Scorecard version approved', 'Your submission was approved and is now the active version.', 'submitter', now()),
  ('scorecard_approver_assigned', 'Scorecard approval (re)assigned', 'An administrator assigned or reassigned a scorecard approval.', 'assignee', now())
ON CONFLICT (event_type) DO NOTHING;

-- ── 15. SoD registry: project the new rules onto strata_check_role_sod ───────
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
    SELECT 'strategy_office'::text,
           'segregation of duties: the submitter cannot approve their own scorecard submission'::text
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
