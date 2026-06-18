-- ════════════════════════════════════════════════════════════════════════
-- RELEASE OPERATIONS — Schema extension (Phase 1)
-- Branch: release-operations-rebuild-01
--
-- Strategy (LOCKED): extend rh_* in place. Additive / non-destructive only.
--   - ALTER rh_releases / rh_changes / rh_freeze_windows / rh_production_events
--     to add richer lifecycle columns (nullable, no data rewrite).
--   - CREATE 10 new rh_* tables for the surfaces the handoff requires.
--   - Tighten RLS on the primary writable entities from wide-open USING(true)
--     to the canonical user_roles pattern via a SECURITY DEFINER helper.
--
-- Roles (LOCKED): map to existing 4 app_roles. No enum change.
--   admin            = full
--   program_manager  = release_manager + change_manager + settings ("manager")
--   team_lead        = approve sign-offs / SOP steps ("approver")
--   user             = viewer (read-only)
--   Per-row approver identity (assigned_to / owner_id) is honoured regardless
--   of role, so the assigned individual can action their own item.
--
-- Link targets: products(id), business_requests(id), anchor_sprints(id),
--   ph_issues(issue_key text PK — stored as text, not hard-FK'd, since a work
--   item may not be synced yet).
-- ════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────
-- 0. RLS HELPER (SECURITY DEFINER — bypasses user_roles RLS, no recursion)
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rh_user_has_role(p_user uuid, p_roles app_role[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user
      AND ur.role = ANY (p_roles)
  );
$$;

-- "manager" = admin + program_manager (full CRUD on releases/changes/settings)
CREATE OR REPLACE FUNCTION public.rh_is_manager(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.rh_user_has_role(p_user, ARRAY['admin','program_manager']::app_role[]);
$$;

-- "approver" = admin + program_manager + team_lead (action sign-offs / SOP)
CREATE OR REPLACE FUNCTION public.rh_is_approver(p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.rh_user_has_role(p_user, ARRAY['admin','program_manager','team_lead']::app_role[]);
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 1. ALTER rh_releases — richer release lifecycle
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE rh_releases
  ADD COLUMN IF NOT EXISTS release_type        TEXT,                       -- regular|minor|major|hotfix|emergency
  ADD COLUMN IF NOT EXISTS target_env          TEXT,                       -- qa|beta|staging|production
  ADD COLUMN IF NOT EXISTS product_id          UUID REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS planned_start_date  DATE,
  ADD COLUMN IF NOT EXISTS planned_release_date DATE,
  ADD COLUMN IF NOT EXISTS release_manager_id  UUID,
  ADD COLUMN IF NOT EXISTS product_owner_id    UUID,
  ADD COLUMN IF NOT EXISTS qa_lead_id          UUID,
  ADD COLUMN IF NOT EXISTS uat_lead_id         UUID,
  ADD COLUMN IF NOT EXISTS health              TEXT,                       -- at_risk|on_track|done (cached derived)
  ADD COLUMN IF NOT EXISTS readiness_pct       INTEGER;


-- ────────────────────────────────────────────────────────────────────────
-- 2. ALTER rh_changes — richer change lifecycle (note: chg_number, risk_level,
--    source, deployment_date already exist — additive only)
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE rh_changes
  ADD COLUMN IF NOT EXISTS change_type           TEXT,                     -- standard|normal|emergency|hotfix
  ADD COLUMN IF NOT EXISTS target_env            TEXT,                     -- qa|beta|staging|production
  ADD COLUMN IF NOT EXISTS deployment_category   TEXT,                     -- frontend|backend|integration|database|full_stack|configuration
  ADD COLUMN IF NOT EXISTS window_start          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_end            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS change_manager_id     UUID,
  ADD COLUMN IF NOT EXISTS release_manager_id    UUID,
  ADD COLUMN IF NOT EXISTS external_system       TEXT,
  ADD COLUMN IF NOT EXISTS is_emergency_override BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS override_reason       TEXT,
  ADD COLUMN IF NOT EXISTS override_approver_id  UUID;


-- ────────────────────────────────────────────────────────────────────────
-- 3. ALTER rh_freeze_windows — env / product scoping + status
--    (start_date/end_date DATE retained; new cols additive)
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE rh_freeze_windows
  ADD COLUMN IF NOT EXISTS target_env      TEXT,                           -- qa|beta|staging|production|all
  ADD COLUMN IF NOT EXISTS applicability   TEXT DEFAULT 'all',             -- all|product
  ADD COLUMN IF NOT EXISTS product_id      UUID REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'scheduled',       -- scheduled|active|ended
  ADD COLUMN IF NOT EXISTS override_policy TEXT;


-- ────────────────────────────────────────────────────────────────────────
-- 4. ALTER rh_production_events — structured FKs + immutable snapshots
--    (change_key/release_key TEXT retained for back-compat; new cols additive)
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE rh_production_events
  ADD COLUMN IF NOT EXISTS event_key                  TEXT,
  ADD COLUMN IF NOT EXISTS release_id                 UUID REFERENCES rh_releases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_id                  UUID REFERENCES rh_changes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id                 UUID REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS target_env                 TEXT,
  ADD COLUMN IF NOT EXISTS produced_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deployment_status          TEXT,                -- success|partial|failed
  ADD COLUMN IF NOT EXISTS owner_id                   UUID,
  ADD COLUMN IF NOT EXISTS release_notes_id           UUID,
  ADD COLUMN IF NOT EXISTS work_items_snapshot        JSONB,
  ADD COLUMN IF NOT EXISTS business_requests_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS commits_snapshot           JSONB,
  ADD COLUMN IF NOT EXISTS sop_evidence_snapshot      JSONB,
  ADD COLUMN IF NOT EXISTS approvers_snapshot         JSONB;


-- ────────────────────────────────────────────────────────────────────────
-- 5. NEW TABLES
-- ────────────────────────────────────────────────────────────────────────

-- 5.1 SOP templates (reusable deployment procedures) — DISTINCT from the
--     existing rh_sign_off_templates (those are approval-gate templates).
CREATE TABLE IF NOT EXISTS rh_sop_templates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  description          TEXT,
  deployment_category  TEXT,
  target_env           TEXT,
  owner_id             UUID,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rh_sop_template_steps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id         UUID NOT NULL REFERENCES rh_sop_templates(id) ON DELETE CASCADE,
  step_no             INTEGER NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  step_type           TEXT,                                               -- manual|script|deployment|validation|communication|rollback
  default_owner_id    UUID,
  external_owner_name TEXT,
  environment         TEXT,
  is_mandatory        BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (template_id, step_no)
);

-- 5.2 SOP execution steps (per-change instance, with evidence + lifecycle)
CREATE TABLE IF NOT EXISTS rh_sop_steps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id           UUID NOT NULL REFERENCES rh_changes(id) ON DELETE CASCADE,
  template_id         UUID REFERENCES rh_sop_templates(id) ON DELETE SET NULL,
  step_no             INTEGER NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  step_type           TEXT,
  owner_id            UUID,
  external_owner_name TEXT,
  environment         TEXT,
  branch              TEXT,
  frontend_commit     TEXT,
  backend_commit      TEXT,
  integration_commit  TEXT,
  script_reference    TEXT,
  command_text        TEXT,
  expected_result     TEXT,
  actual_result       TEXT,
  evidence_url        TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',                    -- pending|in_progress|done|blocked|skipped|failed
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  blocker_reason      TEXT,
  is_mandatory        BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (change_id, step_no)
);

-- 5.3 Release ↔ Business Requests (join)
CREATE TABLE IF NOT EXISTS rh_release_brs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id           UUID NOT NULL REFERENCES rh_releases(id) ON DELETE CASCADE,
  business_request_id  UUID NOT NULL REFERENCES business_requests(id) ON DELETE CASCADE,
  linked_by            UUID,
  linked_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (release_id, business_request_id)
);

-- 5.4 Release ↔ Sprints (join → anchor_sprints)
CREATE TABLE IF NOT EXISTS rh_release_sprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id  UUID NOT NULL REFERENCES rh_releases(id) ON DELETE CASCADE,
  sprint_id   UUID NOT NULL REFERENCES anchor_sprints(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id),
  linked_by   UUID,
  linked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (release_id, sprint_id)
);

-- 5.5 Release work-item inclusion model (sprint-derived + manual include/exclude)
--     work_item_key references ph_issues.issue_key (text) — not hard-FK'd since
--     the issue may not be synced into ph_issues yet.
CREATE TABLE IF NOT EXISTS rh_release_work_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id       UUID NOT NULL REFERENCES rh_releases(id) ON DELETE CASCADE,
  work_item_key    TEXT NOT NULL,
  inclusion_source TEXT NOT NULL DEFAULT 'sprint',                        -- sprint|manual|excluded
  exclusion_reason TEXT,
  added_by         UUID,
  added_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (release_id, work_item_key)
);

-- 5.6 Change ↔ Release links (many-to-many; supersedes rh_changes.release_id 1:1)
CREATE TABLE IF NOT EXISTS rh_change_release_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id     UUID NOT NULL REFERENCES rh_changes(id) ON DELETE CASCADE,
  release_id    UUID NOT NULL REFERENCES rh_releases(id) ON DELETE CASCADE,
  linked_by     UUID,
  linked_at     TIMESTAMPTZ DEFAULT NOW(),
  unlink_reason TEXT,
  unlinked_at   TIMESTAMPTZ,
  UNIQUE (change_id, release_id)
);

-- 5.7 Release notes
CREATE TABLE IF NOT EXISTS rh_release_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id       UUID NOT NULL REFERENCES rh_releases(id) ON DELETE CASCADE,
  content_md       TEXT,
  content_adf      JSONB,
  generated_by_ai  BOOLEAN DEFAULT FALSE,
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 5.8 Readiness checks (drive readiness_pct + health)
CREATE TABLE IF NOT EXISTS rh_readiness_checks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id  UUID NOT NULL REFERENCES rh_releases(id) ON DELETE CASCADE,
  check_key   TEXT NOT NULL,
  label       TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',                           -- pending|pass|fail|na
  detail      TEXT,
  checked_by  UUID,
  checked_at  TIMESTAMPTZ,
  UNIQUE (release_id, check_key)
);

-- 5.9 Notify subscribers (release|change → users notified on status change)
CREATE TABLE IF NOT EXISTS rh_notify_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type  TEXT NOT NULL,                                              -- release|change
  item_id    UUID NOT NULL,
  user_id    UUID NOT NULL,
  added_by   UUID,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (item_type, item_id, user_id)
);


-- ────────────────────────────────────────────────────────────────────────
-- 6. INDEXES (FK lookups + common filters)
-- ────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rh_releases_product        ON rh_releases (product_id);
CREATE INDEX IF NOT EXISTS idx_rh_releases_status         ON rh_releases (status);
CREATE INDEX IF NOT EXISTS idx_rh_releases_target_env     ON rh_releases (target_env);

CREATE INDEX IF NOT EXISTS idx_rh_changes_status          ON rh_changes (status);
CREATE INDEX IF NOT EXISTS idx_rh_changes_target_env      ON rh_changes (target_env);
CREATE INDEX IF NOT EXISTS idx_rh_changes_change_type     ON rh_changes (change_type);

CREATE INDEX IF NOT EXISTS idx_rh_sop_tmpl_steps_tmpl     ON rh_sop_template_steps (template_id);
CREATE INDEX IF NOT EXISTS idx_rh_sop_steps_change        ON rh_sop_steps (change_id);
CREATE INDEX IF NOT EXISTS idx_rh_sop_steps_template      ON rh_sop_steps (template_id);
CREATE INDEX IF NOT EXISTS idx_rh_sop_steps_status        ON rh_sop_steps (status);

CREATE INDEX IF NOT EXISTS idx_rh_release_brs_release     ON rh_release_brs (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_brs_br          ON rh_release_brs (business_request_id);

CREATE INDEX IF NOT EXISTS idx_rh_release_sprints_release ON rh_release_sprints (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_sprints_sprint  ON rh_release_sprints (sprint_id);

CREATE INDEX IF NOT EXISTS idx_rh_release_wi_release      ON rh_release_work_items (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_wi_key          ON rh_release_work_items (work_item_key);

CREATE INDEX IF NOT EXISTS idx_rh_chg_rel_links_change    ON rh_change_release_links (change_id);
CREATE INDEX IF NOT EXISTS idx_rh_chg_rel_links_release   ON rh_change_release_links (release_id);

CREATE INDEX IF NOT EXISTS idx_rh_release_notes_release   ON rh_release_notes (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_readiness_release       ON rh_readiness_checks (release_id);

CREATE INDEX IF NOT EXISTS idx_rh_notify_item            ON rh_notify_subscribers (item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_rh_notify_user            ON rh_notify_subscribers (user_id);

CREATE INDEX IF NOT EXISTS idx_rh_prod_events_release     ON rh_production_events (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_prod_events_change      ON rh_production_events (change_id);


-- ────────────────────────────────────────────────────────────────────────
-- 7. updated_at TRIGGERS (reuse existing rh_update_updated_at())
-- ────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS rh_sop_templates_updated_at ON rh_sop_templates;
CREATE TRIGGER rh_sop_templates_updated_at BEFORE UPDATE ON rh_sop_templates
  FOR EACH ROW EXECUTE FUNCTION rh_update_updated_at();

DROP TRIGGER IF EXISTS rh_sop_steps_updated_at ON rh_sop_steps;
CREATE TRIGGER rh_sop_steps_updated_at BEFORE UPDATE ON rh_sop_steps
  FOR EACH ROW EXECUTE FUNCTION rh_update_updated_at();

DROP TRIGGER IF EXISTS rh_release_notes_updated_at ON rh_release_notes;
CREATE TRIGGER rh_release_notes_updated_at BEFORE UPDATE ON rh_release_notes
  FOR EACH ROW EXECUTE FUNCTION rh_update_updated_at();


-- ────────────────────────────────────────────────────────────────────────
-- 8. RLS — new tables: read = any authenticated; write = manager
--    (rh_sop_steps adds owner self-update; rh_readiness adds approver action)
-- ────────────────────────────────────────────────────────────────────────

-- Enable RLS on all new tables
ALTER TABLE rh_sop_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_sop_template_steps   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_sop_steps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_release_brs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_release_sprints      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_release_work_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_change_release_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_release_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_readiness_checks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_notify_subscribers   ENABLE ROW LEVEL SECURITY;

-- Generic manager-write policy set, applied per new table
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rh_sop_templates','rh_sop_template_steps','rh_release_brs','rh_release_sprints',
    'rh_release_work_items','rh_change_release_links','rh_release_notes','rh_notify_subscribers'
  ]
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',  t||'_sel', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.rh_is_manager(auth.uid()))', t||'_ins', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.rh_is_manager(auth.uid())) WITH CHECK (public.rh_is_manager(auth.uid()))', t||'_upd', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.rh_is_manager(auth.uid()))', t||'_del', t);
  END LOOP;
END $$;

-- rh_sop_steps: read all; insert/delete manager; update by manager OR the step owner
CREATE POLICY rh_sop_steps_sel ON rh_sop_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY rh_sop_steps_ins ON rh_sop_steps FOR INSERT TO authenticated
  WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_sop_steps_upd ON rh_sop_steps FOR UPDATE TO authenticated
  USING (public.rh_is_manager(auth.uid()) OR owner_id = auth.uid())
  WITH CHECK (public.rh_is_manager(auth.uid()) OR owner_id = auth.uid());
CREATE POLICY rh_sop_steps_del ON rh_sop_steps FOR DELETE TO authenticated
  USING (public.rh_is_manager(auth.uid()));

-- rh_readiness_checks: read all; insert/delete manager; update by approver roles
CREATE POLICY rh_readiness_sel ON rh_readiness_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY rh_readiness_ins ON rh_readiness_checks FOR INSERT TO authenticated
  WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_readiness_upd ON rh_readiness_checks FOR UPDATE TO authenticated
  USING (public.rh_is_approver(auth.uid()))
  WITH CHECK (public.rh_is_approver(auth.uid()));
CREATE POLICY rh_readiness_del ON rh_readiness_checks FOR DELETE TO authenticated
  USING (public.rh_is_manager(auth.uid()));


-- ────────────────────────────────────────────────────────────────────────
-- 9. RLS — RE-TIGHTEN primary writable entities.
--    Drop ALL existing (wide-open) policies by name via catalog loop, then
--    recreate the canonical set. Read stays open (non-PII module data,
--    viewers read all); writes require manager; sign-offs allow approver +
--    assigned individual.
-- ────────────────────────────────────────────────────────────────────────
DO $$
DECLARE pol RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rh_releases','rh_changes','rh_change_signoffs','rh_freeze_windows','rh_production_events'
  ]
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- rh_releases
CREATE POLICY rh_releases_sel ON rh_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY rh_releases_ins ON rh_releases FOR INSERT TO authenticated WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_releases_upd ON rh_releases FOR UPDATE TO authenticated USING (public.rh_is_manager(auth.uid())) WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_releases_del ON rh_releases FOR DELETE TO authenticated USING (public.rh_is_manager(auth.uid()));

-- rh_changes
CREATE POLICY rh_changes_sel ON rh_changes FOR SELECT TO authenticated USING (true);
CREATE POLICY rh_changes_ins ON rh_changes FOR INSERT TO authenticated WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_changes_upd ON rh_changes FOR UPDATE TO authenticated USING (public.rh_is_manager(auth.uid())) WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_changes_del ON rh_changes FOR DELETE TO authenticated USING (public.rh_is_manager(auth.uid()));

-- rh_change_signoffs: read all; insert manager (request sign-off);
--   update by approver roles OR the assigned approver (action own sign-off)
CREATE POLICY rh_signoffs_sel ON rh_change_signoffs FOR SELECT TO authenticated USING (true);
CREATE POLICY rh_signoffs_ins ON rh_change_signoffs FOR INSERT TO authenticated WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_signoffs_upd ON rh_change_signoffs FOR UPDATE TO authenticated
  USING (public.rh_is_approver(auth.uid()) OR assigned_to = auth.uid())
  WITH CHECK (public.rh_is_approver(auth.uid()) OR assigned_to = auth.uid());
CREATE POLICY rh_signoffs_del ON rh_change_signoffs FOR DELETE TO authenticated USING (public.rh_is_manager(auth.uid()));

-- rh_freeze_windows
CREATE POLICY rh_freeze_sel ON rh_freeze_windows FOR SELECT TO authenticated USING (true);
CREATE POLICY rh_freeze_ins ON rh_freeze_windows FOR INSERT TO authenticated WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_freeze_upd ON rh_freeze_windows FOR UPDATE TO authenticated USING (public.rh_is_manager(auth.uid())) WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_freeze_del ON rh_freeze_windows FOR DELETE TO authenticated USING (public.rh_is_manager(auth.uid()));

-- rh_production_events: read all; write manager (events are auto-generated server-side)
CREATE POLICY rh_prod_events_sel ON rh_production_events FOR SELECT TO authenticated USING (true);
CREATE POLICY rh_prod_events_ins ON rh_production_events FOR INSERT TO authenticated WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_prod_events_upd ON rh_production_events FOR UPDATE TO authenticated USING (public.rh_is_manager(auth.uid())) WITH CHECK (public.rh_is_manager(auth.uid()));
CREATE POLICY rh_prod_events_del ON rh_production_events FOR DELETE TO authenticated USING (public.rh_is_manager(auth.uid()));

-- ════════════════════════════════════════════════════════════════════════
-- END — Release Operations schema extension
-- ════════════════════════════════════════════════════════════════════════
