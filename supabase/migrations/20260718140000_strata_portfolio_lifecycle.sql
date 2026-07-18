-- CAT-STRATA-IMPL-20260712-001 · PB-DEF-007 · governed portfolio lifecycle
--
-- Replaces the active/archived-only status with a governed lifecycle:
--   draft → submitted → active(approved) → closed → archived   (+ cancelled from any pre-close state)
-- Owner mandatory before submission; submit and approve are separate authorized actions with SoD
-- (approver ≠ submitter); closure/cancellation require a reason + evidence; invalid transitions fail
-- server-side; every transition is audited with before/after. Status can now change ONLY through the
-- governed transition RPCs — the generic update no longer rewrites it.

-- 1) widen the state set (additive — existing active/archived rows stay valid)
ALTER TABLE public.strata_portfolios DROP CONSTRAINT IF EXISTS strata_portfolios_status_check;
ALTER TABLE public.strata_portfolios
  ADD CONSTRAINT strata_portfolios_status_check
  CHECK (status IN ('draft','submitted','active','closed','cancelled','archived'));

-- 2) transition provenance
ALTER TABLE public.strata_portfolios
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS closure_reason text,
  ADD COLUMN IF NOT EXISTS closure_evidence text,
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- 3) new portfolios begin as Draft (governed lifecycle), not immediately Active
CREATE OR REPLACE FUNCTION public.strata_create_portfolio(p_name text, p_description text DEFAULT NULL::text, p_category uuid DEFAULT NULL::uuid, p_owner uuid DEFAULT NULL::uuid, p_value_target numeric DEFAULT NULL::numeric)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'creating a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'portfolio name is required'; END IF;
  IF p_category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_value_categories WHERE id = p_category) THEN
    RAISE EXCEPTION 'value category not found';
  END IF;
  IF p_value_target IS NOT NULL AND p_value_target < 0 THEN
    RAISE EXCEPTION 'value target cannot be negative';
  END IF;

  INSERT INTO public.strata_portfolios (name, description, category_id, owner_id, value_target, status, created_by)
  VALUES (btrim(p_name), p_description, p_category, p_owner, p_value_target, 'draft', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, after, note)
  VALUES ('strata_portfolios', new_id, 'RPC:create_portfolio', auth.uid(),
          jsonb_build_object('status','draft'), format('portfolio "%s" created (draft)', btrim(p_name)));
  RETURN new_id;
END;
$function$;

-- 4) generic update no longer moves status — that is the lifecycle RPCs' job (append-only history)
CREATE OR REPLACE FUNCTION public.strata_update_portfolio(p_portfolio uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_category uuid DEFAULT NULL::uuid, p_owner uuid DEFAULT NULL::uuid, p_value_target numeric DEFAULT NULL::numeric, p_status text DEFAULT NULL::text, p_clear_owner boolean DEFAULT false, p_clear_category boolean DEFAULT false)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE pf record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'updating a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO pf FROM public.strata_portfolios WHERE id = p_portfolio;
  IF pf IS NULL THEN RAISE EXCEPTION 'portfolio not found'; END IF;
  IF p_status IS NOT NULL AND p_status IS DISTINCT FROM pf.status THEN
    RAISE EXCEPTION 'portfolio status changes go through the governed lifecycle actions (submit / approve / close / cancel / archive), not a direct edit';
  END IF;
  IF p_category IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.strata_value_categories WHERE id = p_category) THEN
    RAISE EXCEPTION 'value category not found';
  END IF;

  UPDATE public.strata_portfolios
     SET name = COALESCE(btrim(p_name), name),
         description = COALESCE(p_description, description),
         category_id = CASE WHEN p_clear_category THEN NULL ELSE COALESCE(p_category, category_id) END,
         owner_id = CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, owner_id) END,
         value_target = COALESCE(p_value_target, value_target),
         updated_at = now()
   WHERE id = p_portfolio;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_portfolios', p_portfolio, 'RPC:update_portfolio', auth.uid(), 'definition updated');
END;
$function$;

-- 5) governed transitions
CREATE OR REPLACE FUNCTION public.strata_submit_portfolio(p_portfolio uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pf record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'submitting a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO pf FROM public.strata_portfolios WHERE id = p_portfolio;
  IF pf.id IS NULL THEN RAISE EXCEPTION 'portfolio not found'; END IF;
  IF pf.status <> 'draft' THEN RAISE EXCEPTION 'only a draft portfolio can be submitted (current: %)', pf.status; END IF;
  IF pf.owner_id IS NULL THEN RAISE EXCEPTION 'a portfolio owner is required before submission'; END IF;
  UPDATE public.strata_portfolios SET status='submitted', submitted_by=auth.uid(), submitted_at=now(), updated_at=now() WHERE id=p_portfolio;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_portfolios', p_portfolio, 'RPC:submit_portfolio', auth.uid(),
          jsonb_build_object('status',pf.status), jsonb_build_object('status','submitted'), 'submitted for approval');
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_approve_portfolio(p_portfolio uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pf record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'approving a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO pf FROM public.strata_portfolios WHERE id = p_portfolio;
  IF pf.id IS NULL THEN RAISE EXCEPTION 'portfolio not found'; END IF;
  IF pf.status <> 'submitted' THEN RAISE EXCEPTION 'only a submitted portfolio can be approved (current: %)', pf.status; END IF;
  IF pf.submitted_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the approver must differ from the submitter';
  END IF;
  UPDATE public.strata_portfolios SET status='active', approved_by=auth.uid(), approved_at=now(), updated_at=now() WHERE id=p_portfolio;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_portfolios', p_portfolio, 'RPC:approve_portfolio', auth.uid(),
          jsonb_build_object('status',pf.status), jsonb_build_object('status','active'), 'approved and activated');
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_close_portfolio(p_portfolio uuid, p_reason text, p_evidence text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pf record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'closing a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO pf FROM public.strata_portfolios WHERE id = p_portfolio;
  IF pf.id IS NULL THEN RAISE EXCEPTION 'portfolio not found'; END IF;
  IF pf.status <> 'active' THEN RAISE EXCEPTION 'only an active portfolio can be closed (current: %)', pf.status; END IF;
  IF p_reason IS NULL OR btrim(p_reason)='' THEN RAISE EXCEPTION 'closure requires a reason'; END IF;
  IF p_evidence IS NULL OR btrim(p_evidence)='' THEN RAISE EXCEPTION 'closure requires evidence'; END IF;
  UPDATE public.strata_portfolios
     SET status='closed', closure_reason=btrim(p_reason), closure_evidence=btrim(p_evidence),
         closed_by=auth.uid(), closed_at=now(), updated_at=now()
   WHERE id=p_portfolio;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_portfolios', p_portfolio, 'RPC:close_portfolio', auth.uid(),
          jsonb_build_object('status',pf.status), jsonb_build_object('status','closed','reason',btrim(p_reason)),
          format('closed: %s', btrim(p_reason)));
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_cancel_portfolio(p_portfolio uuid, p_reason text, p_evidence text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pf record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'cancelling a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO pf FROM public.strata_portfolios WHERE id = p_portfolio;
  IF pf.id IS NULL THEN RAISE EXCEPTION 'portfolio not found'; END IF;
  IF pf.status NOT IN ('draft','submitted','active') THEN RAISE EXCEPTION 'a % portfolio cannot be cancelled', pf.status; END IF;
  IF p_reason IS NULL OR btrim(p_reason)='' THEN RAISE EXCEPTION 'cancellation requires a reason'; END IF;
  IF p_evidence IS NULL OR btrim(p_evidence)='' THEN RAISE EXCEPTION 'cancellation requires evidence'; END IF;
  UPDATE public.strata_portfolios
     SET status='cancelled', closure_reason=btrim(p_reason), closure_evidence=btrim(p_evidence),
         closed_by=auth.uid(), closed_at=now(), updated_at=now()
   WHERE id=p_portfolio;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_portfolios', p_portfolio, 'RPC:cancel_portfolio', auth.uid(),
          jsonb_build_object('status',pf.status), jsonb_build_object('status','cancelled','reason',btrim(p_reason)),
          format('cancelled: %s', btrim(p_reason)));
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_archive_portfolio(p_portfolio uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pf record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'archiving a portfolio requires strategy_office, vmo_validator or admin role';
  END IF;
  SELECT * INTO pf FROM public.strata_portfolios WHERE id = p_portfolio;
  IF pf.id IS NULL THEN RAISE EXCEPTION 'portfolio not found'; END IF;
  IF pf.status NOT IN ('active','closed','cancelled') THEN RAISE EXCEPTION 'a % portfolio cannot be archived', pf.status; END IF;
  UPDATE public.strata_portfolios SET status='archived', updated_at=now() WHERE id=p_portfolio;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after, note)
  VALUES ('strata_portfolios', p_portfolio, 'RPC:archive_portfolio', auth.uid(),
          jsonb_build_object('status',pf.status), jsonb_build_object('status','archived'), 'archived');
END;
$$;

GRANT EXECUTE ON FUNCTION public.strata_submit_portfolio(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_approve_portfolio(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_close_portfolio(uuid, text, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_cancel_portfolio(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_archive_portfolio(uuid) TO authenticated;
