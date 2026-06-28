-- ============================================================================
-- P0: Versioned Canonical Workflow Foundation (ph_wf_*)
-- Feature: CAT-WF-CANONICAL — Phase 2B / P0
-- ----------------------------------------------------------------------------
-- ADDITIVE + RUNTIME-INERT. This migration ONLY creates new ph_wf_* tables,
-- indexes, RLS policies, and one security-definer audit-insert function.
--   * No existing table is dropped.
--   * No existing column is removed or renamed.
--   * No existing enum is extended.
--   * Nothing here is wired into runtime; new tables are empty after apply.
-- Target: STAGING ONLY (cyijbdeuehohvhnsywig). Apply via linked CLI (= staging).
-- All objects use IF NOT EXISTS so re-apply is safe and non-destructive.
-- ============================================================================

-- ---- shared updated_at trigger ---------------------------------------------
CREATE OR REPLACE FUNCTION public.ph_wf_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---- admin helper (mirrors existing safest Catalyst admin pattern) ---------
-- Existing pattern: user_roles.role = 'admin'::app_role (see 20260621100000).
-- Extended to also honor the product super_admin role (see check_permission,
-- 20260627140000). SECURITY DEFINER so policies can read user_roles cleanly.
CREATE OR REPLACE FUNCTION public.ph_wf_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.role_id
      WHERE upr.user_id = auth.uid() AND pr.code = 'super_admin'
    );
$$;

-- ============================================================================
-- 1. ph_wf_versions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES public.ph_workflow_templates(id) ON DELETE RESTRICT,
  entity_key    text NOT NULL,
  version_no    integer NOT NULL,
  lifecycle     text NOT NULL DEFAULT 'draft',
  notes         text,
  effective_at  timestamptz,
  published_at  timestamptz,
  published_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_versions_lifecycle_chk
    CHECK (lifecycle IN ('draft','published','superseded','archived')),
  CONSTRAINT ph_wf_versions_version_no_chk CHECK (version_no > 0),
  CONSTRAINT ph_wf_versions_uq UNIQUE (template_id, version_no)
);
COMMENT ON TABLE public.ph_wf_versions IS 'P0 additive/inert. Immutable workflow version snapshot (draft/published/superseded/archived). Not runtime-wired.';
CREATE INDEX IF NOT EXISTS ph_wf_versions_template_lifecycle_idx ON public.ph_wf_versions (template_id, lifecycle);
CREATE INDEX IF NOT EXISTS ph_wf_versions_entity_lifecycle_idx  ON public.ph_wf_versions (entity_key, lifecycle);

-- ============================================================================
-- 2. ph_wf_version_statuses
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_version_statuses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id      uuid NOT NULL REFERENCES public.ph_wf_versions(id) ON DELETE CASCADE,
  status_key      text NOT NULL,
  display_label   text NOT NULL,
  category        text NOT NULL,
  lifecycle_group text,
  sort_order      integer NOT NULL DEFAULT 0,
  color_token     text NOT NULL,
  is_initial      boolean NOT NULL DEFAULT false,
  is_terminal     boolean NOT NULL DEFAULT false,
  is_exception    boolean NOT NULL DEFAULT false,
  supports_reopen boolean NOT NULL DEFAULT false,
  requires_reason boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_version_statuses_category_chk
    CHECK (category IN ('todo','in_progress','done')),
  -- Color law: ADS design tokens only — no hex, no rgb/hsl.
  CONSTRAINT ph_wf_version_statuses_token_chk
    CHECK (color_token ~ '^(color\.|var\(--ds-)' AND color_token !~ '#'),
  CONSTRAINT ph_wf_version_statuses_uq UNIQUE (version_id, status_key)
);
COMMENT ON TABLE public.ph_wf_version_statuses IS 'P0 additive/inert. Version-scoped status registry. color_token is ADS-token-only (no hex).';
CREATE INDEX IF NOT EXISTS ph_wf_version_statuses_order_idx ON public.ph_wf_version_statuses (version_id, sort_order);

-- ============================================================================
-- 3. ph_wf_version_transitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_version_transitions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id       uuid NOT NULL REFERENCES public.ph_wf_versions(id) ON DELETE CASCADE,
  from_status_key  text,                 -- NULL = global "any-from" (global-IN)
  to_status_key    text NOT NULL,
  transition_type  text NOT NULL DEFAULT 'forward',
  requires_reason  boolean NOT NULL DEFAULT false,
  requires_comment boolean NOT NULL DEFAULT false,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_version_transitions_type_chk
    CHECK (transition_type IN ('forward','backward','exception','reopen','cancel','reject','defer','rollback')),
  CONSTRAINT ph_wf_version_transitions_selfloop_chk
    CHECK (from_status_key IS NULL OR from_status_key <> to_status_key)
);
COMMENT ON TABLE public.ph_wf_version_transitions IS 'P0 additive/inert. Version transitions. NULL from_status_key = global-IN. Endpoints validated against statuses at publish time (app/fn), not FK.';
CREATE INDEX IF NOT EXISTS ph_wf_version_transitions_from_idx ON public.ph_wf_version_transitions (version_id, from_status_key);
-- NULL-safe uniqueness (Postgres treats NULLs as distinct): two partial uniques.
CREATE UNIQUE INDEX IF NOT EXISTS ph_wf_version_transitions_uq_pair
  ON public.ph_wf_version_transitions (version_id, from_status_key, to_status_key)
  WHERE from_status_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ph_wf_version_transitions_uq_global
  ON public.ph_wf_version_transitions (version_id, to_status_key)
  WHERE from_status_key IS NULL;

-- ============================================================================
-- 4. ph_wf_transition_roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_transition_roles (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_id            uuid NOT NULL REFERENCES public.ph_wf_version_transitions(id) ON DELETE CASCADE,
  role_group               text NOT NULL,
  allow_assignee           boolean NOT NULL DEFAULT false,
  allow_reporter           boolean NOT NULL DEFAULT false,
  allow_super_admin_bypass boolean NOT NULL DEFAULT true,
  bypass_requires_reason   boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_transition_roles_uq UNIQUE (transition_id, role_group)
);
COMMENT ON TABLE public.ph_wf_transition_roles IS 'P0 additive/inert. Allowed role groups per transition + assignee/reporter/bypass flags.';
CREATE INDEX IF NOT EXISTS ph_wf_transition_roles_tr_idx ON public.ph_wf_transition_roles (transition_id);

-- ============================================================================
-- 5. ph_wf_transition_guards
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_transition_guards (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_id  uuid NOT NULL REFERENCES public.ph_wf_version_transitions(id) ON DELETE CASCADE,
  guard_type     text NOT NULL,
  params         jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_blocking    boolean NOT NULL DEFAULT true,
  waiver_allowed boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_transition_guards_type_chk CHECK (guard_type IN (
    'required_field','approval','brd_attached','figma_attached',
    'acceptance_criteria_present','assignee_required','child_completion',
    'test_coverage','qa_signoff','uat_signoff','no_open_blocker_critical',
    'release_readiness','deployment_window','deployment_evidence','rca',
    'reason_required','comment_required','smoke_evidence'
  ))
);
COMMENT ON TABLE public.ph_wf_transition_guards IS 'P0 additive/inert. Guard rules per transition. approval guard references transition_approval_configs via params (no FK).';
CREATE INDEX IF NOT EXISTS ph_wf_transition_guards_tr_idx ON public.ph_wf_transition_guards (transition_id);

-- ============================================================================
-- 6. ph_wf_field_requirements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_field_requirements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id    uuid NOT NULL REFERENCES public.ph_wf_versions(id) ON DELETE CASCADE,
  scope         text NOT NULL,
  status_key    text,
  transition_id uuid REFERENCES public.ph_wf_version_transitions(id) ON DELETE SET NULL,
  field_key     text NOT NULL,   -- soft-links to catalyst_field_layouts.field_key (no FK; layouts are project-scoped)
  requirement   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_field_requirements_scope_chk CHECK (scope IN ('on_enter_status','on_transition')),
  CONSTRAINT ph_wf_field_requirements_req_chk   CHECK (requirement IN ('required','visible','hidden')),
  CONSTRAINT ph_wf_field_requirements_target_chk
    CHECK ( (status_key IS NOT NULL)::int + (transition_id IS NOT NULL)::int = 1 )
);
COMMENT ON TABLE public.ph_wf_field_requirements IS 'P0 additive/inert. Workflow-aware field requirements. field_key soft-links to catalyst_field_layouts.';
CREATE INDEX IF NOT EXISTS ph_wf_field_requirements_ver_idx ON public.ph_wf_field_requirements (version_id, scope);

-- ============================================================================
-- 7. ph_wf_reason_codes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_reason_codes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id         uuid REFERENCES public.ph_wf_versions(id) ON DELETE CASCADE,  -- NULL = global
  transition_type    text,
  code               text NOT NULL,
  label              text NOT NULL,
  requires_free_text boolean NOT NULL DEFAULT false,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ph_wf_reason_codes IS 'P0 additive/inert. Reason picklists for transitions requiring reason. version_id NULL = global.';
CREATE UNIQUE INDEX IF NOT EXISTS ph_wf_reason_codes_uq_ver
  ON public.ph_wf_reason_codes (version_id, code) WHERE version_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ph_wf_reason_codes_uq_global
  ON public.ph_wf_reason_codes (code) WHERE version_id IS NULL;

-- ============================================================================
-- 8. ph_wf_schemes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_schemes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  is_default  boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ph_wf_schemes IS 'P0 additive/inert. Named bundle mapping entity_key -> version. At most one default.';
CREATE UNIQUE INDEX IF NOT EXISTS ph_wf_schemes_single_default ON public.ph_wf_schemes (is_default) WHERE is_default;

-- ============================================================================
-- 9. ph_wf_scheme_entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_scheme_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id  uuid NOT NULL REFERENCES public.ph_wf_schemes(id) ON DELETE CASCADE,
  entity_key text NOT NULL,
  version_id uuid NOT NULL REFERENCES public.ph_wf_versions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_scheme_entries_uq UNIQUE (scheme_id, entity_key)
);
COMMENT ON TABLE public.ph_wf_scheme_entries IS 'P0 additive/inert. Scheme -> (entity_key -> version) entries.';
CREATE INDEX IF NOT EXISTS ph_wf_scheme_entries_scheme_idx ON public.ph_wf_scheme_entries (scheme_id);

-- ============================================================================
-- 10. ph_wf_scheme_assignments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_scheme_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.ph_projects(id) ON DELETE CASCADE,
  scheme_id   uuid NOT NULL REFERENCES public.ph_wf_schemes(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_scheme_assignments_uq UNIQUE (project_id)
);
COMMENT ON TABLE public.ph_wf_scheme_assignments IS 'P0 additive/inert. Project -> scheme binding (one scheme per project). Legacy ph_project_workflow_assignments preserved separately.';
CREATE INDEX IF NOT EXISTS ph_wf_scheme_assignments_scheme_idx ON public.ph_wf_scheme_assignments (scheme_id);

-- ============================================================================
-- 11. ph_wf_status_remaps
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_status_remaps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_version_id uuid REFERENCES public.ph_wf_versions(id) ON DELETE SET NULL,
  to_version_id   uuid NOT NULL REFERENCES public.ph_wf_versions(id) ON DELETE CASCADE,
  entity_key      text NOT NULL,
  old_status_key  text NOT NULL,
  new_status_key  text NOT NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_status_remaps_uq UNIQUE (to_version_id, entity_key, old_status_key)
);
COMMENT ON TABLE public.ph_wf_status_remaps IS 'P0 additive/inert. Non-destructive activation remap (old_status_key -> new_status_key) for preview + lazy migration.';
CREATE INDEX IF NOT EXISTS ph_wf_status_remaps_to_idx ON public.ph_wf_status_remaps (to_version_id);

-- ============================================================================
-- 12. ph_wf_audit  (append-only; admin-only read; insert via fn only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_key    text NOT NULL,
  entity_id     uuid NOT NULL,            -- polymorphic; intentionally no FK
  project_id    uuid,
  from_status_key text,
  to_status_key text NOT NULL,
  version_id    uuid REFERENCES public.ph_wf_versions(id) ON DELETE SET NULL,
  actor         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role    text,
  allowed_roles text[],
  role_decision text NOT NULL DEFAULT 'allow',
  guard_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_guard text,
  tooltip_basis text,
  would_block   boolean,
  bypass_required boolean NOT NULL DEFAULT false,
  reason_code   text,
  reason_text   text,
  mode          text NOT NULL DEFAULT 'advisory',
  source_surface text,
  at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ph_wf_audit_role_decision_chk CHECK (role_decision IN ('allow','deny','bypass','waiver')),
  CONSTRAINT ph_wf_audit_mode_chk CHECK (mode IN ('advisory','blocking'))
);
COMMENT ON TABLE public.ph_wf_audit IS 'P0 additive/inert. Append-only version-aware status-change log. Admin-only read; insert ONLY via ph_wf_write_audit().';
CREATE INDEX IF NOT EXISTS ph_wf_audit_entity_idx ON public.ph_wf_audit (entity_key, entity_id, at DESC);
CREATE INDEX IF NOT EXISTS ph_wf_audit_mode_idx   ON public.ph_wf_audit (mode, at DESC);

-- ============================================================================
-- 13. ph_wf_admin_audit  (append-only; admin-only read)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ph_wf_admin_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,
  target_kind text,
  target_ids  uuid[],
  actor       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  diff_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ph_wf_admin_audit IS 'P0 additive/inert. Append-only admin-action log (publish/clone/assign/remap/archive). Admin-only read.';
CREATE INDEX IF NOT EXISTS ph_wf_admin_audit_action_idx ON public.ph_wf_admin_audit (action, at DESC);

-- ============================================================================
-- updated_at triggers (mutable config tables only; audit tables excluded)
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ph_wf_versions','ph_wf_version_statuses','ph_wf_version_transitions',
    'ph_wf_transition_roles','ph_wf_transition_guards','ph_wf_field_requirements',
    'ph_wf_reason_codes','ph_wf_schemes','ph_wf_scheme_entries',
    'ph_wf_scheme_assignments','ph_wf_status_remaps'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', t||'_touch', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ph_wf_touch_updated_at();',
      t||'_touch', t);
  END LOOP;
END $$;

-- ============================================================================
-- Security-definer audit insert function (narrow: insert into ph_wf_audit only)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ph_wf_write_audit(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.ph_wf_audit (
    entity_key, entity_id, project_id, from_status_key, to_status_key,
    version_id, actor, actor_role, allowed_roles, role_decision,
    guard_results, missing_guard, tooltip_basis, would_block, bypass_required,
    reason_code, reason_text, mode, source_surface
  )
  VALUES (
    payload->>'entity_key',
    (payload->>'entity_id')::uuid,
    NULLIF(payload->>'project_id','')::uuid,
    payload->>'from_status_key',
    payload->>'to_status_key',
    NULLIF(payload->>'version_id','')::uuid,
    COALESCE(NULLIF(payload->>'actor','')::uuid, auth.uid()),
    payload->>'actor_role',
    CASE WHEN payload ? 'allowed_roles'
         THEN ARRAY(SELECT jsonb_array_elements_text(payload->'allowed_roles'))
         ELSE NULL END,
    COALESCE(payload->>'role_decision','allow'),
    COALESCE(payload->'guard_results','[]'::jsonb),
    payload->>'missing_guard',
    payload->>'tooltip_basis',
    CASE WHEN payload ? 'would_block' THEN (payload->>'would_block')::boolean ELSE NULL END,
    COALESCE((payload->>'bypass_required')::boolean, false),
    payload->>'reason_code',
    payload->>'reason_text',
    COALESCE(payload->>'mode','advisory'),
    payload->>'source_surface'
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
COMMENT ON FUNCTION public.ph_wf_write_audit(jsonb) IS 'P0. Narrow security-definer: inserts a single ph_wf_audit row from a JSON payload. No other mutation. Not yet called by runtime.';
REVOKE ALL ON FUNCTION public.ph_wf_write_audit(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.ph_wf_write_audit(jsonb) TO authenticated;

-- ============================================================================
-- RLS — enable on all 13 tables
-- ============================================================================
ALTER TABLE public.ph_wf_versions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_version_statuses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_version_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_transition_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_transition_guards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_field_requirements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_reason_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_schemes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_scheme_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_scheme_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_status_remaps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_audit               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ph_wf_admin_audit         ENABLE ROW LEVEL SECURITY;

-- Configuration tables: authenticated READ, admin WRITE. Loop keeps it DRY.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ph_wf_versions','ph_wf_version_statuses','ph_wf_version_transitions',
    'ph_wf_transition_roles','ph_wf_transition_guards','ph_wf_field_requirements',
    'ph_wf_reason_codes','ph_wf_schemes','ph_wf_scheme_entries',
    'ph_wf_scheme_assignments','ph_wf_status_remaps'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_select_auth', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);',
      t||'_select_auth', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_write_admin', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.ph_wf_is_admin()) WITH CHECK (public.ph_wf_is_admin());',
      t||'_write_admin', t);
  END LOOP;
END $$;

-- Audit tables: admin-only READ. No INSERT/UPDATE/DELETE policy => no direct
-- client writes; ph_wf_audit is written only via SECURITY DEFINER ph_wf_write_audit().
DROP POLICY IF EXISTS ph_wf_audit_select_admin ON public.ph_wf_audit;
CREATE POLICY ph_wf_audit_select_admin ON public.ph_wf_audit
  FOR SELECT TO authenticated USING (public.ph_wf_is_admin());

DROP POLICY IF EXISTS ph_wf_admin_audit_select_admin ON public.ph_wf_admin_audit;
CREATE POLICY ph_wf_admin_audit_select_admin ON public.ph_wf_admin_audit
  FOR SELECT TO authenticated USING (public.ph_wf_is_admin());

-- ============================================================================
-- END P0. Additive only. 13 new tables, empty. Nothing runtime-wired.
-- Rollback: DROP TABLE ... CASCADE for the 13 ph_wf_* tables +
--   DROP FUNCTION ph_wf_write_audit(jsonb), ph_wf_is_admin(), ph_wf_touch_updated_at().
-- ============================================================================
