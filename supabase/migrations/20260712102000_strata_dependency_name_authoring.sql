-- V3-OPEN-006 · Dependency Name is authored/edited distinctly from Description.
-- strata_dependencies gained a `name` column (20260706200000) but the interactive
-- create/update RPCs never wrote it — the UI collapsed name into description, so
-- the name was silently dropped and unavailable in edit. These redefinitions add
-- a p_name parameter (appended, DEFAULT NULL so every existing named-arg caller is
-- unaffected) and wire it to the name column. Mirrors the current canonical defs
-- in 20260706191000_strata_execution_reconciliation_rpcs.sql, adding only p_name.

DROP FUNCTION IF EXISTS public.strata_create_dependency(text,uuid,text,uuid,text,text,date,int,text,boolean,text,text,uuid,date,date,text,text,text);

CREATE FUNCTION public.strata_create_dependency(
  p_requesting_type text,
  p_requesting_id uuid,
  p_serving_type text,
  p_serving_id uuid DEFAULT NULL,
  p_serving_label text DEFAULT NULL,
  p_dependency_type text DEFAULT 'delivery',
  p_due_date date DEFAULT NULL,
  p_sla_days int DEFAULT NULL,
  p_impact text DEFAULT NULL,
  p_is_blocker boolean DEFAULT false,
  p_status text DEFAULT 'open',
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_source_system text DEFAULT NULL,
  p_source_reference_key text DEFAULT NULL,
  p_source_issue_id text DEFAULT NULL,
  p_name text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'creating a dependency requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  IF p_requesting_type NOT IN ('initiative','project_card') THEN
    RAISE EXCEPTION 'requesting type must be initiative | project_card';
  END IF;
  IF NOT public.strata_entity_exists(p_requesting_type, p_requesting_id) THEN
    RAISE EXCEPTION '% (requesting) not found', p_requesting_type;
  END IF;
  IF p_serving_type NOT IN ('initiative','project_card','external') THEN
    RAISE EXCEPTION 'serving type must be initiative | project_card | external';
  END IF;
  IF p_serving_type = 'external' THEN
    IF p_serving_label IS NULL OR btrim(p_serving_label) = '' THEN
      RAISE EXCEPTION 'external dependencies require a serving label';
    END IF;
  ELSE
    IF p_serving_id IS NULL OR NOT public.strata_entity_exists(p_serving_type, p_serving_id) THEN
      RAISE EXCEPTION '% (serving) not found', p_serving_type;
    END IF;
  END IF;
  IF p_dependency_type NOT IN ('delivery','data','decision','resource','external') THEN
    RAISE EXCEPTION 'dependency type must be delivery | data | decision | resource | external';
  END IF;
  IF p_status NOT IN ('open','at_risk','blocked','resolved','cancelled') THEN
    RAISE EXCEPTION 'status must be open | at_risk | blocked | resolved | cancelled';
  END IF;
  IF p_sla_days IS NOT NULL AND p_sla_days < 0 THEN RAISE EXCEPTION 'SLA days cannot be negative'; END IF;
  IF p_baseline_start IS NOT NULL AND p_baseline_end IS NOT NULL AND p_baseline_end < p_baseline_start THEN
    RAISE EXCEPTION 'baseline end cannot precede baseline start';
  END IF;

  INSERT INTO public.strata_dependencies
    (requesting_type, requesting_id, serving_type, serving_id, serving_label,
     dependency_type, due_date, status, sla_days, impact, is_blocker, created_by,
     description, owner_id, baseline_start, baseline_end, source_system, source_reference_key, source_issue_id,
     name)
  VALUES
    (p_requesting_type, p_requesting_id, p_serving_type, p_serving_id, p_serving_label,
     p_dependency_type, p_due_date, p_status, p_sla_days, p_impact, COALESCE(p_is_blocker, false), auth.uid(),
     p_description, p_owner, p_baseline_start, p_baseline_end, p_source_system, p_source_reference_key, p_source_issue_id,
     NULLIF(btrim(p_name), ''))
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_dependencies', new_id, 'RPC:create_dependency', auth.uid(),
          format('%s dependency for %s "%s"%s', p_dependency_type, p_requesting_type,
                 public.strata_entity_name(p_requesting_type, p_requesting_id),
                 CASE WHEN COALESCE(p_is_blocker,false) THEN ' · BLOCKER' ELSE '' END));
  RETURN new_id;
END;
$$;

DROP FUNCTION IF EXISTS public.strata_update_dependency(uuid,text,date,int,text,boolean,text,text,uuid,date,date,text,text,text,boolean);

CREATE FUNCTION public.strata_update_dependency(
  p_dependency uuid,
  p_status text DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_sla_days int DEFAULT NULL,
  p_impact text DEFAULT NULL,
  p_is_blocker boolean DEFAULT NULL,
  p_serving_label text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_owner uuid DEFAULT NULL,
  p_baseline_start date DEFAULT NULL,
  p_baseline_end date DEFAULT NULL,
  p_source_system text DEFAULT NULL,
  p_source_reference_key text DEFAULT NULL,
  p_source_issue_id text DEFAULT NULL,
  p_clear_owner boolean DEFAULT false,
  p_name text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dep record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward']) THEN
    RAISE EXCEPTION 'updating a dependency requires strategy_office, vmo_validator, data_steward or admin role';
  END IF;
  SELECT * INTO dep FROM public.strata_dependencies WHERE id = p_dependency;
  IF dep IS NULL THEN RAISE EXCEPTION 'dependency not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open','at_risk','blocked','resolved','cancelled') THEN
    RAISE EXCEPTION 'status must be open | at_risk | blocked | resolved | cancelled';
  END IF;
  IF p_sla_days IS NOT NULL AND p_sla_days < 0 THEN RAISE EXCEPTION 'SLA days cannot be negative'; END IF;

  UPDATE public.strata_dependencies
     SET status = COALESCE(p_status, status),
         due_date = COALESCE(p_due_date, due_date),
         sla_days = COALESCE(p_sla_days, sla_days),
         impact = COALESCE(p_impact, impact),
         is_blocker = COALESCE(p_is_blocker, is_blocker),
         serving_label = COALESCE(p_serving_label, serving_label),
         description = COALESCE(p_description, description),
         name = COALESCE(NULLIF(btrim(p_name), ''), name),
         owner_id = CASE WHEN p_clear_owner THEN NULL ELSE COALESCE(p_owner, owner_id) END,
         baseline_start = COALESCE(p_baseline_start, baseline_start),
         baseline_end = COALESCE(p_baseline_end, baseline_end),
         source_system = COALESCE(p_source_system, source_system),
         source_reference_key = COALESCE(p_source_reference_key, source_reference_key),
         source_issue_id = COALESCE(p_source_issue_id, source_issue_id),
         updated_at = now()
   WHERE id = p_dependency;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_dependencies', p_dependency, 'RPC:update_dependency', auth.uid(),
          concat_ws(' · ',
            CASE WHEN p_status IS NOT NULL THEN format('status → %s', p_status) END,
            CASE WHEN p_is_blocker IS NOT NULL THEN format('blocker → %s', p_is_blocker) END,
            'updated'));
END;
$$;
