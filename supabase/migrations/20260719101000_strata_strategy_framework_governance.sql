-- CAT-STRATA-GOVFRAMEWORK-20260719-001 — Slice 2: Strategy Framework governance RPCs
-- Dedicated maker-checker workflow for strata_strategy_framework_versions, mirroring the
-- scorecard-model governed-approval pattern (20260718200000): assigned approver enforced,
-- both-sided maker-checker, validator rerun inside the approve txn, optimistic concurrency
-- via updated_at, one-open approval task, atomic activation cutover, status-guard trigger + GUC.
--
-- DELIBERATELY NOT TOUCHED (principle #9): strata_governed_tables() and the generic
-- strata_submit_record/approve_record/retire_record verbs are left exactly as they are.
-- Framework versions are NOT added to the generic whitelist — all lifecycle goes through the
-- dedicated RPCs below, and the status-guard trigger blocks any direct status write. This
-- preserves every existing governed table's behavior untouched.
--
-- Depends on Slice 1 (20260719100000). Forward-only.

-- ── 1. Approval task (assigned-approver work queue + serialization point) ────
CREATE TABLE IF NOT EXISTS public.strata_strategy_framework_approval_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_version_id uuid NOT NULL REFERENCES public.strata_strategy_framework_versions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled','superseded')),
  assigned_to uuid NOT NULL,
  submission_attempt int NOT NULL DEFAULT 1,
  outcome text CHECK (outcome IN ('approved','changes_requested','rejected')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text
);
CREATE UNIQUE INDEX IF NOT EXISTS strata_sfv_approval_one_open
  ON public.strata_strategy_framework_approval_tasks (framework_version_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS strata_sfv_approval_assignee_idx
  ON public.strata_strategy_framework_approval_tasks (assigned_to, status);
ALTER TABLE public.strata_strategy_framework_approval_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strata_sfv_approval_tasks_select ON public.strata_strategy_framework_approval_tasks;
CREATE POLICY strata_sfv_approval_tasks_select ON public.strata_strategy_framework_approval_tasks
  FOR SELECT USING (public.current_user_is_approved());
GRANT SELECT ON public.strata_strategy_framework_approval_tasks TO authenticated;

-- ── 2. Status-transition guard (RPC-only, GUC-gated; approved→retired exempt) ─
CREATE OR REPLACE FUNCTION public.strata_guard_framework_version_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND COALESCE(current_setting('strata.framework_lifecycle', true), '') <> '1' THEN
    RAISE EXCEPTION 'strategy framework lifecycle status changes only through the governed workflow (submit / withdraw / request changes / reject / approve / retire)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_strata_sfv_status_guard ON public.strata_strategy_framework_versions;
CREATE TRIGGER trg_strata_sfv_status_guard
  BEFORE UPDATE ON public.strata_strategy_framework_versions
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_framework_version_status();

-- ── 3. Approver candidates + shared eligibility assert ───────────────────────
CREATE OR REPLACE FUNCTION public.strata_framework_approver_candidates(p_version uuid)
RETURNS TABLE (user_id uuid, roles text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ra.user_id, array_agg(DISTINCT ra.role ORDER BY ra.role)
    FROM public.strata_role_assignments ra
    JOIN public.profiles p ON p.id = ra.user_id AND p.approval_status = 'APPROVED'
   WHERE ra.role IN ('strategy_office','strata_admin')
     AND ra.user_id <> auth.uid()
     AND ra.user_id IS DISTINCT FROM
         (SELECT created_by FROM public.strata_strategy_framework_versions WHERE id = p_version)
   GROUP BY ra.user_id
   ORDER BY 2;
$$;
GRANT EXECUTE ON FUNCTION public.strata_framework_approver_candidates(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_assert_framework_approver_eligible(
  p_version uuid, p_approver uuid, p_submitter uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_creator uuid;
BEGIN
  IF p_approver IS NULL THEN
    RAISE EXCEPTION 'an approver must be selected — submission cannot proceed without a resolved approver';
  END IF;
  IF p_approver = p_submitter THEN
    RAISE EXCEPTION 'segregation of duties: the submitter cannot be the approver of their own submission';
  END IF;
  SELECT created_by INTO v_creator FROM public.strata_strategy_framework_versions WHERE id = p_version;
  IF p_approver IS NOT DISTINCT FROM v_creator THEN
    RAISE EXCEPTION 'segregation of duties: the version creator cannot be its approver';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_approver AND p.approval_status = 'APPROVED') THEN
    RAISE EXCEPTION 'the selected approver is not an active user';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_role_assignments ra
                  WHERE ra.user_id = p_approver AND ra.role IN ('strategy_office','strata_admin')) THEN
    RAISE EXCEPTION 'the selected approver does not hold an approval role (strategy_office or strata_admin)';
  END IF;
END;
$$;

-- ── 4. Create framework identity + Version 1 (draft) ─────────────────────────
CREATE OR REPLACE FUNCTION public.strata_create_strategy_framework(
  p_name text, p_description text DEFAULT NULL, p_framework_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_fw uuid; v_ver uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a strategy framework requires the strategy_office or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'a framework name is required';
  END IF;
  INSERT INTO public.strata_strategy_frameworks (name, description, framework_key)
  VALUES (btrim(p_name), p_description, nullif(btrim(coalesce(p_framework_key,'')), ''))
  RETURNING id INTO v_fw;

  INSERT INTO public.strata_strategy_framework_versions (framework_id, version, status, change_reason)
  VALUES (v_fw, 1, 'draft', 'Initial framework version')
  RETURNING id INTO v_ver;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_framework_versions', v_ver, 'RPC:create_strategy_framework', auth.uid(),
          format('framework "%s" created with draft v1', btrim(p_name)));
  RETURN jsonb_build_object('framework_id', v_fw, 'version_id', v_ver);
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_create_strategy_framework(text, text, text) TO authenticated;

-- ── 5. Create a new DRAFT version by cloning the approved version ─────────────
CREATE OR REPLACE FUNCTION public.strata_create_framework_draft_version(
  p_framework uuid, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_src public.strata_strategy_framework_versions%ROWTYPE; v_new uuid; v_open uuid; v_next int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a framework version requires the strategy_office or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a change reason is required to create a new version';
  END IF;

  -- Source = current effective approved version of this framework.
  SELECT * INTO v_src FROM public.strata_strategy_framework_versions
   WHERE framework_id = p_framework AND status = 'approved' AND effective_to IS NULL
   ORDER BY version DESC LIMIT 1;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'no approved effective version exists for this framework to revise';
  END IF;

  -- One open successor at a time (draft/changes_requested/pending_approval).
  SELECT id INTO v_open FROM public.strata_strategy_framework_versions
   WHERE framework_id = p_framework AND status IN ('draft','changes_requested','pending_approval') LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'an open framework version already exists (%) — finish or discard it first', v_open;
  END IF;

  -- Monotonic version numbers even past rejected attempts.
  v_next := COALESCE((SELECT max(version) FROM public.strata_strategy_framework_versions WHERE framework_id = p_framework), 0) + 1;

  INSERT INTO public.strata_strategy_framework_versions
    (framework_id, version, status, change_reason, supersedes_id)
  VALUES (p_framework, v_next, 'draft', btrim(p_reason), v_src.id)
  RETURNING id INTO v_new;

  INSERT INTO public.strata_strategy_framework_members (framework_version_id, perspective_id, weight, order_index)
  SELECT v_new, perspective_id, weight, order_index
    FROM public.strata_strategy_framework_members WHERE framework_version_id = v_src.id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_framework_versions', v_new, 'RPC:create_framework_draft_version', auth.uid(),
          format('v%s draft cloned from v%s: %s', v_next, v_src.version, btrim(p_reason)));
  RETURN v_new;
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_create_framework_draft_version(uuid, text) TO authenticated;

-- ── 6. Update draft metadata (change_reason) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_update_framework_draft(
  p_version uuid, p_change_reason text, p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.strata_strategy_framework_versions%ROWTYPE;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'editing a framework version requires the strategy_office or admin role';
  END IF;
  SELECT * INTO v FROM public.strata_strategy_framework_versions WHERE id = p_version FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'framework version not found'; END IF;
  IF v.status NOT IN ('draft','changes_requested') THEN
    RAISE EXCEPTION 'only draft or changes-requested versions can be edited (current: %)', v.status;
  END IF;
  IF v.created_by IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the version author (or an admin) may edit it';
  END IF;
  IF p_expected_updated_at IS NOT NULL AND v.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'this version changed after you opened it — refresh, then try again';
  END IF;
  UPDATE public.strata_strategy_framework_versions
     SET change_reason = nullif(btrim(coalesce(p_change_reason,'')), ''), updated_at = now()
   WHERE id = p_version;
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_update_framework_draft(uuid, text, timestamptz) TO authenticated;

-- ── 7. Replace ALL members of a draft version (atomic; no partial activation) ─
CREATE OR REPLACE FUNCTION public.strata_replace_framework_members(
  p_version uuid, p_members jsonb, p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.strata_strategy_framework_versions%ROWTYPE; bad uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'authoring framework members requires the strategy_office or admin role';
  END IF;
  SELECT * INTO v FROM public.strata_strategy_framework_versions WHERE id = p_version FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'framework version not found'; END IF;
  IF v.status NOT IN ('draft','changes_requested') THEN
    RAISE EXCEPTION 'members can only be edited on a draft or changes-requested version (current: %)', v.status;
  END IF;
  IF v.created_by IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the version author (or an admin) may edit members';
  END IF;
  IF p_expected_updated_at IS NOT NULL AND v.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'this version changed after you opened it — refresh, then try again';
  END IF;

  -- Referential guard: every perspective must exist and not be retired.
  SELECT m.perspective_id INTO bad
    FROM jsonb_to_recordset(coalesce(p_members,'[]'::jsonb)) AS m(perspective_id uuid, weight numeric, order_index int)
    LEFT JOIN public.strata_perspectives p ON p.id = m.perspective_id
   WHERE p.id IS NULL OR p.status = 'retired' LIMIT 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'member perspective % is missing or retired', bad;
  END IF;

  DELETE FROM public.strata_strategy_framework_members WHERE framework_version_id = p_version;
  INSERT INTO public.strata_strategy_framework_members (framework_version_id, perspective_id, weight, order_index)
  SELECT p_version, m.perspective_id, m.weight, m.order_index
    FROM jsonb_to_recordset(coalesce(p_members,'[]'::jsonb)) AS m(perspective_id uuid, weight numeric, order_index int);
  -- (unique perspective, unique order, weight 0–100 enforced by table constraints)

  -- Advance the concurrency token so a stale editor conflicts on next save.
  UPDATE public.strata_strategy_framework_versions SET updated_at = now() WHERE id = p_version;
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_replace_framework_members(uuid, jsonb, timestamptz) TO authenticated;

-- ── 8. Submit / resubmit ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_submit_framework_version(
  p_version uuid, p_approver uuid, p_note text DEFAULT NULL, p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v public.strata_strategy_framework_versions%ROWTYPE;
  v_name text; v_validation jsonb; v_blockers jsonb; v_attempt int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'submitting a framework version requires the strategy_office or admin role';
  END IF;
  SELECT * INTO v FROM public.strata_strategy_framework_versions WHERE id = p_version FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'framework version not found'; END IF;
  IF v.status NOT IN ('draft','changes_requested') THEN
    RAISE EXCEPTION 'only draft or changes-requested versions can be submitted (current: %)', v.status;
  END IF;
  IF v.created_by IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the version author (or an admin) may submit it for approval';
  END IF;
  IF p_expected_updated_at IS NOT NULL AND v.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'this version changed after you opened it — refresh, then submit again';
  END IF;

  v_validation := public.strata_validate_strategy_framework_version(p_version);
  v_blockers := v_validation->'blockers';
  IF jsonb_array_length(v_blockers) > 0 THEN
    RAISE EXCEPTION 'submission blocked — % issue(s): %',
      jsonb_array_length(v_blockers),
      (SELECT string_agg(x, '; ') FROM jsonb_array_elements_text(v_blockers) t(x));
  END IF;

  PERFORM public.strata_assert_framework_approver_eligible(p_version, p_approver, auth.uid());
  IF EXISTS (SELECT 1 FROM public.strata_strategy_framework_approval_tasks
              WHERE framework_version_id = p_version AND status = 'open') THEN
    RAISE EXCEPTION 'an open approval task already exists for this version';
  END IF;

  v_attempt := COALESCE((SELECT max(submission_attempt) FROM public.strata_strategy_framework_approval_tasks
                          WHERE framework_version_id = p_version), 0) + 1;

  INSERT INTO public.strata_strategy_framework_approval_tasks
    (framework_version_id, status, assigned_to, submission_attempt, created_by)
  VALUES (p_version, 'open', p_approver, v_attempt, auth.uid());

  PERFORM set_config('strata.framework_lifecycle', '1', true);
  UPDATE public.strata_strategy_framework_versions
     SET status = 'pending_approval', submitted_by = auth.uid(), submitted_at = now(),
         assigned_approver_id = p_approver, decision_note = NULL, updated_at = now()
   WHERE id = p_version AND status IN ('draft','changes_requested');
  IF NOT FOUND THEN RAISE EXCEPTION 'submission conflict — the version is no longer editable'; END IF;

  SELECT f.name INTO v_name FROM public.strata_strategy_frameworks f WHERE f.id = v.framework_id;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_strategy_framework_versions', p_version,
          CASE WHEN v_attempt > 1 THEN 'RPC:resubmit_framework_version' ELSE 'RPC:submit_framework_version' END,
          auth.uid(), jsonb_build_object('status', v.status),
          jsonb_build_object('status','pending_approval','assigned_approver_id',p_approver,'submission_attempt',v_attempt),
          coalesce(nullif(btrim(coalesce(p_note,'')), ''), format('v%s submitted for approval (attempt %s)', v.version, v_attempt)));

  PERFORM public.strata_notify(p_approver, 'framework_submitted', 'strata_strategy_framework_versions', p_version,
    'Strategy framework awaiting your approval',
    format('%s v%s was submitted for your approval (attempt %s).', coalesce(v_name,'Framework'), v.version, v_attempt));
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_submit_framework_version(uuid, uuid, text, timestamptz) TO authenticated;

-- ── 9. Withdraw ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_withdraw_framework_version(p_version uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.strata_strategy_framework_versions%ROWTYPE; v_task public.strata_strategy_framework_approval_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.strata_strategy_framework_versions WHERE id = p_version FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'framework version not found'; END IF;
  IF v.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can be withdrawn (current: %)', v.status;
  END IF;
  IF v.submitted_by IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the submitter (or an admin) may withdraw this submission';
  END IF;
  UPDATE public.strata_strategy_framework_approval_tasks
     SET status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(btrim(coalesce(p_reason,'')), '')
   WHERE framework_version_id = p_version AND status = 'open' RETURNING * INTO v_task;

  PERFORM set_config('strata.framework_lifecycle', '1', true);
  UPDATE public.strata_strategy_framework_versions
     SET status = 'draft', assigned_approver_id = NULL, updated_at = now()
   WHERE id = p_version AND status = 'pending_approval';
  IF NOT FOUND THEN RAISE EXCEPTION 'withdraw conflict — the version is no longer pending approval'; END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_strategy_framework_versions', p_version, 'RPC:withdraw_framework_version', auth.uid(),
          jsonb_build_object('status','pending_approval'), jsonb_build_object('status','draft'),
          coalesce(nullif(btrim(coalesce(p_reason,'')), ''), format('v%s submission withdrawn', v.version)));
  IF v_task.assigned_to IS NOT NULL THEN
    PERFORM public.strata_notify(v_task.assigned_to, 'framework_withdrawn', 'strata_strategy_framework_versions', p_version,
      'Framework submission withdrawn', format('v%s was withdrawn by its submitter — no action needed.', v.version));
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_withdraw_framework_version(uuid, text) TO authenticated;

-- ── 10. Request changes (assigned approver only; SAME version) ───────────────
CREATE OR REPLACE FUNCTION public.strata_request_framework_changes(p_version uuid, p_comment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.strata_strategy_framework_versions%ROWTYPE; v_comment text := nullif(btrim(coalesce(p_comment,'')), '');
BEGIN
  IF v_comment IS NULL THEN RAISE EXCEPTION 'a comment is required to request changes'; END IF;
  IF length(v_comment) > 2000 THEN RAISE EXCEPTION 'comment too long (max 2000 characters)'; END IF;
  SELECT * INTO v FROM public.strata_strategy_framework_versions WHERE id = p_version FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'framework version not found'; END IF;
  IF v.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can receive requested changes (current: %)', v.status;
  END IF;
  IF v.assigned_approver_id IS NULL THEN
    RAISE EXCEPTION 'this submission has no assigned approver — a strata_admin must assign one first';
  END IF;
  IF v.assigned_approver_id <> auth.uid() THEN RAISE EXCEPTION 'only the assigned approver may decide this submission'; END IF;
  IF v.submitted_by IS NOT DISTINCT FROM auth.uid() OR v.created_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the submitter/creator cannot decide their own submission';
  END IF;

  UPDATE public.strata_strategy_framework_approval_tasks
     SET status = 'completed', outcome = 'changes_requested', completed_by = auth.uid(), completed_at = now()
   WHERE framework_version_id = p_version AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'decision conflict — this submission has already been decided'; END IF;

  PERFORM set_config('strata.framework_lifecycle', '1', true);
  UPDATE public.strata_strategy_framework_versions
     SET status = 'changes_requested', decision_note = v_comment, updated_at = now()
   WHERE id = p_version AND status = 'pending_approval';

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_strategy_framework_versions', p_version, 'RPC:request_framework_changes', auth.uid(),
          jsonb_build_object('status','pending_approval'), jsonb_build_object('status','changes_requested'), v_comment);
  IF v.submitted_by IS NOT NULL THEN
    PERFORM public.strata_notify(v.submitted_by, 'framework_changes_requested', 'strata_strategy_framework_versions', p_version,
      'Changes requested on your framework submission', format('v%s: %s', v.version, v_comment));
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_request_framework_changes(uuid, text) TO authenticated;

-- ── 11. Reject (terminal) ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_reject_framework_version(p_version uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.strata_strategy_framework_versions%ROWTYPE; v_reason text := nullif(btrim(coalesce(p_reason,'')), '');
BEGIN
  IF v_reason IS NULL THEN RAISE EXCEPTION 'a reason is required to reject a submission'; END IF;
  IF length(v_reason) > 2000 THEN RAISE EXCEPTION 'reason too long (max 2000 characters)'; END IF;
  SELECT * INTO v FROM public.strata_strategy_framework_versions WHERE id = p_version FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'framework version not found'; END IF;
  IF v.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can be rejected (current: %)', v.status;
  END IF;
  IF v.assigned_approver_id IS NULL THEN
    RAISE EXCEPTION 'this submission has no assigned approver — a strata_admin must assign one first';
  END IF;
  IF v.assigned_approver_id <> auth.uid() THEN RAISE EXCEPTION 'only the assigned approver may decide this submission'; END IF;
  IF v.submitted_by IS NOT DISTINCT FROM auth.uid() OR v.created_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the submitter/creator cannot decide their own submission';
  END IF;

  UPDATE public.strata_strategy_framework_approval_tasks
     SET status = 'completed', outcome = 'rejected', completed_by = auth.uid(), completed_at = now()
   WHERE framework_version_id = p_version AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'decision conflict — this submission has already been decided'; END IF;

  PERFORM set_config('strata.framework_lifecycle', '1', true);
  UPDATE public.strata_strategy_framework_versions
     SET status = 'rejected', decision_note = v_reason, updated_at = now()
   WHERE id = p_version AND status = 'pending_approval';

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_strategy_framework_versions', p_version, 'RPC:reject_framework_version', auth.uid(),
          jsonb_build_object('status','pending_approval'), jsonb_build_object('status','rejected'), v_reason);
  IF v.submitted_by IS NOT NULL THEN
    PERFORM public.strata_notify(v.submitted_by, 'framework_rejected', 'strata_strategy_framework_versions', p_version,
      'Framework submission rejected', format('v%s was rejected: %s', v.version, v_reason));
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_reject_framework_version(uuid, text) TO authenticated;

-- ── 12. Approve (assigned approver only; validation rerun; atomic cutover) ────
-- NOTE the cutover ORDER: the predecessor is superseded FIRST, then the successor is
-- activated. This satisfies the strata_sfv_one_effective partial unique index (never two
-- approved+effective rows for one framework, even momentarily inside the transaction).
CREATE OR REPLACE FUNCTION public.strata_approve_framework_version(
  p_version uuid, p_note text DEFAULT NULL, p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.strata_strategy_framework_versions%ROWTYPE; v_name text; v_validation jsonb; v_blockers jsonb;
BEGIN
  SELECT * INTO v FROM public.strata_strategy_framework_versions WHERE id = p_version FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'framework version not found'; END IF;
  IF v.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can be approved (current: %)', v.status;
  END IF;
  IF v.assigned_approver_id IS NULL THEN
    RAISE EXCEPTION 'this submission has no assigned approver — a strata_admin must assign one first';
  END IF;
  IF v.assigned_approver_id <> auth.uid() THEN RAISE EXCEPTION 'only the assigned approver may decide this submission'; END IF;
  IF v.submitted_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the submitter cannot approve their own submission';
  END IF;
  IF v.created_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the creator cannot approve their own record';
  END IF;
  IF p_expected_updated_at IS NOT NULL AND v.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'this submission changed after you opened it — refresh and review again before deciding';
  END IF;

  v_validation := public.strata_validate_strategy_framework_version(p_version);
  v_blockers := v_validation->'blockers';
  IF jsonb_array_length(v_blockers) > 0 THEN
    RAISE EXCEPTION 'approval blocked — % issue(s): %',
      jsonb_array_length(v_blockers),
      (SELECT string_agg(x, '; ') FROM jsonb_array_elements_text(v_blockers) t(x));
  END IF;

  UPDATE public.strata_strategy_framework_approval_tasks
     SET status = 'completed', outcome = 'approved', completed_by = auth.uid(), completed_at = now()
   WHERE framework_version_id = p_version AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'decision conflict — this submission has already been decided'; END IF;

  PERFORM set_config('strata.framework_lifecycle', '1', true);
  -- Supersede predecessor FIRST (frees the one-effective slot), then activate successor.
  IF v.supersedes_id IS NOT NULL THEN
    UPDATE public.strata_strategy_framework_versions
       SET status = 'superseded', effective_to = COALESCE(effective_to, now()), updated_at = now()
     WHERE id = v.supersedes_id;
  END IF;
  UPDATE public.strata_strategy_framework_versions
     SET status = 'approved', approved_by = auth.uid(), approved_at = now(),
         effective_from = COALESCE(effective_from, now()), decision_note = NULL, updated_at = now()
   WHERE id = p_version AND status = 'pending_approval';

  SELECT f.name INTO v_name FROM public.strata_strategy_frameworks f WHERE f.id = v.framework_id;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_strategy_framework_versions', p_version, 'RPC:approve_framework_version', auth.uid(),
          jsonb_build_object('status','pending_approval'),
          jsonb_build_object('status','approved','superseded_predecessor', v.supersedes_id),
          coalesce(nullif(btrim(coalesce(p_note,'')), ''), format('v%s approved and effective', v.version)));
  IF v.submitted_by IS NOT NULL THEN
    PERFORM public.strata_notify(v.submitted_by, 'framework_approved', 'strata_strategy_framework_versions', p_version,
      'Framework version approved', format('%s v%s was approved and is now the effective framework.', coalesce(v_name,'Framework'), v.version));
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_approve_framework_version(uuid, text, timestamptz) TO authenticated;

-- ── 13. Assign / reassign approver (strata_admin remediation, never a decision) ─
CREATE OR REPLACE FUNCTION public.strata_assign_framework_approver(
  p_version uuid, p_approver uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.strata_strategy_framework_versions%ROWTYPE; v_prev uuid; v_attempt int;
BEGIN
  IF NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'assigning a framework approver requires the strata_admin role';
  END IF;
  SELECT * INTO v FROM public.strata_strategy_framework_versions WHERE id = p_version FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'framework version not found'; END IF;
  IF v.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'only a pending-approval version can be (re)assigned (current: %)', v.status;
  END IF;
  PERFORM public.strata_assert_framework_approver_eligible(p_version, p_approver, v.submitted_by);
  IF p_approver = v.assigned_approver_id THEN RAISE EXCEPTION 'this user is already the assigned approver'; END IF;

  v_prev := v.assigned_approver_id;
  v_attempt := COALESCE((SELECT max(submission_attempt) FROM public.strata_strategy_framework_approval_tasks
                          WHERE framework_version_id = p_version), 1);
  UPDATE public.strata_strategy_framework_approval_tasks
     SET status = 'superseded' WHERE framework_version_id = p_version AND status = 'open';
  INSERT INTO public.strata_strategy_framework_approval_tasks
    (framework_version_id, status, assigned_to, submission_attempt, created_by)
  VALUES (p_version, 'open', p_approver, v_attempt, auth.uid());

  PERFORM set_config('strata.framework_lifecycle', '1', true);
  UPDATE public.strata_strategy_framework_versions
     SET assigned_approver_id = p_approver, updated_at = now()
   WHERE id = p_version AND status = 'pending_approval';

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_strategy_framework_versions', p_version, 'RPC:assign_framework_approver', auth.uid(),
          jsonb_build_object('assigned_approver_id', v_prev), jsonb_build_object('assigned_approver_id', p_approver),
          nullif(btrim(coalesce(p_reason,'')), ''));
  PERFORM public.strata_notify(p_approver, 'framework_approver_assigned', 'strata_strategy_framework_versions', p_version,
    'Framework approval assigned to you', format('v%s is pending your approval decision.', v.version));
  IF v_prev IS NOT NULL THEN
    PERFORM public.strata_notify(v_prev, 'framework_approver_assigned', 'strata_strategy_framework_versions', p_version,
      'Framework approval reassigned', format('v%s was reassigned to another approver — no action needed.', v.version));
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_assign_framework_approver(uuid, uuid, text) TO authenticated;

-- ── 14. Retire an approved framework version (decommission) ──────────────────
CREATE OR REPLACE FUNCTION public.strata_retire_strategy_framework_version(p_version uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.strata_strategy_framework_versions%ROWTYPE;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'retiring a framework version requires the strategy_office or admin role';
  END IF;
  SELECT * INTO v FROM public.strata_strategy_framework_versions WHERE id = p_version FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'framework version not found'; END IF;
  IF v.status <> 'approved' THEN
    RAISE EXCEPTION 'only an approved framework version can be retired (current: %)', v.status;
  END IF;
  PERFORM set_config('strata.framework_lifecycle', '1', true);
  UPDATE public.strata_strategy_framework_versions
     SET status = 'retired', effective_to = COALESCE(effective_to, now()),
         change_reason = COALESCE(nullif(btrim(coalesce(p_reason,'')), ''), change_reason), updated_at = now()
   WHERE id = p_version;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_strategy_framework_versions', p_version, 'RPC:retire_strategy_framework_version', auth.uid(),
          jsonb_build_object('status','approved'), jsonb_build_object('status','retired'),
          nullif(btrim(coalesce(p_reason,'')), ''));
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_retire_strategy_framework_version(uuid, text) TO authenticated;

-- ── 15. Dependency impact (informational; extended for models in Slice 3) ────
CREATE OR REPLACE FUNCTION public.strata_framework_dependency_impact(p_version uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_member_count int; v_element_count int;
BEGIN
  SELECT COUNT(*) INTO v_member_count FROM public.strata_strategy_framework_members WHERE framework_version_id = p_version;
  SELECT COUNT(*) INTO v_element_count
    FROM public.strata_strategy_elements e
   WHERE e.perspective_id IN (SELECT perspective_id FROM public.strata_strategy_framework_members WHERE framework_version_id = p_version);
  RETURN jsonb_build_object(
    'version_id', p_version,
    'member_count', v_member_count,
    'strategy_elements_using_member_perspectives', v_element_count
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.strata_framework_dependency_impact(uuid) TO authenticated;

-- ── 16. Notification rules (disabled/unknown rule = silent no-op) ────────────
INSERT INTO public.strata_notification_rules (event_type, label, description, audience, approved_at)
VALUES
  ('framework_submitted', 'Framework awaiting your approval', 'A strategy framework version was submitted and assigned to you for decision.', 'assignee', now()),
  ('framework_withdrawn', 'Framework submission withdrawn', 'A submission assigned to you was withdrawn by its submitter.', 'assignee', now()),
  ('framework_changes_requested', 'Changes requested on your framework', 'The assigned approver requested changes on your submission.', 'submitter', now()),
  ('framework_rejected', 'Framework submission rejected', 'The assigned approver rejected your submission.', 'submitter', now()),
  ('framework_approved', 'Framework version approved', 'Your submission was approved and is now the effective framework.', 'submitter', now()),
  ('framework_approver_assigned', 'Framework approval (re)assigned', 'An administrator assigned or reassigned a framework approval.', 'assignee', now())
ON CONFLICT (event_type) DO NOTHING;
