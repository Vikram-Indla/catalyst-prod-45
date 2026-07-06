-- ════════════════════════════════════════════════════════════════════════
-- RELEASE OPERATIONS — Phase 2 Functional Foundation
-- CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001 · Phase 2
--
-- PURPOSE: make the Release Ops data model structurally complete + traceable
--   for the chain BR → Release → Sprint/WorkItem → Change → SOP template →
--   SOP execution step → assignee → planned/actual window → commit/evidence →
--   sign-off → freeze validation → emergency override → production event →
--   incident/defect → replay/audit.
--
-- STRATEGY (LOCKED): additive + idempotent ONLY. Every statement is
--   ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE.
--   No DROP of data-bearing objects. No data rewrite except slug/link backfill
--   (both null-guarded). Safe to run whether or not 20260618120000 /
--   20260618140001 physically applied (discovery proved they did NOT fully
--   apply on staging cyij — this migration reconciles that gap and extends it).
--
-- RLS: new tables get RLS enabled with permissive authenticated read+write
--   (module data; matches how the running app already writes rh_changes).
--   Manager/approver hardening is deferred to a security phase.
-- ════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- 0. shared updated_at trigger fn (exists on cyij; CREATE OR REPLACE = safe)
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rh_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- ════════════════════════════════════════════════════════════════════════
-- 1. RELEASE — baseline reconcile (§2)
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_releases
  ADD COLUMN IF NOT EXISTS release_type         TEXT,
  ADD COLUMN IF NOT EXISTS target_env           TEXT,
  ADD COLUMN IF NOT EXISTS product_id           UUID REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS planned_start_date   DATE,
  ADD COLUMN IF NOT EXISTS planned_release_date DATE,
  ADD COLUMN IF NOT EXISTS release_manager_id   UUID,
  ADD COLUMN IF NOT EXISTS product_owner_id     UUID,
  ADD COLUMN IF NOT EXISTS qa_lead_id           UUID,
  ADD COLUMN IF NOT EXISTS uat_lead_id          UUID,
  ADD COLUMN IF NOT EXISTS health               TEXT,
  ADD COLUMN IF NOT EXISTS readiness_pct        INTEGER;

-- ════════════════════════════════════════════════════════════════════════
-- 2. CHANGE RECORD — baseline reconcile + Phase 2 window/role/justification (§3)
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_changes
  -- baseline (20260618120000 ALTER never applied on cyij)
  ADD COLUMN IF NOT EXISTS change_type           TEXT,
  ADD COLUMN IF NOT EXISTS target_env            TEXT,
  ADD COLUMN IF NOT EXISTS deployment_category   TEXT,
  ADD COLUMN IF NOT EXISTS window_start          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_end            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS change_manager_id     UUID,
  ADD COLUMN IF NOT EXISTS release_manager_id    UUID,
  ADD COLUMN IF NOT EXISTS external_system       TEXT,
  ADD COLUMN IF NOT EXISTS is_emergency_override BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS override_reason       TEXT,
  ADD COLUMN IF NOT EXISTS override_approver_id  UUID,
  -- Phase 2 planned/actual execution window (§3.10-13)
  ADD COLUMN IF NOT EXISTS planned_start_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planned_end_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_start_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_at         TIMESTAMPTZ,
  -- Phase 2 extra roles (§3.18-19)
  ADD COLUMN IF NOT EXISTS technical_lead_id     UUID,
  ADD COLUMN IF NOT EXISTS qa_owner_id           UUID,
  -- Phase 2 unlinked-production-change justification (§3 functional rules)
  ADD COLUMN IF NOT EXISTS prod_no_release_justification TEXT;

-- ════════════════════════════════════════════════════════════════════════
-- 3. CHANGE SLUG (§4) — prefer chg_number, then title, then id. Trigger + backfill.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_changes ADD COLUMN IF NOT EXISTS slug TEXT;

-- backfill: chg_number → title → id
UPDATE public.rh_changes
SET slug = public.catalyst_slugify(chg_number)
WHERE slug IS NULL AND chg_number IS NOT NULL AND chg_number <> '';
UPDATE public.rh_changes
SET slug = public.catalyst_slugify(title)
WHERE slug IS NULL AND title IS NOT NULL AND title <> '';
UPDATE public.rh_changes
SET slug = 'chg-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- dedup existing
DO $$
DECLARE rec RECORD; counter INT; candidate TEXT;
BEGIN
  FOR rec IN
    SELECT id, slug FROM (
      SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
      FROM public.rh_changes WHERE slug IS NOT NULL
    ) sub WHERE rn > 1
  LOOP
    counter := 2; candidate := rec.slug || '-' || counter;
    WHILE EXISTS (SELECT 1 FROM public.rh_changes WHERE slug = candidate AND id <> rec.id) LOOP
      counter := counter + 1; candidate := rec.slug || '-' || counter;
    END LOOP;
    UPDATE public.rh_changes SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE public.rh_changes ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rh_changes_slug_unique ON public.rh_changes (slug);

CREATE OR REPLACE FUNCTION public.rh_changes_generate_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE base_slug TEXT; candidate TEXT; counter INT := 2;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    IF NEW.chg_number IS NOT NULL AND NEW.chg_number <> '' THEN
      base_slug := public.catalyst_slugify(NEW.chg_number);
    ELSIF NEW.title IS NOT NULL AND NEW.title <> '' THEN
      base_slug := public.catalyst_slugify(NEW.title);
    ELSE
      base_slug := 'chg-' || substr(NEW.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.rh_changes WHERE slug = candidate AND id <> NEW.id) LOOP
      candidate := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS rh_changes_slug_trg ON public.rh_changes;
CREATE TRIGGER rh_changes_slug_trg BEFORE INSERT ON public.rh_changes
  FOR EACH ROW EXECUTE FUNCTION public.rh_changes_generate_slug();

-- ════════════════════════════════════════════════════════════════════════
-- 4. RELEASE ↔ CHANGE many-to-many (§5) — join = forward truth; legacy kept.
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rh_change_release_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id     UUID NOT NULL REFERENCES public.rh_changes(id) ON DELETE CASCADE,
  release_id    UUID NOT NULL REFERENCES public.rh_releases(id) ON DELETE CASCADE,
  linked_by     UUID,
  linked_at     TIMESTAMPTZ DEFAULT NOW(),
  unlink_reason TEXT,
  unlinked_at   TIMESTAMPTZ,
  UNIQUE (change_id, release_id)
);
-- backfill legacy 1:1 release_id → join (null-guarded, dedup via ON CONFLICT)
INSERT INTO public.rh_change_release_links (change_id, release_id, linked_at)
SELECT c.id, c.release_id, NOW()
FROM public.rh_changes c
WHERE c.release_id IS NOT NULL
ON CONFLICT (change_id, release_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════
-- 5. RELEASE SCOPE joins (§13) — BR / Sprint / Work Item
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rh_release_brs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id          UUID NOT NULL REFERENCES public.rh_releases(id) ON DELETE CASCADE,
  business_request_id UUID NOT NULL REFERENCES public.business_requests(id) ON DELETE CASCADE,
  linked_by           UUID,
  linked_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (release_id, business_request_id)
);
CREATE TABLE IF NOT EXISTS public.rh_release_sprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id  UUID NOT NULL REFERENCES public.rh_releases(id) ON DELETE CASCADE,
  sprint_id   UUID NOT NULL REFERENCES public.anchor_sprints(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id),
  linked_by   UUID,
  linked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (release_id, sprint_id)
);
CREATE TABLE IF NOT EXISTS public.rh_release_work_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id       UUID NOT NULL REFERENCES public.rh_releases(id) ON DELETE CASCADE,
  work_item_key    TEXT NOT NULL,
  inclusion_source TEXT NOT NULL DEFAULT 'sprint',   -- sprint|manual|excluded
  exclusion_reason TEXT,
  added_by         UUID,
  added_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (release_id, work_item_key)
);

-- ════════════════════════════════════════════════════════════════════════
-- 6. SOP TEMPLATE richness (§6)
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_sop_templates
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS risk_applicability         TEXT,      -- all|high|critical
  ADD COLUMN IF NOT EXISTS is_active                  BOOLEAN DEFAULT TRUE;

ALTER TABLE public.rh_sop_template_steps
  ADD COLUMN IF NOT EXISTS default_assigned_role         TEXT,
  ADD COLUMN IF NOT EXISTS repo_name                     TEXT,
  ADD COLUMN IF NOT EXISTS repo_url                      TEXT,
  ADD COLUMN IF NOT EXISTS branch                        TEXT,
  ADD COLUMN IF NOT EXISTS script_reference              TEXT,
  ADD COLUMN IF NOT EXISTS command_text                  TEXT,
  ADD COLUMN IF NOT EXISTS expected_result               TEXT,
  ADD COLUMN IF NOT EXISTS commit_required               BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS evidence_required             BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS default_planned_offset_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS default_duration_minutes      INTEGER,
  ADD COLUMN IF NOT EXISTS rollback_step_flag            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS predecessor_step_no           INTEGER;

-- ════════════════════════════════════════════════════════════════════════
-- 7. SOP EXECUTION STEP (§7) — schedule, roles, commits, lineage
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_sop_steps
  ADD COLUMN IF NOT EXISTS assigned_role           TEXT,
  ADD COLUMN IF NOT EXISTS repo_name               TEXT,
  ADD COLUMN IF NOT EXISTS repo_url                TEXT,
  ADD COLUMN IF NOT EXISTS database_commit         TEXT,
  ADD COLUMN IF NOT EXISTS configuration_commit    TEXT,
  ADD COLUMN IF NOT EXISTS planned_start_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planned_end_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planned_duration_minutes INTEGER,
  -- actual timing: started_at / completed_at already exist and remain the
  -- canonical actuals; mirror aliases added for explicit Phase 2 contract.
  ADD COLUMN IF NOT EXISTS actual_start_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_order         INTEGER,      -- optional; step_no remains primary order
  ADD COLUMN IF NOT EXISTS is_technical_step       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commit_required         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS evidence_required       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_status     TEXT DEFAULT 'none', -- none|notified|acknowledged
  ADD COLUMN IF NOT EXISTS timer_state             TEXT DEFAULT 'idle', -- idle|running|paused|stopped
  ADD COLUMN IF NOT EXISTS incident_id             UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS defect_id               UUID REFERENCES public.tm_defects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS production_event_id     UUID REFERENCES public.rh_production_events(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════════════
-- 8. SIGN-OFF (§8) — change-level extend + release-level table (both scopes)
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_change_signoffs
  ADD COLUMN IF NOT EXISTS scope                 TEXT DEFAULT 'change',  -- change (this table)
  ADD COLUMN IF NOT EXISTS release_id            UUID REFERENCES public.rh_releases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requested_by          UUID,
  ADD COLUMN IF NOT EXISTS requested_at          TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS due_date              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decided_at            TIMESTAMPTZ,   -- mirror of actioned_at for Phase 2 contract
  ADD COLUMN IF NOT EXISTS dependency_key        TEXT,          -- gate key for dependency-style visual (later)
  ADD COLUMN IF NOT EXISTS depends_on_signoff_id UUID,
  ADD COLUMN IF NOT EXISTS emergency_override_id UUID;

CREATE TABLE IF NOT EXISTS public.rh_release_signoffs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope                 TEXT NOT NULL DEFAULT 'release',
  release_id            UUID NOT NULL REFERENCES public.rh_releases(id) ON DELETE CASCADE,
  stage                 TEXT,
  signoff_role          TEXT NOT NULL,
  assigned_to           UUID,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','skipped','overridden','auto_approved','bypassed')),
  requested_by          UUID,
  requested_at          TIMESTAMPTZ DEFAULT NOW(),
  wait_started_at       TIMESTAMPTZ DEFAULT NOW(),
  due_date              TIMESTAMPTZ,
  actioned_at           TIMESTAMPTZ,
  actioned_by           UUID,
  decided_at            TIMESTAMPTZ,
  comment               TEXT,
  dependency_key        TEXT,
  depends_on_signoff_id UUID,
  emergency_override_id UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════
-- 9. EMERGENCY OVERRIDE (§9) — explicit, auditable, per scope
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rh_emergency_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope          TEXT NOT NULL,     -- release|change|signoff|freeze|readiness
  release_id     UUID REFERENCES public.rh_releases(id) ON DELETE CASCADE,
  change_id      UUID REFERENCES public.rh_changes(id) ON DELETE CASCADE,
  signoff_id     UUID,
  bypassed_gate  TEXT,
  reason         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested','approved','rejected','revoked')),
  requested_by   UUID,
  requested_at   TIMESTAMPTZ DEFAULT NOW(),
  approved_by    UUID,
  approved_at    TIMESTAMPTZ,
  rejected_by    UUID,
  rejected_at    TIMESTAMPTZ,
  audit_payload  JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════
-- 10. FREEZE WINDOW (§10) — baseline reconcile + Phase 2 scope/datetime/owner
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_freeze_windows
  -- baseline (20260618120000 ALTER never applied on cyij)
  ADD COLUMN IF NOT EXISTS target_env      TEXT,
  ADD COLUMN IF NOT EXISTS applicability   TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS product_id      UUID REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'scheduled',   -- scheduled|active|ended
  ADD COLUMN IF NOT EXISTS override_policy TEXT,
  -- Phase 2
  ADD COLUMN IF NOT EXISTS scope           TEXT DEFAULT 'environment', -- global|product|project|release|environment
  ADD COLUMN IF NOT EXISTS release_id      UUID REFERENCES public.rh_releases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id      UUID REFERENCES public.projects(id),
  ADD COLUMN IF NOT EXISTS start_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_id        UUID,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT TRUE;
-- seed start_at/end_at from existing DATE columns where null
UPDATE public.rh_freeze_windows
SET start_at = start_date::timestamptz WHERE start_at IS NULL AND start_date IS NOT NULL;
UPDATE public.rh_freeze_windows
SET end_at = (end_date::timestamptz + INTERVAL '1 day' - INTERVAL '1 second') WHERE end_at IS NULL AND end_date IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════
-- 11. INCIDENT / DEFECT lineage (§11) — additive columns only, hubs stay safe
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS source_release_id            UUID,
  ADD COLUMN IF NOT EXISTS source_change_id             UUID REFERENCES public.rh_changes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_sop_step_id           UUID REFERENCES public.rh_sop_steps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_production_event_id   UUID REFERENCES public.rh_production_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raised_during_change_execution BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tm_defects
  ADD COLUMN IF NOT EXISTS source_release_id            UUID,
  ADD COLUMN IF NOT EXISTS source_change_id             UUID REFERENCES public.rh_changes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_sop_step_id           UUID REFERENCES public.rh_sop_steps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_production_event_id   UUID REFERENCES public.rh_production_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raised_during_change_execution BOOLEAN DEFAULT FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- 12. PRODUCTION EVENT (§12) — structured FKs, snapshots, planned/actual, rollup
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_production_events
  -- baseline structured cols (20260618120000 ALTER never applied on cyij)
  ADD COLUMN IF NOT EXISTS event_key                    TEXT,
  ADD COLUMN IF NOT EXISTS release_id                   UUID REFERENCES public.rh_releases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_id                    UUID REFERENCES public.rh_changes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id                   UUID REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS target_env                   TEXT,
  ADD COLUMN IF NOT EXISTS produced_at                  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deployment_status            TEXT,   -- success|partial|failed|rollback
  ADD COLUMN IF NOT EXISTS owner_id                     UUID,
  ADD COLUMN IF NOT EXISTS release_notes_id             UUID,
  ADD COLUMN IF NOT EXISTS work_items_snapshot          JSONB,
  ADD COLUMN IF NOT EXISTS business_requests_snapshot   JSONB,
  ADD COLUMN IF NOT EXISTS commits_snapshot             JSONB,
  ADD COLUMN IF NOT EXISTS sop_evidence_snapshot        JSONB,
  ADD COLUMN IF NOT EXISTS approvers_snapshot           JSONB,
  -- Phase 2 planned/actual + rollup + full lineage snapshots
  ADD COLUMN IF NOT EXISTS planned_start_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planned_end_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_start_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overrun_minutes              INTEGER,
  ADD COLUMN IF NOT EXISTS executed_by                  UUID,
  ADD COLUMN IF NOT EXISTS approved_by                  UUID,
  ADD COLUMN IF NOT EXISTS sop_steps_snapshot           JSONB,
  ADD COLUMN IF NOT EXISTS signoffs_snapshot            JSONB,
  ADD COLUMN IF NOT EXISTS incidents_snapshot           JSONB,
  ADD COLUMN IF NOT EXISTS defects_snapshot             JSONB,
  ADD COLUMN IF NOT EXISTS emergency_override_snapshot  JSONB,
  ADD COLUMN IF NOT EXISTS freeze_result                JSONB,
  ADD COLUMN IF NOT EXISTS replay_summary               JSONB,
  ADD COLUMN IF NOT EXISTS event_level                  TEXT DEFAULT 'change',  -- change|release
  ADD COLUMN IF NOT EXISTS is_release_rollup            BOOLEAN DEFAULT FALSE;

-- ════════════════════════════════════════════════════════════════════════
-- 13. RELEASE NOTES / READINESS / NOTIFY (baseline reconcile — missing on cyij)
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rh_release_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id      UUID NOT NULL REFERENCES public.rh_releases(id) ON DELETE CASCADE,
  content_md      TEXT,
  content_adf     JSONB,
  generated_by_ai BOOLEAN DEFAULT FALSE,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.rh_readiness_checks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id  UUID NOT NULL REFERENCES public.rh_releases(id) ON DELETE CASCADE,
  check_key   TEXT NOT NULL,
  label       TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending|pass|fail|na
  detail      TEXT,
  checked_by  UUID,
  checked_at  TIMESTAMPTZ,
  UNIQUE (release_id, check_key)
);
CREATE TABLE IF NOT EXISTS public.rh_notify_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type  TEXT NOT NULL,   -- release|change
  item_id    UUID NOT NULL,
  user_id    UUID NOT NULL,
  added_by   UUID,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (item_type, item_id, user_id)
);

-- ════════════════════════════════════════════════════════════════════════
-- 14. INDEXES
-- ════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_rh_chg_rel_links_change  ON public.rh_change_release_links (change_id);
CREATE INDEX IF NOT EXISTS idx_rh_chg_rel_links_release ON public.rh_change_release_links (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_brs_release   ON public.rh_release_brs (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_brs_br        ON public.rh_release_brs (business_request_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_sprints_rel   ON public.rh_release_sprints (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_sprints_spr   ON public.rh_release_sprints (sprint_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_wi_release    ON public.rh_release_work_items (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_wi_key        ON public.rh_release_work_items (work_item_key);
CREATE INDEX IF NOT EXISTS idx_rh_release_signoffs_rel  ON public.rh_release_signoffs (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_release_signoffs_stat ON public.rh_release_signoffs (status);
CREATE INDEX IF NOT EXISTS idx_rh_emerg_override_change ON public.rh_emergency_overrides (change_id);
CREATE INDEX IF NOT EXISTS idx_rh_emerg_override_rel    ON public.rh_emergency_overrides (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_sop_steps_incident    ON public.rh_sop_steps (incident_id);
CREATE INDEX IF NOT EXISTS idx_rh_sop_steps_defect      ON public.rh_sop_steps (defect_id);
CREATE INDEX IF NOT EXISTS idx_rh_sop_steps_prodevent   ON public.rh_sop_steps (production_event_id);
CREATE INDEX IF NOT EXISTS idx_rh_prod_events_release2  ON public.rh_production_events (release_id);
CREATE INDEX IF NOT EXISTS idx_rh_prod_events_change2   ON public.rh_production_events (change_id);
CREATE INDEX IF NOT EXISTS idx_incidents_src_change     ON public.incidents (source_change_id);
CREATE INDEX IF NOT EXISTS idx_incidents_src_sop        ON public.incidents (source_sop_step_id);
CREATE INDEX IF NOT EXISTS idx_tm_defects_src_change    ON public.tm_defects (source_change_id);
CREATE INDEX IF NOT EXISTS idx_freeze_release           ON public.rh_freeze_windows (release_id);

-- ════════════════════════════════════════════════════════════════════════
-- 15. updated_at triggers on new/missing tables (idempotent)
-- ════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS rh_release_notes_updated_at ON public.rh_release_notes;
CREATE TRIGGER rh_release_notes_updated_at BEFORE UPDATE ON public.rh_release_notes
  FOR EACH ROW EXECUTE FUNCTION public.rh_update_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 16. RLS — new tables: enable + permissive authenticated (module data).
--     (Manager/approver hardening deferred to a security phase.)
-- ════════════════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rh_change_release_links','rh_release_brs','rh_release_sprints','rh_release_work_items',
    'rh_release_signoffs','rh_emergency_overrides','rh_release_notes','rh_readiness_checks','rh_notify_subscribers'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_sel', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_sel', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t||'_all', t);
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════════
-- 17. RECONSTRUCTION VIEW — unlinked production changes (§3 / §14 Scenario B)
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.vw_rh_unlinked_production_changes AS
SELECT c.id, c.chg_number, c.slug, c.title, c.target_env, c.status,
       c.prod_no_release_justification,
       (c.prod_no_release_justification IS NOT NULL AND c.prod_no_release_justification <> '') AS has_justification
FROM public.rh_changes c
WHERE c.target_env = 'production'
  AND NOT EXISTS (
    SELECT 1 FROM public.rh_change_release_links l
    WHERE l.change_id = c.id AND l.unlinked_at IS NULL
  )
  AND c.release_id IS NULL;

-- ════════════════════════════════════════════════════════════════════════
-- END — Release Ops Phase 2 functional foundation
-- ════════════════════════════════════════════════════════════════════════
