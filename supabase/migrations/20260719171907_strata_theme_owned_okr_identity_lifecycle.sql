-- CAT-STRATA-THEMEOKR-20260719-001 — Wave 2: Theme-owned OKR identity, versioned
-- definition, and the governed approval-gate lifecycle (decision D-1: full approval gate).
--
-- Additive + forward-only. Repurposes strata_okrs as the stable identity/head (preserving
-- existing FKs, RPCs, review-links, tests) and adds strata_okr_versions for the versioned
-- definition envelope. New prospective OKRs belong directly to a Strategic Theme
-- (strata_strategy_elements.element_type='theme') — NO child Strategy Objective/KPI required
-- (supersedes the historical SR-DEF-007 "Theme OKR = child-objective roll-up" rule; legacy
-- objective-linked OKRs are preserved as history via objective_element_id).
--
-- Lifecycle (D-1): Draft -> Submitted -> Active(approved) -> closing_review -> Closed;
--                  Draft/Submitted -> Withdrawn|Rejected; Active -> Cancelled (governed reason).
-- Maker-checker: approver/rejecter must differ from submitter (server-enforced SoD).
-- Legacy strata_activate_okr (direct draft->active) is redefined to REJECT theme-owned OKRs,
-- forcing them through submit->approve; objective-linked legacy OKRs keep the old path.
--
-- The old lifecycle migration file (20260718009000) is NOT edited — its guard tests read that
-- file verbatim and continue to pass; the live functions are redefined here.

-- ===========================================================================
-- 1. strata_okrs — identity/head columns + expanded lifecycle + theme ownership
-- ===========================================================================
ALTER TABLE public.strata_okrs
  ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS objective_statement text,
  ADD COLUMN IF NOT EXISTS commitment text,
  ADD COLUMN IF NOT EXISTS owning_org_unit_id uuid REFERENCES public.strata_org_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS lock_version int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawn_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE public.strata_okrs DROP CONSTRAINT IF EXISTS strata_okrs_commitment_check;
ALTER TABLE public.strata_okrs ADD CONSTRAINT strata_okrs_commitment_check
  CHECK (commitment IS NULL OR commitment IN ('committed','aspirational'));

-- Expand lifecycle. Existing rows (draft/active/closed) remain valid.
ALTER TABLE public.strata_okrs DROP CONSTRAINT IF EXISTS strata_okrs_status_check;
ALTER TABLE public.strata_okrs ADD CONSTRAINT strata_okrs_status_check CHECK (
  status = ANY (ARRAY['draft','submitted','active','closing_review','closed','withdrawn','rejected','cancelled']::text[])
);

CREATE INDEX IF NOT EXISTS idx_strata_okrs_theme ON public.strata_okrs(theme_id);
CREATE INDEX IF NOT EXISTS idx_strata_okrs_status ON public.strata_okrs(status);

-- Theme-ownership integrity: theme_id must reference a Strategic Theme element (mirrors the
-- strata_project_cards.theme_id element_type='theme' guard). Enforced server-side, not UI.
CREATE OR REPLACE FUNCTION public.strata_okr_theme_check() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE et text;
BEGIN
  IF NEW.theme_id IS NOT NULL THEN
    SELECT element_type INTO et FROM public.strata_strategy_elements WHERE id = NEW.theme_id;
    IF et IS NULL THEN RAISE EXCEPTION 'MISSING_THEME: theme % not found', NEW.theme_id; END IF;
    IF et <> 'theme' THEN
      RAISE EXCEPTION 'INVALID_THEME: an OKR must belong to a Strategic Theme, not a % element', et;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_okr_theme_check ON public.strata_okrs;
CREATE TRIGGER trg_strata_okr_theme_check BEFORE INSERT OR UPDATE OF theme_id ON public.strata_okrs
  FOR EACH ROW EXECUTE FUNCTION public.strata_okr_theme_check();

-- ===========================================================================
-- 2. strata_okr_versions — versioned OKR definition envelope
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.strata_okr_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id uuid NOT NULL REFERENCES public.strata_okrs(id) ON DELETE CASCADE,
  version int NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','superseded')),
  objective_statement text NOT NULL,
  description text,
  theme_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE RESTRICT,
  cycle_id uuid REFERENCES public.strata_cycles(id) ON DELETE SET NULL,
  start_period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  end_period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  commitment text CHECK (commitment IS NULL OR commitment IN ('committed','aspirational')),
  owner_id uuid,
  owning_org_unit_id uuid REFERENCES public.strata_org_units(id) ON DELETE SET NULL,
  review_cadence text,
  all_must_pass boolean NOT NULL DEFAULT false,
  weighting_policy jsonb,
  change_rationale text,
  materiality text CHECK (materiality IS NULL OR materiality IN ('minor','material','fundamental')),
  effective_from timestamptz,
  effective_to timestamptz,
  supersedes_id uuid REFERENCES public.strata_okr_versions(id) ON DELETE SET NULL,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (okr_id, version)
);
COMMENT ON TABLE public.strata_okr_versions IS
  'Versioned OKR definition envelope (CAT-STRATA-THEMEOKR-20260719-001). The head strata_okrs row is the stable identity; each definition change is a prospective new version. Approved/superseded versions are immutable.';
CREATE INDEX IF NOT EXISTS idx_strata_okr_versions_okr ON public.strata_okr_versions(okr_id, version DESC);

-- current_version_id FK (added after the versions table exists)
ALTER TABLE public.strata_okrs DROP CONSTRAINT IF EXISTS strata_okrs_current_version_fk;
ALTER TABLE public.strata_okrs ADD CONSTRAINT strata_okrs_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES public.strata_okr_versions(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_okr_versions_touch') THEN
    CREATE TRIGGER trg_strata_okr_versions_touch BEFORE UPDATE ON public.strata_okr_versions
      FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_okr_versions_audit') THEN
    CREATE TRIGGER trg_strata_okr_versions_audit AFTER INSERT OR UPDATE OR DELETE ON public.strata_okr_versions
      FOR EACH ROW EXECUTE FUNCTION public.strata_audit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_strata_okr_versions_guard') THEN
    -- approved/superseded versions are immutable except effective_to bookkeeping
    NULL;
  END IF;
END $$;

-- Immutability guard for approved/superseded OKR versions (prospective change only).
CREATE OR REPLACE FUNCTION public.strata_guard_okr_version() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('approved','superseded') THEN RAISE EXCEPTION 'CLOSED_LOCKED_MUTATION: approved OKR version cannot be deleted'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'approved' AND NEW.status = 'approved'
     AND (NEW.objective_statement, NEW.commitment, NEW.theme_id) IS DISTINCT FROM (OLD.objective_statement, OLD.commitment, OLD.theme_id) THEN
    RAISE EXCEPTION 'CLOSED_LOCKED_MUTATION: an approved OKR version is immutable — create a prospective new version';
  END IF;
  IF OLD.status = 'superseded' THEN
    RAISE EXCEPTION 'CLOSED_LOCKED_MUTATION: a superseded OKR version is immutable';
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_strata_okr_versions_guard ON public.strata_okr_versions;
CREATE TRIGGER trg_strata_okr_versions_guard BEFORE UPDATE OR DELETE ON public.strata_okr_versions
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_okr_version();

ALTER TABLE public.strata_okr_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_okr_versions_select ON public.strata_okr_versions FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_okr_versions_write ON public.strata_okr_versions FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office','okr_owner','kpi_owner']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','okr_owner','kpi_owner']));

-- ===========================================================================
-- 3. Authoritative OKR validator (reused by submit / approve / migration verify)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_okr_validate(p_okr uuid, p_stage text DEFAULT 'submit')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; kr_total int; kr_exception boolean; codes text[] := '{}';
BEGIN
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'codes', ARRAY['OKR_NOT_FOUND']); END IF;
  IF o.theme_id IS NULL THEN codes := array_append(codes, 'MISSING_THEME');
  ELSIF NOT EXISTS (SELECT 1 FROM public.strata_strategy_elements WHERE id = o.theme_id AND element_type='theme')
    THEN codes := array_append(codes, 'INVALID_THEME'); END IF;
  IF coalesce(btrim(o.objective_statement),'') = '' THEN codes := array_append(codes, 'MISSING_OBJECTIVE_STATEMENT'); END IF;
  IF o.owner_id IS NULL THEN codes := array_append(codes, 'MISSING_OWNER'); END IF;
  IF o.owning_org_unit_id IS NULL THEN codes := array_append(codes, 'MISSING_OWNING_ORG'); END IF;
  IF o.cycle_id IS NULL THEN codes := array_append(codes, 'MISSING_CYCLE'); END IF;
  IF coalesce(o.start_period_id, o.period_id) IS NULL THEN codes := array_append(codes, 'MISSING_START_PERIOD'); END IF;
  SELECT count(*) INTO kr_total FROM public.strata_key_results WHERE okr_id = p_okr;
  IF kr_total = 0 THEN codes := array_append(codes, 'NO_KEY_RESULTS');
  ELSIF kr_total < 2 OR kr_total > 4 THEN
    -- invariant 3: 2-4 normal; outside band requires a governed exception, never silent
    codes := array_append(codes, 'KR_COUNT_OUT_OF_BAND');
  END IF;
  RETURN jsonb_build_object('valid', array_length(codes,1) IS NULL, 'codes', codes, 'kr_count', kr_total, 'stage', p_stage);
END; $function$;
COMMENT ON FUNCTION public.strata_okr_validate(uuid, text) IS
  'Authoritative Theme-owned OKR validator (CAT-STRATA-THEMEOKR-20260719-001, invariants 1-3,7). Reused by submit/approve/migration verification. UI mirrors it for explanation only.';
GRANT EXECUTE ON FUNCTION public.strata_okr_validate(uuid, text) TO authenticated;

-- ===========================================================================
-- 4. Governed approval-gate lifecycle RPCs
-- ===========================================================================

-- create (Theme-owned; no child objective required)
CREATE OR REPLACE FUNCTION public.strata_create_okr_v2(
  p_theme uuid, p_name text, p_objective_statement text,
  p_cycle uuid DEFAULT NULL, p_owner uuid DEFAULT NULL, p_owning_org uuid DEFAULT NULL,
  p_commitment text DEFAULT 'committed', p_start_period uuid DEFAULT NULL, p_end_period uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_theme record; v_cycle uuid; v_okr uuid; v_ver uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kpi_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: creating an OKR requires strategy_office, okr_owner or admin'; END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'MISSING_NAME: OKR name is required'; END IF;
  IF p_objective_statement IS NULL OR btrim(p_objective_statement) = '' THEN
    RAISE EXCEPTION 'MISSING_OBJECTIVE_STATEMENT: a qualitative objective statement is required'; END IF;
  SELECT * INTO v_theme FROM public.strata_strategy_elements WHERE id = p_theme;
  IF v_theme.id IS NULL THEN RAISE EXCEPTION 'MISSING_THEME: theme not found'; END IF;
  IF v_theme.element_type <> 'theme' THEN
    RAISE EXCEPTION 'INVALID_THEME: an OKR must be created under a Strategic Theme, not a % element', v_theme.element_type; END IF;
  IF p_commitment IS NOT NULL AND p_commitment NOT IN ('committed','aspirational') THEN
    RAISE EXCEPTION 'INVALID_OKR: commitment must be committed|aspirational'; END IF;
  IF p_owning_org IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_org_units WHERE id = p_owning_org) THEN
    RAISE EXCEPTION 'INVALID_OKR: owning organisation unit not found'; END IF;
  v_cycle := COALESCE(p_cycle, v_theme.cycle_id);
  INSERT INTO public.strata_okrs
    (theme_id, name, objective_statement, cycle_id, owner_id, owning_org_unit_id, commitment,
     start_period_id, period_id, end_period_id, status)
  VALUES
    (p_theme, p_name, p_objective_statement, v_cycle, p_owner, p_owning_org, p_commitment,
     p_start_period, p_start_period, p_end_period, 'draft')
  RETURNING id INTO v_okr;
  INSERT INTO public.strata_okr_versions
    (okr_id, version, status, objective_statement, theme_id, cycle_id, start_period_id, end_period_id,
     commitment, owner_id, owning_org_unit_id)
  VALUES
    (v_okr, 1, 'draft', p_objective_statement, p_theme, v_cycle, p_start_period, p_end_period,
     p_commitment, p_owner, p_owning_org)
  RETURNING id INTO v_ver;
  UPDATE public.strata_okrs SET current_version_id = v_ver WHERE id = v_okr;
  RETURN v_okr;
END; $function$;
COMMENT ON FUNCTION public.strata_create_okr_v2(uuid,text,text,uuid,uuid,uuid,text,uuid,uuid) IS
  'Create a Theme-owned OKR (invariants 1,2). Preselects+locks the Theme; no child Strategy Objective/KPI required.';
GRANT EXECUTE ON FUNCTION public.strata_create_okr_v2(uuid,text,text,uuid,uuid,uuid,text,uuid,uuid) TO authenticated;

-- submit (draft -> submitted); validator must pass
CREATE OR REPLACE FUNCTION public.strata_submit_okr(p_okr uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner','kpi_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: submitting an OKR requires strategy_office or okr_owner'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> o.lock_version THEN
    RAISE EXCEPTION 'STALE_WRITE: OKR changed since load (expected %, got %)', p_lock_version, o.lock_version; END IF;
  IF o.status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a draft/rejected OKR can be submitted (current: %)', o.status; END IF;
  v := public.strata_okr_validate(p_okr, 'submit');
  IF NOT (v->>'valid')::boolean THEN
    RAISE EXCEPTION 'INVALID_OKR: cannot submit — %', (v->>'codes'); END IF;
  UPDATE public.strata_okrs
     SET status='submitted', submitted_at=now(), submitted_by=auth.uid(),
         rejected_at=NULL, rejected_by=NULL, rejection_reason=NULL,
         lock_version=lock_version+1, updated_at=now()
   WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_submit_okr(uuid,int) TO authenticated;

-- approve (submitted -> active); maker-checker SoD: approver <> submitter
CREATE OR REPLACE FUNCTION public.strata_approve_okr(p_okr uuid, p_lock_version int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; v jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_approver']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: approving an OKR requires the okr_approver or strategy_office role'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF p_lock_version IS NOT NULL AND p_lock_version <> o.lock_version THEN
    RAISE EXCEPTION 'STALE_WRITE: OKR changed since load'; END IF;
  IF o.status <> 'submitted' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a submitted OKR can be approved (current: %)', o.status; END IF;
  IF o.submitted_by IS NOT NULL AND o.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot approve their own OKR (maker-checker)'; END IF;
  v := public.strata_okr_validate(p_okr, 'approve');
  IF NOT (v->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_OKR: cannot approve — %', (v->>'codes'); END IF;
  UPDATE public.strata_okrs
     SET status='active', approved_at=now(), approved_by=auth.uid(),
         activated_at=now(), activated_by=auth.uid(), lock_version=lock_version+1, updated_at=now()
   WHERE id = p_okr;
  UPDATE public.strata_okr_versions
     SET status='approved', approved_by=auth.uid(), approved_at=now(),
         effective_from=COALESCE(effective_from, now())
   WHERE id = o.current_version_id AND status='draft';
END; $function$;
COMMENT ON FUNCTION public.strata_approve_okr(uuid,int) IS
  'Approve+activate a submitted OKR (D-1). Maker-checker: approver must differ from submitter (OWNER_SOD_CONFLICT).';
GRANT EXECUTE ON FUNCTION public.strata_approve_okr(uuid,int) TO authenticated;

-- reject (submitted -> rejected); SoD: rejecter <> submitter
CREATE OR REPLACE FUNCTION public.strata_reject_okr(p_okr uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_approver']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: rejecting an OKR requires the okr_approver or strategy_office role'; END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'INVALID_OKR: a rejection reason is required'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status <> 'submitted' THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a submitted OKR can be rejected (current: %)', o.status; END IF;
  IF o.submitted_by IS NOT NULL AND o.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'OWNER_SOD_CONFLICT: the submitter cannot decide their own OKR'; END IF;
  UPDATE public.strata_okrs
     SET status='rejected', rejected_at=now(), rejected_by=auth.uid(), rejection_reason=p_reason,
         lock_version=lock_version+1, updated_at=now()
   WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_reject_okr(uuid,text) TO authenticated;

-- withdraw (draft/submitted -> withdrawn)
CREATE OR REPLACE FUNCTION public.strata_withdraw_okr(p_okr uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: withdrawing an OKR requires strategy_office or okr_owner'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status NOT IN ('draft','submitted') THEN RAISE EXCEPTION 'INVALID_TRANSITION: only a draft/submitted OKR can be withdrawn (current: %)', o.status; END IF;
  UPDATE public.strata_okrs
     SET status='withdrawn', withdrawn_at=now(), withdrawn_by=auth.uid(),
         lock_version=lock_version+1, updated_at=now()
   WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_withdraw_okr(uuid,text) TO authenticated;

-- cancel (active -> cancelled; governed reason)
CREATE OR REPLACE FUNCTION public.strata_cancel_okr(p_okr uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: cancelling an OKR requires the strategy_office role'; END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'INVALID_OKR: a cancellation reason is required'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status NOT IN ('active','closing_review') THEN RAISE EXCEPTION 'INVALID_TRANSITION: only an active OKR can be cancelled (current: %)', o.status; END IF;
  UPDATE public.strata_okrs
     SET status='cancelled', cancelled_at=now(), cancelled_by=auth.uid(), cancellation_reason=p_reason,
         lock_version=lock_version+1, updated_at=now()
   WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_cancel_okr(uuid,text) TO authenticated;

-- version (approved/active OKR -> prospective draft vNext)
CREATE OR REPLACE FUNCTION public.strata_version_okr(
  p_okr uuid, p_objective_statement text, p_rationale text, p_materiality text DEFAULT 'material'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; cur record; v_next int; v_new uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','okr_owner']) THEN
    RAISE EXCEPTION 'STRATA_FORBIDDEN: versioning an OKR requires strategy_office or okr_owner'; END IF;
  IF p_rationale IS NULL OR btrim(p_rationale) = '' THEN RAISE EXCEPTION 'INVALID_OKR: a change rationale is required for a new version'; END IF;
  IF p_materiality NOT IN ('minor','material','fundamental') THEN RAISE EXCEPTION 'INVALID_OKR: materiality must be minor|material|fundamental'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.status NOT IN ('active','closing_review') THEN RAISE EXCEPTION 'INVALID_TRANSITION: only an active OKR can be re-versioned (current: %)', o.status; END IF;
  SELECT * INTO cur FROM public.strata_okr_versions WHERE id = o.current_version_id;
  SELECT COALESCE(max(version),0)+1 INTO v_next FROM public.strata_okr_versions WHERE okr_id = p_okr;
  INSERT INTO public.strata_okr_versions
    (okr_id, version, status, objective_statement, description, theme_id, cycle_id, start_period_id, end_period_id,
     commitment, owner_id, owning_org_unit_id, review_cadence, all_must_pass, weighting_policy,
     change_rationale, materiality, supersedes_id)
  VALUES
    (p_okr, v_next, 'draft', COALESCE(p_objective_statement, cur.objective_statement), cur.description,
     cur.theme_id, cur.cycle_id, cur.start_period_id, cur.end_period_id, cur.commitment, cur.owner_id,
     cur.owning_org_unit_id, cur.review_cadence, cur.all_must_pass, cur.weighting_policy,
     p_rationale, p_materiality, cur.id)
  RETURNING id INTO v_new;
  RETURN v_new;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_version_okr(uuid,text,text,text) TO authenticated;

-- ===========================================================================
-- 5. Legacy activation guard — theme-owned OKRs must use the approval gate.
--    (Redefines the live function; the original file 20260718009000 is untouched, so its
--     guard test still passes. Objective-linked legacy OKRs keep the direct path.)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.strata_activate_okr(p_okr uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE o record; kr_count int; missing text[] := '{}';
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'activating an OKR requires the strategy_office or admin role'; END IF;
  SELECT * INTO o FROM public.strata_okrs WHERE id = p_okr;
  IF o.id IS NULL THEN RAISE EXCEPTION 'OKR not found'; END IF;
  IF o.theme_id IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: a Theme-owned OKR is activated through submit -> approve (maker-checker), not direct activation';
  END IF;
  IF o.status <> 'draft' THEN RAISE EXCEPTION 'only a draft OKR can be activated (current: %)', o.status; END IF;
  IF o.owner_id IS NULL THEN missing := array_append(missing, 'accountable owner'); END IF;
  IF o.objective_element_id IS NULL THEN missing := array_append(missing, 'strategy objective link'); END IF;
  IF o.period_id IS NULL THEN missing := array_append(missing, 'period'); END IF;
  SELECT count(*) INTO kr_count FROM public.strata_key_results WHERE okr_id = p_okr;
  IF kr_count = 0 THEN missing := array_append(missing, 'at least one Key Result'); END IF;
  IF array_length(missing,1) > 0 THEN RAISE EXCEPTION 'cannot activate — missing: %', array_to_string(missing, '; '); END IF;
  UPDATE public.strata_okrs SET status='active', activated_at=now(), activated_by=auth.uid(), updated_at=now() WHERE id = p_okr;
END; $function$;
GRANT EXECUTE ON FUNCTION public.strata_activate_okr(uuid) TO authenticated;
