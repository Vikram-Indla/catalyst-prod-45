-- CAT-STRATA-E2E-FIXES-20260711-001 — defect STRATA-E2E-006.
--
-- Project Cards could author Milestones and Dependencies but had no structured
-- Risk entity (only a free-text summary) and no standalone Blocker path. This
-- adds a first-class strata_risks table scoped to a Project Card, with a
-- standard likelihood × impact matrix + status, RLS mirroring strata_dependencies,
-- and create/update/delete RPCs following the strata authoring pattern.
--
-- Standalone Blockers need NO new schema: strata_dependencies.is_blocker already
-- models them; the UI adds a "New blocker" entry point that pre-sets is_blocker.

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE public.strata_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  project_card_id uuid NOT NULL REFERENCES public.strata_project_cards(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  -- Standard 3-band risk matrix; NULL = not yet assessed (zero-assumption).
  likelihood text CHECK (likelihood IS NULL OR likelihood IN ('low','medium','high')),
  impact text CHECK (impact IS NULL OR impact IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigating','accepted','closed')),
  owner_id uuid,
  mitigation text,
  target_resolution_date date,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_risks_project ON public.strata_risks (project_card_id, status);

COMMENT ON TABLE public.strata_risks IS
  'Structured project-card risks (STRATA-E2E-006). Likelihood × impact matrix + status; owned per card.';

-- ── RLS (mirrors strata_dependencies) ────────────────────────────────────────
ALTER TABLE public.strata_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY strata_risks_select ON public.strata_risks
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY strata_risks_write ON public.strata_risks
  FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']));

-- ── RPCs ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_create_risk(
  p_project uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_likelihood text DEFAULT NULL,
  p_impact text DEFAULT NULL,
  p_status text DEFAULT 'open',
  p_owner uuid DEFAULT NULL,
  p_mitigation text DEFAULT NULL,
  p_target_date date DEFAULT NULL
) RETURNS uuid
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating a risk requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'risk title is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_project_cards WHERE id = p_project) THEN
    RAISE EXCEPTION 'project card not found';
  END IF;

  INSERT INTO public.strata_risks
    (project_card_id, title, description, likelihood, impact, status, owner_id, mitigation, target_resolution_date, created_by)
  VALUES
    (p_project, btrim(p_title), p_description, p_likelihood, p_impact, COALESCE(p_status,'open'), p_owner, p_mitigation, p_target_date, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_risks', new_id, 'RPC:create_risk', auth.uid(),
          format('risk "%s" created on %s', btrim(p_title), public.strata_entity_name('project_card', p_project)));
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.strata_update_risk(
  p_risk uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_likelihood text DEFAULT NULL,
  p_impact text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_mitigation text DEFAULT NULL,
  p_target_date date DEFAULT NULL,
  p_clear_owner boolean DEFAULT false
) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating a risk requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_risks WHERE id = p_risk) THEN
    RAISE EXCEPTION 'risk not found';
  END IF;

  UPDATE public.strata_risks
     SET title = COALESCE(NULLIF(btrim(p_title), ''), title),
         description = COALESCE(p_description, description),
         likelihood = COALESCE(p_likelihood, likelihood),
         impact = COALESCE(p_impact, impact),
         status = COALESCE(p_status, status),
         owner_id = CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, owner_id) END,
         mitigation = COALESCE(p_mitigation, mitigation),
         target_resolution_date = COALESCE(p_target_date, target_resolution_date),
         updated_at = now()
   WHERE id = p_risk;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_risks', p_risk, 'RPC:update_risk', auth.uid(), 'risk updated');
END;
$function$;

CREATE OR REPLACE FUNCTION public.strata_delete_risk(p_risk uuid)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'deleting a risk requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  DELETE FROM public.strata_risks WHERE id = p_risk;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_risks', p_risk, 'RPC:delete_risk', auth.uid(), 'risk deleted');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_create_risk(uuid,text,text,text,text,text,uuid,text,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_update_risk(uuid,text,text,text,text,text,uuid,text,date,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_delete_risk(uuid) TO authenticated;
