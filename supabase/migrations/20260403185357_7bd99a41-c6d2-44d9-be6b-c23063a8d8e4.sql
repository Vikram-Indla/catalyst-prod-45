
-- TABLE 1: tm_shared_step_categories
CREATE TABLE IF NOT EXISTS tm_shared_step_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT,
  icon       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tm_shared_step_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_ssc" ON tm_shared_step_categories
  FOR ALL USING (auth.role() = 'authenticated');

-- TABLE 2: tm_shared_steps
CREATE TABLE IF NOT EXISTS tm_shared_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  steps       JSONB NOT NULL DEFAULT '[]',
  category_id UUID REFERENCES tm_shared_step_categories(id),
  tags        TEXT[] DEFAULT '{}',
  usage_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES profiles(id),
  deleted_at  TIMESTAMPTZ
);
ALTER TABLE tm_shared_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_ss" ON tm_shared_steps
  FOR ALL USING (auth.role() = 'authenticated');

-- TABLE 3: tm_requirements
CREATE TABLE IF NOT EXISTS tm_requirements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  req_key         TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT DEFAULT 'Functional',
  priority        TEXT DEFAULT 'Medium',
  status          TEXT DEFAULT 'Draft',
  external_id     TEXT,
  source          TEXT,
  release_version TEXT,
  owner_id        UUID REFERENCES profiles(id),
  project_id      UUID REFERENCES tm_projects(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  created_by      UUID REFERENCES profiles(id),
  deleted_at      TIMESTAMPTZ
);
ALTER TABLE tm_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_req" ON tm_requirements
  FOR ALL USING (auth.role() = 'authenticated');

-- TABLE 4: tm_requirement_tests
CREATE TABLE IF NOT EXISTS tm_requirement_tests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES tm_requirements(id) ON DELETE CASCADE,
  test_case_id   UUID NOT NULL REFERENCES tm_test_cases(id) ON DELETE CASCADE,
  coverage_status TEXT DEFAULT 'Not Run',
  created_at     TIMESTAMPTZ DEFAULT now(),
  created_by     UUID REFERENCES profiles(id),
  UNIQUE(requirement_id, test_case_id)
);
ALTER TABLE tm_requirement_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_rt" ON tm_requirement_tests
  FOR ALL USING (auth.role() = 'authenticated');

-- COLUMN ADDITIONS: tm_test_cycles
ALTER TABLE tm_test_cycles
  ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES tm_environments(id),
  ADD COLUMN IF NOT EXISTS cycle_key      TEXT,
  ADD COLUMN IF NOT EXISTS description    TEXT;

-- COLUMN ADDITIONS: tm_environments
ALTER TABLE tm_environments
  ADD COLUMN IF NOT EXISTS health_status    TEXT DEFAULT 'Healthy',
  ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS app_url          TEXT,
  ADD COLUMN IF NOT EXISTS api_url          TEXT,
  ADD COLUMN IF NOT EXISTS db_info          TEXT;
