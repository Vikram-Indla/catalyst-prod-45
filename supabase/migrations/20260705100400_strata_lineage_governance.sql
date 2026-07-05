-- ============================================================================
-- STRATA R1c/R4 — Data lineage pipeline + Governance (snapshots, decisions)
-- CAT-STRATA-20260705-001 · Blueprint §11, §19, §21 · Flow 1
-- Source → run → staging → validation → attestation → canonical write →
-- calculation → snapshot lock → decision evidence. Snapshots are INSERT-only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Data sources (must be registered before feeding approved KPIs — §19)
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  system_type text NOT NULL CHECK (system_type IN ('excel','jira','manual','api','erp','bi')),
  owner_id uuid,
  refresh_cadence text,
  expected_fields jsonb,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','active','suspended','retired')),
  health text, -- connector health band key (computed server-side)
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Upload runs (run ID, raw retention, counts, status machine — §19/§22)
-- ---------------------------------------------------------------------------

CREATE SEQUENCE public.strata_run_seq;

CREATE TABLE public.strata_upload_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key text NOT NULL UNIQUE DEFAULT ('RUN-' || nextval('public.strata_run_seq')::text),
  data_source_id uuid REFERENCES public.strata_data_sources(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.strata_upload_templates(id) ON DELETE SET NULL,
  template_version int,
  channel text NOT NULL DEFAULT 'excel' CHECK (channel IN ('excel','manual','jira','api')),
  initiated_by uuid DEFAULT auth.uid(),
  storage_path text,     -- raw file retained in storage bucket
  file_name text,
  file_hash text,        -- sha256 of the raw payload
  row_count_raw int NOT NULL DEFAULT 0,
  row_count_valid int NOT NULL DEFAULT 0,
  row_count_rejected int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded','staging','validating','pending_attestation','writing','calculating','completed','failed','quarantined'
  )),
  error_summary text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_upload_runs IS 'Every ingestion run: raw reference, hash, counts, status machine (Flow 1).';
CREATE INDEX idx_strata_runs_source ON public.strata_upload_runs (data_source_id, started_at DESC);

CREATE TABLE public.strata_staging_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_run_id uuid NOT NULL REFERENCES public.strata_upload_runs(id) ON DELETE CASCADE,
  row_number int NOT NULL,
  raw jsonb NOT NULL,
  target_entity text,
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','valid','rejected','quarantined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (upload_run_id, row_number)
);

CREATE TABLE public.strata_validation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_run_id uuid NOT NULL REFERENCES public.strata_upload_runs(id) ON DELETE CASCADE,
  staging_row_id uuid REFERENCES public.strata_staging_rows(id) ON DELETE CASCADE,
  field_name text,
  error_code text NOT NULL,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('error','warning')),
  message text NOT NULL,
  suggested_fix text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_validation_run ON public.strata_validation_results (upload_run_id, severity);

-- Canonical-write provenance (every accepted value points back to run + row)
CREATE TABLE public.strata_lineage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  upload_run_id uuid REFERENCES public.strata_upload_runs(id) ON DELETE SET NULL,
  staging_row_id uuid REFERENCES public.strata_staging_rows(id) ON DELETE SET NULL,
  written_by uuid,
  written_at timestamptz NOT NULL DEFAULT now(),
  config_context jsonb, -- config/template versions active at write time
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_lineage_entity ON public.strata_lineage_records (entity_table, entity_id);

-- ---------------------------------------------------------------------------
-- Calculated values (provenance-carrying results — §20)
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_calculated_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,  -- 'kpi' | 'scorecard_line' | 'scorecard_instance' | 'perspective' | 'benefit' | 'portfolio' | 'project_card'
  entity_id uuid NOT NULL,
  period_id uuid REFERENCES public.strata_periods(id) ON DELETE CASCADE,
  metric_key text NOT NULL,   -- 'achievement_pct' | 'score' | 'ytd' | 'realization_index' | 'value_at_risk' | 'execution_progress' | …
  value numeric,
  score numeric,
  status_key text,            -- threshold band key (org-configured), e.g. 'green'
  formula_version text,
  inputs jsonb,
  source_run_ids uuid[],
  config_context jsonb,       -- {threshold_scheme_id, model_id, model_version, …}
  confidence numeric(4,3),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculated_by text NOT NULL DEFAULT 'strata_calc_engine',
  snapshot_id uuid,           -- set when frozen into a snapshot
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_calc_entity ON public.strata_calculated_values (entity_type, entity_id, period_id, metric_key, calculated_at DESC);
COMMENT ON TABLE public.strata_calculated_values IS
  'Every executive number: value + score + band + formula version + inputs + source runs + config context (blueprint §20). UI never computes.';

-- ---------------------------------------------------------------------------
-- Snapshots (immutable evidence bundles — §11/§21) + decisions + actions
-- ---------------------------------------------------------------------------

CREATE SEQUENCE public.strata_snapshot_seq;
CREATE SEQUENCE public.strata_decision_seq;
CREATE SEQUENCE public.strata_action_seq;

CREATE TABLE public.strata_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_key text NOT NULL UNIQUE DEFAULT ('SNAP-' || nextval('public.strata_snapshot_seq')::text),
  organization_id uuid,
  cycle_id uuid REFERENCES public.strata_cycles(id) ON DELETE SET NULL,
  period_id uuid REFERENCES public.strata_periods(id) ON DELETE SET NULL,
  name text NOT NULL,
  scope jsonb,                 -- what was frozen (instance ids, portfolio ids…)
  config_versions jsonb,       -- config records + versions active at lock time
  data_run_ids uuid[],         -- upload runs feeding the frozen numbers
  created_by uuid DEFAULT auth.uid(),
  approved_by uuid,
  locked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'locked' CHECK (status IN ('locked','superseded')),
  superseded_by_id uuid REFERENCES public.strata_snapshots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_snapshots IS
  'Locked review evidence. INSERT-only for clients; supersession happens via strata_supersede_snapshot RPC and creates a NEW snapshot.';

CREATE TABLE public.strata_snapshot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.strata_snapshots(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL,      -- frozen values incl. provenance
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_snapshot_items ON public.strata_snapshot_items (snapshot_id, entity_type);

CREATE TABLE public.strata_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_key text NOT NULL UNIQUE DEFAULT ('DEC-' || nextval('public.strata_decision_seq')::text),
  organization_id uuid,
  forum text,                  -- e.g. 'Quarterly Business Review'
  snapshot_id uuid REFERENCES public.strata_snapshots(id) ON DELETE SET NULL,
  decision_type text NOT NULL DEFAULT 'governance' CHECK (decision_type IN ('governance','gate','escalation','action_only')),
  title text NOT NULL,
  description text,
  owner_id uuid,
  decided_by uuid,
  decided_at timestamptz,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','decided','closed')),
  evidence_refs jsonb,         -- linked evidence objects
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.strata_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key text NOT NULL UNIQUE DEFAULT ('ACT-' || nextval('public.strata_action_seq')::text),
  decision_id uuid REFERENCES public.strata_decisions(id) ON DELETE CASCADE,
  title text NOT NULL,
  owner_id uuid,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  note text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.strata_board_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.strata_snapshots(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('pdf','pptx')),
  storage_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','ready','failed')),
  generated_by uuid,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.strata_board_packs IS 'Exported board packs reconcile to snapshot_key (Q7: PDF + PPTX).';

-- ---------------------------------------------------------------------------
-- AI advisory outputs (advisory-only, provenance-carrying — §13)
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_ai_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case text NOT NULL CHECK (use_case IN ('narrative','variance_explanation','anomaly','data_quality','value_leakage','scenario','qa')),
  entity_refs jsonb,           -- [{entity_type, entity_id}]
  snapshot_id uuid REFERENCES public.strata_snapshots(id) ON DELETE SET NULL,
  config_context jsonb,
  uses_live_data boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  cited_evidence jsonb,
  confidence numeric(4,3),
  model text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  human_review_status text NOT NULL DEFAULT 'pending' CHECK (human_review_status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_ai_review_sod CHECK (reviewed_by IS NULL OR reviewed_by <> created_by)
);
COMMENT ON TABLE public.strata_ai_outputs IS
  'AI is advisory only: outputs carry provenance + live/locked flag + human review. Nothing here mutates governed data.';

-- ---------------------------------------------------------------------------
-- Deferred FKs
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_kpis
  ADD CONSTRAINT strata_kpis_source_fk FOREIGN KEY (data_source_id) REFERENCES public.strata_data_sources(id) ON DELETE SET NULL;
ALTER TABLE public.strata_kpi_actuals
  ADD CONSTRAINT strata_actuals_run_fk FOREIGN KEY (upload_run_id) REFERENCES public.strata_upload_runs(id) ON DELETE SET NULL,
  ADD CONSTRAINT strata_actuals_row_fk FOREIGN KEY (staging_row_id) REFERENCES public.strata_staging_rows(id) ON DELETE SET NULL;
ALTER TABLE public.strata_benefit_values
  ADD CONSTRAINT strata_benefit_values_run_fk FOREIGN KEY (upload_run_id) REFERENCES public.strata_upload_runs(id) ON DELETE SET NULL;
ALTER TABLE public.strata_scorecard_instances
  ADD CONSTRAINT strata_instances_snapshot_fk FOREIGN KEY (locked_snapshot_id) REFERENCES public.strata_snapshots(id) ON DELETE SET NULL;
ALTER TABLE public.strata_gate_instances
  ADD CONSTRAINT strata_gates_decision_fk FOREIGN KEY (decision_id) REFERENCES public.strata_decisions(id) ON DELETE SET NULL;
ALTER TABLE public.strata_calculated_values
  ADD CONSTRAINT strata_calc_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES public.strata_snapshots(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Governance RPCs: gate decision, snapshot lock/supersede, period close guard
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strata_decide_gate(p_gate uuid, p_verdict text, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g record; stage record; subj_owner uuid; new_decision uuid;
BEGIN
  SELECT * INTO g FROM public.strata_gate_instances WHERE id = p_gate;
  IF g IS NULL THEN RAISE EXCEPTION 'gate instance not found'; END IF;
  IF g.status = 'decided' THEN RAISE EXCEPTION 'gate already decided'; END IF;
  SELECT * INTO stage FROM public.strata_gate_model_stages WHERE id = g.stage_id;
  IF NOT (p_verdict = ANY (stage.decision_options)) THEN
    RAISE EXCEPTION 'verdict % is not a configured decision option for this stage', p_verdict;
  END IF;
  IF NOT public.strata_has_role(stage.approval_roles) THEN
    RAISE EXCEPTION 'gate decision requires one of the configured approval roles';
  END IF;
  -- SoD: the owner of the gated subject cannot decide its gate
  subj_owner := CASE g.subject_type
    WHEN 'initiative'   THEN (SELECT owner_id FROM public.strata_initiatives WHERE id = g.subject_id)
    WHEN 'project_card' THEN (SELECT pm_id    FROM public.strata_project_cards WHERE id = g.subject_id)
    WHEN 'benefit'      THEN (SELECT owner_id FROM public.strata_benefits WHERE id = g.subject_id)
  END;
  IF subj_owner IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the subject owner cannot decide their own gate';
  END IF;
  INSERT INTO public.strata_decisions (forum, decision_type, title, description, owner_id, decided_by, decided_at, status, evidence_refs)
  VALUES ('Value Gate', 'gate',
          format('Gate %s: %s', stage.name, p_verdict),
          p_note, subj_owner, auth.uid(), now(), 'decided',
          jsonb_build_array(jsonb_build_object('entity_type','gate_instance','entity_id',p_gate)))
  RETURNING id INTO new_decision;
  UPDATE public.strata_gate_instances
     SET status = 'decided', verdict = p_verdict, verdict_note = p_note,
         decided_by = auth.uid(), decided_at = now(), decision_id = new_decision, updated_at = now()
   WHERE id = p_gate;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_gate_instances', p_gate, 'RPC:decide_gate', auth.uid(), p_verdict);
  RETURN new_decision;
END;
$$;

-- Snapshot lock: freezes current calculated values for the given scorecard
-- instances + benefit/portfolio metrics, stamps config versions + data runs.
CREATE OR REPLACE FUNCTION public.strata_lock_snapshot(
  p_name text,
  p_cycle uuid,
  p_period uuid,
  p_instance_ids uuid[] DEFAULT NULL,
  p_scope jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE snap uuid; runs uuid[]; cfg jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'locking a snapshot requires strategy_office or admin role';
  END IF;
  -- Data runs feeding validated actuals in this period
  SELECT COALESCE(array_agg(DISTINCT a.upload_run_id) FILTER (WHERE a.upload_run_id IS NOT NULL), '{}')
    INTO runs
    FROM public.strata_kpi_actuals a
   WHERE a.period_id = p_period AND a.validation_status = 'validated';
  -- Active config versions at lock time
  SELECT jsonb_build_object(
    'perspectives',      (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_perspectives WHERE status = 'approved'),
    'threshold_schemes', (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_threshold_schemes WHERE status = 'approved'),
    'scorecard_models',  (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_scorecard_models WHERE status = 'approved')
  ) INTO cfg;
  INSERT INTO public.strata_snapshots (name, cycle_id, period_id, scope, config_versions, data_run_ids, created_by, approved_by)
  VALUES (p_name, p_cycle, p_period,
          COALESCE(p_scope, jsonb_build_object('instance_ids', to_jsonb(COALESCE(p_instance_ids, '{}'::uuid[])))),
          cfg, runs, auth.uid(), auth.uid())
  RETURNING id INTO snap;
  -- Freeze the latest calculated values for the period
  INSERT INTO public.strata_snapshot_items (snapshot_id, entity_type, entity_id, payload)
  SELECT snap, cv.entity_type, cv.entity_id,
         to_jsonb(cv) - 'id' - 'snapshot_id'
    FROM public.strata_calculated_values cv
   WHERE cv.period_id = p_period
     AND cv.calculated_at = (
       SELECT max(cv2.calculated_at) FROM public.strata_calculated_values cv2
        WHERE cv2.entity_type = cv.entity_type AND cv2.entity_id = cv.entity_id
          AND cv2.period_id = cv.period_id AND cv2.metric_key = cv.metric_key
     );
  UPDATE public.strata_calculated_values SET snapshot_id = snap
   WHERE period_id = p_period AND snapshot_id IS NULL;
  -- Lock the scorecard instances in scope
  IF p_instance_ids IS NOT NULL THEN
    UPDATE public.strata_scorecard_instances
       SET status = 'locked', locked_snapshot_id = snap, updated_at = now()
     WHERE id = ANY (p_instance_ids);
  END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_snapshots', snap, 'RPC:lock_snapshot', auth.uid(), p_name);
  RETURN snap;
END;
$$;

-- Supersede: never edits the old snapshot; links old → new.
CREATE OR REPLACE FUNCTION public.strata_supersede_snapshot(p_old uuid, p_new uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'superseding a snapshot requires strategy_office or admin role';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'a supersession reason is mandatory';
  END IF;
  UPDATE public.strata_snapshots SET status = 'superseded', superseded_by_id = p_new WHERE id = p_old AND status = 'locked';
  IF NOT FOUND THEN RAISE EXCEPTION 'old snapshot not found or not locked'; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_snapshots', p_old, 'RPC:supersede_snapshot', auth.uid(), p_reason);
END;
$$;

-- Period close guard (§12: cannot close with critical validation errors unless overridden)
CREATE OR REPLACE FUNCTION public.strata_close_period(p_period uuid, p_override boolean DEFAULT false, p_override_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pending int; errors int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'closing a period requires strategy_office or admin role';
  END IF;
  SELECT count(*) INTO pending FROM public.strata_kpi_actuals
   WHERE period_id = p_period AND validation_status = 'pending';
  SELECT count(*) INTO errors FROM public.strata_validation_results vr
   JOIN public.strata_upload_runs r ON r.id = vr.upload_run_id
   WHERE vr.severity = 'error' AND r.status NOT IN ('completed','failed','quarantined');
  IF (pending > 0 OR errors > 0) AND NOT p_override THEN
    RAISE EXCEPTION 'period close blocked: % pending attestations, % open validation errors (override requires reason)', pending, errors;
  END IF;
  IF p_override AND (p_override_reason IS NULL OR length(trim(p_override_reason)) = 0) THEN
    RAISE EXCEPTION 'override requires a reason';
  END IF;
  UPDATE public.strata_periods SET close_status = 'closed', closed_by = auth.uid(), closed_at = now(), updated_at = now()
   WHERE id = p_period;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_periods', p_period, 'RPC:close_period', auth.uid(),
          CASE WHEN p_override THEN 'OVERRIDE: ' || p_override_reason ELSE 'clean close' END);
END;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  EXECUTE 'CREATE TRIGGER trg_strata_data_sources_slug BEFORE INSERT ON public.strata_data_sources FOR EACH ROW EXECUTE FUNCTION public.strata_generate_slug()';
  FOREACH t IN ARRAY ARRAY[
    'strata_data_sources','strata_upload_runs','strata_staging_rows','strata_decisions','strata_actions','strata_board_packs','strata_ai_outputs'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at()', t, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'strata_data_sources','strata_upload_runs','strata_decisions','strata_actions','strata_board_packs','strata_ai_outputs','strata_snapshots'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['strata_data_sources'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %1$s_select ON public.%1$I FOR SELECT USING (public.current_user_is_approved())', t);
    EXECUTE format($p$
      CREATE POLICY %1$s_write ON public.%1$I FOR ALL
        USING (public.strata_has_role(ARRAY['data_steward','strategy_office']))
        WITH CHECK (public.strata_has_role(ARRAY['data_steward','strategy_office']))
    $p$, t);
  END LOOP;
END $$;

ALTER TABLE public.strata_upload_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_runs_select ON public.strata_upload_runs FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_runs_insert ON public.strata_upload_runs FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['data_steward','kpi_owner','strategy_office']) AND initiated_by = auth.uid());
CREATE POLICY strata_runs_update ON public.strata_upload_runs FOR UPDATE
  USING (initiated_by = auth.uid() OR public.strata_is_admin())
  WITH CHECK (true);

ALTER TABLE public.strata_staging_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_staging_select ON public.strata_staging_rows FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_staging_write ON public.strata_staging_rows FOR ALL
  USING (EXISTS (SELECT 1 FROM public.strata_upload_runs r WHERE r.id = upload_run_id
                 AND (r.initiated_by = auth.uid() OR public.strata_is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.strata_upload_runs r WHERE r.id = upload_run_id
                      AND (r.initiated_by = auth.uid() OR public.strata_is_admin())));

ALTER TABLE public.strata_validation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_vr_select ON public.strata_validation_results FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_vr_insert ON public.strata_validation_results FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.strata_upload_runs r WHERE r.id = upload_run_id
                      AND (r.initiated_by = auth.uid() OR public.strata_is_admin())));

ALTER TABLE public.strata_lineage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_lineage_select ON public.strata_lineage_records FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_lineage_insert ON public.strata_lineage_records FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['data_steward','kpi_owner','strategy_office']));
-- No UPDATE/DELETE policies: lineage is immutable.

ALTER TABLE public.strata_calculated_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_calc_select ON public.strata_calculated_values FOR SELECT
  USING (public.current_user_is_approved());
-- No client INSERT/UPDATE/DELETE policies: rows are produced only by SECURITY DEFINER calc RPCs.

ALTER TABLE public.strata_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_snapshots_select ON public.strata_snapshots FOR SELECT
  USING (public.current_user_is_approved());
-- No client INSERT/UPDATE/DELETE policies: snapshots are created/superseded only via RPCs. Immutable.

ALTER TABLE public.strata_snapshot_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_snapshot_items_select ON public.strata_snapshot_items FOR SELECT
  USING (public.current_user_is_approved());
-- No client write policies: items are frozen by the lock RPC only.

ALTER TABLE public.strata_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_decisions_select ON public.strata_decisions FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_decisions_insert ON public.strata_decisions FOR INSERT
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','executive_viewer','vmo_validator']) AND created_by = auth.uid());
CREATE POLICY strata_decisions_update ON public.strata_decisions FOR UPDATE
  USING (public.strata_has_role(ARRAY['strategy_office']) OR created_by = auth.uid())
  WITH CHECK (true);

ALTER TABLE public.strata_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_actions_select ON public.strata_actions FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_actions_write ON public.strata_actions FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office']) OR owner_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office']) OR owner_id = auth.uid() OR created_by = auth.uid());

ALTER TABLE public.strata_board_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_board_packs_select ON public.strata_board_packs FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_board_packs_write ON public.strata_board_packs FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office']));

ALTER TABLE public.strata_ai_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_ai_select ON public.strata_ai_outputs FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_ai_insert ON public.strata_ai_outputs FOR INSERT
  WITH CHECK (created_by = auth.uid() AND human_review_status = 'pending');
CREATE POLICY strata_ai_review ON public.strata_ai_outputs FOR UPDATE
  USING (public.strata_has_role(ARRAY['strategy_office','executive_viewer']) AND created_by <> auth.uid())
  WITH CHECK (reviewed_by = auth.uid());
