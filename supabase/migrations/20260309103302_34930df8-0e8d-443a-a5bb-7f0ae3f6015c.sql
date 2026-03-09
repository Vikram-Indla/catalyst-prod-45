
-- ══════════════════════════════════════════
-- RELEASEHUB v2.1 — SCHEMA
-- ══════════════════════════════════════════

-- 1. CREATE rh_releases
CREATE TABLE IF NOT EXISTS rh_releases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  version      TEXT,
  status       TEXT NOT NULL DEFAULT 'todo',
  source       TEXT NOT NULL DEFAULT 'catalyst',
  jira_key     TEXT,
  target_date  DATE NOT NULL,
  owner_id     UUID,
  project_id   UUID REFERENCES projects(id),
  chg_count    INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE rh_changes
CREATE TABLE IF NOT EXISTS rh_changes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chg_number           TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'new',
  risk_level           TEXT NOT NULL DEFAULT 'low',
  risk_score           INTEGER DEFAULT 0,
  source               TEXT NOT NULL DEFAULT 'catalyst',
  release_id           UUID REFERENCES rh_releases(id) ON DELETE SET NULL,
  category             TEXT,
  deployment_date      DATE,
  frontend_required    BOOLEAN DEFAULT FALSE,
  frontend_commit      TEXT,
  backend_required     BOOLEAN DEFAULT FALSE,
  backend_commit       TEXT,
  dependency           TEXT,
  deployment_process   TEXT DEFAULT 'Execute the CICD Pipeline',
  additional_commands  TEXT,
  additional_comments  TEXT,
  sn_imported          BOOLEAN DEFAULT FALSE,
  created_by           UUID,
  project_id           UUID REFERENCES projects(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE rh_change_work_items
CREATE TABLE IF NOT EXISTS rh_change_work_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id        UUID NOT NULL REFERENCES rh_changes(id) ON DELETE CASCADE,
  work_item_id     UUID,
  work_item_key    TEXT NOT NULL,
  work_item_type   TEXT DEFAULT 'story',
  work_item_title  TEXT NOT NULL,
  work_item_status TEXT DEFAULT 'todo',
  linked_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(change_id, work_item_key)
);

-- 4. CREATE rh_change_status_history
CREATE TABLE IF NOT EXISTS rh_change_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id    UUID NOT NULL REFERENCES rh_changes(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  changed_by   UUID,
  changed_at   TIMESTAMPTZ DEFAULT NOW(),
  comment      TEXT
);

-- 5. CREATE rh_change_signoffs
CREATE TABLE IF NOT EXISTS rh_change_signoffs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id        UUID NOT NULL REFERENCES rh_changes(id) ON DELETE CASCADE,
  stage            TEXT NOT NULL,
  signoff_role     TEXT NOT NULL,
  assigned_to      UUID,
  status           TEXT NOT NULL DEFAULT 'pending',
  actioned_at      TIMESTAMPTZ,
  actioned_by      UUID,
  wait_started_at  TIMESTAMPTZ DEFAULT NOW(),
  comment          TEXT,
  UNIQUE(change_id, stage)
);

-- 6. CREATE rh_freeze_windows
CREATE TABLE IF NOT EXISTS rh_freeze_windows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CREATE rh_release_test_cycle_links
CREATE TABLE IF NOT EXISTS rh_release_test_cycle_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id     UUID NOT NULL REFERENCES rh_releases(id) ON DELETE CASCADE,
  test_cycle_id  UUID NOT NULL REFERENCES tm_test_cycles(id) ON DELETE CASCADE,
  linked_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(release_id, test_cycle_id)
);

-- 8. RLS POLICIES
ALTER TABLE rh_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_change_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_change_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_change_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_freeze_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_release_test_cycle_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read rh_releases" ON rh_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert rh_releases" ON rh_releases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update rh_releases" ON rh_releases FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read rh_changes" ON rh_changes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert rh_changes" ON rh_changes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update rh_changes" ON rh_changes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read rh_change_work_items" ON rh_change_work_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert rh_change_work_items" ON rh_change_work_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read rh_change_status_history" ON rh_change_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert rh_change_status_history" ON rh_change_status_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read rh_change_signoffs" ON rh_change_signoffs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert rh_change_signoffs" ON rh_change_signoffs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update rh_change_signoffs" ON rh_change_signoffs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read rh_freeze_windows" ON rh_freeze_windows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert rh_freeze_windows" ON rh_freeze_windows FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read rh_release_test_cycle_links" ON rh_release_test_cycle_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert rh_release_test_cycle_links" ON rh_release_test_cycle_links FOR INSERT TO authenticated WITH CHECK (true);

-- 9. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION rh_update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER rh_releases_updated_at BEFORE UPDATE ON rh_releases
  FOR EACH ROW EXECUTE FUNCTION rh_update_updated_at();

CREATE TRIGGER rh_changes_updated_at BEFORE UPDATE ON rh_changes
  FOR EACH ROW EXECUTE FUNCTION rh_update_updated_at();
