-- ============================================================================
-- STRATA R0 — Foundation: helpers, roles, audit, governed configuration engine
-- CAT-STRATA-20260705-001 · Blueprint §5, §12, §21, Appendix B · Flow 2
-- Conventions: UUID PKs, timestamptz, strict RLS (no USING(true)),
-- governed records carry version/status/effective dates/approval/audit.
-- Single-tenant deployment (Q4): organization_id kept nullable for future use.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strata_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_slugify(input_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(lower(coalesce(input_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Generic slug trigger: derives slug from NEW.name when absent, dedupes with -2, -3…
-- Slug is FROZEN on creation (never recomputed on rename) per the slug contract.
CREATE OR REPLACE FUNCTION public.strata_generate_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
  clash int;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base := public.strata_slugify(NEW.name);
  IF base = '' THEN base := 'item'; END IF;
  candidate := base;
  LOOP
    EXECUTE format('SELECT 1 FROM %I.%I WHERE slug = $1 LIMIT 1', TG_TABLE_SCHEMA, TG_TABLE_NAME)
      INTO clash USING candidate;
    EXIT WHEN clash IS NULL;
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- STRATA roles (persona separation — blueprint §4)
-- Module access remains governed by feature_flags + admin_role_module_permissions;
-- these rows govern WHAT a user may do inside STRATA (SoD).
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN (
    'strata_admin',       -- config control plane, RBAC, templates, mappings
    'strategy_office',    -- owns strategy model, cycles, scorecards, snapshots
    'executive_viewer',   -- CEO/CXO consumption; no data edits
    'kpi_owner',          -- submits/explains actuals
    'vmo_validator',      -- validates benefits / financial truth
    'data_steward'        -- uploads, mappings, data quality
  )),
  scope_type text NOT NULL DEFAULT 'organization',
  scope_entity_id uuid,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, scope_type, scope_entity_id)
);
COMMENT ON TABLE public.strata_role_assignments IS
  'STRATA persona roles (blueprint §4). Segregation of duties is enforced against these rows.';

CREATE TRIGGER trg_strata_role_assignments_touch
  BEFORE UPDATE ON public.strata_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at();

-- Admin check: platform admin/owner (existing RBAC) OR strata_admin role.
CREATE OR REPLACE FUNCTION public.strata_is_admin(p_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = p_user AND pr.name IN ('admin', 'owner')
  ) OR EXISTS (
    SELECT 1 FROM public.strata_role_assignments ra
    WHERE ra.user_id = p_user AND ra.role = 'strata_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.strata_has_role(p_roles text[], p_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.strata_is_admin(p_user) OR EXISTS (
    SELECT 1 FROM public.strata_role_assignments ra
    WHERE ra.user_id = p_user AND ra.role = ANY (p_roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- Audit (blueprint §21) — INSERT-only ledger, trigger-fed
-- ---------------------------------------------------------------------------

CREATE TABLE public.strata_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table text NOT NULL,
  entity_id uuid,
  action text NOT NULL, -- INSERT | UPDATE | DELETE | RPC:<name>
  actor_id uuid,
  before jsonb,
  after jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strata_audit_entity ON public.strata_audit_events (entity_table, entity_id, created_at DESC);
COMMENT ON TABLE public.strata_audit_events IS 'Immutable STRATA audit ledger. INSERT-only; no UPDATE/DELETE policies exist.';

CREATE OR REPLACE FUNCTION public.strata_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, before, after)
  VALUES (
    TG_TABLE_NAME,
    COALESCE((CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END), NULL),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---------------------------------------------------------------------------
-- Governed configuration records (Flow 2 / Appendix B)
-- Shared envelope: version, status, effective dates, approval, supersession.
-- Status transitions beyond draft are RPC-only (see strata_submit/approve below);
-- client UPDATE policies only allow edits while status = 'draft'.
-- ---------------------------------------------------------------------------

-- Perspectives (blueprint §5 — never hard-coded)
CREATE TABLE public.strata_perspectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  order_index int NOT NULL DEFAULT 0,
  default_weight numeric(6,3),
  color_token text, -- ADS token name only, never a hex
  parent_id uuid REFERENCES public.strata_perspectives(id) ON DELETE SET NULL,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_perspectives(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Threshold schemes (RAG bands — config, never constants)
CREATE TABLE public.strata_threshold_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  -- bands: ordered array [{key:'green', label:'On track', min_score:85}, …]; keys are org-defined
  bands jsonb NOT NULL,
  tolerance numeric(6,3),
  confidence_threshold numeric(6,3),
  escalation_rules jsonb,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_threshold_schemes(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_threshold_bands_shape CHECK (jsonb_typeof(bands) = 'array')
);

-- Value taxonomy (blueprint §10)
CREATE TABLE public.strata_value_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  parent_id uuid REFERENCES public.strata_value_categories(id) ON DELETE SET NULL,
  measurement_unit text,
  validator_role text, -- strata role expected to validate realization in this category
  realization_cadence text,
  double_counting_rule jsonb,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_value_categories(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Gate models + stages (blueprint §10/§12 — stages are records, not constants)
CREATE TABLE public.strata_gate_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_gate_models(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.strata_gate_model_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_model_id uuid NOT NULL REFERENCES public.strata_gate_models(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  name text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,           -- [{key,label,required}]
  evidence_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_options text[] NOT NULL DEFAULT ARRAY['approve','continue','rebaseline','pivot','pause','stop'],
  approval_roles text[] NOT NULL DEFAULT ARRAY['strategy_office'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gate_model_id, stage_key)
);

-- KPI type configs (formula templates — blueprint §5/§8)
CREATE TABLE public.strata_kpi_type_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  formula_template text NOT NULL, -- e.g. 'ratio_to_target', 'band', 'lower_is_better', 'milestone', 'manual'
  directionality text NOT NULL CHECK (directionality IN ('higher_better','lower_better','band','manual')),
  normalization jsonb,
  allowed_units text[],
  mandatory_metadata jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_rules jsonb,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_kpi_type_configs(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Upload templates (blueprint §22 — generated from governed config, versioned)
CREATE TABLE public.strata_upload_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  target_entity text NOT NULL, -- 'kpi_actual' | 'kpi_target' | 'benefit_actual' | 'project_card' | 'milestone'
  column_schema jsonb NOT NULL, -- [{column,label,type,required,maps_to}]
  validation_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  mapping_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_upload_templates(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_upload_columns_shape CHECK (jsonb_typeof(column_schema) = 'array')
);

-- Workflow configs (states/transitions/approvals as records)
CREATE TABLE public.strata_workflow_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  entity_type text NOT NULL,
  states jsonb NOT NULL,       -- [{key,label,category}]
  transitions jsonb NOT NULL,  -- [{from,to,roles,requires_note}]
  approval_roles jsonb,
  sla jsonb,
  notifications jsonb,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_workflow_configs(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Config change requests (request → approve → apply; SoD enforced)
CREATE TABLE public.strata_config_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  entity_table text NOT NULL,
  entity_id uuid,
  change_type text NOT NULL CHECK (change_type IN ('create','update','retire','supersede')),
  payload jsonb,
  reason text,
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_ccr_no_self_approval CHECK (decided_by IS NULL OR decided_by <> requested_by)
);
COMMENT ON CONSTRAINT strata_ccr_no_self_approval ON public.strata_config_change_requests IS
  'Segregation of duties: a change request can never be decided by its requester.';

-- ---------------------------------------------------------------------------
-- Governance RPCs — the ONLY way governed records change status past draft.
-- SECURITY DEFINER (table owner) bypasses the draft-only client policies.
-- ---------------------------------------------------------------------------

-- Whitelist of governed tables the generic RPCs may touch.
CREATE OR REPLACE FUNCTION public.strata_governed_tables()
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    'strata_perspectives','strata_threshold_schemes','strata_value_categories',
    'strata_gate_models','strata_kpi_type_configs','strata_upload_templates',
    'strata_workflow_configs','strata_scorecard_models','strata_kpis'
  ];
$$;

CREATE OR REPLACE FUNCTION public.strata_submit_record(p_table text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur_status text; cur_creator uuid;
BEGIN
  IF NOT (p_table = ANY (public.strata_governed_tables())) THEN
    RAISE EXCEPTION 'strata_submit_record: % is not a governed table', p_table;
  END IF;
  EXECUTE format('SELECT status, created_by FROM public.%I WHERE id = $1', p_table)
    INTO cur_status, cur_creator USING p_id;
  IF cur_status IS NULL THEN RAISE EXCEPTION 'record not found'; END IF;
  IF cur_status <> 'draft' THEN RAISE EXCEPTION 'only draft records can be submitted (current: %)', cur_status; END IF;
  IF cur_creator IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the creator (or an admin) may submit a draft';
  END IF;
  EXECUTE format('UPDATE public.%I SET status = ''pending_approval'', updated_at = now() WHERE id = $1', p_table) USING p_id;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES (p_table, p_id, 'RPC:submit_record', auth.uid(), 'draft → pending_approval');
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_approve_record(p_table text, p_id uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur_status text; cur_creator uuid; cur_supersedes uuid;
BEGIN
  IF NOT (p_table = ANY (public.strata_governed_tables())) THEN
    RAISE EXCEPTION 'strata_approve_record: % is not a governed table', p_table;
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

CREATE OR REPLACE FUNCTION public.strata_retire_record(p_table text, p_id uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur_status text;
BEGIN
  IF NOT (p_table = ANY (public.strata_governed_tables())) THEN
    RAISE EXCEPTION 'strata_retire_record: % is not a governed table', p_table;
  END IF;
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'retiring a governed record requires strategy_office or admin role';
  END IF;
  EXECUTE format('SELECT status FROM public.%I WHERE id = $1', p_table) INTO cur_status USING p_id;
  IF cur_status IS NULL THEN RAISE EXCEPTION 'record not found'; END IF;
  IF cur_status <> 'approved' THEN RAISE EXCEPTION 'only approved records can be retired (current: %)', cur_status; END IF;
  EXECUTE format(
    'UPDATE public.%I SET status = ''retired'', effective_to = COALESCE(effective_to, now()),
       change_reason = COALESCE($2, change_reason), updated_at = now() WHERE id = $1',
    p_table) USING p_id, p_reason;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES (p_table, p_id, 'RPC:retire_record', auth.uid(), p_reason);
END;
$$;

-- ---------------------------------------------------------------------------
-- Triggers: slugs, touch, audit
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'strata_perspectives','strata_threshold_schemes','strata_value_categories',
    'strata_gate_models','strata_kpi_type_configs','strata_upload_templates','strata_workflow_configs'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_slug BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_generate_slug()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['strata_gate_model_stages','strata_config_change_requests'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- RLS — strict. SELECT: approved users. INSERT: strata roles. UPDATE: draft-only
-- by creator (status may not change client-side). DELETE: draft-only by creator/admin.
-- Status transitions happen exclusively through the RPCs above.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'strata_perspectives','strata_threshold_schemes','strata_value_categories',
    'strata_gate_models','strata_kpi_type_configs','strata_upload_templates','strata_workflow_configs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY %1$s_select ON public.%1$I FOR SELECT
        USING (public.current_user_is_approved())
    $p$, t);
    EXECUTE format($p$
      CREATE POLICY %1$s_insert ON public.%1$I FOR INSERT
        WITH CHECK (public.strata_has_role(ARRAY['strata_admin','strategy_office']) AND status = 'draft')
    $p$, t);
    EXECUTE format($p$
      CREATE POLICY %1$s_update ON public.%1$I FOR UPDATE
        USING (status = 'draft' AND (created_by = auth.uid() OR public.strata_is_admin()))
        WITH CHECK (status = 'draft')
    $p$, t);
    EXECUTE format($p$
      CREATE POLICY %1$s_delete ON public.%1$I FOR DELETE
        USING (status = 'draft' AND (created_by = auth.uid() OR public.strata_is_admin()))
    $p$, t);
  END LOOP;
END $$;

ALTER TABLE public.strata_gate_model_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_gate_model_stages_select ON public.strata_gate_model_stages FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_gate_model_stages_write ON public.strata_gate_model_stages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.strata_gate_models gm
                 WHERE gm.id = gate_model_id AND gm.status = 'draft'
                   AND (gm.created_by = auth.uid() OR public.strata_is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.strata_gate_models gm
                      WHERE gm.id = gate_model_id AND gm.status = 'draft'
                        AND (gm.created_by = auth.uid() OR public.strata_is_admin())));

ALTER TABLE public.strata_role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_role_assignments_select ON public.strata_role_assignments FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_role_assignments_admin_write ON public.strata_role_assignments FOR ALL
  USING (public.strata_is_admin())
  WITH CHECK (public.strata_is_admin());

ALTER TABLE public.strata_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_audit_events_select ON public.strata_audit_events FOR SELECT
  USING (public.current_user_is_approved());
-- No INSERT policy: rows arrive only via SECURITY DEFINER trigger/RPCs. No UPDATE/DELETE policies: immutable.

ALTER TABLE public.strata_config_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_ccr_select ON public.strata_config_change_requests FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_ccr_insert ON public.strata_config_change_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid() AND status = 'pending');
CREATE POLICY strata_ccr_withdraw ON public.strata_config_change_requests FOR UPDATE
  USING (requested_by = auth.uid() AND status = 'pending')
  WITH CHECK (status IN ('pending','withdrawn') AND decided_by IS NULL);
