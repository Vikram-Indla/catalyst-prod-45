
-- ═══ SDLC RELEASES TABLE ═══
CREATE TABLE IF NOT EXISTS ph_sdlc_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for release status
CREATE OR REPLACE FUNCTION validate_ph_sdlc_releases_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active','closed','planned') THEN
    RAISE EXCEPTION 'Invalid release status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ph_sdlc_releases_validate_status
  BEFORE INSERT OR UPDATE ON ph_sdlc_releases
  FOR EACH ROW EXECUTE FUNCTION validate_ph_sdlc_releases_status();

-- ═══ SDLC ISSUES TABLE ═══
CREATE TABLE IF NOT EXISTS ph_sdlc_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'task',
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  assignee_id UUID,
  release_id UUID REFERENCES ph_sdlc_releases(id),
  due_date DATE,
  overdue_days INT DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'catalyst',
  jira_key TEXT,
  parent_id UUID REFERENCES ph_sdlc_issues(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

-- Validation trigger for issues
CREATE OR REPLACE FUNCTION validate_ph_sdlc_issues()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type NOT IN ('epic','feature','story','task','bug','subtask') THEN
    RAISE EXCEPTION 'Invalid issue type: %', NEW.type;
  END IF;
  IF NEW.status NOT IN ('backlog','ready','in_dev','in_qa','in_uat','in_beta','prod_ready','production','on_hold') THEN
    RAISE EXCEPTION 'Invalid issue status: %', NEW.status;
  END IF;
  IF NEW.priority NOT IN ('urgent','high','medium','low') THEN
    RAISE EXCEPTION 'Invalid issue priority: %', NEW.priority;
  END IF;
  IF NEW.source NOT IN ('jira','catalyst') THEN
    RAISE EXCEPTION 'Invalid issue source: %', NEW.source;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ph_sdlc_issues_validate
  BEFORE INSERT OR UPDATE ON ph_sdlc_issues
  FOR EACH ROW EXECUTE FUNCTION validate_ph_sdlc_issues();

-- ═══ BOARD CONFIGS TABLE ═══
CREATE TABLE IF NOT EXISTS ph_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]',
  card_fields JSONB NOT NULL DEFAULT '{"type":true,"key":true,"title":true,"priority":true,"assignee":true,"due":true,"source":true,"overdue":true}',
  filters JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ INDEXES ═══
CREATE INDEX IF NOT EXISTS idx_ph_sdlc_issues_status ON ph_sdlc_issues(status);
CREATE INDEX IF NOT EXISTS idx_ph_sdlc_issues_type ON ph_sdlc_issues(type);
CREATE INDEX IF NOT EXISTS idx_ph_sdlc_issues_priority ON ph_sdlc_issues(priority);
CREATE INDEX IF NOT EXISTS idx_ph_sdlc_issues_assignee ON ph_sdlc_issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_ph_sdlc_issues_release ON ph_sdlc_issues(release_id);
CREATE INDEX IF NOT EXISTS idx_ph_sdlc_issues_parent ON ph_sdlc_issues(parent_id);
CREATE INDEX IF NOT EXISTS idx_ph_sdlc_issues_source ON ph_sdlc_issues(source);

-- ═══ RLS ═══
ALTER TABLE ph_sdlc_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_sdlc_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ph_sdlc_issues" ON ph_sdlc_issues FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can insert ph_sdlc_issues" ON ph_sdlc_issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ph_sdlc_issues" ON ph_sdlc_issues FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read ph_sdlc_releases" ON ph_sdlc_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ph_sdlc_releases" ON ph_sdlc_releases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ph_sdlc_releases" ON ph_sdlc_releases FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read ph_boards" ON ph_boards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ph_boards" ON ph_boards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ph_boards" ON ph_boards FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete ph_boards" ON ph_boards FOR DELETE TO authenticated USING (true);

-- ═══ UPDATED_AT TRIGGERS ═══
CREATE OR REPLACE FUNCTION update_ph_sdlc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ph_sdlc_issues_updated_at BEFORE UPDATE ON ph_sdlc_issues
FOR EACH ROW EXECUTE FUNCTION update_ph_sdlc_updated_at();

CREATE TRIGGER ph_boards_updated_at BEFORE UPDATE ON ph_boards
FOR EACH ROW EXECUTE FUNCTION update_ph_sdlc_updated_at();

CREATE TRIGGER ph_sdlc_releases_updated_at BEFORE UPDATE ON ph_sdlc_releases
FOR EACH ROW EXECUTE FUNCTION update_ph_sdlc_updated_at();
